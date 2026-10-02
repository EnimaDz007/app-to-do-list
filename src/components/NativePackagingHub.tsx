import React, { useState, useEffect } from 'react';
import {
  Smartphone, Bell, BellOff, Database, Download, Check, Copy,
  ChevronDown, ChevronUp, Activity, HardDrive, RefreshCw,
  Settings as SettingsIcon, Calendar, Target, Trophy, Sparkles,
  Terminal, Shield, AlertTriangle, Trash2,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { triggerHaptic } from '../utils/haptics';
import { Task, Habit, HabitCheckIn, Milestone } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  getNotificationPermissionStatus,
  playAudioChime,
  scheduleTestReminder,
  previewAlertSound,
} from '../utils/notifications';
import { exportTasksToJSON, exportTasksToCSV } from '../utils/dataTransfer';
import { generateICS, downloadICS } from '../utils/calendarSync';

interface NativePackagingHubProps {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  milestones: Milestone[];
  onOpenInstallModal: () => void;
  onOpenSettings: () => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  title: string;
  subtitle: string;
  refresh: string;
  platform: string;
  alerts: string;
  storage: string;
  tasks: string;
  habits: string;
  targets: string;
  doneSuffix: string;
  checkInsSuffix: string;
  keysStoredSuffix: string;
  quickActions: string;
  testNotification: string;
  testNotificationDesc: string;
  testFired: string;
  backupJson: string;
  backupDesc: string;
  exportIcs: string;
  exportIcsDesc: string;
  openSettings: string;
  openSettingsDesc: string;
  installTitle: string;
  installDesc: string;
  installBtn: string;
  hardReloadTitle: string;
  hardReloadDesc: string;
  hardReloadBtn: string;
  hardReloadBusy: string;
  hardReloadConfirm: string;
  buildRefTitle: string;
  buildRefDesc: string;
  buildIntroPrefix: string;
  buildIntroSuffix: string;
  android: string;
  ios: string;
  copied: string;
  copy: string;
  privacyBold: string;
  privacyRest: string;
  platformWeb: string;
  platformIos: string;
  platformAndroid: string;
  permGranted: string;
  permDenied: string;
  permPrompt: string;
}> = {
  en: {
    title: 'App Diagnostics',
    subtitle: 'Live status of your device and data',
    refresh: 'Refresh',
    platform: 'Platform',
    alerts: 'Alerts',
    storage: 'Storage',
    tasks: 'Tasks',
    habits: 'Habits',
    targets: 'Targets',
    doneSuffix: '{n} done',
    checkInsSuffix: '{n} check-ins',
    keysStoredSuffix: '{n} keys stored',
    quickActions: 'Quick Actions',
    testNotification: 'Test notification',
    testNotificationDesc: 'Fires in 5 seconds',
    testFired: '⏱️ Notification in 5s — lock the phone to see it',
    backupJson: 'Backup JSON',
    backupDesc: 'Full data export',
    exportIcs: 'Export .ics',
    exportIcsDesc: 'Google Calendar',
    openSettings: 'Open settings',
    openSettingsDesc: 'All preferences',
    installTitle: 'Install on this device',
    installDesc: 'Add to home screen for full-screen mode',
    installBtn: 'Install',
    hardReloadTitle: 'Hard reload',
    hardReloadDesc: 'Clears service worker cache & reloads',
    hardReloadBtn: 'Reload',
    hardReloadBusy: '…',
    hardReloadConfirm: 'Reload the app? Unsaved changes will be lost.',
    buildRefTitle: 'Build & package reference',
    buildRefDesc: 'iOS & Android CLI commands',
    buildIntroPrefix: 'These commands scaffold a native wrapper around the same web build. Change the domain in ',
    buildIntroSuffix: ' to your own.',
    android: '🤖 Android',
    ios: '🍎 iOS',
    copied: 'Copied',
    copy: 'Copy',
    privacyBold: '100% offline.',
    privacyRest: ' All your tasks, habits, and milestones stay on this device. No accounts, no tracking.',
    platformWeb: '🌐 Web',
    platformIos: '🍎 iOS',
    platformAndroid: '🤖 Android',
    permGranted: 'Granted',
    permDenied: 'Denied',
    permPrompt: 'Not yet',
  },
  fr: {
    title: 'Diagnostic de l’app',
    subtitle: 'État en direct de votre appareil et de vos données',
    refresh: 'Actualiser',
    platform: 'Plateforme',
    alerts: 'Alertes',
    storage: 'Stockage',
    tasks: 'Tâches',
    habits: 'Habitudes',
    targets: 'Objectifs',
    doneSuffix: '{n} terminées',
    checkInsSuffix: '{n} enregistrements',
    keysStoredSuffix: '{n} clés stockées',
    quickActions: 'Actions rapides',
    testNotification: 'Tester la notification',
    testNotificationDesc: 'Se déclenche dans 5 secondes',
    testFired: '⏱️ Notification dans 5 s — verrouillez le téléphone pour la voir',
    backupJson: 'Sauvegarde JSON',
    backupDesc: 'Export complet des données',
    exportIcs: 'Exporter .ics',
    exportIcsDesc: 'Google Agenda',
    openSettings: 'Ouvrir les paramètres',
    openSettingsDesc: 'Toutes les préférences',
    installTitle: 'Installer sur cet appareil',
    installDesc: 'Ajouter à l’écran d’accueil pour le mode plein écran',
    installBtn: 'Installer',
    hardReloadTitle: 'Rechargement forcé',
    hardReloadDesc: 'Vide le cache du service worker et recharge',
    hardReloadBtn: 'Recharger',
    hardReloadBusy: '…',
    hardReloadConfirm: 'Recharger l’application ? Les modifications non enregistrées seront perdues.',
    buildRefTitle: 'Référence build & packaging',
    buildRefDesc: 'Commandes CLI iOS & Android',
    buildIntroPrefix: 'Ces commandes génèrent un wrapper natif autour du même build web. Remplacez le domaine dans ',
    buildIntroSuffix: ' par le vôtre.',
    android: '🤖 Android',
    ios: '🍎 iOS',
    copied: 'Copié',
    copy: 'Copier',
    privacyBold: '100 % hors ligne.',
    privacyRest: ' Toutes vos tâches, habitudes et jalons restent sur cet appareil. Aucun compte, aucun suivi.',
    platformWeb: '🌐 Web',
    platformIos: '🍎 iOS',
    platformAndroid: '🤖 Android',
    permGranted: 'Accordée',
    permDenied: 'Refusée',
    permPrompt: 'Pas encore',
  },
  ar: {
    title: 'تشخيص التطبيق',
    subtitle: 'حالة جهازك وبياناتك المباشرة',
    refresh: 'تحديث',
    platform: 'المنصة',
    alerts: 'التنبيهات',
    storage: 'التخزين',
    tasks: 'المهام',
    habits: 'العادات',
    targets: 'الأهداف',
    doneSuffix: '{n} منجزة',
    checkInsSuffix: '{n} تسجيل',
    keysStoredSuffix: '{n} مفتاح مخزّن',
    quickActions: 'إجراءات سريعة',
    testNotification: 'اختبار الإشعار',
    testNotificationDesc: 'يُطلق خلال ٥ ثوانٍ',
    testFired: '⏱️ إشعار خلال ٥ ثوانٍ — اقفل الهاتف لرؤيته',
    backupJson: 'نسخة احتياطية JSON',
    backupDesc: 'تصدير كامل للبيانات',
    exportIcs: 'تصدير .ics',
    exportIcsDesc: 'تقويم Google',
    openSettings: 'فتح الإعدادات',
    openSettingsDesc: 'جميع التفضيلات',
    installTitle: 'تثبيت على هذا الجهاز',
    installDesc: 'أضف إلى الشاشة الرئيسية لوضع ملء الشاشة',
    installBtn: 'تثبيت',
    hardReloadTitle: 'إعادة تحميل قوية',
    hardReloadDesc: 'يمسح ذاكرة service worker ويعيد التحميل',
    hardReloadBtn: 'إعادة تحميل',
    hardReloadBusy: '…',
    hardReloadConfirm: 'إعادة تحميل التطبيق؟ ستفقد التغييرات غير المحفوظة.',
    buildRefTitle: 'مرجع البناء والتغليف',
    buildRefDesc: 'أوامر iOS & Android CLI',
    buildIntroPrefix: 'هذه الأوامر تُنشئ غلافاً أصلياً حول نفس بناء الويب. غيّر النطاق في ',
    buildIntroSuffix: ' إلى نطاقك.',
    android: '🤖 أندرويد',
    ios: '🍎 iOS',
    copied: 'تم النسخ',
    copy: 'نسخ',
    privacyBold: 'يعمل دون اتصال ١٠٠٪.',
    privacyRest: ' تبقى كل مهامك وعاداتك وأهدافك على هذا الجهاز. لا حسابات، لا تتبّع.',
    platformWeb: '🌐 ويب',
    platformIos: '🍎 iOS',
    platformAndroid: '🤖 أندرويد',
    permGranted: 'ممنوح',
    permDenied: 'مرفوض',
    permPrompt: 'لم يُطلب بعد',
  },
};

function permLabel(status: string, copy: typeof COPY.en): string {
  if (status === 'granted') return copy.permGranted;
  if (status === 'denied') return copy.permDenied;
  return copy.permPrompt;
}

const BUILD_COMMANDS = {
  android: `npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Task Priority" "com.yourdomain.taskpriority" --web-dir dist
npm run build
npx cap add android
npx cap open android`,
  ios: `npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Task Priority" "com.yourdomain.taskpriority" --web-dir dist
npm run build
npx cap add ios
npx cap open ios`,
};

function getStorageSize(): { bytes: number; keys: number } {
  let bytes = 0;
  let keys = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k) || '';
      bytes += k.length + v.length;
      keys++;
    }
  } catch { /* noop */ }
  return { bytes, keys };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const NativePackagingHub: React.FC<NativePackagingHubProps> = ({
  tasks,
  habits,
  checkIns,
  milestones,
  onOpenInstallModal,
  onOpenSettings,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const [permStatus, setPermStatus] = useState<string>('prompt');
  const [storage, setStorage] = useState<{ bytes: number; keys: number }>({ bytes: 0, keys: 0 });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [showAndroid, setShowAndroid] = useState(true);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const refresh = () => {
    setPermStatus(getNotificationPermissionStatus());
    setStorage(getStorageSize());
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  const platformLabel =
    platform === 'web' ? copy.platformWeb :
    platform === 'ios' ? copy.platformIos :
    copy.platformAndroid;

  const activeTasks = tasks.filter((t) => t.status !== 'completed' && !t.archivedAt).length;
  const doneTasks = tasks.filter((t) => t.status === 'completed').length;
  const activeHabits = habits.filter((h) => !h.archivedAt).length;
  const activeMilestones = milestones.filter((m) => !m.archivedAt).length;

  const handleCopy = (text: string, key: string) => {
    triggerHaptic('light');
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { /* noop */ }
  };

  const handleTestNotification = () => {
    triggerHaptic('medium');
    previewAlertSound('chime');
    const candidate = tasks.find(
      (t) => t.quadrant === 'do_first' && t.status !== 'completed' && !t.archivedAt
    );
    scheduleTestReminder(candidate || null);
    setTestMsg(copy.testFired);
    setTimeout(() => setTestMsg(null), 5000);
  };

  const handleExportAll = () => {
    triggerHaptic('success');
    try {
      exportTasksToJSON(tasks);
      playAudioChime('success');
    } catch { /* noop */ }
  };

  const handleExportICS = () => {
    triggerHaptic('success');
    try {
      const content = generateICS(tasks);
      downloadICS(content, 'task-priority.ics');
      playAudioChime('beep');
    } catch { /* noop */ }
  };

  const handleHardReload = async () => {
    if (!window.confirm(copy.hardReloadConfirm)) return;
    triggerHaptic('medium');
    setClearing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } catch { /* noop */ }
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <div id="app-diagnostics" className="space-y-3.5 pb-6">

      {/* ===== Status Card ===== */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-4 shadow-md text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <h3 className="text-sm font-bold text-white">{copy.title}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {copy.subtitle}
            </p>
          </div>
          <button
            onClick={() => { refresh(); triggerHaptic('light'); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={copy.refresh}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">{copy.platform}</div>
            <div className="text-slate-200 text-[11px] font-semibold mt-0.5">
              {platformLabel}
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">{copy.alerts}</div>
            <div className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${
              permStatus === 'granted' ? 'text-emerald-400' :
              permStatus === 'denied' ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {permStatus === 'granted' ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              <span>{permLabel(permStatus, copy)}</span>
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">{copy.storage}</div>
            <div className="text-slate-200 text-[11px] font-semibold mt-0.5 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-indigo-400" />
              {formatBytes(storage.bytes)}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Data Summary ===== */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3 h-3" />
            {copy.tasks}
          </div>
          <div className="mt-1 text-xl font-black text-slate-900 dark:text-white leading-none">
            {activeTasks}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {copy.doneSuffix.replace('{n}', String(doneTasks))}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Target className="w-3 h-3" />
            {copy.habits}
          </div>
          <div className="mt-1 text-xl font-black text-slate-900 dark:text-white leading-none">
            {activeHabits}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {copy.checkInsSuffix.replace('{n}', String(checkIns.length))}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Trophy className="w-3 h-3" />
            {copy.targets}
          </div>
          <div className="mt-1 text-xl font-black text-slate-900 dark:text-white leading-none">
            {activeMilestones}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {copy.keysStoredSuffix.replace('{n}', String(storage.keys))}
          </div>
        </div>
      </div>

      {/* ===== Quick Actions ===== */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-start">
          {copy.quickActions}
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTestNotification}
            className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-start transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 leading-tight">
                {copy.testNotification}
              </div>
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">
                {copy.testNotificationDesc}
              </div>
            </div>
          </button>

          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-start transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
                {copy.backupJson}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                {copy.backupDesc}
              </div>
            </div>
          </button>

          <button
            onClick={handleExportICS}
            className="flex items-center gap-2 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-950/60 border border-sky-200 dark:border-sky-900/60 text-start transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-sky-900 dark:text-sky-200 leading-tight">
                {copy.exportIcs}
              </div>
              <div className="text-[10px] text-sky-600 dark:text-sky-400 truncate">
                {copy.exportIcsDesc}
              </div>
            </div>
          </button>

          <button
            onClick={() => { triggerHaptic('light'); onOpenSettings(); }}
            className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-start transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-700 dark:bg-slate-600 text-white flex items-center justify-center shrink-0">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-900 dark:text-slate-200 leading-tight">
                {copy.openSettings}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {copy.openSettingsDesc}
              </div>
            </div>
          </button>
        </div>

        {testMsg && (
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span>{testMsg}</span>
          </div>
        )}
      </div>

      {/* ===== PWA Install (only when applicable) ===== */}
      {!isNative && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-start">
              <h4 className="text-[12px] font-bold text-slate-900 dark:text-white">
                {copy.installTitle}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {copy.installDesc}
              </p>
            </div>
            <button
              onClick={() => { triggerHaptic('medium'); onOpenInstallModal(); }}
              className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              {copy.installBtn}
            </button>
          </div>
        </div>
      )}

      {/* ===== Safety ===== */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <h4 className="text-[12px] font-bold text-slate-900 dark:text-white">
              {copy.hardReloadTitle}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {copy.hardReloadDesc}
            </p>
          </div>
          <button
            onClick={handleHardReload}
            disabled={clearing}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-[11px] font-bold transition cursor-pointer shrink-0"
          >
            {clearing ? copy.hardReloadBusy : copy.hardReloadBtn}
          </button>
        </div>
      </div>

      {/* ===== Build Reference (collapsed) ===== */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <button
          onClick={() => { triggerHaptic('light'); setShowBuild((v) => !v); }}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-slate-100 flex items-center justify-center shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="text-start">
              <div className="text-[12px] font-bold text-slate-900 dark:text-white">
                {copy.buildRefTitle}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {copy.buildRefDesc}
              </div>
            </div>
          </div>
          {showBuild ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showBuild && (
          <div className="px-3.5 pb-3.5 space-y-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-3 leading-relaxed text-start">
              {copy.buildIntroPrefix}
              <code className="text-indigo-600 dark:text-indigo-400">appId</code>
              {copy.buildIntroSuffix}
            </p>

            {/* Android */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => { triggerHaptic('light'); setShowAndroid(true); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold transition cursor-pointer ${
                  showAndroid
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{copy.android}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(BUILD_COMMANDS.android, 'android-cmd');
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 transition cursor-pointer"
                >
                  {copiedKey === 'android-cmd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'android-cmd' ? copy.copied : copy.copy}
                </button>
              </button>
              {showAndroid && (
                <div dir="ltr" className="bg-slate-950 p-3 font-mono text-[10.5px] text-emerald-300 overflow-x-auto">
                  <pre>{BUILD_COMMANDS.android}</pre>
                </div>
              )}
            </div>

            {/* iOS */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => { triggerHaptic('light'); setShowAndroid(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold transition cursor-pointer ${
                  !showAndroid
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{copy.ios}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(BUILD_COMMANDS.ios, 'ios-cmd');
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 transition cursor-pointer"
                >
                  {copiedKey === 'ios-cmd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'ios-cmd' ? copy.copied : copy.copy}
                </button>
              </button>
              {!showAndroid && (
                <div dir="ltr" className="bg-slate-950 p-3 font-mono text-[10.5px] text-sky-300 overflow-x-auto">
                  <pre>{BUILD_COMMANDS.ios}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== Privacy notice ===== */}
      <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-snug text-start">
          <span className="font-bold">{copy.privacyBold}</span>
          {copy.privacyRest}
        </div>
      </div>
    </div>
  );
};