import React, { useEffect, useState } from 'react';
import { Bell, Clock3, X } from 'lucide-react';
import type { FacultyNotification } from '../lib/types.js';

interface FacultyNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FacultyNotificationsPanel: React.FC<FacultyNotificationsPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<FacultyNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const loadNotifications = async () => {
      setIsLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('gprec_token');
        const response = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Could not load faculty notifications.');
        setNotifications(await response.json() as FacultyNotification[]);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load faculty notifications.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadNotifications();
    return () => controller.abort();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={onClose}>
      <aside
        aria-label="Faculty notifications"
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-100 p-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Faculty Notifications</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Updates shared by your faculty</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading && <p className="py-8 text-center text-sm text-slate-500">Loading notifications…</p>}
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">{error}</p>}
          {!isLoading && !error && notifications.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No notifications yet</p>
              <p className="mt-1 text-xs text-slate-500">Faculty announcements will appear here.</p>
            </div>
          )}
          {notifications.map(notification => (
            <article key={notification.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h3>
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Faculty
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                {notification.message}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3 w-3" />
                {new Date(notification.updatedAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
};
