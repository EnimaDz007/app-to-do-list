import React, { useState, useRef } from 'react';
import {
  X,
  Settings,
  Sun,
  Moon,
  LayoutGrid,
  Globe,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  Bell,
  Check,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Info,
  Volume2,
  Play,
} from 'lucide-react';
import { Task } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { useUIDesign, UI_DESIGNS } from '../hooks/useUIDesign';
import { useTheme } from '../context/ThemeContext';
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
  playAudioAlert,
  getSelectedAlertSound,
  setSelectedAlertSound,
  SOUND_ALERT_OPTIONS,
  SoundAlertId,
  getDueTasks,
} from '../utils/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImportTasks: (newTasks: Task[], mode: 'replace' | 'append') => void;
  onOpenInstallModal?: () => void;
}

type SettingsTab = 'general' | 'backup' | 'notifications' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onImportTasks,
  onOpenInstallModal,
}) => {
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { uiDesign, setUIDesign } = useUIDesign();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    return isNotificationSupported() ? Notification.permission : 'unsupported';
  });
  const [selectedSound, setSelectedSound] = useState<SoundAlertId>(() => getSelectedAlertSound());

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const dueTasks = getDueTasks(tasks);

  const handleSelectSound = (soundId: SoundAlertId) => {
    triggerHaptic('medium');
    setSelectedSound(soundId);
    setSelectedAlertSound(soundId);
    playAudioAlert(soundId);
  };

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
      setImportSuccess(
        `Successfully imported ${imported.length} task${imported.length === 1 ? '' : 's'} (${importMode === 'replace' ? 'replaced existing' : 'added to list'})!`
      );
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
    playAudioAlert(selectedSound);
    const success = sendBrowserNotification('Task Priority Reminder', {
      body: `You have ${dueTasks.length} task(s) scheduled for today or overdue.`,
    });
    if (!success && notificationStatus !== 'granted') {
      handleRequestPermission();
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: t('settings_tab_general' as any), icon: Sun },
    { id: 'backup', label: t('settings_tab_backup' as any), icon: Download },
    { id: 'notifications', label: t('settings_tab_notifications' as any), icon: Bell },
    { id: 'about', label: t('settings_tab_about' as any), icon: Info },
  ];

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="settings-modal-dialog"
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                {t('settings_modal_title' as any)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Task Priority
              </p>
            </div>
          </div>

          <button
            id="btn-close-settings"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sleek Segmented Control Tab Bar */}
        <div className="px-3 py-2 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-settings-${tab.id}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-xs transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                  <span className="truncate text-[11px] sm:text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: GENERAL (THEME & LANGUAGE) */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Appearance / Theme */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('settings_theme_title' as any)}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('settings_theme_desc' as any)}
                      </p>
                    </div>
                  </div>

                  <button
  id="btn-settings-toggle-theme"
  dir="ltr"
  onClick={() => {
    triggerHaptic('light');
    toggleTheme();
  }}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}
  role="switch"
  aria-checked={isDark}
>
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isDark ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

                          {/* 🎨 UI Layout Picker */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    UI Layout
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose your design style
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {UI_DESIGNS.map((design) => {
                  const isSelected = uiDesign === design.id;
                  return (
                    <button
                      key={design.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setUIDesign(design.id);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl p-2.5 transition text-left cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 ring-2 ring-indigo-500'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`text-lg flex-shrink-0 w-7 text-center ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        {design.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[11px] font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {design.name}
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                          {design.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

              {/* Language Picker */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('settings_lang_title' as any)}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('settings_lang_desc' as any)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {supportedLanguages.map((langOpt) => {
                    const isSelected = langOpt.code === language;
                    return (
                      <button
                        key={langOpt.code}
                        id={`btn-lang-${langOpt.code}`}
                        onClick={() => {
                          triggerHaptic('medium');
                          setLanguage(langOpt.code);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg leading-tight mb-1">{langOpt.flag}</span>
                        <span className="text-xs font-semibold">{langOpt.nativeName}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{langOpt.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA & BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-indigo-950 dark:text-indigo-200">
                  Total Records: {tasks.length} tasks
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Your tasks stay 100% private in local device storage. Export a backup file anytime.
                </div>
              </div>

              {/* JSON Export Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Full JSON Backup (.json)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preserves all quadrants, status, tags, and timestamps.
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-settings-export-json"
                    onClick={handleExportJSON}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* CSV Export Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Spreadsheet Export (.csv)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Compatible with Excel, Google Sheets & Notion.
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-settings-export-csv"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Import / Restore Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Import / Restore Tasks
                  </h4>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500">Mode:</span>
                    <button
                      id="btn-mode-append"
                      onClick={() => setImportMode('append')}
                      className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                        importMode === 'append'
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Append
                    </button>
                    <button
                      id="btn-mode-replace"
                      onClick={() => setImportMode('replace')}
                      className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                        importMode === 'replace'
                          ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Replace
                    </button>
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drop file here
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports .json backup and .csv</p>
                </div>

                {importSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                {importError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-amber-950 dark:text-amber-200">
                  Scheduled Tasks Due Today: {dueTasks.length}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Receive browser and native notifications for deadlines and high-priority items.
                </div>
              </div>

              {/* Status Row */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Alert Permissions
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Current status:{' '}
                      <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {notificationStatus}
                      </span>
                    </p>
                  </div>

                  {notificationStatus !== 'granted' ? (
                    <button
                      id="btn-enable-notifications"
                      onClick={handleRequestPermission}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Enable Alerts
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Active</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Test Sound & Alert Banner
                  </span>
                  <button
                    id="btn-test-alert"
                    onClick={handleTestNotification}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                  >
                    Send Test Alert
                  </button>
                </div>
              </div>

              {/* Sound Alert Tone Picker */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('settings_sound_title' as any)}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('settings_sound_desc' as any)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {SOUND_ALERT_OPTIONS.map((option) => {
                    const isSelected = selectedSound === option.id;
                    return (
                      <div
                        key={option.id}
                        id={`sound-option-${option.id}`}
                        onClick={() => handleSelectSound(option.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold truncate ${
                                  isSelected
                                    ? 'text-indigo-950 dark:text-indigo-200'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {option.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {option.tag}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {option.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          id={`btn-play-sound-${option.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            playAudioAlert(option.id);
                          }}
                          className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title={`Preview ${option.name}`}
                          aria-label={`Preview ${option.name}`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT & INSTALL */}
          {activeTab === 'about' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-amber-400 font-extrabold text-xl flex items-center justify-center ring-2 ring-amber-400/30 shadow-md">
                  TP
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Task Priority
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Mobile-first Eisenhower Matrix productivity engine for iOS, Android, and Desktop.
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>100% Offline & Local Storage</span>
                </div>
              </div>

              {onOpenInstallModal && (
                <button
                  id="btn-settings-install-pwa"
                  onClick={() => {
                    triggerHaptic('medium');
                    onClose();
                    onOpenInstallModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install App on Home Screen</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
          <button
            id="btn-settings-done"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};