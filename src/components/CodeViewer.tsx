import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Copy, Check, Download, Maximize2, Minimize2, Code2, Terminal } from 'lucide-react';
import { detectLanguageFromFilename } from '../lib/code-highlighter-utils.js';

interface CodeViewerProps {
  code: string;
  language?: string;
  title?: string;
  filename?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'java',
  title,
  filename
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState('');

  const detectedLang = filename ? detectLanguageFromFilename(filename) : language;

  useEffect(() => {
    try {
      const validLang = hljs.getLanguage(detectedLang) ? detectedLang : 'plaintext';
      const result = hljs.highlight(code || '', { language: validLang });
      setHighlightedCode(result.value);
    } catch (err) {
      setHighlightedCode((code || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    }
  }, [code, detectedLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const defaultName = filename || (title ? `${title.replace(/\s+/g, '_')}.${detectedLang}` : `experiment.${detectedLang}`);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = (code || '').split('\n');

  return (
    <div
      className={`rounded-xl overflow-hidden border border-slate-700 bg-[#1e222b] shadow-xl flex flex-col ${
        isFullScreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative my-4'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#181a20] border-b border-slate-700/80 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="font-mono text-slate-300 font-medium flex items-center gap-1.5 ml-2">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            {filename || title || 'Program Source Code'}
          </span>
          <span className="uppercase text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
            {detectedLang}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Download source code file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download</span>
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="overflow-auto flex-1 font-mono text-[13px] leading-relaxed p-4 text-slate-200">
        <table className="border-collapse w-full">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40">
                <td className="code-line-number text-slate-500 select-none align-top pr-4 w-12 text-right">
                  {idx + 1}
                </td>
                <td className="whitespace-pre font-mono pl-2 align-top overflow-x-auto text-slate-200">
                  {/* Highlight current line safely */}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: hljs.highlight(line || ' ', {
                        language: hljs.getLanguage(detectedLang) ? detectedLang : 'plaintext'
                      }).value
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Code Footer info */}
      <div className="px-4 py-1.5 bg-[#14171d] border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Terminal className="w-3 h-3 text-slate-500" />
          {lines.length} lines • UTF-8
        </span>
        <span>GPREC Laboratory Code Repository</span>
      </div>
    </div>
  );
};
