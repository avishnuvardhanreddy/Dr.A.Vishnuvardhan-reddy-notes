import React, { useState, useEffect } from 'react';
import {
  AcademicYear,
  Semester,
  Subject,
  Unit,
  Resource,
  SubjectCategory
} from '../lib/types.js';
import { RichNotesReader } from './RichNotesReader.js';
import { CodeViewer } from './CodeViewer.js';
import {
  BookOpen,
  Code2,
  FileText,
  ChevronRight,
  Layers,
  Sparkles,
  Download,
  Clock,
  ArrowLeft,
  CheckCircle2,
  FolderOpen,
  Filter,
  GraduationCap
} from 'lucide-react';

interface StudentPortalProps {
  years: AcademicYear[];
  semesters: Semester[];
  subjects: Subject[];
  onOpenSearch: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  years,
  semesters,
  subjects,
  onOpenSearch
}) => {
  // Navigation State
  const [selectedYearId, setSelectedYearId] = useState<string>('year-1');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('sem-1');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'theory' | 'lab'>('all');

  // Unit and Resource State
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);

  // Semesters for currently chosen year
  const availableSemesters = semesters.filter(s => s.yearId === selectedYearId);

  // If selected year changes, automatically choose the first semester of that year
  useEffect(() => {
    const sems = semesters.filter(s => s.yearId === selectedYearId);
    if (sems.length > 0 && !sems.some(s => s.id === selectedSemesterId)) {
      setSelectedSemesterId(sems[0].id);
      setSelectedSubjectId(null);
      setSelectedUnitId(null);
      setSelectedResource(null);
    }
  }, [selectedYearId, semesters]);

  // Subjects for selected semester
  const availableSubjects = subjects.filter(
    s => s.semesterId === selectedSemesterId && s.isPublished
  ).filter(s => {
    if (categoryFilter === 'all') return true;
    return s.category === categoryFilter;
  });

  // Fetch Units when Subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setUnits([]);
      setSelectedUnitId(null);
      setSelectedResource(null);
      return;
    }

    const fetchUnits = async () => {
      setLoadingUnits(true);
      try {
        const token = localStorage.getItem('gprec_token');
        const res = await fetch(`/api/academic/units?subjectId=${selectedSubjectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data: Unit[] = await res.json();
          const published = data.filter(u => u.isPublished);
          setUnits(published);
          if (published.length > 0) {
            setSelectedUnitId(published[0].id);
          } else {
            setSelectedUnitId(null);
            setSelectedResource(null);
          }
        }
      } catch (err) {
        console.error('Failed to load units:', err);
      } finally {
        setLoadingUnits(false);
      }
    };

    fetchUnits();
  }, [selectedSubjectId]);

  // Fetch Resources when Unit changes
  useEffect(() => {
    if (!selectedUnitId) {
      setResources([]);
      setSelectedResource(null);
      return;
    }

    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        const token = localStorage.getItem('gprec_token');
        const res = await fetch(`/api/resources?unitId=${selectedUnitId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data: Resource[] = await res.json();
          const published = data.filter(r => r.isPublished);
          setResources(published);
          if (published.length > 0) {
            setSelectedResource(published[0]);
          } else {
            setSelectedResource(null);
          }
        }
      } catch (err) {
        console.error('Failed to load resources:', err);
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, [selectedUnitId]);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const activeUnit = units.find(u => u.id === selectedUnitId);

  return (
    <div className="space-y-6">
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-xs font-semibold text-amber-300 mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            DR. A. VISHNU VARDHAN REDDY · CSM NOTES
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            CSM Notes & Course Resources
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Notes shared by Dr. A. Vishnu Vardhan Reddy, Associate Professor, CSM, for his students.
          </p>
        </div>
      </div>

      {/* STEP 1: Academic Year Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Step 1 of 5
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Select Academic Year
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Choose your current undergraduate year of study
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {years.map((year) => {
            const isSelected = year.id === selectedYearId;
            const yearSems = semesters.filter(s => s.yearId === year.id);
            return (
              <button
                key={year.id}
                onClick={() => setSelectedYearId(year.id)}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-white shadow-md ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm sm:text-base">{year.name}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {yearSems.map(s => `Sem ${s.number}`).join(' & ')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Semester Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Step 2 of 5
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Select Semester
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Semesters available under {years.find(y => y.id === selectedYearId)?.name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {availableSemesters.map((sem) => {
            const isSelected = sem.id === selectedSemesterId;
            return (
              <button
                key={sem.id}
                onClick={() => {
                  setSelectedSemesterId(sem.id);
                  setSelectedSubjectId(null);
                  setSelectedUnitId(null);
                  setSelectedResource(null);
                }}
                className={`py-3 px-4 rounded-xl border text-center font-bold text-sm transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {sem.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: Subject Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Step 3 of 5
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Select Subject ({availableSubjects.length})
            </h2>
          </div>

          {/* Theory vs Lab Category Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Subjects
            </button>
            <button
              onClick={() => setCategoryFilter('theory')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === 'theory'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Theory Subjects
            </button>
            <button
              onClick={() => setCategoryFilter('lab')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === 'lab'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Laboratories
            </button>
          </div>
        </div>

        {availableSubjects.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No subjects registered under this semester yet.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Authorized faculty administrators can add and publish syllabus subjects using the Admin Suite.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSubjects.map((sub) => {
              const isSelected = sub.id === selectedSubjectId;
              const isLab = sub.category === 'lab';
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-600/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {sub.code}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isLab
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                        }`}
                      >
                        {isLab ? 'Laboratory' : 'Theory'}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {sub.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                      {sub.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{sub.credits} Credits</span>
                    <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                      {isSelected ? 'Selected' : 'Open Curriculum'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 4 & 5: Unit-wise Resources and Resource Viewer */}
      {selectedSubjectId && activeSubject && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Step 4 & 5
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{activeSubject.code} – {activeSubject.name}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  activeSubject.category === 'lab'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {activeSubject.category === 'lab' ? 'Lab Experiments & Programs' : 'Units & Theory Notes'}
                </span>
              </h2>
            </div>

            <button
              onClick={onOpenSearch}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Search in Subject</span>
            </button>
          </div>

          {loadingUnits ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading syllabus units...
            </div>
          ) : units.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No units published for {activeSubject.name} yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Administrators can create Unit 1 to Unit 5 in the Admin Dashboard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Unit Navigation Sidebar / Tabs */}
              <div className="lg:col-span-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  Syllabus Breakdown ({units.length} Units)
                </p>

                <div className="space-y-2">
                  {units.map((unit) => {
                    const isSelected = unit.id === selectedUnitId;
                    return (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-white shadow-sm ring-1 ring-blue-600/30 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs uppercase font-mono text-blue-600 dark:text-blue-400 font-bold">
                            Unit #{unit.unitNumber}
                          </span>
                          {isSelected && <ChevronRight className="w-4 h-4 text-blue-600" />}
                        </div>
                        <h4 className="text-sm font-bold leading-tight line-clamp-2">
                          {unit.title}
                        </h4>
                        {unit.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {unit.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resource Content Area */}
              <div className="lg:col-span-8">
                {loadingResources ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    Loading unit resources...
                  </div>
                ) : resources.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/30">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No learning materials added for this unit yet.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Faculty members will upload notes and code here soon.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Multiple Resource Switcher Tabs (if unit has more than 1 resource) */}
                    {resources.length > 1 && (
                      <div className="flex flex-wrap items-center gap-2 mb-4 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                        {resources.map((r) => {
                          const isCurrent = selectedResource?.id === r.id;
                          return (
                            <button
                              key={r.id}
                              onClick={() => setSelectedResource(r)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                                isCurrent
                                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {r.type === 'code' ? (
                                <Code2 className="w-3.5 h-3.5 text-purple-500" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span className="truncate max-w-[200px]">{r.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Active Resource View */}
                    {selectedResource && (
                      <div>
                        {selectedResource.type === 'code' ? (
                          <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-sm text-purple-950 dark:text-purple-200">
                                  {selectedResource.title}
                                </h3>
                                <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
                                  {selectedResource.description || 'Laboratory experiment program with syntax highlighting, copy and download capabilities.'}
                                </p>
                              </div>
                              <span className="uppercase text-[10px] font-bold px-2 py-1 rounded bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200 shrink-0">
                                Language: {selectedResource.codeLanguage || 'Java'}
                              </span>
                            </div>

                            <CodeViewer
                              code={selectedResource.content}
                              language={selectedResource.codeLanguage || 'java'}
                              title={selectedResource.title}
                            />
                          </div>
                        ) : (
                          <RichNotesReader
                            resource={selectedResource}
                            subjectName={`${activeSubject.code} – ${activeSubject.name}`}
                            unitTitle={activeUnit?.title}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
