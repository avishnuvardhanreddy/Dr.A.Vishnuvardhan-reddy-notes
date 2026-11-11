import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Response } from 'express';
import type { NodeJsClient } from '@smithy/types';

interface UploadedFile {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

interface S3Storage {
  bucket: string;
  client: NodeJsClient<S3Client>;
}

let storage: S3Storage | null = null;
let storageConfigured = false;

function getStorage(): S3Storage | null {
  if (storageConfigured) return storage;

  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = process.env.AWS_REGION?.trim();
  const bucket = process.env.AWS_BUCKET_NAME?.trim();
  const values = [endpoint, accessKeyId, secretAccessKey, region, bucket];

  if (values.every(value => !value)) {
    storageConfigured = true;
    return null;
  }
  if (values.some(value => !value)) {
    throw new Error('S3-compatible storage requires AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_BUCKET_NAME.');
  }

  storage = {
    bucket: bucket!,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    }) as NodeJsClient<S3Client>,
  };
  storageConfigured = true;
  return storage;
}

function parseS3Path(storagePath: string): { bucket: string; key: string } | null {
  if (!storagePath.startsWith('s3://')) return null;
  const bucketAndKey = storagePath.slice('s3://'.length);
  const separator = bucketAndKey.indexOf('/');
  if (separator <= 0 || separator === bucketAndKey.length - 1) return null;
  return {
    bucket: bucketAndKey.slice(0, separator),
    key: bucketAndKey.slice(separator + 1),
  };
}

export async function storeUploadedFile(file: UploadedFile): Promise<string> {
  const configuredStorage = getStorage();
  if (!configuredStorage) {
    if (process.env.VERCEL === '1') {
      throw new Error('S3-compatible storage is not configured for this Vercel deployment.');
    }
    return file.path;
  }

  const key = `uploads/${file.filename}`;
  try {
    const body = await fs.readFile(file.path);
    await configuredStorage.client.send(new PutObjectCommand({
      Bucket: configuredStorage.bucket,
      Key: key,
      Body: body,
      ContentLength: body.length,
      ContentType: file.mimetype || 'application/octet-stream',
    }));
    return `s3://${configuredStorage.bucket}/${key}`;
  } finally {
    await fs.rm(file.path, { force: true });
  }
}

export function usesDirectUploads(): boolean {
  return process.env.VERCEL === '1' || getStorage() !== null;
}

export async function createPresignedUpload(uploadId: string, contentType: string): Promise<string> {
  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for direct uploads.');
  }

  return getSignedUrl(configuredStorage.client, new PutObjectCommand({
    Bucket: configuredStorage.bucket,
    Key: `uploads/${uploadId}`,
    ContentType: contentType,
    Metadata: { 'upload-id': uploadId },
  }), {
    expiresIn: 900,
    signableHeaders: new Set(['content-type']),
    unhoistableHeaders: new Set(['x-amz-meta-upload-id']),
  });
}

export async function inspectPresignedUpload(uploadId: string): Promise<{
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  metadataUploadId: string | undefined;
} | null> {
  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for direct uploads.');
  }

  const key = `uploads/${uploadId}`;
  try {
    const result = await configuredStorage.client.send(new HeadObjectCommand({
      Bucket: configuredStorage.bucket,
      Key: key,
    }));
    return {
      storagePath: `s3://${configuredStorage.bucket}/${key}`,
      sizeBytes: result.ContentLength ?? 0,
      mimeType: result.ContentType ?? 'application/octet-stream',
      metadataUploadId: result.Metadata?.['upload-id'],
    };
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (statusCode === 404) return null;
    throw error;
  }
}

export async function readPresignedUploadText(uploadId: string, maxBytes: number): Promise<string | null> {
  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for direct uploads.');
  }

  const result = await configuredStorage.client.send(new GetObjectCommand({
    Bucket: configuredStorage.bucket,
    Key: `uploads/${uploadId}`,
  }));
  if ((result.ContentLength ?? 0) > maxBytes) return null;
  if (!result.Body) throw new Error('The uploaded file returned an empty response.');
  return result.Body.transformToString('utf-8');
}

export async function deletePresignedUpload(uploadId: string): Promise<void> {
  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for direct uploads.');
  }

  await configuredStorage.client.send(new DeleteObjectCommand({
    Bucket: configuredStorage.bucket,
    Key: `uploads/${uploadId}`,
  }));
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  const remotePath = parseS3Path(storagePath);
  if (!remotePath) {
    await fs.rm(storagePath, { force: true });
    return;
  }

  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for this stored file.');
  }
  await configuredStorage.client.send(new DeleteObjectCommand({
    Bucket: remotePath.bucket,
    Key: remotePath.key,
  }));
}

export async function storedFileExists(storagePath: string): Promise<boolean> {
  const remotePath = parseS3Path(storagePath);
  if (!remotePath) {
    try {
      await fs.access(storagePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for this stored file.');
  }
  try {
    await configuredStorage.client.send(new HeadObjectCommand({
      Bucket: remotePath.bucket,
      Key: remotePath.key,
    }));
    return true;
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (statusCode === 404) return false;
    throw error;
  }
}

export async function sendStoredFile(storagePath: string, response: Response): Promise<void> {
  const remotePath = parseS3Path(storagePath);
  if (!remotePath) {
    await new Promise<void>((resolve, reject) => {
      response.sendFile(path.resolve(storagePath), error => error ? reject(error) : resolve());
    });
    return;
  }

  const configuredStorage = getStorage();
  if (!configuredStorage) {
    throw new Error('S3-compatible storage is not configured for this stored file.');
  }
  const result = await configuredStorage.client.send(new GetObjectCommand({
    Bucket: remotePath.bucket,
    Key: remotePath.key,
  }));
  const body = result.Body;
  if (!body) throw new Error('The stored file returned an empty response.');

  await new Promise<void>((resolve, reject) => {
    body.once('error', reject);
    response.once('error', reject);
    response.once('finish', resolve);
    body.pipe(response);
  });
}
