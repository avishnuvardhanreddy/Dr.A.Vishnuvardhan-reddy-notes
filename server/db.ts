import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool } from '@neondatabase/serverless';
import {
  AcademicYear,
  Semester,
  Subject,
  Unit,
  Resource,
  ResourceFile,
  FacultyNotification,
  User,
  AuditLog,
  AdminStats
} from '../src/lib/types.js';

const DATA_DIR = process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'gprec-academic-hub')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'gprec_db.json');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface DatabaseSchema {
  users: User[];
  sessions: { token: string; userId: string; createdAt: string; expiresAt: string }[];
  sharedStudentCredentials?: { userId: string; salt: string; passwordHash: string };
  otpRequests: { email: string; otp: string; expiresAt: string; verified: boolean }[];
  years: AcademicYear[];
  semesters: Semester[];
  subjects: Subject[];
  units: Unit[];
  resources: Resource[];
  resourceFiles: ResourceFile[];
  notifications?: FacultyNotification[];
  auditLogs: AuditLog[];
}

export interface DatabaseRequestState {
  data: DatabaseSchema;
}

export interface DatabaseTransaction {
  state: DatabaseRequestState;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

function getInitialSeed(): DatabaseSchema {
  const years: AcademicYear[] = [
    { id: 'year-1', name: '1st Year (B.Tech)', order: 1 },
    { id: 'year-2', name: '2nd Year (B.Tech)', order: 2 },
    { id: 'year-3', name: '3rd Year (B.Tech)', order: 3 },
    { id: 'year-4', name: '4th Year (B.Tech)', order: 4 },
  ];

  const semesters: Semester[] = [
    { id: 'sem-1', yearId: 'year-1', number: 1, name: 'Semester 1' },
    { id: 'sem-2', yearId: 'year-1', number: 2, name: 'Semester 2' },
    { id: 'sem-3', yearId: 'year-2', number: 3, name: 'Semester 3' },
    { id: 'sem-4', yearId: 'year-2', number: 4, name: 'Semester 4' },
    { id: 'sem-5', yearId: 'year-3', number: 5, name: 'Semester 5' },
    { id: 'sem-6', yearId: 'year-3', number: 6, name: 'Semester 6' },
    { id: 'sem-7', yearId: 'year-4', number: 7, name: 'Semester 7' },
    { id: 'sem-8', yearId: 'year-4', number: 8, name: 'Semester 8' },
  ];

  const now = new Date().toISOString();

  // Clean production state - zero fake subjects, units, notes, or fake students
  const subjects: Subject[] = [];
  const units: Unit[] = [];
  const resources: Resource[] = [];
  const resourceFiles: ResourceFile[] = [];

  const vishnuAdmin: User = {
    id: 'admin-vishnu-csm',
    name: 'Dr. A. Vishnu Vardhan Reddy',
    email: 'vishnu.csm@gprec.ac.in',
    role: 'admin',
    department: 'Associate Professor, CSM',
    verified: true,
    registeredAt: now,
    lastLogin: now,
  };

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      userEmail: 'vishnu.csm@gprec.ac.in',
      action: 'SYSTEM_INITIALIZED',
      entityType: 'user',
      entityId: 'admin-vishnu-csm',
      details: 'GPREC Academic Hub initialized with clean curriculum repository. Ready for faculty course creation.',
      timestamp: now,
    }
  ];

  return {
    users: [vishnuAdmin],
    sessions: [],
    otpRequests: [],
    years,
    semesters,
    subjects,
    units,
    resources,
    resourceFiles,
    notifications: [],
    auditLogs
  };
}

function isDatabaseSchema(value: unknown): value is DatabaseSchema {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return [
    'users',
    'sessions',
    'otpRequests',
    'years',
    'semesters',
    'subjects',
    'units',
    'resources',
    'resourceFiles',
    'auditLogs',
  ].every(key => Array.isArray(data[key])) &&
    (data.notifications === undefined || Array.isArray(data.notifications));
}

class Database {
  private baseData: DatabaseSchema;
  private requestState = new AsyncLocalStorage<DatabaseRequestState>();
  private pool: Pool | null = null;
  private schemaReady: Promise<void> | null = null;

  private get data(): DatabaseSchema {
    return this.requestState.getStore()?.data ?? this.baseData;
  }

  private set data(data: DatabaseSchema) {
    const state = this.requestState.getStore();
    if (state) {
      state.data = data;
    } else {
      this.baseData = data;
    }
  }

  constructor() {
    this.baseData = this.load();
  }

  private getPool(): Pool | null {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) return null;
    if (!this.pool) {
      this.pool = new Pool({ connectionString, max: 1 });
    }
    return this.pool;
  }

  public hasPersistentStore(): boolean {
    return this.getPool() !== null;
  }

  private async ensurePersistentSchema(pool: Pool): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = pool.query(`
        CREATE TABLE IF NOT EXISTS gprec_academic_hub_state (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          data JSONB NOT NULL
        )
      `).then(() => undefined).catch((error: unknown) => {
        this.schemaReady = null;
        throw error;
      });
    }
    await this.schemaReady;
  }

  public async beginRequest(): Promise<DatabaseTransaction | null> {
    const pool = this.getPool();
    if (!pool) return null;

    await this.ensurePersistentSchema(pool);
    const client = await pool.connect();
    const state: DatabaseRequestState = { data: getInitialSeed() };

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO gprec_academic_hub_state (id, data)
         VALUES (1, $1::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(state.data)]
      );
      const result = await client.query(
        'SELECT data FROM gprec_academic_hub_state WHERE id = 1 FOR UPDATE'
      );
      const storedData: unknown = result.rows[0]?.data;
      if (!isDatabaseSchema(storedData)) {
        throw new Error('Neon database contains an invalid application state record.');
      }
      state.data = storedData;
      if (!Array.isArray(state.data.notifications)) state.data.notifications = [];

      let finished = false;
      return {
        state,
        commit: async () => {
          if (finished) return;
          finished = true;
          try {
            await client.query(
              'UPDATE gprec_academic_hub_state SET data = $1::jsonb WHERE id = 1',
              [JSON.stringify(state.data)]
            );
            await client.query('COMMIT');
          } catch (error) {
            try {
              await client.query('ROLLBACK');
            } catch (rollbackError) {
              console.error('Failed to roll back Neon database transaction:', rollbackError);
            }
            throw error;
          } finally {
            client.release();
          }
        },
        rollback: async () => {
          if (finished) return;
          finished = true;
          try {
            await client.query('ROLLBACK');
          } finally {
            client.release();
          }
        },
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back Neon database transaction:', rollbackError);
      }
      client.release();
      throw error;
    }
  }

  public runWithRequestState<T>(state: DatabaseRequestState, callback: () => T): T {
    return this.requestState.run(state, callback);
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        const hadNotifications = Array.isArray(parsed.notifications);
        if (!hadNotifications) parsed.notifications = [];
        // Ensure legacy fake items are filtered out if any linger
        parsed.subjects = (parsed.subjects || []).filter(s => !s.id.startsWith('subj-'));
        parsed.units = (parsed.units || []).filter(u => !u.id.startsWith('unit-'));
        parsed.resources = (parsed.resources || []).filter(r => !r.id.startsWith('res-'));
        parsed.users = (parsed.users || []).filter(u => u.id !== 'student-demo-1');

        // Ensure vishnu.csm@gprec.ac.in exists as admin
        const hasVishnu = parsed.users.find(u => u.email.toLowerCase() === 'vishnu.csm@gprec.ac.in');
        if (!hasVishnu) {
          parsed.users.unshift({
            id: 'admin-vishnu-csm',
            name: 'Dr. A. Vishnu Vardhan Reddy',
            email: 'vishnu.csm@gprec.ac.in',
            role: 'admin',
            department: 'Associate Professor, CSM',
            verified: true,
            registeredAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
          this.saveDirect(parsed);
        } else {
          let ownerProfileChanged = !hadNotifications;
          if (hasVishnu.name !== 'Dr. A. Vishnu Vardhan Reddy') {
            hasVishnu.name = 'Dr. A. Vishnu Vardhan Reddy';
            ownerProfileChanged = true;
          }
          if (hasVishnu.department !== 'Associate Professor, CSM') {
            hasVishnu.department = 'Associate Professor, CSM';
            ownerProfileChanged = true;
          }
          if (hasVishnu.role !== 'admin') {
            hasVishnu.role = 'admin';
            ownerProfileChanged = true;
          }
          if (ownerProfileChanged) this.saveDirect(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load database from file, re-initializing seed:', err);
    }
    const initial = getInitialSeed();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema): void {
    if (this.requestState.getStore()) return;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public save(): void {
    this.saveDirect(this.data);
  }

  public resetToDefault(): void {
    const sharedStudentCredentials = this.data.sharedStudentCredentials;
    const notifications = this.data.notifications ?? [];
    this.data = getInitialSeed();
    this.data.sharedStudentCredentials = sharedStudentCredentials;
    this.data.notifications = notifications;
    this.save();
  }

  // Getters
  public getUsers(): User[] { return this.data.users; }
  public getSessions() { return this.data.sessions; }
  public getOtpRequests() { return this.data.otpRequests; }
  public getYears(): AcademicYear[] { return this.data.years.sort((a, b) => a.order - b.order); }
  public getSemesters(): Semester[] { return this.data.semesters.sort((a, b) => a.number - b.number); }
  public getSubjects(): Subject[] { return this.data.subjects; }
  public getUnits(): Unit[] { return this.data.units.sort((a, b) => a.orderIndex - b.orderIndex); }
  public getResources(): Resource[] { return this.data.resources; }
  public getResourceFiles(): ResourceFile[] { return this.data.resourceFiles; }
  public getNotifications(): FacultyNotification[] {
    return (this.data.notifications ?? []).slice().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  public getAuditLogs(): AuditLog[] { return this.data.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); }

  // User & Auth Management
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getSharedStudentUserId(): string | null {
    return this.data.sharedStudentCredentials?.userId ?? null;
  }

  public hasSharedStudentCredentials(): boolean {
    return Boolean(this.data.sharedStudentCredentials);
  }

  public setSharedStudentCredentials(userId: string, password: string): void {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
    this.data.sharedStudentCredentials = { userId, salt, passwordHash };
    this.data.sessions = this.data.sessions.filter(session => session.userId !== 'student-shared');
    this.save();
  }

  public verifySharedStudentCredentials(userId: string, password: string): boolean {
    const credentials = this.data.sharedStudentCredentials;
    if (!credentials) return false;

    const userIdHash = crypto.createHash('sha256').update(userId).digest();
    const expectedUserIdHash = crypto.createHash('sha256').update(credentials.userId).digest();
    const passwordHash = crypto.scryptSync(password, credentials.salt, 64);
    const expectedPasswordHash = Buffer.from(credentials.passwordHash, 'hex');
    const userIdMatches = crypto.timingSafeEqual(userIdHash, expectedUserIdHash);
    const passwordMatches = expectedPasswordHash.length === passwordHash.length &&
      crypto.timingSafeEqual(passwordHash, expectedPasswordHash);
    return userIdMatches && passwordMatches;
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUserRole(userId: string, newRole: 'student' | 'admin', adminEmail: string): User | null {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.role = newRole;
    this.addAuditLog(adminEmail, 'UPDATE_ROLE', 'user', userId, `Changed role of ${user.email} to ${newRole}`);
    this.save();
    return user;
  }

  public createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    this.data.sessions.push({
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt
    });
    this.save();
    return token;
  }

  public getSessionUser(token: string): User | null {
    if (!token) return null;
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }
    const user = this.data.users.find(u => u.id === session.userId);
    return user || null;
  }

  public removeSession(token: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.save();
  }

  // OTP Handling
  public storeOtp(email: string, otp: string): void {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    this.data.otpRequests = this.data.otpRequests.filter(o => o.email.toLowerCase() !== email.toLowerCase());
    this.data.otpRequests.push({ email: email.toLowerCase(), otp, expiresAt, verified: false });
    this.save();
  }

  public verifyOtp(email: string, otp: string): boolean {
    const req = this.data.otpRequests.find(o => o.email.toLowerCase() === email.toLowerCase() && o.otp === otp);
    if (!req) return false;
    if (new Date(req.expiresAt) < new Date()) return false;
    req.verified = true;
    this.save();
    return true;
  }

  // Structure Management
  public addSubject(subject: Subject, adminEmail: string): Subject {
    this.data.subjects.push(subject);
    this.addAuditLog(adminEmail, 'CREATE_SUBJECT', 'subject', subject.id, `Created subject: ${subject.name} (${subject.code})`);
    this.save();
    return subject;
  }

  public updateSubject(id: string, updates: Partial<Subject>, adminEmail: string): Subject | null {
    const sub = this.data.subjects.find(s => s.id === id);
    if (!sub) return null;
    Object.assign(sub, updates, { updatedAt: new Date().toISOString() });
    this.addAuditLog(adminEmail, 'UPDATE_SUBJECT', 'subject', id, `Updated subject: ${sub.name}`);
    this.save();
    return sub;
  }

  public deleteSubject(id: string, adminEmail: string): boolean {
    const idx = this.data.subjects.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const [deleted] = this.data.subjects.splice(idx, 1);
    // Delete cascading units and resources
    const unitIds = this.data.units.filter(u => u.subjectId === id).map(u => u.id);
    this.data.units = this.data.units.filter(u => u.subjectId !== id);
    this.data.resources = this.data.resources.filter(r => !unitIds.includes(r.unitId));
    this.addAuditLog(adminEmail, 'DELETE_SUBJECT', 'subject', id, `Deleted subject: ${deleted.name}`);
    this.save();
    return true;
  }

  public addUnit(unit: Unit, adminEmail: string): Unit {
    this.data.units.push(unit);
    this.addAuditLog(adminEmail, 'CREATE_UNIT', 'unit', unit.id, `Created unit: ${unit.title}`);
    this.save();
    return unit;
  }

  public updateUnit(id: string, updates: Partial<Unit>, adminEmail: string): Unit | null {
    const unit = this.data.units.find(u => u.id === id);
    if (!unit) return null;
    Object.assign(unit, updates, { updatedAt: new Date().toISOString() });
    this.addAuditLog(adminEmail, 'UPDATE_UNIT', 'unit', id, `Updated unit: ${unit.title}`);
    this.save();
    return unit;
  }

  public deleteUnit(id: string, adminEmail: string): boolean {
    const idx = this.data.units.findIndex(u => u.id === id);
    if (idx === -1) return false;
    const [deleted] = this.data.units.splice(idx, 1);
    this.data.resources = this.data.resources.filter(r => r.unitId !== id);
    this.addAuditLog(adminEmail, 'DELETE_UNIT', 'unit', id, `Deleted unit: ${deleted.title}`);
    this.save();
    return true;
  }

  // Resources
  public addResource(resource: Resource, adminEmail: string): Resource {
    this.data.resources.push(resource);
    this.addAuditLog(adminEmail, 'CREATE_RESOURCE', 'resource', resource.id, `Created resource: ${resource.title}`);
    this.save();
    return resource;
  }

  public updateResource(id: string, updates: Partial<Resource>, adminEmail: string): Resource | null {
    const res = this.data.resources.find(r => r.id === id);
    if (!res) return null;
    Object.assign(res, updates, { updatedAt: new Date().toISOString() });
    this.addAuditLog(adminEmail, 'UPDATE_RESOURCE', 'resource', id, `Updated resource: ${res.title}`);
    this.save();
    return res;
  }

  public deleteResource(id: string, adminEmail: string): boolean {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx === -1) return false;
    const [deleted] = this.data.resources.splice(idx, 1);
    this.data.resourceFiles = this.data.resourceFiles.filter(file => file.resourceId !== id);
    this.addAuditLog(adminEmail, 'DELETE_RESOURCE', 'resource', id, `Deleted resource: ${deleted.title}`);
    this.save();
    return true;
  }

  public addResourceFile(file: ResourceFile, adminEmail: string): ResourceFile {
    this.data.resourceFiles.push(file);
    const parentResource = this.data.resources.find(r => r.id === file.resourceId);
    if (parentResource) {
      if (!parentResource.files) parentResource.files = [];
      parentResource.files.push(file);
    }
    this.addAuditLog(adminEmail, 'UPLOAD_FILE', 'file', file.id, `Uploaded file: ${file.originalName}`);
    this.save();
    return file;
  }

  public addNotification(notification: FacultyNotification, adminEmail: string): FacultyNotification {
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.push(notification);
    this.addAuditLog(adminEmail, 'CREATE_NOTIFICATION', 'notification', notification.id, `Created notification: ${notification.title}`);
    this.save();
    return notification;
  }

  public updateNotification(id: string, title: string, message: string, adminEmail: string): FacultyNotification | null {
    const notification = (this.data.notifications ?? []).find(item => item.id === id);
    if (!notification) return null;
    notification.title = title;
    notification.message = message;
    notification.updatedAt = new Date().toISOString();
    this.addAuditLog(adminEmail, 'UPDATE_NOTIFICATION', 'notification', id, `Updated notification: ${notification.title}`);
    this.save();
    return notification;
  }

  public deleteNotification(id: string, adminEmail: string): boolean {
    const notifications = this.data.notifications ?? [];
    const index = notifications.findIndex(item => item.id === id);
    if (index === -1) return false;
    const [deleted] = notifications.splice(index, 1);
    this.data.notifications = notifications;
    this.addAuditLog(adminEmail, 'DELETE_NOTIFICATION', 'notification', id, `Deleted notification: ${deleted.title}`);
    this.save();
    return true;
  }

  public addAuditLog(
    userEmail: string,
    action: string,
    entityType: 'subject' | 'unit' | 'resource' | 'notification' | 'user' | 'file',
    entityId: string,
    details: string
  ): void {
    this.data.auditLogs.push({
      id: 'log-' + crypto.randomUUID(),
      userEmail,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  public getAdminStats(): AdminStats {
    const totalStudents = this.data.users.filter(u => u.role === 'student').length;
    const totalYears = this.data.years.length;
    const totalSubjects = this.data.subjects.length;
    const totalUnits = this.data.units.length;
    const totalResources = this.data.resources.length;
    const totalFiles = this.data.resourceFiles.length;
    const recentAuditLogs = this.data.auditLogs
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalStudents,
      totalYears,
      totalSubjects,
      totalUnits,
      totalResources,
      totalFiles,
      recentAuditLogs
    };
  }
}

export const db = new Database();
