import React, { useState } from 'react';
import { Resource } from '../lib/types.js';
import { formatFileSize } from '../lib/code-highlighter-utils.js';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileCode,
  Paperclip,
  Share2
} from 'lucide-react';

interface RichNotesReaderProps {
  resource: Resource;
  subjectName?: string;
  unitTitle?: string;
}

export const RichNotesReader: React.FC<RichNotesReaderProps> = ({
  resource,
  subjectName,
  unitTitle
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const openProtectedFile = async (fileId: string, action: 'preview' | 'download', fileName: string, previewWindow?: Window) => {
    setFileError(null);
    const token = localStorage.getItem('gprec_token');
    if (!token) {
      previewWindow?.close();
      setFileError('Sign in to access this file.');
      return;
    }

    try {
      const response = await fetch(`/api/files/${action}/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Could not access this file. Please sign in again.');

      const objectUrl = URL.createObjectURL(await response.blob());
      if (action === 'preview' && previewWindow) {
        previewWindow.opener = null;
        previewWindow.location.href = objectUrl;
      } else if (action === 'download') {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      previewWindow?.close();
      setFileError(err.message || 'Could not access this file.');
    }
  };

  const handleCopyText = async () => {
    // Strip HTML to get plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = resource.content;
    const text = tempDiv.textContent || tempDiv.innerText || '';

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-all ${
        isFullScreen ? 'fixed inset-4 z-50 overflow-auto shadow-2xl p-6 md:p-10' : 'p-6 my-4'
      }`}
    >
      {/* Header & Meta */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <FileText className="w-3.5 h-3.5" />
              Theory Resource
            </span>
            {subjectName && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {subjectName}
              </span>
            )}
            {unitTitle && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {unitTitle}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Copy notes content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Content' : 'Copy Text'}
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
          {resource.title}
        </h1>

        {resource.description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {resource.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {resource.authorEmail}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date(resource.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
          {resource.files && resource.files.length > 0 && (
            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <Paperclip className="w-3.5 h-3.5" />
              {resource.files.length} attached document{resource.files.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Main Prose Content */}
      <div className="prose-notes text-slate-800 dark:text-slate-200 flex-1">
        <div dangerouslySetInnerHTML={{ __html: resource.content || '<p class="text-slate-500 italic">No notes content written yet.</p>' }} />
      </div>

      {/* Attached Files Section */}
      {resource.files && resource.files.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Attached Downloads & Learning Assets ({resource.files.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resource.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.sizeBytes)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const previewWindow = window.open('about:blank', '_blank');
                      if (!previewWindow) {
                        setFileError('Allow pop-ups to preview this file.');
                        return;
                      }
                      void openProtectedFile(file.id, 'preview', file.originalName, previewWindow);
                    }}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void openProtectedFile(file.id, 'download', file.originalName)}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {fileError && (
            <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">
              {fileError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
