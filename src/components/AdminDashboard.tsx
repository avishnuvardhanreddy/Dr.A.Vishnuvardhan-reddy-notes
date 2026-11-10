import React, { useState, useEffect } from 'react';
import {
  AcademicYear,
  Semester,
  Subject,
  Unit,
  Resource,
  AdminStats,
  User,
  SubjectCategory,
  ResourceType
} from '../lib/types.js';
import { FileUploadZone } from './FileUploadZone.js';
import { SUPPORTED_LANGUAGES, formatFileSize } from '../lib/code-highlighter-utils.js';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  FileEdit,
  UploadCloud,
  Users,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Eye,
  FileCode,
  FileText,
  Download,
  KeyRound,
  Bold,
  Italic,
  List,
  Heading,
  Code2,
  Table,
  Link2
} from 'lucide-react';

interface AdminDashboardProps {
  years: AcademicYear[];
  semesters: Semester[];
  subjects: Subject[];
  onRefreshData: () => void;
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  years,
  semesters,
  subjects,
  onRefreshData,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'structure' | 'units' | 'notes-write' | 'file-upload' | 'resources-list' | 'users'
  >('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [sharedStudentUserId, setSharedStudentUserId] = useState('');
  const [newSharedStudentUserId, setNewSharedStudentUserId] = useState('');
  const [newSharedStudentPassword, setNewSharedStudentPassword] = useState('');
  const [confirmSharedStudentPassword, setConfirmSharedStudentPassword] = useState('');
  const [isUpdatingStudentLogin, setIsUpdatingStudentLogin] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Subject Form Modal / State
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState<{
    id?: string;
    semesterId: string;
    name: string;
    code: string;
    category: SubjectCategory;
    description: string;
    credits: number;
    isPublished: boolean;
  }>({
    semesterId: semesters[0]?.id || '',
    name: '',
    code: '',
    category: 'theory',
    description: '',
    credits: 3,
    isPublished: true
  });

  // Unit Form State
  const [selectedSubjectForUnits, setSelectedSubjectForUnits] = useState<string>(subjects[0]?.id || '');
  const [currentSubjectUnits, setCurrentSubjectUnits] = useState<Unit[]>([]);
  const [unitFormData, setUnitFormData] = useState<{
    id?: string;
    unitNumber: number;
    title: string;
    description: string;
    orderIndex: number;
    isPublished: boolean;
  }>({
    unitNumber: 1,
    title: '',
    description: '',
    orderIndex: 1,
    isPublished: true
  });

  // Notes Write Form State (Method 1)
  const [noteTargetUnitId, setNoteTargetUnitId] = useState<string>('');
  const [noteType, setNoteType] = useState<ResourceType>('note');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCodeLang, setNoteCodeLang] = useState('java');
  const [noteIsPublished, setNoteIsPublished] = useState(true);

  // File Upload Form State (Method 2)
  const [uploadTargetUnitId, setUploadTargetUnitId] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'subject' | 'unit' | 'resource';
    id: string;
    name: string;
  } | null>(null);

  // Load stats and users
  const loadAdminData = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('gprec_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, studentLoginRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/student-login', { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }
      if (studentLoginRes.ok) {
        const studentLoginData = await studentLoginRes.json();
        setSharedStudentUserId(studentLoginData.userId || '');
        setNewSharedStudentUserId(studentLoginData.userId || '');
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Fetch Units when Subject for Unit management changes
  useEffect(() => {
    if (!selectedSubjectForUnits) return;
    const fetchUnits = async () => {
      try {
        const token = localStorage.getItem('gprec_token');
        const res = await fetch(`/api/academic/units?subjectId=${selectedSubjectForUnits}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentSubjectUnits(data);
          if (data.length > 0 && !noteTargetUnitId) {
            setNoteTargetUnitId(data[0].id);
            setUploadTargetUnitId(data[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUnits();
  }, [selectedSubjectForUnits]);

  // Flash message helper
  const showToast = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleUpdateStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSharedStudentPassword !== confirmSharedStudentPassword) {
      showToast('The new passwords do not match.', true);
      return;
    }
    if (newSharedStudentPassword.length < 8) {
      showToast('The new password must be at least 8 characters.', true);
      return;
    }

    setIsUpdatingStudentLogin(true);
    try {
      const token = localStorage.getItem('gprec_token');
      const response = await fetch('/api/admin/student-login', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: newSharedStudentUserId,
          password: newSharedStudentPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update student login.');

      setSharedStudentUserId(data.userId);
      setNewSharedStudentUserId(data.userId);
      setNewSharedStudentPassword('');
      setConfirmSharedStudentPassword('');
      showToast('Shared student login updated. Students will need to sign in again.');
    } catch (err: any) {
      showToast(err.message || 'Could not update student login.', true);
    } finally {
      setIsUpdatingStudentLogin(false);
    }
  };

  // ----------------------------------------
  // Subject CRUD Handlers
  // ----------------------------------------
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('gprec_token');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    try {
      if (subjectFormData.id) {
        // Edit
        const res = await fetch(`/api/academic/subjects/${subjectFormData.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(subjectFormData)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update subject');
        showToast('Subject updated successfully');
      } else {
        // Create
        const res = await fetch('/api/academic/subjects', {
          method: 'POST',
          headers,
          body: JSON.stringify(subjectFormData)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create subject');
        showToast('Subject created successfully');
      }

      setIsEditingSubject(false);
      setSubjectFormData({
        semesterId: semesters[0]?.id || '',
        name: '',
        code: '',
        category: 'theory',
        description: '',
        credits: 3,
        isPublished: true
      });
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // ----------------------------------------
  // Unit CRUD Handlers
  // ----------------------------------------
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectForUnits) {
      showToast('Please select a subject first', true);
      return;
    }

    const token = localStorage.getItem('gprec_token');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    try {
      if (unitFormData.id) {
        const res = await fetch(`/api/academic/units/${unitFormData.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(unitFormData)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update unit');
        showToast('Unit updated successfully');
      } else {
        const res = await fetch('/api/academic/units', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...unitFormData,
            subjectId: selectedSubjectForUnits
          })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create unit');
        showToast('Unit created successfully');
      }

      setUnitFormData({
        unitNumber: currentSubjectUnits.length + 1,
        title: '',
        description: '',
        orderIndex: currentSubjectUnits.length + 1,
        isPublished: true
      });

      // Refresh units
      const token = localStorage.getItem('gprec_token');
      const unitsRes = await fetch(`/api/academic/units?subjectId=${selectedSubjectForUnits}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (unitsRes.ok) setCurrentSubjectUnits(await unitsRes.json());
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // ----------------------------------------
  // Notes / Code Resource Create (Method 1)
  // ----------------------------------------
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTargetUnitId || !noteTitle) {
      showToast('Unit and Title are required', true);
      return;
    }

    const token = localStorage.getItem('gprec_token');
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          unitId: noteTargetUnitId,
          title: noteTitle,
          description: noteDescription,
          type: noteType,
          content: noteContent,
          codeLanguage: noteType === 'code' ? noteCodeLang : undefined,
          isPublished: noteIsPublished
        })
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to publish resource');
      showToast('Learning resource published to students');
      setNoteTitle('');
      setNoteDescription('');
      setNoteContent('');
      loadAdminData();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // ----------------------------------------
  // Universal File Upload (Method 2)
  // ----------------------------------------
  const handleUploadFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTargetUnitId || !uploadTitle || selectedFiles.length === 0) {
      showToast('Please select a unit, specify title, and add at least one file', true);
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('gprec_token');

    try {
      const formData = new FormData();
      formData.append('unitId', uploadTargetUnitId);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      selectedFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/resources/quick-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to upload files');
      showToast(`Successfully uploaded ${selectedFiles.length} file(s)`);
      setUploadTitle('');
      setUploadDescription('');
      setSelectedFiles([]);
      loadAdminData();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setIsUploading(false);
    }
  };

  // ----------------------------------------
  // Delete Destructive Handler
  // ----------------------------------------
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const token = localStorage.getItem('gprec_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      let endpoint = '';
      if (deleteConfirm.type === 'subject') endpoint = `/api/academic/subjects/${deleteConfirm.id}`;
      else if (deleteConfirm.type === 'unit') endpoint = `/api/academic/units/${deleteConfirm.id}`;
      else if (deleteConfirm.type === 'resource') endpoint = `/api/resources/${deleteConfirm.id}`;

      const res = await fetch(endpoint, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete operation failed');

      showToast(`Deleted ${deleteConfirm.name}`);
      setDeleteConfirm(null);

      // Refresh list
      if (deleteConfirm.type === 'unit') {
        const unitsRes = await fetch(`/api/academic/units?subjectId=${selectedSubjectForUnits}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (unitsRes.ok) setCurrentSubjectUnits(await unitsRes.json());
      }
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Reset demo curriculum
  const handleResetCurriculum = async () => {
    const token = localStorage.getItem('gprec_token');
    try {
      const res = await fetch('/api/admin/reset-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Restored standard GPREC autonomous syllabus curriculum');
        onRefreshData();
        loadAdminData();
      }
    } catch (e) {
      showToast('Failed to reset', true);
    }
  };

  // Helper for quick rich text toolbar inserts
  const insertRichTag = (tagStart: string, tagEnd = '') => {
    setNoteContent(prev => prev + `${tagStart}Text${tagEnd}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
            statusMessage.isError
              ? 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider border border-amber-500/30">
              Faculty Owner
            </span>
            <span className="text-xs text-slate-400">
              Logged in as {currentUser.email}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            CSM Notes & Course Resource Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dr. A. Vishnu Vardhan Reddy · Associate Professor, CSM
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetCurriculum}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Reload standard sample curriculum"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Standard Curriculum</span>
          </button>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('structure')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'structure'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects & Semesters</span>
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'units'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Unit Management</span>
        </button>

        <button
          onClick={() => setActiveTab('notes-write')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'notes-write'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>Write Notes / Code</span>
        </button>

        <button
          onClick={() => setActiveTab('file-upload')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'file-upload'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Files</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>RBAC & Students</span>
        </button>

      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Registered Students</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {stats?.totalStudents ?? 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Academic Years</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {stats?.totalYears ?? 4}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Active Subjects</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {stats?.totalSubjects ?? subjects.length}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Curriculum Units</span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {stats?.totalUnits ?? 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Learning Resources</span>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {stats?.totalResources ?? 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Uploaded Files</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats?.totalFiles ?? 0}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Quick Administrative Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  setIsEditingSubject(true);
                  setActiveTab('structure');
                }}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all group"
              >
                <Plus className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Add New Subject</h4>
                <p className="text-xs text-slate-500 mt-1">Create Theory or Lab course for any semester</p>
              </button>

              <button
                onClick={() => setActiveTab('units')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all group"
              >
                <FolderTree className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Add Syllabus Unit</h4>
                <p className="text-xs text-slate-500 mt-1">Add Unit 1-5 or Lab experiments</p>
              </button>

              <button
                onClick={() => setActiveTab('notes-write')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-700 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all group"
              >
                <FileEdit className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Write Rich Notes</h4>
                <p className="text-xs text-slate-500 mt-1">Author lecture notes or source code</p>
              </button>

              <button
                onClick={() => setActiveTab('file-upload')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-700 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all group"
              >
                <UploadCloud className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Upload Files</h4>
                <p className="text-xs text-slate-500 mt-1">Attach PDFs, ZIPs, DOCX, Code files</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS & STRUCTURE MANAGEMENT */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Academic Curriculum Subjects ({subjects.length})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage subject codes, Theory vs Lab classification, credits, and semester distribution.
              </p>
            </div>
            <button
              onClick={() => {
                setSubjectFormData({
                  semesterId: semesters[0]?.id || '',
                  name: '',
                  code: '',
                  category: 'theory',
                  description: '',
                  credits: 3,
                  isPublished: true
                });
                setIsEditingSubject(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Subject</span>
            </button>
          </div>

          {/* Subject Add/Edit Modal/Form */}
          {isEditingSubject && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 shadow-md">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
                {subjectFormData.id ? 'Edit Subject' : 'Add New Curriculum Subject'}
              </h3>
              <form onSubmit={handleSaveSubject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Semester
                    </label>
                    <select
                      value={subjectFormData.semesterId}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, semesterId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    >
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({years.find(y => y.id === s.yearId)?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subject Code (Unique in Semester)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 20CS301"
                      value={subjectFormData.code}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subject Category
                    </label>
                    <select
                      value={subjectFormData.category}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                    >
                      <option value="theory">Theory Subject</option>
                      <option value="lab">Laboratory Subject</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subject Title / Course Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Operating Systems"
                      value={subjectFormData.name}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Credits
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={subjectFormData.credits}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, credits: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Description & Scope
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the course contents and prerequisites..."
                    value={subjectFormData.description}
                    onChange={(e) => setSubjectFormData({ ...subjectFormData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={subjectFormData.isPublished}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Publish Subject to Student Portal</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingSubject(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Save Subject
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Subjects Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Code</th>
                    <th className="p-4">Subject Name</th>
                    <th className="p-4">Semester</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Credits</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {subjects.map((sub) => {
                    const sem = semesters.find(s => s.id === sub.semesterId);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-4 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                          {sub.code}
                        </td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">
                          {sub.name}
                        </td>
                        <td className="p-4 text-xs text-slate-500">
                          {sem?.name || 'N/A'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                              sub.category === 'lab'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                            }`}
                          >
                            {sub.category === 'lab' ? 'Laboratory' : 'Theory'}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {sub.credits}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.isPublished
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {sub.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSubjectFormData({
                                id: sub.id,
                                semesterId: sub.semesterId,
                                name: sub.name,
                                code: sub.code,
                                category: sub.category,
                                description: sub.description,
                                credits: sub.credits,
                                isPublished: sub.isPublished
                              });
                              setIsEditingSubject(true);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Subject"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm({
                                type: 'subject',
                                id: sub.id,
                                name: `${sub.code} - ${sub.name}`
                              });
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNIT MANAGEMENT */}
      {activeTab === 'units' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Select Subject to Manage Units:
              </label>
              <select
                value={selectedSubjectForUnits}
                onChange={(e) => setSelectedSubjectForUnits(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.category.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-500">
              For theory subjects, specify Unit 1 to Unit 5. For lab subjects, specify Experiment batches.
            </p>
          </div>

          {/* Add / Edit Unit Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              {unitFormData.id ? 'Edit Unit' : 'Create New Unit for Selected Subject'}
            </h3>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit / Experiment Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={unitFormData.unitNumber}
                    onChange={(e) => setUnitFormData({ ...unitFormData, unitNumber: Number(e.target.value), orderIndex: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Unit 1 – Introduction to OOP & JVM Architecture"
                    value={unitFormData.title}
                    onChange={(e) => setUnitFormData({ ...unitFormData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Description & Topics Covered
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of topics, syllabus outcomes, and key focus areas..."
                  value={unitFormData.description}
                  onChange={(e) => setUnitFormData({ ...unitFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={unitFormData.isPublished}
                    onChange={(e) => setUnitFormData({ ...unitFormData, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Published for Students</span>
                </label>

                <div className="flex items-center gap-2">
                  {unitFormData.id && (
                    <button
                      type="button"
                      onClick={() => setUnitFormData({
                        unitNumber: currentSubjectUnits.length + 1,
                        title: '',
                        description: '',
                        orderIndex: currentSubjectUnits.length + 1,
                        isPublished: true
                      })}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {unitFormData.id ? 'Update Unit' : 'Add Unit'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Current Units List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Existing Units for {subjects.find(s => s.id === selectedSubjectForUnits)?.name} ({currentSubjectUnits.length})
            </h4>

            {currentSubjectUnits.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <p className="text-sm text-slate-500">No units defined yet for this subject.</p>
              </div>
            ) : (
              currentSubjectUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        Unit {unit.unitNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        unit.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {unit.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {unit.title}
                    </h5>
                    {unit.description && (
                      <p className="text-xs text-slate-500 mt-1">
                        {unit.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setUnitFormData({
                        id: unit.id,
                        unitNumber: unit.unitNumber,
                        title: unit.title,
                        description: unit.description,
                        orderIndex: unit.orderIndex,
                        isPublished: unit.isPublished
                      })}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({
                        type: 'unit',
                        id: unit.id,
                        name: unit.title
                      })}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: METHOD 1 - WRITE NOTES / CODE */}
      {activeTab === 'notes-write' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Method 1: Author Academic Notes or Laboratory Code
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Create structured rich-text notes with headings, tables, formulas, and code blocks, or publish clean lab programs.
            </p>

            <form onSubmit={handleCreateResource} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubjectForUnits}
                    onChange={(e) => setSelectedSubjectForUnits(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Unit
                  </label>
                  <select
                    value={noteTargetUnitId}
                    onChange={(e) => setNoteTargetUnitId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    {currentSubjectUnits.length === 0 ? (
                      <option value="">No units created yet for this subject</option>
                    ) : (
                      currentSubjectUnits.map(u => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unitNumber}: {u.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Content Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteType('note')}
                      className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        noteType === 'note'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Theory Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteType('code')}
                      className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        noteType === 'code'
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Lab Code
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resource Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Multithreading and Synchronization Mechanism in Java"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>

                {noteType === 'code' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Programming Language
                    </label>
                    <select
                      value={noteCodeLang}
                      onChange={(e) => setNoteCodeLang(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-semibold"
                    >
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.id} value={lang.id}>
                          {lang.label} ({lang.extension})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Publication Status
                    </label>
                    <select
                      value={noteIsPublished ? 'published' : 'draft'}
                      onChange={(e) => setNoteIsPublished(e.target.value === 'published')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                    >
                      <option value="published">Published for Students</option>
                      <option value="draft">Save as Draft</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Abstract / Summary
                </label>
                <input
                  type="text"
                  placeholder="Key concepts, syllabus points or lab experiment objective..."
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              {/* Rich text formatting tools for Theory notes */}
              {noteType === 'note' && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-semibold text-slate-500 mr-2 text-[11px]">Format:</span>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<h2>', '</h2>')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Heading 2"
                  >
                    <Heading className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<strong>', '</strong>')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<em>', '</em>')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Bulleted List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<blockquote>', '</blockquote>')}
                    className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                  >
                    Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<code>', '</code>')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Inline Code"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRichTag('<table>\n  <tr><th>Col 1</th><th>Col 2</th></tr>\n  <tr><td>Data 1</td><td>Data 2</td></tr>\n</table>')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Insert Table"
                  >
                    <Table className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {noteType === 'code' ? 'Source Code Body (Preserves Indentation)' : 'Rich Text Content / HTML'}
                </label>
                <textarea
                  rows={14}
                  required
                  placeholder={
                    noteType === 'code'
                      ? 'public class BinaryTree {\n    // Paste Java/Python/C/C++ lab program code here\n}'
                      : '<h2>1. Core Concepts</h2>\n<p>Explain the chapter theories, definitions, and derivations here...</p>'
                  }
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className={`w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm ${
                    noteType === 'code' ? 'font-mono text-xs leading-relaxed' : 'prose-notes'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  Publish Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: METHOD 2 - UNIVERSAL FILE UPLOAD */}
      {activeTab === 'file-upload' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Method 2: Upload Academic Documents & Code Archives
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Supports <strong>ANY file extension</strong>: PDF, Word, PowerPoint, Text, Java, Python, C/C++, Jupyter Notebooks (.ipynb), SQL scripts, ZIP archives, CSV, and custom files.
            </p>

            <form onSubmit={handleUploadFiles} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubjectForUnits}
                    onChange={(e) => setSelectedSubjectForUnits(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Unit / Experiment
                  </label>
                  <select
                    value={uploadTargetUnitId}
                    onChange={(e) => setUploadTargetUnitId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    {currentSubjectUnits.map(u => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unitNumber}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resource Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unit 2 Complete Lecture Presentation & Lab Manual"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Instructions for Students
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for executing programs, recommended compiler versions, etc."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              {/* Drag and Drop Upload Zone */}
              <FileUploadZone
                onFilesSelected={(newFiles) => {
                  setSelectedFiles(prev => [...prev, ...newFiles]);
                }}
                uploadedFiles={selectedFiles}
                onRemoveFile={(idx) => {
                  setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                }}
              />

              <div className="flex items-center justify-end pt-4">
                <button
                  type="submit"
                  disabled={isUploading || selectedFiles.length === 0}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading & Processing...' : `Upload ${selectedFiles.length} File(s)`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: Portal Accounts */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Shared Student Login
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Change the shared ID and password used by Dr. A. Vishnu Vardhan Reddy's CSM students. The current password is never displayed.
            </p>
          </div>

          <form onSubmit={handleUpdateStudentLogin} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Current shared ID: {sharedStudentUserId || 'Not configured'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New student ID
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={64}
                  value={newSharedStudentUserId}
                  onChange={(event) => setNewSharedStudentUserId(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New student password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newSharedStudentPassword}
                  onChange={(event) => setNewSharedStudentPassword(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmSharedStudentPassword}
                  onChange={(event) => setConfirmSharedStudentPassword(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingStudentLogin}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {isUpdatingStudentLogin ? 'Updating...' : 'Update student login'}
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Name / Roll No</th>
                    <th className="p-4">Organizational Email</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Current Role</th>
                    <th className="p-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {usersList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {usr.name}
                        </div>
                        {usr.rollNumber && (
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            Roll: {usr.rollNumber}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                        {usr.email}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {usr.department || 'Engineering'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            usr.role === 'admin'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {usr.role === 'admin' ? 'Faculty Admin' : 'Student'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(usr.registeredAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Destructive Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Confirm Deletion
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>? This operation cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
