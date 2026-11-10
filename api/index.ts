import type { Request, Response } from 'express';
import app from '../server.js';

export default function handler(req: Request, res: Response): void {
  const requestUrl = new URL(req.url ?? '/', 'https://vercel.invalid');
  const apiPath = requestUrl.searchParams.get('__api_path');

  if (apiPath) {
    requestUrl.searchParams.delete('__api_path');
    req.url = `/api/${apiPath}${requestUrl.search}`;
  }

  app(req, res);
}
