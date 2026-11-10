export interface LanguageOption {
  id: string;
  label: string;
  extension: string;
  aliases: string[];
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'java', label: 'Java', extension: '.java', aliases: ['java'] },
  { id: 'python', label: 'Python', extension: '.py', aliases: ['python', 'py'] },
  { id: 'c', label: 'C Language', extension: '.c', aliases: ['c'] },
  { id: 'cpp', label: 'C++', extension: '.cpp', aliases: ['cpp', 'c++'] },
  { id: 'javascript', label: 'JavaScript', extension: '.js', aliases: ['javascript', 'js'] },
  { id: 'typescript', label: 'TypeScript', extension: '.ts', aliases: ['typescript', 'ts'] },
  { id: 'sql', label: 'SQL', extension: '.sql', aliases: ['sql', 'psql'] },
  { id: 'html', label: 'HTML', extension: '.html', aliases: ['html', 'htm'] },
  { id: 'css', label: 'CSS', extension: '.css', aliases: ['css', 'scss'] },
  { id: 'bash', label: 'Shell Script', extension: '.sh', aliases: ['bash', 'sh', 'zsh', 'shell'] },
  { id: 'json', label: 'JSON', extension: '.json', aliases: ['json'] },
  { id: 'xml', label: 'XML', extension: '.xml', aliases: ['xml', 'svg'] },
];

/**
 * Detect language ID from file extension or filename
 */
export function detectLanguageFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf('.'));
  
  const found = SUPPORTED_LANGUAGES.find(lang => lang.extension === ext || lang.aliases.includes(ext.replace('.', '')));
  if (found) return found.id;
  
  if (lower.endsWith('.ipynb')) return 'json'; // Jupyter notebooks are JSON
  return 'plaintext';
}

/**
 * Format bytes to readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
