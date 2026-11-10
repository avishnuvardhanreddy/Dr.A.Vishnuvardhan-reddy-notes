import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { StudentPortal } from './components/StudentPortal.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { AuthModal } from './components/AuthModal.js';
import { GlobalSearchModal } from './components/GlobalSearchModal.js';
import { AcademicYear, Semester, Subject, User } from './lib/types.js';
import { SearchResultItem } from './lib/search-indexer.js';
import { School, Award, GraduationCap, ShieldCheck, ArrowRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'student' | 'admin'>('student');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState<'student' | 'admin'>('student');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gprec_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Curriculum Data
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gprec_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gprec_theme', 'light');
    }
  }, [isDark]);

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Current Session & Academic Structure
  const loadData = async () => {
    try {
      const token = localStorage.getItem('gprec_token');
      if (!token) {
        setCurrentUser(null);
        setYears([]);
        setSemesters([]);
        setSubjects([]);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const userRes = await fetch('/api/auth/me', { headers });
      const userData = userRes.ok ? await userRes.json() : { user: null };
      if (!userData.user) {
        localStorage.removeItem('gprec_token');
        setCurrentUser(null);
        setYears([]);
        setSemesters([]);
        setSubjects([]);
        return;
      }

      setCurrentUser(userData.user);

      const [yearsRes, semsRes, subjectsRes] = await Promise.all([
        fetch('/api/academic/years', { headers }),
        fetch('/api/academic/semesters', { headers }),
        fetch('/api/academic/subjects', { headers })
      ]);

      if ([yearsRes, semsRes, subjectsRes].some(response => response.status === 401)) {
        localStorage.removeItem('gprec_token');
        setCurrentUser(null);
        setYears([]);
        setSemesters([]);
        setSubjects([]);
        return;
      }

      if (yearsRes.ok) setYears(await yearsRes.json());
      if (semsRes.ok) setSemesters(await semsRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (err) {
      console.error('Failed to load initial data:', err);
      localStorage.removeItem('gprec_token');
      setCurrentUser(null);
      setYears([]);
      setSemesters([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('gprec_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Ignore network errors on logout
      }
    }
    localStorage.removeItem('gprec_token');
    setCurrentUser(null);
    setActiveView('student');
    setIsAuthModalOpen(false);
    setYears([]);
    setSemesters([]);
    setSubjects([]);
    setIsSearchOpen(false);
  };

  const handleAuthSuccess = (user: User, _token: string) => {
    setLoading(true);
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    if (user.role === 'admin') {
      setActiveView('admin');
    } else {
      setActiveView('student');
    }
    void loadData();
  };

  const handleOpenAuth = (role: 'student' | 'admin' = 'student') => {
    setAuthModalInitialRole(role);
    setIsAuthModalOpen(true);
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    setActiveView('student');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f4f2eb] text-slate-900">
        <header className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b2932] text-amber-300">
              <School className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                Dr. A. Vishnu Vardhan Reddy · Associate Professor, CSM
              </p>
              <p className="text-[11px] text-slate-500 sm:text-xs">Notes for his CSM students</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAuth('admin')}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white/70 hover:text-[#0b5960]"
          >
            Faculty login
          </button>
        </header>

        <main>
          <section className="homepage-hero relative flex min-h-[60vh] items-center overflow-hidden sm:min-h-[62vh]">
            <div aria-hidden="true" className="homepage-grid absolute inset-0" />
            <div aria-hidden="true" className="homepage-drafting hidden lg:block" />
            <div aria-hidden="true" className="homepage-scanline" />
            <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-12 sm:py-8 lg:px-16 lg:py-10">
              <div className="homepage-reveal mb-4 inline-flex items-center gap-2 border-l-2 border-amber-400 pl-3 text-xs font-semibold uppercase text-amber-200">
                <Award className="h-4 w-4" />
                DR. A. VISHNU VARDHAN REDDY · ASSOCIATE PROFESSOR · CSM
              </div>
              <h1 className="homepage-reveal homepage-delay-1 max-w-3xl font-serif text-5xl font-medium leading-[1.05] text-white sm:text-6xl lg:text-7xl">
                Dr. A. Vishnu Vardhan Reddy's CSM Notes
              </h1>
              <p className="homepage-reveal homepage-delay-2 mt-4 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
                Notes and course materials shared by Dr. A. Vishnu Vardhan Reddy with his CSM students.
              </p>
              <div className="homepage-reveal homepage-delay-3 mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('student')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
                >
                  <GraduationCap className="h-4 w-4" />
                  Student login
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('admin')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Faculty owner
                </button>
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-slate-200 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
              <div className="py-5 sm:px-6 sm:py-7">
                <p className="text-[10px] font-bold uppercase text-slate-500">Faculty owner</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Dr. A. Vishnu Vardhan Reddy</p>
              </div>
              <div className="py-5 sm:px-6 sm:py-7">
                <p className="text-[10px] font-bold uppercase text-slate-500">Department</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Associate Professor · CSM</p>
              </div>
              <div className="py-5 sm:px-6 sm:py-7">
                <p className="text-[10px] font-bold uppercase text-slate-500">Access</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Enrolled CSM students</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Dr. A. Vishnu Vardhan Reddy · CSM</span>
        </footer>

        {isAuthModalOpen && (
          <AuthModal
            isOpen
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
            initialRole={authModalInitialRole}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Faculty portal context */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-blue-100 text-[11px] py-1.5 px-4 text-center border-b border-blue-900/60 flex items-center justify-center gap-3">
        <span className="font-semibold flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          Dr. A. Vishnu Vardhan Reddy · Associate Professor, CSM
        </span>
        <span className="hidden sm:inline text-blue-300/80">•</span>
        <span className="hidden sm:inline">
          Course resources for enrolled students
        </span>
      </div>

      {/* Main Navigation */}
      <Navbar
        user={currentUser}
        activeView={activeView}
        onViewChange={(view) => {
          if (view === 'admin' && currentUser?.role !== 'admin') {
            handleOpenAuth('admin');
          } else {
            setActiveView(view);
          }
        }}
        onOpenAuth={handleOpenAuth}
        onOpenSearch={() => setIsSearchOpen(true)}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Loading Dr. A. Vishnu Vardhan Reddy's CSM notes...
            </p>
          </div>
        ) : activeView === 'admin' && currentUser?.role === 'admin' ? (
          <AdminDashboard
            years={years}
            semesters={semesters}
            subjects={subjects}
            onRefreshData={loadData}
            currentUser={currentUser}
          />
        ) : (
          <StudentPortal
            years={years}
            semesters={semesters}
            subjects={subjects}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-800 text-amber-300 flex items-center justify-center font-bold">
              <School className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Dr. A. Vishnu Vardhan Reddy · Associate Professor, CSM
              </p>
              <p className="text-[11px]">
                Notes shared for his CSM students.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <button
              onClick={() => handleOpenAuth('student')}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Student View
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenAuth('admin')}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Faculty Owner Access
            </button>
            <span>•</span>
          </div>

          <p className="text-[11px] text-center md:text-right">
            © {new Date().getFullYear()} Dr. A. Vishnu Vardhan Reddy · CSM
          </p>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialRole={authModalInitialRole}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        years={years}
        semesters={semesters}
        subjects={subjects}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
}
