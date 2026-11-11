export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  rollNumber?: string;
  department?: string;
  avatar?: string;
  authProvider?: string;
  verified: boolean;
  registeredAt: string;
  lastLogin: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  order: number;
}

export interface Semester {
  id: string;
  yearId: string;
  number: number;
  name: string;
}

export type SubjectCategory = 'theory' | 'lab';

export interface Subject {
  id: string;
  semesterId: string;
  name: string;
  code: string;
  category: SubjectCategory;
  description: string;
  credits: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  unitNumber: number;
  title: string;
  description: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 'note' | 'code' | 'file';

export interface ResourceFile {
  id: string;
  resourceId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploaderEmail: string;
  createdAt: string;
}

export interface Resource {
  id: string;
  unitId: string;
  title: string;
  description: string;
  type: ResourceType;
  content: string; // HTML rich text or source code or text
  codeLanguage?: string; // e.g. java, python, c, cpp, sql, javascript, html, xml, etc.
  isPublished: boolean;
  authorEmail: string;
  files: ResourceFile[];
  createdAt: string;
  updatedAt: string;
}

export interface FacultyNotification {
  id: string;
  title: string;
  message: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  entityType: 'subject' | 'unit' | 'resource' | 'notification' | 'user' | 'file';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface AdminStats {
  totalStudents: number;
  totalYears: number;
  totalSubjects: number;
  totalUnits: number;
  totalResources: number;
  totalFiles: number;
  recentAuditLogs: AuditLog[];
}
