import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatFileSize } from '../lib/code-highlighter-utils.js';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  uploadedFiles?: File[];
  onRemoveFile?: (index: number) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  maxFiles = 10,
  uploadedFiles = [],
  onRemoveFile
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files);
      onFilesSelected(selected);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-800 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-100 dark:bg-blue-950/60 rounded-full text-blue-700 dark:text-blue-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Click to select or drag and drop any academic file here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports <strong>ANY file extension</strong> (PDF, Word, PPTX, Java, Python, C/C++, SQL, Jupyter .ipynb, ZIP, CSV, images, and arbitrary formats), up to 50 MB per file and 10 files per upload.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files Preview List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Selected for Upload ({uploadedFiles.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <File className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(idx);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
