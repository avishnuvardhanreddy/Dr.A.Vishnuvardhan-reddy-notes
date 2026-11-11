import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  BookOpen,
  LayoutDashboard,
  School
} from 'lucide-react';
import { User } from '../lib/types.js';

interface NavbarProps {
  user: User | null;
  activeView: 'student' | 'admin';
  onViewChange: (view: 'student' | 'admin') => void;
  onOpenAuth: (role?: 'student' | 'admin') => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onViewChange,
  onOpenAuth,
  onOpenSearch,
  onOpenNotifications,
  onLogout,
  isDark,
  onToggleTheme
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => onViewChange('student')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-950/20 group-hover:scale-105 transition-transform">
            <School className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                VISHNU
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300">
                CSM Notes
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate max-w-xs">
              Dr. A. Vishnu Vardhan Reddy · Associate Professor, CSM
            </p>
          </div>
        </div>

        {/* Center Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex-1 max-w-md hidden md:flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 transition-all shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Search subjects, syllabus units, lab programs...</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            Ctrl+K
          </kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search icon */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Search resources"
          >
            <Search className="w-4 h-4 text-blue-600" />
          </button>

          {user && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Faculty notifications"
              aria-label="Open faculty notifications"
            >
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* View Mode Switcher (Student vs Admin) */}
          {user?.role === 'admin' && (
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => onViewChange('student')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeView === 'student'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Student View
              </button>
              <button
                onClick={() => onViewChange('admin')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeView === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Admin Suite
              </button>
            </div>
          )}

          {/* User Account State */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  {user.role === 'admin' ? 'Faculty Admin' : user.rollNumber || 'Student'}
                </p>
              </div>

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  user.role === 'admin'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                    : 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:text-blue-200'
                }`}
                title={`${user.name} (${user.email})`}
              >
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('student')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow transition-all flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Login</span>
              </button>
              <button
                onClick={() => onOpenAuth('admin')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
