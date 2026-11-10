import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGprecEmail, validateOtpCode, validateStudentGmailEmail } from './auth-validation.js';
import { detectLanguageFromFilename, formatFileSize } from './code-highlighter-utils.js';
import { filterAndSearchResources } from './search-indexer.js';

test('Student sign-in accepts only GPREC institutional accounts', () => {
  const gprecResult = validateStudentGmailEmail('219x1a0523@gprec.ac.in');
  assert.equal(gprecResult.isValid, true);
  assert.equal(gprecResult.extractedRollNo, '219X1A0523');

  const gmailResult = validateStudentGmailEmail('student@gmail.com');
  assert.equal(gmailResult.isValid, false);
  assert.match(gmailResult.error || '', /Personal email addresses/);

  const otherDomainResult = validateStudentGmailEmail('student@othercollege.edu');
  assert.equal(otherDomainResult.isValid, false);
  assert.match(otherDomainResult.error || '', /Only email addresses ending with @gprec.ac.in/);
});

test('GPREC email validator accepts valid @gprec.ac.in emails', () => {
  const result = validateGprecEmail('219x1a0523@gprec.ac.in');
  assert.equal(result.isValid, true);
  assert.equal(result.extractedRollNo, '219X1A0523');
  assert.equal(result.department, 'Computer Science & Engineering (CSE)');
});

test('GPREC email validator rejects personal email providers', () => {
  const gmailResult = validateGprecEmail('student@gmail.com');
  assert.equal(gmailResult.isValid, false);
  assert.match(gmailResult.error || '', /Personal email addresses/);

  const yahooResult = validateGprecEmail('student@yahoo.com');
  assert.equal(yahooResult.isValid, false);

  const invalidDomain = validateGprecEmail('user@othercollege.edu');
  assert.equal(invalidDomain.isValid, false);
  assert.match(invalidDomain.error || '', /Only email addresses ending with @gprec.ac.in/);
});

test('OTP code validation verifies 6 digits', () => {
  assert.equal(validateOtpCode('123456').isValid, true);
  assert.equal(validateOtpCode('12345').isValid, false);
  assert.equal(validateOtpCode('12a456').isValid, false);
  assert.equal(validateOtpCode('').isValid, false);
});

test('detectLanguageFromFilename detects proper programming languages', () => {
  assert.equal(detectLanguageFromFilename('BinarySearch.java'), 'java');
  assert.equal(detectLanguageFromFilename('model.py'), 'python');
  assert.equal(detectLanguageFromFilename('main.c'), 'c');
  assert.equal(detectLanguageFromFilename('algorithm.cpp'), 'cpp');
  assert.equal(detectLanguageFromFilename('schema.sql'), 'sql');
  assert.equal(detectLanguageFromFilename('notebook.ipynb'), 'json');
  assert.equal(detectLanguageFromFilename('style.css'), 'css');
  assert.equal(detectLanguageFromFilename('unknown.xyz'), 'plaintext');
});

test('formatFileSize correctly formats bytes', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1048576), '1 MB');
});

test('filterAndSearchResources matches keywords and respects category filters', () => {
  const mockYears = [{ id: 'y3', name: '3rd Year', order: 3 }];
  const mockSemesters = [{ id: 's5', yearId: 'y3', number: 5, name: 'Semester 5' }];
  const mockSubjects = [
    {
      id: 'sub1',
      semesterId: 's5',
      name: 'Java Programming',
      code: 'CS301',
      category: 'theory' as const,
      description: 'Core OOP Java',
      credits: 4,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    },
    {
      id: 'sub2',
      semesterId: 's5',
      name: 'Java Programming Lab',
      code: 'CS302',
      category: 'lab' as const,
      description: 'Hands-on Java lab experiments',
      credits: 2,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
  ];
  const mockUnits = [
    {
      id: 'u1',
      subjectId: 'sub1',
      unitNumber: 1,
      title: 'Introduction to OOP',
      description: 'Basics of Java',
      orderIndex: 1,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    },
    {
      id: 'u2',
      subjectId: 'sub2',
      unitNumber: 1,
      title: 'Lab Experiments 1-5',
      description: 'Core programs',
      orderIndex: 1,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
  ];
  const mockResources = [
    {
      id: 'res1',
      unitId: 'u1',
      title: 'Inheritance and Polymorphism Notes',
      description: 'Detailed lecture notes on inheritance',
      type: 'note' as const,
      content: '<h1>OOP concepts</h1>',
      isPublished: true,
      authorEmail: 'faculty@gprec.ac.in',
      files: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    },
    {
      id: 'res2',
      unitId: 'u2',
      title: 'MultiThreaded Producer Consumer Program',
      description: 'Complete source code and algorithm',
      type: 'code' as const,
      content: 'class ProducerConsumer { ... }',
      codeLanguage: 'java',
      isPublished: true,
      authorEmail: 'faculty@gprec.ac.in',
      files: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
  ];

  // Test keyword search
  const keywordResults = filterAndSearchResources(
    { query: 'Inheritance' },
    { years: mockYears, semesters: mockSemesters, subjects: mockSubjects, units: mockUnits, resources: mockResources }
  );
  assert.equal(keywordResults.length, 1);
  assert.equal(keywordResults[0].id, 'res1');

  // Test category filter
  const labResults = filterAndSearchResources(
    { category: 'lab' },
    { years: mockYears, semesters: mockSemesters, subjects: mockSubjects, units: mockUnits, resources: mockResources }
  );
  assert.equal(labResults.length, 1);
  assert.equal(labResults[0].id, 'res2');
  assert.equal(labResults[0].codeLanguage, 'java');
});
