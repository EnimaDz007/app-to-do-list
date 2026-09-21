import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  Bell,
  BellRing,
  Volume2,
  Check,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Task } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import {
  exportTasksToJSON,
  exportTasksToCSV,
  importTasksFromJSON,
  importTasksFromCSV,
} from '../utils/dataTransfer';
import {
  isNotificationSupported,
  requestNotificationPermission,
  sendBrowserNotification,
  playAudioChime,
  getDueTasks,
} from '../utils/notifications';

interface DataHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImportTasks: (newTasks: Task[], mode: 'replace' | 'append') => void;
}

export const DataHubModal: React.FC<DataHubModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onImportTasks,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'notifications'>('export');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    return isNotificationSupported() ? Notification.permission : 'unsupported';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const dueTasks = getDueTasks(tasks);

  // Handle Export
  const handleExportJSON = () => {
    triggerHaptic('success');
    exportTasksToJSON(tasks);
    playAudioChime('beep');
  };

  const handleExportCSV = () => {
    triggerHaptic('success');
    exportTasksToCSV(tasks);
    playAudioChime('beep');
  };

  // Handle File Import
  const processFile = async (file: File) => {
    setImportError(null);
    setImportSuccess(null);
    try {
      let imported: Task[] = [];
      if (file.name.endsWith('.json') || file.type.includes('json')) {
        imported = await importTasksFromJSON(file);
      } else if (file.name.endsWith('.csv') || file.type.includes('csv')) {
        imported = await importTasksFromCSV(file);
      } else {
        throw new Error('Unsupported file format. Please upload a .json or .csv file.');
      }

      if (imported.length === 0) {
        throw new Error('No valid tasks were found in the uploaded file.');
      }

      triggerHaptic('success');
      playAudioChime('success');
      onImportTasks(imported, importMode);
      setImportSuccess(`Successfully imported ${imported.length} tasks (${importMode === 'replace' ? 'replaced existing' : 'added to list'})!`);
    } catch (err: unknown) {
      triggerHaptic('heavy');
      const message = err instanceof Error ? err.message : 'Failed to import file.';
      setImportError(message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so same file can be reselected if needed
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle Notification Permission
  const handleRequestPermission = async () => {
    triggerHaptic('medium');
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      playAudioChime('success');
      sendBrowserNotification('Notifications Activated! 🔔', {
        body: 'You will receive reminders for upcoming and high-priority tasks.',
      });
    }
  };

  const handleTestNotification = () => {
    triggerHaptic('light');
    playAudioChime('beep');
    const success = sendBrowserNotification('Task Priority Reminder', {
      body: `You have ${dueTasks.length} task(s) scheduled for today or overdue.`,
    });
    if (!success && notificationStatus !== 'granted') {
      handleRequestPermission();
    }
  };

  return (
    <div
      id="data-hub-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Data Tools & Reminders
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Native JS file export, import & browser alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('export');
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('import');
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import / Restore</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('notifications');
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminders</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-indigo-950 dark:text-indigo-200">
                  Total Records: {tasks.length} tasks
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Export your tasks locally anytime. No account or cloud sync required.
                </div>
              </div>

              {/* JSON Export Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Full JSON Backup (.json)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preserves all quadrants, metadata, timestamps and status.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* CSV Export Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Spreadsheet CSV (.csv)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Open in Excel, Google Sheets, or Apple Numbers.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Import Mode Radio */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`flex-1 py-1.5 rounded-xl transition cursor-pointer font-medium ${
                    importMode === 'append'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Append to Existing
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`flex-1 py-1.5 rounded-xl transition cursor-pointer font-medium ${
                    importMode === 'replace'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Replace All Tasks
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Drop your .json or .csv backup here
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  or click to browse from device
                </div>
              </div>

              {/* Status alerts */}
              {importSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS & REMINDERS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Browser Push Reminders
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Status: <strong className="capitalize text-slate-800 dark:text-slate-200">{notificationStatus}</strong>
                      </p>
                    </div>
                  </div>

                  {notificationStatus !== 'granted' ? (
                    <button
                      onClick={handleRequestPermission}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Enable
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Tasks Due Today or Overdue:
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {dueTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleTestNotification}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Send Test Notification</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      playAudioChime('beep');
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    title="Test Audio Chime"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-500" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
