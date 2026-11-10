import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, Code2, FileText, ArrowRight, Filter, Sparkles } from 'lucide-react';
import { AcademicYear, Semester, Subject } from '../lib/types.js';
import { SearchResultItem } from '../lib/search-indexer.js';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  years: AcademicYear[];
  semesters: Semester[];
  subjects: Subject[];
  onSelectResult: (result: SearchResultItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  years,
  semesters,
  subjects,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'theory' | 'lab'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'note' | 'code' | 'file'>('all');

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append('q', query.trim());
        if (selectedYear) params.append('yearId', selectedYear);
        if (selectedSem) params.append('semesterId', selectedSem);
        if (selectedSubject) params.append('subjectId', selectedSubject);
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (selectedType !== 'all') params.append('resourceType', selectedType);

        const token = localStorage.getItem('gprec_token');
        const res = await fetch(`/api/search?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => clearTimeout(timer);
  }, [isOpen, query, selectedYear, selectedSem, selectedSubject, selectedCategory, selectedType]);

  if (!isOpen) return null;

  const filteredSemesters = selectedYear
    ? semesters.filter(s => s.yearId === selectedYear)
    : semesters;

  const filteredSubjects = selectedSem
    ? subjects.filter(s => s.semesterId === selectedSem)
    : subjects;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            placeholder="Search notes, lab programs, subject codes (e.g., 20CS301, Java, Threads, ML)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-xs font-semibold px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Filter Bars */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedSem('');
              setSelectedSubject('');
            }}
            aria-label="Filter by academic year"
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Academic Years</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>

          <select
            value={selectedSem}
            onChange={(e) => {
              setSelectedSem(e.target.value);
              setSelectedSubject('');
            }}
            aria-label="Filter by semester"
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Semesters</option>
            {filteredSemesters.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            aria-label="Filter by subject category"
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">Theory & Lab</option>
            <option value="theory">Theory Only</option>
            <option value="lab">Lab Only</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            aria-label="Filter by resource type"
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Formats</option>
            <option value="note">Notes</option>
            <option value="code">Source Code</option>
            <option value="file">Files/Assets</option>
          </select>

          {(selectedYear || selectedSem || selectedCategory !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSelectedYear('');
                setSelectedSem('');
                setSelectedSubject('');
                setSelectedCategory('all');
                setSelectedType('all');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Searching academic repository...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No academic resources found matching your query
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for a subject code, unit title, or topic name.
              </p>
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800/80 bg-white dark:bg-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                      item.subjectCategory === 'lab'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}>
                      {item.subjectCategory === 'lab' ? 'Laboratory' : 'Theory'}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.subjectCode} • {item.subjectName}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Sem {item.semesterNumber})
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>

                  {item.unitTitle && (
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.unitTitle}
                    </p>
                  )}

                  {item.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                      {item.snippet}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                  {item.resourceType === 'code' ? (
                    <Code2 className="w-4 h-4 text-purple-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500" />
                  )}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Found {results.length} resources</span>
          <span>Dr. A. Vishnu Vardhan Reddy's CSM Notes</span>
        </div>
      </div>
    </div>
  );
};
