import { Subject, Unit, Resource, AcademicYear, Semester } from './types.js';

export interface SearchFilter {
  query?: string;
  yearId?: string;
  semesterId?: string;
  subjectId?: string;
  category?: 'theory' | 'lab';
  resourceType?: 'note' | 'code' | 'file';
}

export interface SearchResultItem {
  id: string;
  type: 'subject' | 'unit' | 'resource';
  title: string;
  snippet: string;
  subjectName: string;
  subjectCode: string;
  subjectCategory: 'theory' | 'lab';
  semesterNumber: number;
  yearName: string;
  unitTitle?: string;
  resourceType?: 'note' | 'code' | 'file';
  codeLanguage?: string;
  filesCount?: number;
  matchScore: number;
}

export function filterAndSearchResources(
  filter: SearchFilter,
  data: {
    years: AcademicYear[];
    semesters: Semester[];
    subjects: Subject[];
    units: Unit[];
    resources: Resource[];
  }
): SearchResultItem[] {
  const { years, semesters, subjects, units, resources } = data;
  const query = (filter.query || '').trim().toLowerCase();
  const results: SearchResultItem[] = [];

  const yearMap = new Map(years.map(y => [y.id, y]));
  const semMap = new Map(semesters.map(s => [s.id, s]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const unitMap = new Map(units.map(u => [u.id, u]));

  for (const res of resources) {
    if (!res.isPublished) continue;

    const unit = unitMap.get(res.unitId);
    if (!unit || !unit.isPublished) continue;

    const subject = subjectMap.get(unit.subjectId);
    if (!subject || !subject.isPublished) continue;

    const sem = semMap.get(subject.semesterId);
    if (!sem) continue;

    const year = yearMap.get(sem.yearId);
    if (!year) continue;

    // Apply strict filters
    if (filter.yearId && year.id !== filter.yearId) continue;
    if (filter.semesterId && sem.id !== filter.semesterId) continue;
    if (filter.subjectId && subject.id !== filter.subjectId) continue;
    if (filter.category && subject.category !== filter.category) continue;
    if (filter.resourceType && res.type !== filter.resourceType) continue;

    // Search query scoring
    let score = 0;
    if (query) {
      const titleLower = res.title.toLowerCase();
      const descLower = res.description.toLowerCase();
      const contentLower = (res.content || '').toLowerCase();
      const subjectNameLower = subject.name.toLowerCase();
      const subjectCodeLower = subject.code.toLowerCase();
      const unitTitleLower = unit.title.toLowerCase();
      const fileNames = res.files.map(f => f.originalName.toLowerCase()).join(' ');

      if (titleLower.includes(query)) score += 10;
      if (subjectCodeLower.includes(query)) score += 9;
      if (subjectNameLower.includes(query)) score += 8;
      if (unitTitleLower.includes(query)) score += 7;
      if (descLower.includes(query)) score += 5;
      if (fileNames.includes(query)) score += 4;
      if (contentLower.includes(query)) score += 2;

      if (score === 0) continue; // query didn't match
    } else {
      score = 1; // Return all matching filter
    }

    results.push({
      id: res.id,
      type: 'resource',
      title: res.title,
      snippet: res.description || (res.content ? res.content.substring(0, 160).replace(/<[^>]*>/g, '') : ''),
      subjectName: subject.name,
      subjectCode: subject.code,
      subjectCategory: subject.category,
      semesterNumber: sem.number,
      yearName: year.name,
      unitTitle: unit.title,
      resourceType: res.type,
      codeLanguage: res.codeLanguage,
      filesCount: res.files.length,
      matchScore: score
    });
  }

  // Sort descending by score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
