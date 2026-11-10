import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db, UPLOAD_DIR } from './server/db.js';
import { deleteStoredFile, sendStoredFile, storeUploadedFile, storedFileExists } from './server/storage.js';
import { validateGprecEmail } from './src/lib/auth-validation.js';
import { filterAndSearchResources } from './src/lib/search-indexer.js';
import { detectLanguageFromFilename } from './src/lib/code-highlighter-utils.js';

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Body parsing
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use((req, res, next) => {
  if (process.env.VERCEL === '1' && !db.hasPersistentStore()) {
    res.status(503).json({ error: 'DATABASE_URL must be configured for this Vercel deployment.' });
    return;
  }

  if (!db.hasPersistentStore()) {
    next();
    return;
  }

  void db.beginRequest().then(transaction => {
    if (!transaction) {
      next();
      return;
    }

    let finished = false;
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      if (finished) return res;
      finished = true;
      void transaction.commit().then(() => {
        sendJson(body);
      }).catch((error: unknown) => {
        console.error('Failed to persist Neon database transaction:', error);
        if (res.headersSent) {
          res.destroy(error instanceof Error ? error : new Error('Failed to persist database request.'));
          return;
        }
        res.status(503);
        sendJson({ error: 'The application database is temporarily unavailable.' });
      });
      return res;
    };

    res.once('close', () => {
      if (finished) return;
      finished = true;
      void transaction.rollback().catch((error: unknown) => {
        console.error('Failed to release Neon database transaction:', error);
      });
    });

    db.runWithRequestState(transaction.state, next);
  }).catch((error: unknown) => {
    console.error('Failed to initialize Neon database request:', error);
    res.status(503).json({ error: 'The application database is temporarily unavailable.' });
  });
});

// Multer storage for ANY uploaded file format
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  }
});

// Configure upload with configurable size limit (e.g. 50MB) and no restrictive file type whitelist
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

async function storeUploadedFiles(files: Express.Multer.File[]): Promise<{ file: Express.Multer.File; storagePath: string }[]> {
  const storedFiles: { file: Express.Multer.File; storagePath: string }[] = [];
  try {
    for (const file of files) {
      storedFiles.push({ file, storagePath: await storeUploadedFile(file) });
    }
    return storedFiles;
  } catch (error) {
    await Promise.all(files.map(file => fs.promises.rm(file.path, { force: true })));
    await Promise.all(storedFiles.map(async ({ storagePath }) => {
      try {
        await deleteStoredFile(storagePath);
      } catch (cleanupError) {
        console.error('Failed to clean up an incomplete file upload:', cleanupError);
      }
    }));
    throw error;
  }
}

// Auth Middleware helpers
interface AuthenticatedRequest extends Request {
  user?: ReturnType<typeof db.getSessionUser>;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication session required' });
    return;
  }
  const user = db.getSessionUser(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authMiddleware(req, res, () => {
    const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!req.user || req.user.role !== 'admin' || !ownerEmail || req.user.email.toLowerCase() !== ownerEmail) {
      res.status(403).json({ error: 'Forbidden: Only the configured faculty owner can administer this portal.' });
      return;
    }
    next();
  });
}

// ==========================================
// Authentication Routes
// ==========================================

function safeCredentialMatch(candidate: string, expected: string): boolean {
  const candidateHash = crypto.createHash('sha256').update(candidate).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(candidateHash, expectedHash);
}

function initializeSharedStudentCredentials(): boolean {
  if (db.hasSharedStudentCredentials()) return true;

  const userId = process.env.STUDENT_SHARED_USER_ID?.trim();
  const password = process.env.STUDENT_SHARED_PASSWORD;
  if (!userId || !password) return false;

  db.setSharedStudentCredentials(userId, password);
  return true;
}

app.post('/api/auth/student-login', (req, res) => {
  if (!initializeSharedStudentCredentials()) {
    res.status(503).json({ error: 'Shared student login is not configured. Set STUDENT_SHARED_USER_ID and STUDENT_SHARED_PASSWORD in .env.local.' });
    return;
  }

  const { userId, password } = req.body;
  if (typeof userId !== 'string' || typeof password !== 'string' || !userId || !password) {
    res.status(400).json({ error: 'Student user ID and password are required.' });
    return;
  }

  if (!db.verifySharedStudentCredentials(userId.trim(), password)) {
    res.status(401).json({ error: 'Invalid student user ID or password.' });
    return;
  }

  const now = new Date().toISOString();
  const sharedEmail = 'shared-student@gprec.ac.in';
  let user = db.findUserByEmail(sharedEmail);
  if (user && user.role !== 'student') {
    res.status(500).json({ error: 'Shared student account conflicts with an administrator account.' });
    return;
  }
  if (!user) {
    user = {
      id: 'student-shared',
      name: 'GPREC Student Account',
      email: sharedEmail,
      role: 'student',
      department: 'Shared Student Account',
      authProvider: 'shared-password',
      verified: true,
      registeredAt: now,
      lastLogin: now,
    };
    db.createUser(user);
  } else {
    user.lastLogin = now;
    db.save();
  }

  const token = db.createSession(user.id);
  db.addAuditLog(user.email, 'SHARED_STUDENT_LOGIN', 'user', user.id, 'Student signed in using the shared student account');
  res.json({ success: true, token, user });
});

// Administrator sign-in requires the configured email and password.
app.post('/api/auth/admin-login', (req, res) => {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    res.status(503).json({ error: 'Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local.' });
    return;
  }

  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    res.status(400).json({ error: 'Administrator email and password are required.' });
    return;
  }

  const emailValidation = validateGprecEmail(email);
  if (!emailValidation.isValid || !emailValidation.normalizedEmail) {
    res.status(401).json({ error: 'Invalid administrator email or password.' });
    return;
  }

  const emailMatches = safeCredentialMatch(emailValidation.normalizedEmail, expectedEmail);
  const passwordMatches = safeCredentialMatch(password, expectedPassword);
  if (!emailMatches || !passwordMatches) {
    res.status(401).json({ error: 'Invalid administrator email or password.' });
    return;
  }

  let user = db.findUserByEmail(expectedEmail);
  if (!user) {
    user = {
      id: 'admin-configured',
      name: 'Dr. A. Vishnu Vardhan Reddy',
      email: expectedEmail,
      role: 'admin',
      department: 'Associate Professor, CSM',
      verified: true,
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    db.createUser(user);
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'The configured administrator account is not authorized.' });
    return;
  }

  user.lastLogin = new Date().toISOString();
  db.save();
  const token = db.createSession(user.id);
  db.addAuditLog(user.email, 'ADMIN_LOGIN', 'user', user.id, 'Administrator logged in to dashboard');

  res.json({ success: true, token, user });
});

// Get Current User Profile
app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.json({ user: null });
    return;
  }
  const user = db.getSessionUser(token);
  res.json({ user: user || null });
});

// Logout
app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
  const token = getBearerToken(req);
  if (token) {
    db.removeSession(token);
  }
  res.json({ success: true });
});

// ==========================================
// Academic Structure Routes
// ==========================================

// Years
app.get('/api/academic/years', authMiddleware, (_req, res) => {
  res.json(db.getYears());
});

// Semesters
app.get('/api/academic/semesters', authMiddleware, (req, res) => {
  const { yearId } = req.query;
  let sems = db.getSemesters();
  if (yearId) {
    sems = sems.filter(s => s.yearId === yearId);
  }
  res.json(sems);
});

// Subjects
app.get('/api/academic/subjects', authMiddleware, (req, res) => {
  const { semesterId } = req.query;
  let subjects = db.getSubjects();
  if (semesterId) {
    subjects = subjects.filter(s => s.semesterId === semesterId);
  }
  res.json(subjects);
});

// Add Subject (Admin)
app.post('/api/academic/subjects', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { semesterId, name, code, category, description, credits } = req.body;
  if (!semesterId || !name || !code || !category) {
    res.status(400).json({ error: 'Semester, subject name, code and category (theory/lab) are required.' });
    return;
  }

  // Prevent duplicate subject code in the same semester
  const existing = db.getSubjects().find(s => s.semesterId === semesterId && s.code.toLowerCase() === code.trim().toLowerCase());
  if (existing) {
    res.status(400).json({ error: `A subject with code ${code} already exists in this semester.` });
    return;
  }

  const now = new Date().toISOString();
  const newSubject = db.addSubject({
    id: 'sub-' + crypto.randomUUID(),
    semesterId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    category: category === 'lab' ? 'lab' : 'theory',
    description: description?.trim() || '',
    credits: Number(credits) || 3,
    isPublished: true,
    createdAt: now,
    updatedAt: now
  }, req.user!.email);

  res.status(201).json(newSubject);
});

// Update Subject (Admin)
app.put('/api/academic/subjects/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updated = db.updateSubject(id, req.body, req.user!.email);
  if (!updated) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  res.json(updated);
});

// Delete Subject (Admin)
app.delete('/api/academic/subjects/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const success = db.deleteSubject(id, req.user!.email);
  if (!success) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  res.json({ success: true });
});

// Units
app.get('/api/academic/units', authMiddleware, (req, res) => {
  const { subjectId } = req.query;
  let units = db.getUnits();
  if (subjectId) {
    units = units.filter(u => u.subjectId === subjectId);
  }
  res.json(units);
});

// Add Unit (Admin)
app.post('/api/academic/units', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { subjectId, unitNumber, title, description, orderIndex } = req.body;
  if (!subjectId || !title) {
    res.status(400).json({ error: 'Subject ID and unit title are required.' });
    return;
  }

  const now = new Date().toISOString();
  const newUnit = db.addUnit({
    id: 'unit-' + crypto.randomUUID(),
    subjectId,
    unitNumber: Number(unitNumber) || 1,
    title: title.trim(),
    description: description?.trim() || '',
    orderIndex: Number(orderIndex) || Number(unitNumber) || 1,
    isPublished: true,
    createdAt: now,
    updatedAt: now
  }, req.user!.email);

  res.status(201).json(newUnit);
});

// Update Unit (Admin)
app.put('/api/academic/units/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updated = db.updateUnit(id, req.body, req.user!.email);
  if (!updated) {
    res.status(404).json({ error: 'Unit not found' });
    return;
  }
  res.json(updated);
});

// Delete Unit (Admin)
app.delete('/api/academic/units/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const success = db.deleteUnit(id, req.user!.email);
  if (!success) {
    res.status(404).json({ error: 'Unit not found' });
    return;
  }
  res.json({ success: true });
});

// ==========================================
// Resources & Notes Routes
// ==========================================

// Get Resources for a Unit
app.get('/api/resources', authMiddleware, (req, res) => {
  const { unitId } = req.query;
  let resources = db.getResources();
  if (unitId) {
    resources = resources.filter(r => r.unitId === unitId);
  }
  res.json(resources);
});

// Get Single Resource
app.get('/api/resources/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const resource = db.getResources().find(r => r.id === id);
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json(resource);
});

// Create Resource (Admin) - Write Notes or Code
app.post('/api/resources', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { unitId, title, description, type, content, codeLanguage, isPublished } = req.body;
  if (!unitId || !title) {
    res.status(400).json({ error: 'Unit ID and title are required.' });
    return;
  }

  const now = new Date().toISOString();
  const newResource = db.addResource({
    id: 'res-' + crypto.randomUUID(),
    unitId,
    title: title.trim(),
    description: description?.trim() || '',
    type: type || 'note',
    content: content || '',
    codeLanguage: codeLanguage || (type === 'code' ? 'java' : undefined),
    isPublished: isPublished !== false,
    authorEmail: req.user!.email,
    files: [],
    createdAt: now,
    updatedAt: now
  }, req.user!.email);

  res.status(201).json(newResource);
});

// Update Resource (Admin)
app.put('/api/resources/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updated = db.updateResource(id, req.body, req.user!.email);
  if (!updated) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json(updated);
});

// Delete Resource (Admin)
app.delete('/api/resources/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const success = db.deleteResource(id, req.user!.email);
  if (!success) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json({ success: true });
});

// Attach File to Existing Resource (Admin)
app.post('/api/resources/:id/files', requireAdmin, upload.array('files', 10), async (req: AuthenticatedRequest, res, next) => {
  const { id } = req.params;
  const resource = db.getResources().find(r => r.id === id);
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    res.status(400).json({ error: 'No files were uploaded' });
    return;
  }

  try {
    const storedFiles = await storeUploadedFiles(files);
    const addedFiles = storedFiles.map(({ file, storagePath }) => {
      const resourceFile = {
        id: 'file-' + crypto.randomUUID(),
        resourceId: id,
        originalName: file.originalname,
        fileName: file.filename,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        storagePath,
        uploaderEmail: req.user!.email,
        createdAt: new Date().toISOString()
      };
      return db.addResourceFile(resourceFile, req.user!.email);
    });

    res.json({ success: true, files: addedFiles });
  } catch (error) {
    next(error);
  }
});

// Quick Upload: Upload File and Create Resource automatically (Admin)
app.post('/api/resources/quick-upload', requireAdmin, upload.array('files', 10), async (req: AuthenticatedRequest, res, next) => {
  const { unitId, title, description, type } = req.body;
  if (!unitId || !title) {
    res.status(400).json({ error: 'Unit ID and title are required.' });
    return;
  }

  const files = (req.files as Express.Multer.File[]) || [];
  const now = new Date().toISOString();
  const resId = 'res-' + crypto.randomUUID();

  // If a single code file was uploaded, read text content if applicable
  let content = '';
  let codeLanguage: string | undefined;

  if (files.length === 1) {
    const single = files[0];
    const detectedLang = detectLanguageFromFilename(single.originalname);
    if (detectedLang !== 'plaintext') {
      codeLanguage = detectedLang;
      try {
        content = fs.readFileSync(single.path, 'utf-8');
      } catch (err) {
        content = '';
      }
    }
  }

  try {
    const storedFiles = await storeUploadedFiles(files);
    const resource = db.addResource({
      id: resId,
      unitId,
      title: title.trim(),
      description: description?.trim() || '',
      type: type || (codeLanguage ? 'code' : 'file'),
      content,
      codeLanguage,
      isPublished: true,
      authorEmail: req.user!.email,
      files: [],
      createdAt: now,
      updatedAt: now
    }, req.user!.email);
    const attached = storedFiles.map(({ file, storagePath }) => {
      const rf = {
        id: 'file-' + crypto.randomUUID(),
        resourceId: resId,
        originalName: file.originalname,
        fileName: file.filename,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        storagePath,
        uploaderEmail: req.user!.email,
        createdAt: now
      };
      return db.addResourceFile(rf, req.user!.email);
    });

    res.status(201).json({ ...resource, files: attached });
  } catch (error) {
    next(error);
  }
});

// Safe File Download Endpoint
app.get('/api/files/download/:id', authMiddleware, async (req, res, next) => {
  const { id } = req.params;
  const fileRecord = db.getResourceFiles().find(f => f.id === id);
  if (!fileRecord) {
    res.status(404).json({ error: 'File not found or removed from storage' });
    return;
  }

  try {
    if (!await storedFileExists(fileRecord.storagePath)) {
      res.status(404).json({ error: 'File not found or removed from storage' });
      return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    await sendStoredFile(fileRecord.storagePath, res);
  } catch (error) {
    next(error);
  }
});

// Safe Preview Endpoint
app.get('/api/files/preview/:id', authMiddleware, async (req, res, next) => {
  const { id } = req.params;
  const fileRecord = db.getResourceFiles().find(f => f.id === id);
  if (!fileRecord) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  try {
    if (!await storedFileExists(fileRecord.storagePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const ext = path.extname(fileRecord.originalName).toLowerCase();

    // Treat potentially dangerous active formats (like SVG, HTML) as downloads or plaintext
    if (['.html', '.htm', '.svg'].includes(ext)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      await sendStoredFile(fileRecord.storagePath, res);
      return;
    }

    // Safe images and PDFs
    if (['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
      await sendStoredFile(fileRecord.storagePath, res);
      return;
    }

    // Safe text and source code preview
    if (['.txt', '.java', '.py', '.c', '.cpp', '.js', '.ts', '.sql', '.json', '.xml', '.sh', '.md'].includes(ext)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      await sendStoredFile(fileRecord.storagePath, res);
      return;
    }

    // Unsupported preview format -> Fallback to attachment download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
    await sendStoredFile(fileRecord.storagePath, res);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Global Search Route
// ==========================================
app.get('/api/search', authMiddleware, (req, res) => {
  const { q, yearId, semesterId, subjectId, category, resourceType } = req.query;

  const results = filterAndSearchResources({
    query: q as string,
    yearId: yearId as string,
    semesterId: semesterId as string,
    subjectId: subjectId as string,
    category: category as 'theory' | 'lab',
    resourceType: resourceType as 'note' | 'code' | 'file'
  }, {
    years: db.getYears(),
    semesters: db.getSemesters(),
    subjects: db.getSubjects(),
    units: db.getUnits(),
    resources: db.getResources()
  });

  res.json({ query: q, total: results.length, results });
});

// ==========================================
// Admin Statistics & Role Management Routes
// ==========================================
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  res.json(db.getAdminStats());
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  res.json(db.getUsers().filter(user => user.email.toLowerCase() === ownerEmail || user.id === 'student-shared'));
});

app.get('/api/admin/student-login', requireAdmin, (_req, res) => {
  initializeSharedStudentCredentials();
  res.json({ userId: db.getSharedStudentUserId() });
});

app.put('/api/admin/student-login', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { userId, password } = req.body;
  if (typeof userId !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Student user ID and new password are required.' });
    return;
  }

  const normalizedUserId = userId.trim();
  if (normalizedUserId.length < 3 || normalizedUserId.length > 64) {
    res.status(400).json({ error: 'Student user ID must be between 3 and 64 characters.' });
    return;
  }
  if (password.length < 8 || password.length > 128) {
    res.status(400).json({ error: 'Student password must be between 8 and 128 characters.' });
    return;
  }

  db.setSharedStudentCredentials(normalizedUserId, password);
  db.addAuditLog(req.user!.email, 'UPDATE_SHARED_STUDENT_LOGIN', 'user', 'student-shared', 'Updated shared student login credentials');
  res.json({ success: true, userId: normalizedUserId });
});

app.get('/api/admin/audit-logs', requireAdmin, (_req, res) => {
  res.json(db.getAuditLogs());
});

app.post('/api/admin/reset-demo', requireAdmin, (_req, res) => {
  db.resetToDefault();
  res.json({ success: true, message: 'Reset to standard GPREC syllabus curriculum' });
});

// ==========================================
// Vite Dev Server / Static Production Setup
// ==========================================
async function startServer() {
  if (!isProd) {
    // In development, hook into Vite's dev server middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built dist directory
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GPREC Academic Hub running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
