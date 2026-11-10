import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  School,
  X,
  UserCheck
} from 'lucide-react';
import { User } from '../lib/types.js';

interface AuthModalProps {
  isOpen: boolean;
  canClose?: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
  initialRole?: 'student' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  canClose = true,
  onClose,
  onSuccess,
  initialRole = 'student'
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>(initialRole);

  const [studentUserId, setStudentUserId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('vishnu.csm@gprec.ac.in');
  const [adminPassword, setAdminPassword] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentUserId.trim(),
          password: studentPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Student login failed.');
      } else {
        localStorage.setItem('gprec_token', data.token);
        onSuccess(data.user, data.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred while connecting to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  // Admin: Login with Email + Password
  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Admin email and password authentication failed.');
      } else {
        localStorage.setItem('gprec_token', data.token);
        onSuccess(data.user, data.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white relative">
          {canClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-blue-200 hover:text-white rounded-full bg-blue-900/50 hover:bg-blue-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 mb-2">
            <School className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Dr. A. Vishnu Vardhan Reddy · Associate Professor, CSM
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Academic Portal</h2>
          <p className="text-xs text-blue-200/90 mt-1">
            Sign in to access course notes shared by Dr. A. Vishnu Vardhan Reddy.
          </p>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1 bg-blue-950/80 rounded-xl mt-4 border border-blue-800/60">
            <button
              onClick={() => {
                setActiveTab('student');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-blue-950 shadow'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student Access
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-blue-950 shadow'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Faculty Owner
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'student' ? (
            /* Shared student login */
            <div className="space-y-4">
              <form onSubmit={handleStudentLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shared Student User ID
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={studentUserId}
                    onChange={(e) => setStudentUserId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shared Student Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{loading ? 'Signing in...' : 'Log in as Student'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  All students use one shared account, so activity cannot be attributed to an individual student.
                </span>
              </div>
            </div>
          ) : (
            /* Admin Flow: Email and Password */
            <div className="space-y-4">
              <form onSubmit={handleAdminPasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Email (@gprec.ac.in)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="vishnu.csm@gprec.ac.in"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
