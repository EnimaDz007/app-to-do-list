// ─────────────────────────────────────────────────────────────
//  FILE: src/components/SettingsModal.tsx
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from 'capacitor-clerk';
import {
  X, Settings, Sun, Moon, Globe, Download, Upload,
  FileSpreadsheet, FileCode, Bell, Check, AlertCircle, ShieldCheck,
  Smartphone, Info, Volume2, Play, Clock, Sunrise, AlarmClock,
  CalendarPlus, CalendarCheck, RefreshCw, Link2, LogOut, User as UserIcon,
  HardDriveDownload, HardDriveUpload, AlertTriangle, Trash2,
} from 'lucide-react';
import { Task, Habit, HabitCheckIn, Milestone, Project, Template } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TranslationKey } from '../i18n/translations';
import { AppLogo } from './AppLogo';
import {
  exportTasksToJSON, exportTasksToCSV, importTasksFromJSON, importTasksFromCSV,
} from '../utils/dataTransfer';
import {
  buildFullBackup, downloadFullBackup, readFullBackupFile, summarizeBackup, FullBackup, FullBackupData,
} from '../utils/fullBackup';
import {
  isNotificationSupported, requestNotificationPermission, sendBrowserNotification,
  playAudioChime, playAudioAlert, getSelectedAlertSound, setSelectedAlertSound,
  SOUND_ALERT_OPTIONS, SoundAlertId, getDueTasks,
  getNotificationPermissionStatus, unlockAudio, previewAlertSound,
  scheduleTestReminder,
} from '../utils/notifications';
import { DailyDigestConfig, buildTodayPreview } from '../utils/dailyDigest';
import { EscalationConfig, EscalationIntensity } from '../utils/escalatingNags';
import { generateICS, parseICS, eventsToTasks, downloadICS } from '../utils/calendarSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImportTasks: (newTasks: Task[], mode: 'replace' | 'append') => void;
  onOpenInstallModal?: () => void;
  dailyDigest: DailyDigestConfig;
  onChangeDailyDigest: (next: DailyDigestConfig) => void;
  escalation: EscalationConfig;
  onChangeEscalation: (next: EscalationConfig) => void;
  onSyncNow?: () => void | Promise<void>;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  syncCounts?: { tasks: number; habits: number; checkIns: number; milestones: number };
  fullBackupData?: FullBackupData;
  onRestoreFullBackup?: (backup: FullBackup) => void;
  onResetEverything?: () => void;
}

type SettingsTab = 'general' | 'backup' | 'sync' | 'notifications' | 'about';
type LocalLang = 'en' | 'fr' | 'ar';
type HourFormat = '24' | '12';

const HOUR_FORMAT_KEY = 'taskflow_hour_format';

const SYNC_COPY: Record<LocalLang, {
  tab: string;
  title: string;
  desc: string;
  signedInAs: string;
  signOut: string;
  accountHint: string;
  stateSyncing: string;
  stateIssue: string;
  stateOk: string;
  lastSyncedPrefix: string;
  syncNow: string;
  never: string;
  justNow: string;
  minAgo: (n: number) => string;
  hrAgo: (n: number) => string;
  hrsAgo: (n: number) => string;
  dayAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  taskOne: string;
  taskMany: string;
  habitOne: string;
  habitMany: string;
  milestoneOne: string;
  milestoneMany: string;
}> = {
  en: {
    tab: 'Sync',
    title: 'Sync across devices',
    desc: 'Sign in to carry your tasks and theme to any device.',
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
    accountHint: 'Your tasks sync automatically to this account. Sign in with the same account on any device to see them.',
    stateSyncing: 'Syncing…',
    stateIssue: 'Sync issue',
    stateOk: 'Up to date',
    lastSyncedPrefix: 'Last synced:',
    syncNow: 'Sync now',
    never: 'Never',
    justNow: 'Just now',
    minAgo: (n) => `${n} min ago`,
    hrAgo: (n) => `${n} hr ago`,
    hrsAgo: (n) => `${n} hrs ago`,
    dayAgo: (n) => `${n} day ago`,
    daysAgo: (n) => `${n} days ago`,
    taskOne: 'task',
    taskMany: 'tasks',
    habitOne: 'habit',
    habitMany: 'habits',
    milestoneOne: 'milestone',
    milestoneMany: 'milestones',
  },
  fr: {
    tab: 'Synchro',
    title: 'Synchroniser entre appareils',
    desc: 'Connectez-vous pour retrouver vos tâches sur tous vos appareils.',
    signedInAs: 'Connecté en tant que',
    signOut: 'Se déconnecter',
    accountHint: 'Vos tâches se synchronisent automatiquement sur ce compte. Connectez-vous avec le même compte sur n\u2019importe quel appareil pour les retrouver.',
    stateSyncing: 'Synchronisation…',
    stateIssue: 'Problème de synchro',
    stateOk: 'À jour',
    lastSyncedPrefix: 'Dernière synchro :',
    syncNow: 'Synchroniser',
    never: 'Jamais',
    justNow: "À l'instant",
    minAgo: (n) => `il y a ${n} min`,
    hrAgo: (n) => `il y a ${n} h`,
    hrsAgo: (n) => `il y a ${n} h`,
    dayAgo: (n) => `il y a ${n} jour`,
    daysAgo: (n) => `il y a ${n} jours`,
    taskOne: 'tâche',
    taskMany: 'tâches',
    habitOne: 'habitude',
    habitMany: 'habitudes',
    milestoneOne: 'jalon',
    milestoneMany: 'jalons',
  },
  ar: {
    tab: 'المزامنة',
    title: 'المزامنة بين الأجهزة',
    desc: 'سجّل الدخول لنقل مهامك إلى أي جهاز.',
    signedInAs: 'مسجّل الدخول باسم',
    signOut: 'تسجيل الخروج',
    accountHint: 'مهامك تتزامن تلقائياً مع هذا الحساب. سجّل الدخول بنفس الحساب على أي جهاز لعرضها.',
    stateSyncing: 'جارٍ المزامنة…',
    stateIssue: 'مشكلة في المزامنة',
    stateOk: 'محدَّث',
    lastSyncedPrefix: 'آخر مزامنة:',
    syncNow: 'زامن الآن',
    never: 'أبداً',
    justNow: 'الآن',
    minAgo: (n) => `قبل ${n} دقيقة`,
    hrAgo: (n) => `قبل ${n} ساعة`,
    hrsAgo: (n) => `قبل ${n} ساعات`,
    dayAgo: (n) => `قبل ${n} يوم`,
    daysAgo: (n) => `قبل ${n} أيام`,
    taskOne: 'مهمة',
    taskMany: 'مهام',
    habitOne: 'عادة',
    habitMany: 'عادات',
    milestoneOne: 'إنجاز',
    milestoneMany: 'إنجازات',
  },
};

const FULL_BACKUP_COPY: Record<LocalLang, {
  cardTitle: string;
  cardDesc: string;
  download: string;
  downloadHint: string;
  restore: string;
  restoreHint: string;
  restoreConfirmTitle: string;
  restoreConfirmBody: (counts: { tasks: number; habits: number; projects: number }) => string;
  restoreConfirmBtn: string;
  restoreSuccess: string;
  restoreFailed: (msg: string) => string;
  invalidFile: string;
  dangerTitle: string;
  dangerDesc: string;
  resetBtn: string;
  resetConfirmTitle: string;
  resetConfirmBody: string;
  resetTypeHint: string;
  resetTypePlaceholder: string;
  resetConfirmKeyword: string;
  resetConfirmBtn: string;
  cancel: string;
}> = {
  en: {
    cardTitle: 'Full account backup',
    cardDesc: 'Save everything — tasks, habits, milestones, projects, and settings — in one file.',
    download: 'Download backup',
    downloadHint: 'Includes all data across every tab.',
    restore: 'Restore from file',
    restoreHint: 'Replaces everything with the contents of the file.',
    restoreConfirmTitle: 'Restore from this backup?',
    restoreConfirmBody: (c) =>
      `This will replace ALL current data. Backup contains ${c.tasks} task${c.tasks === 1 ? '' : 's'}, ${c.habits} habit${c.habits === 1 ? '' : 's'}, and ${c.projects} project${c.projects === 1 ? '' : 's'}.`,
    restoreConfirmBtn: 'Restore',
    restoreSuccess: 'Backup restored — syncing to server…',
    restoreFailed: (msg) => `Restore failed: ${msg}`,
    invalidFile: 'This file is not a valid Task Priority backup.',
    dangerTitle: 'Danger zone',
    dangerDesc: 'Permanently delete all your data from this device. Your server data will be resynced.',
    resetBtn: 'Reset all data',
    resetConfirmTitle: 'Reset everything?',
    resetConfirmBody: 'This deletes all tasks, habits, milestones, and projects from this device. It cannot be undone.',
    resetTypeHint: 'Type DELETE below to confirm.',
    resetTypePlaceholder: 'DELETE',
    resetConfirmKeyword: 'DELETE',
    resetConfirmBtn: 'Reset all data',
    cancel: 'Cancel',
  },
  fr: {
    cardTitle: 'Sauvegarde complète',
    cardDesc: 'Enregistrez tout — tâches, habitudes, jalons, projets et réglages — dans un seul fichier.',
    download: 'Télécharger',
    downloadHint: 'Inclut toutes les données de chaque onglet.',
    restore: 'Restaurer',
    restoreHint: 'Remplace tout par le contenu du fichier.',
    restoreConfirmTitle: 'Restaurer depuis cette sauvegarde ?',
    restoreConfirmBody: (c) =>
      `Cela remplacera TOUTES les données actuelles. La sauvegarde contient ${c.tasks} tâche${c.tasks === 1 ? '' : 's'}, ${c.habits} habitude${c.habits === 1 ? '' : 's'} et ${c.projects} projet${c.projects === 1 ? '' : 's'}.`,
    restoreConfirmBtn: 'Restaurer',
    restoreSuccess: 'Sauvegarde restaurée — synchronisation…',
    restoreFailed: (msg) => `Échec de la restauration : ${msg}`,
    invalidFile: 'Ce fichier n\u2019est pas une sauvegarde Task Priority valide.',
    dangerTitle: 'Zone de danger',
    dangerDesc: 'Supprime définitivement toutes vos données de cet appareil. Les données serveur seront resynchronisées.',
    resetBtn: 'Tout réinitialiser',
    resetConfirmTitle: 'Tout réinitialiser ?',
    resetConfirmBody: 'Cela supprime toutes les tâches, habitudes, jalons et projets de cet appareil. Action irréversible.',
    resetTypeHint: 'Tapez DELETE ci-dessous pour confirmer.',
    resetTypePlaceholder: 'DELETE',
    resetConfirmKeyword: 'DELETE',
    resetConfirmBtn: 'Tout réinitialiser',
    cancel: 'Annuler',
  },
  ar: {
    cardTitle: 'نسخة احتياطية كاملة',
    cardDesc: 'احفظ كل شيء — المهام والعادات والإنجازات والمشاريع والإعدادات — في ملف واحد.',
    download: 'تنزيل النسخة',
    downloadHint: 'يشمل جميع البيانات في كل تبويب.',
    restore: 'استعادة من ملف',
    restoreHint: 'يستبدل كل شيء بمحتوى الملف.',
    restoreConfirmTitle: 'استعادة من هذه النسخة؟',
    restoreConfirmBody: (c) =>
      `سيؤدي هذا إلى استبدال كل البيانات الحالية. النسخة تحتوي على ${c.tasks} مهمة و${c.habits} عادة و${c.projects} مشروع.`,
    restoreConfirmBtn: 'استعادة',
    restoreSuccess: 'تمت الاستعادة — جارٍ المزامنة…',
    restoreFailed: (msg) => `فشلت الاستعادة: ${msg}`,
    invalidFile: 'هذا الملف ليس نسخة احتياطية صالحة.',
    dangerTitle: 'منطقة الخطر',
    dangerDesc: 'حذف جميع بياناتك نهائياً من هذا الجهاز. ستُعاد مزامنة بيانات الخادم.',
    resetBtn: 'إعادة تعيين كل شيء',
    resetConfirmTitle: 'إعادة تعيين كل شيء؟',
    resetConfirmBody: 'سيحذف هذا جميع المهام والعادات والإنجازات والمشاريع من هذا الجهاز. لا يمكن التراجع.',
    resetTypeHint: 'اكتب DELETE أدناه للتأكيد.',
    resetTypePlaceholder: 'DELETE',
    resetConfirmKeyword: 'DELETE',
    resetConfirmBtn: 'إعادة التعيين',
    cancel: 'إلغاء',
  },
};

const SOUND_TRANSLATIONS: Record<LocalLang, Record<string, { name: string; description: string; tag: string }>> = {
  en: {
    'Silent':        { name: 'Silent',        description: 'Visual banner only, no sound',     tag: 'Off' },
    'Classic Beep':  { name: 'Classic Beep',  description: 'Short single tone',                tag: 'Default' },
    'Soft Chime':    { name: 'Soft Chime',    description: 'Pleasant two-note chime',          tag: 'Gentle' },
    'Success':       { name: 'Success',       description: 'Rising three-note arpeggio',       tag: 'Upbeat' },
    'Urgent Alert':  { name: 'Urgent Alert',  description: 'Double high-pitched alert',        tag: 'Loud' },
  },
  fr: {
    'Silent':        { name: 'Silencieux',      description: 'Bannière visuelle uniquement, aucun son', tag: 'Off' },
    'Classic Beep':  { name: 'Bip classique',   description: 'Tonalité courte unique',                  tag: 'Défaut' },
    'Soft Chime':    { name: 'Carillon doux',   description: 'Carillon agréable à deux notes',          tag: 'Doux' },
    'Success':       { name: 'Succès',          description: 'Arpège montant à trois notes',            tag: 'Entraînant' },
    'Urgent Alert':  { name: 'Alerte urgente',  description: 'Double alerte aiguë',                     tag: 'Fort' },
  },
  ar: {
    'Silent':        { name: 'صامت',              description: 'شريط مرئي فقط',              tag: 'إيقاف' },
    'Classic Beep':  { name: 'صفير كلاسيكي',      description: 'نغمة قصيرة',                 tag: 'افتراضي' },
    'Soft Chime':    { name: 'رنين ناعم',         description: 'رنين لطيف بنغمتين',          tag: 'هادئ' },
    'Success':       { name: 'نجاح',              description: 'نغمات صاعدة',                tag: 'متفائل' },
    'Urgent Alert':  { name: 'تنبيه عاجل',        description: 'تنبيه مزدوج حاد',            tag: 'عالٍ' },
  },
};

const PERM_LABELS: Record<LocalLang, Record<string, string>> = {
  en: { granted: 'Granted', denied: 'Denied', prompt: 'Not yet asked', default: 'Default' },
  fr: { granted: 'Accordée', denied: 'Refusée', prompt: 'Pas encore demandée', default: 'Par défaut' },
  ar: { granted: 'ممنوح', denied: 'مرفوض', prompt: 'لم يُطلب بعد', default: 'افتراضي' },
};

const TIME_COPY: Record<LocalLang, { am: string; pm: string; h24: string; h12: string; switchTo24: string; switchTo12: string }> = {
  en: { am: 'AM', pm: 'PM', h24: '24h', h12: 'AM/PM', switchTo24: 'Switch to 24-hour', switchTo12: 'Switch to AM/PM' },
  fr: { am: 'AM', pm: 'PM', h24: '24h', h12: 'AM/PM', switchTo24: 'Passer au format 24h', switchTo12: 'Passer au format AM/PM' },
  ar: { am: 'ص', pm: 'م', h24: '٢٤س', h12: 'ص/م', switchTo24: '٢٤ ساعة', switchTo12: 'ص/م' },
};

/* ── Language-aware relative time ─────────────────────────── */
function formatRelative(iso: string | null | undefined, copy: typeof SYNC_COPY.en): string {
  if (!iso) return copy.never;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return copy.never;
  const diff = Date.now() - then;
  if (diff < 0) return copy.justNow;
  const s = Math.floor(diff / 1000);
  if (s < 45) return copy.justNow;
  const m = Math.floor(s / 60);
  if (m < 60) return copy.minAgo(m);
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? copy.hrAgo(h) : copy.hrsAgo(h);
  const d = Math.floor(h / 24);
  return d === 1 ? copy.dayAgo(d) : copy.daysAgo(d);
}

/* ── Language-aware count ─────────────────────────────────── */
function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function translateSoundOption(
  option: { id: SoundAlertId; name: string; description: string; tag: string },
  lang: LocalLang
): { name: string; description: string; tag: string } {
  const map = SOUND_TRANSLATIONS[lang] ?? SOUND_TRANSLATIONS.en;
  return map[option.name] ?? { name: option.name, description: option.description, tag: option.tag };
}

function translatePerm(status: string, lang: LocalLang): string {
  const map = PERM_LABELS[lang] ?? PERM_LABELS.en;
  return map[status] ?? status;
}

function readHourFormat(): HourFormat {
  try {
    const v = localStorage.getItem(HOUR_FORMAT_KEY);
    return v === '12' ? '12' : '24';
  } catch {
    return '24';
  }
}

function parseTimeString(s: string): { hour24: number; minute: number } {
  const [h, m] = (s || '08:00').split(':').map((n) => parseInt(n, 10));
  return {
    hour24: isNaN(h) ? 8 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

function toTimeString(hour24: number, minute: number): string {
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, tasks, onImportTasks, onOpenInstallModal,
  dailyDigest, onChangeDailyDigest,
  escalation, onChangeEscalation,
  onSyncNow, isSyncing = false, lastSyncedAt = null, syncError = null,
  syncCounts,
  fullBackupData,
  onRestoreFullBackup,
  onResetEverything,
}) => {
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isDark = theme === 'dark';
  const lang = (language as LocalLang) || 'en';
  const isRtl = lang === 'ar';
  const timeCopy = TIME_COPY[lang] ?? TIME_COPY.en;
  const syncCopy = SYNC_COPY[lang] ?? SYNC_COPY.en;
  const fbCopy = FULL_BACKUP_COPY[lang] ?? FULL_BACKUP_COPY.en;

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string>(() =>
    getNotificationPermissionStatus()
  );
  const [selectedSound, setSelectedSound] = useState<SoundAlertId>(() => getSelectedAlertSound());
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [icsMessage, setIcsMessage] = useState<string | null>(null);
  const [hourFormat, setHourFormat] = useState<HourFormat>(() => readHourFormat());

  const [pendingRestore, setPendingRestore] = useState<FullBackup | null>(null);
  const [fullRestoreMsg, setFullRestoreMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTyped, setResetTyped] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);
  const fullBackupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) unlockAudio();
  }, [isOpen]);

  useEffect(() => {
    try { localStorage.setItem(HOUR_FORMAT_KEY, hourFormat); } catch { /* noop */ }
  }, [hourFormat]);

  if (!isOpen) return null;

  const dueTasks = getDueTasks(tasks);
  const digestPreview = buildTodayPreview(tasks);

  const { hour24: digestHour, minute: digestMinute } = parseTimeString(dailyDigest.time);
  const digestIsPm = digestHour >= 12;
  const digestH12 = digestHour % 12 === 0 ? 12 : digestHour % 12;

  const setDigestHour24 = (h: number) => onChangeDailyDigest({ ...dailyDigest, time: toTimeString(h, digestMinute) });
  const setDigestMinute = (m: number) => onChangeDailyDigest({ ...dailyDigest, time: toTimeString(digestHour, m) });
  const setDigestHour12 = (h12v: number) => { let h24 = h12v % 12; if (digestIsPm) h24 += 12; setDigestHour24(h24); };
  const setDigestAmPm = (pm: boolean) => { let h24 = digestHour % 12; if (pm) h24 += 12; setDigestHour24(h24); };

  const hours24 = Array.from({ length: 24 }, (_, i) => i);
  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const ESCALATION_PRESETS: { id: EscalationIntensity; label: string; description: string }[] = [
    { id: 'off',        label: t('esc_off'),        description: t('esc_off_desc') },
    { id: 'gentle',     label: t('esc_gentle'),     description: t('esc_gentle_desc') },
    { id: 'normal',     label: t('esc_normal'),     description: t('esc_normal_desc') },
    { id: 'aggressive', label: t('esc_aggressive'), description: t('esc_aggressive_desc') },
  ];

  const handleSelectSound = (soundId: SoundAlertId) => {
    triggerHaptic('medium');
    setSelectedSound(soundId);
    setSelectedAlertSound(soundId);
    previewAlertSound(soundId);
  };

  const handleExportJSON = () => { triggerHaptic('success'); exportTasksToJSON(tasks); playAudioChime('beep'); };
  const handleExportCSV = () => { triggerHaptic('success'); exportTasksToCSV(tasks); playAudioChime('beep'); };
  const handleExportICS = () => { triggerHaptic('success'); const content = generateICS(tasks); downloadICS(content, 'task-priority.ics'); playAudioChime('beep'); };

  const handleDownloadFullBackup = () => {
    if (!fullBackupData) return;
    triggerHaptic('success');
    const backup = buildFullBackup(fullBackupData);
    downloadFullBackup(backup);
    playAudioChime('success');
  };

  const handleFullRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFullRestoreMsg(null);
    try {
      const backup = await readFullBackupFile(file);
      setPendingRestore(backup);
    } catch (err) {
      triggerHaptic('heavy');
      const msg = err instanceof Error ? err.message : 'unknown';
      setFullRestoreMsg({
        kind: 'err',
        text: msg === 'INVALID_JSON' || msg === 'INVALID_SHAPE' || msg === 'MISSING_VERSION' || msg === 'MISSING_DATA'
          ? fbCopy.invalidFile
          : fbCopy.restoreFailed(msg),
      });
      setTimeout(() => setFullRestoreMsg(null), 6000);
    }
  };

  const confirmFullRestore = () => {
    if (!pendingRestore) return;
    triggerHaptic('success');
    onRestoreFullBackup?.(pendingRestore);
    setFullRestoreMsg({ kind: 'ok', text: fbCopy.restoreSuccess });
    setPendingRestore(null);
    setTimeout(() => setFullRestoreMsg(null), 4000);
  };

  const handleICSFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIcsMessage(null);
    try {
      const text = await file.text();
      const events = parseICS(text);
      if (events.length === 0) { setIcsMessage(t('ics_no_events')); setTimeout(() => setIcsMessage(null), 5000); return; }
      const newTasks = eventsToTasks(events, tasks);
      if (newTasks.length === 0) { setIcsMessage(t('ics_duplicates', { events: events.length })); setTimeout(() => setIcsMessage(null), 6000); return; }
      triggerHaptic('success'); playAudioChime('success');
      onImportTasks(newTasks, 'append');
      setIcsMessage(t('ics_imported', { imported: newTasks.length, skipped: events.length - newTasks.length }));
      setTimeout(() => setIcsMessage(null), 6000);
    } catch { triggerHaptic('heavy'); setIcsMessage(t('ics_failed')); setTimeout(() => setIcsMessage(null), 5000); }
  };

  const processFile = async (file: File) => {
    setImportError(null); setImportSuccess(null);
    try {
      let imported: Task[] = [];
      if (file.name.endsWith('.json') || file.type.includes('json')) imported = await importTasksFromJSON(file);
      else if (file.name.endsWith('.csv') || file.type.includes('csv')) imported = await importTasksFromCSV(file);
      else throw new Error(t('backup_error_format'));
      if (imported.length === 0) throw new Error(t('backup_error_empty'));
      triggerHaptic('success'); playAudioChime('success');
      onImportTasks(imported, importMode);
      const modeLabel = importMode === 'replace' ? t('backup_success_replaced') : t('backup_success_appended');
      setImportSuccess(t('backup_success', { count: imported.length, mode: modeLabel }));
    } catch (err: unknown) {
      triggerHaptic('heavy');
      const message = err instanceof Error ? err.message : t('backup_error_generic');
      setImportError(message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); };

  const handleRequestPermission = async () => {
    triggerHaptic('medium');
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') { playAudioChime('success'); sendBrowserNotification(t('notif_activated_title'), { body: t('notif_activated_body') }); }
    else if (perm === 'denied') { setImportError(t('notif_denied_hint')); }
  };

  const handleTestNotification = () => {
    triggerHaptic('light');
    previewAlertSound(selectedSound);
    const success = sendBrowserNotification(t('notif_reminder_title'), { body: t('notif_reminder_body', { count: dueTasks.length }) });
    if (!success && notificationStatus !== 'granted') handleRequestPermission();
  };

  const handleTestIn5s = () => {
    triggerHaptic('medium');
    const candidate = tasks.find((tk) => tk.quadrant === 'do_first' && tk.status !== 'completed' && !tk.archivedAt);
    scheduleTestReminder(candidate || null);
    if (candidate) setTestMessage(t('notif_test_5s_msg_task', { title: candidate.title }));
    else setTestMessage(t('notif_test_5s_msg_no_task'));
    setTimeout(() => setTestMessage(null), 6000);
  };

  const handleToggleDigest = () => { triggerHaptic('medium'); onChangeDailyDigest({ ...dailyDigest, enabled: !dailyDigest.enabled }); };
  const toggleHourFormat = () => { triggerHaptic('light'); setHourFormat((v) => (v === '24' ? '12' : '24')); };
  const handleEscalationChange = (intensity: EscalationIntensity) => { triggerHaptic('medium'); onChangeEscalation({ intensity }); };

  const handleSignOut = async () => {
    triggerHaptic('medium');
    try {
      await signOut({ redirectUrl: '/' });
    } catch (err) {
      console.warn('Sign out failed:', err);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: t('settings_tab_general'), icon: Sun },
    { id: 'backup', label: t('settings_tab_backup'), icon: Download },
    { id: 'sync', label: syncCopy.tab, icon: Link2 },
    { id: 'notifications', label: t('settings_tab_notifications'), icon: Bell },
    { id: 'about', label: t('settings_tab_about'), icon: Info },
  ];

  const primaryEmail = user?.primaryEmailAddress?.emailAddress || '';
  const displayName = user?.fullName || user?.firstName || user?.username || primaryEmail || 'User';
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const counts = syncCounts ?? { tasks: tasks.length, habits: 0, checkIns: 0, milestones: 0 };

  const hasFullBackup = !!fullBackupData && !!onRestoreFullBackup;
  const canReset = !!onResetEverything;
  const resetReady = resetTyped.trim().toUpperCase() === fbCopy.resetConfirmKeyword;

  const syncStatusText = isSyncing
    ? syncCopy.stateSyncing
    : syncError
    ? syncCopy.stateIssue
    : syncCopy.stateOk;

  const lastSyncedText = syncError
    ? syncError
    : `${syncCopy.lastSyncedPrefix} ${formatRelative(lastSyncedAt, syncCopy)}`;

  return (
    <div
      id="settings-modal-backdrop"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="settings-modal-dialog"
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-start">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">{t('settings_modal_title')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t('app_title')}</p>
            </div>
          </div>
          <button onClick={() => { triggerHaptic('light'); onClose(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { triggerHaptic('light'); setActiveTab(tab.id); }}
                  className={`flex items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-lg text-xs transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                  <span className="truncate text-[10px] sm:text-[11px]">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <div className="text-start">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('settings_theme_title')}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('settings_theme_desc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => { triggerHaptic('medium'); setTheme('light'); }} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${!isDark ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-amber-500 shadow-md shadow-amber-500/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Sun className={`w-4 h-4 ${!isDark ? 'text-white' : 'text-amber-500'}`} /><span>{t('theme_light_btn')}</span>
                  </button>
                  <button onClick={() => { triggerHaptic('medium'); setTheme('dark'); }} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${isDark ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Moon className={`w-4 h-4 ${isDark ? 'text-white' : 'text-indigo-500'}`} /><span>{t('theme_dark_btn')}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Globe className="w-4 h-4" /></div>
                  <div className="text-start">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('settings_lang_title')}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('settings_lang_desc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {supportedLanguages.map((langOpt) => {
                    const isSelected = langOpt.code === language;
                    return (
                      <button key={langOpt.code} onClick={() => { triggerHaptic('medium'); setLanguage(langOpt.code); }} className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'}`}>
                        <span className="text-lg leading-tight mb-1">{langOpt.flag}</span>
                        <span className="text-xs font-semibold">{langOpt.nativeName}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{langOpt.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-indigo-950 dark:text-indigo-200">💡 {t('settings_ui_layout_hint')}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{t('settings_ui_layout_desc')}</div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-3.5 animate-in fade-in">
              {hasFullBackup && (
                <div className="p-3.5 rounded-2xl border-2 border-indigo-300 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
                      <HardDriveDownload className="w-4 h-4" />
                    </div>
                    <div className="text-start min-w-0">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">{fbCopy.cardTitle}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{fbCopy.cardDesc}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadFullBackup}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="truncate">{fbCopy.download}</span>
                    </button>
                    <button
                      onClick={() => fullBackupInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <HardDriveUpload className="w-3.5 h-3.5" />
                      <span className="truncate">{fbCopy.restore}</span>
                    </button>
                  </div>

                  <input
                    ref={fullBackupInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFullRestoreFile}
                  />

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    <span>{fbCopy.downloadHint}</span>
                  </div>

                  {fullRestoreMsg && (
                    <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
                      fullRestoreMsg.kind === 'ok'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    }`}>
                      {fullRestoreMsg.kind === 'ok' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{fullRestoreMsg.text}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-indigo-950 dark:text-indigo-200">{t('backup_total_records', { count: tasks.length })}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{t('backup_total_desc')}</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"><FileCode className="w-4 h-4" /></div>
                    <div className="text-start">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('backup_json_title')}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('backup_json_desc')}</p>
                    </div>
                  </div>
                  <button onClick={handleExportJSON} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0">
                    <Download className="w-3.5 h-3.5" /><span>{t('backup_download')}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><FileSpreadsheet className="w-4 h-4" /></div>
                    <div className="text-start">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('backup_csv_title')}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('backup_csv_desc')}</p>
                    </div>
                  </div>
                  <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0">
                    <Download className="w-3.5 h-3.5" /><span>CSV</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0"><CalendarPlus className="w-4 h-4" /></div>
                    <div className="text-start">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('backup_ics_title')}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('backup_ics_desc')}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExportICS} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer">
                    <Download className="w-3.5 h-3.5" /><span>{t('backup_ics_export')}</span>
                  </button>
                  <button onClick={() => icsInputRef.current?.click()} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer">
                    <CalendarCheck className="w-3.5 h-3.5" /><span>{t('backup_ics_import')}</span>
                  </button>
                </div>
                <input ref={icsInputRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={handleICSFileChange} />
                {icsMessage && (<div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[11px] flex items-center gap-2"><Check className="w-3.5 h-3.5 shrink-0" /><span>{icsMessage}</span></div>)}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('backup_import_title')}</h4>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500">{t('backup_import_mode')}</span>
                    <button onClick={() => setImportMode('append')} className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${importMode === 'append' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>{t('backup_import_append')}</button>
                    <button onClick={() => setImportMode('replace')} className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${importMode === 'replace' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>{t('backup_import_replace')}</button>
                  </div>
                </div>

                <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${isDragOver ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                  <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileChange} />
                  <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('backup_drop_title')}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('backup_drop_subtitle')}</p>
                </div>

                {importSuccess && (<div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /><span>{importSuccess}</span></div>)}
                {importError && (<div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{importError}</span></div>)}
              </div>

              {canReset && (
                <div className="pt-3 mt-1 border-t-2 border-dashed border-rose-200 dark:border-rose-900/60 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="text-start min-w-0">
                      <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide">{fbCopy.dangerTitle}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{fbCopy.dangerDesc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => { triggerHaptic('medium'); setResetTyped(''); setShowResetConfirm(true); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{fbCopy.resetBtn}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">{syncCopy.title}</h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{syncCopy.desc}</p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-start">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {syncStatusText}
                    </div>
                    <div className={`text-[11px] mt-0.5 truncate ${syncError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {lastSyncedText}
                    </div>
                  </div>
                  <button
                    onClick={() => { void onSyncNow?.(); }}
                    disabled={isSyncing}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold shadow-xs transition cursor-pointer ${isSyncing ? 'bg-indigo-300 dark:bg-indigo-900 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? syncCopy.stateSyncing : syncCopy.syncNow}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">{countLabel(counts.tasks, syncCopy.taskOne, syncCopy.taskMany)}</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-semibold">{countLabel(counts.habits, syncCopy.habitOne, syncCopy.habitMany)}</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-semibold">{countLabel(counts.milestones, syncCopy.milestoneOne, syncCopy.milestoneMany)}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{syncCopy.signedInAs}</span>
                </div>

                <div className="flex items-center gap-3">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center">
                      {initials || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</div>
                    {primaryEmail && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{primaryEmail}</div>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{syncCopy.accountHint}</p>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{syncCopy.signOut}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-xs text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-amber-950 dark:text-amber-200">{t('notif_due_title', { count: dueTasks.length })}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{t('notif_due_desc')}</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-start">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('notif_perm_title')}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('notif_perm_status')}{' '}<span className="font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">{translatePerm(notificationStatus, lang)}</span></p>
                  </div>
                  {notificationStatus !== 'granted' ? (
                    <button onClick={handleRequestPermission} className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer">{t('notif_enable')}</button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"><ShieldCheck className="w-4 h-4" /><span>{t('notif_perm_active')}</span></div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{t('notif_test_banner')}</span>
                  <button onClick={handleTestNotification} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer">{t('notif_send_test')}</button>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{t('notif_test_5s')}</span>
                  <button onClick={handleTestIn5s} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition cursor-pointer"><Clock className="w-3 h-3" /><span>{t('notif_test_schedule')}</span></button>
                </div>

                {testMessage && (<div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2"><Bell className="w-4 h-4 shrink-0" /><span>{testMessage}</span></div>)}
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"><AlarmClock className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1 text-start">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('notif_nags_title')}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('notif_nags_desc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ESCALATION_PRESETS.map((preset) => {
                    const isSelected = escalation.intensity === preset.id;
                    return (
                      <button key={preset.id} onClick={() => handleEscalationChange(preset.id)} className={`text-start p-2.5 rounded-xl border transition cursor-pointer ${isSelected ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-500/40 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <div className={`text-[11px] font-black ${isSelected ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'}`}>{preset.label}</div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{preset.description}</div>
                      </button>
                    );
                  })}
                </div>
                {escalation.intensity !== 'off' && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{t('notif_nags_how')}</span> {t('notif_nags_how_desc')}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"><Sunrise className="w-4 h-4" /></div>
                    <div className="min-w-0 text-start">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('notif_digest_title')}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('notif_digest_desc')}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleToggleDigest} role="switch" aria-checked={dailyDigest.enabled}
                    style={{ width: 44, height: 24, minWidth: 44, minHeight: 24, borderRadius: 12, backgroundColor: dailyDigest.enabled ? '#4F46E5' : '#CBD5E1', border: 'none', padding: 0, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.15s ease', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', top: 2, left: dailyDigest.enabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(15,23,42,0.25)', transition: 'left 0.15s ease', display: 'block' }} />
                  </button>
                </div>

                {dailyDigest.enabled && (
                  <>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{t('notif_digest_fire_at')}</span>
                        <button type="button" onClick={toggleHourFormat} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer" title={hourFormat === '24' ? timeCopy.switchTo12 : timeCopy.switchTo24}>
                          {hourFormat === '24' ? timeCopy.h24 : timeCopy.h12}
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        {hourFormat === '24' ? (
                          <select value={digestHour} onChange={(e) => setDigestHour24(parseInt(e.target.value, 10))} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:border-indigo-500">
                            {hours24.map((h) => (<option key={h} value={h}>{String(h).padStart(2, '0')}</option>))}
                          </select>
                        ) : (
                          <select value={digestH12} onChange={(e) => setDigestHour12(parseInt(e.target.value, 10))} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:border-indigo-500">
                            {hours12.map((h) => (<option key={h} value={h}>{String(h).padStart(2, '0')}</option>))}
                          </select>
                        )}
                        <span className="text-slate-400 font-bold">:</span>
                        <select value={digestMinute} onChange={(e) => setDigestMinute(parseInt(e.target.value, 10))} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:border-indigo-500">
                          {minutes.map((m) => (<option key={m} value={m}>{String(m).padStart(2, '0')}</option>))}
                        </select>
                        {hourFormat === '12' && (
                          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                            <button type="button" onClick={() => setDigestAmPm(false)} className={`px-2 py-1.5 text-xs font-bold transition cursor-pointer ${!digestIsPm ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{timeCopy.am}</button>
                            <button type="button" onClick={() => setDigestAmPm(true)} className={`px-2 py-1.5 text-xs font-bold transition cursor-pointer ${digestIsPm ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{timeCopy.pm}</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('notif_digest_preview')}</div>
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-snug">{t('notif_digest_preview_title')}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{digestPreview}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="text-start">
                  <div className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /><h4 className="text-xs font-bold text-slate-900 dark:text-white">{t('settings_sound_title')}</h4></div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t('settings_sound_desc')}</p>
                </div>
                <div className="space-y-1.5">
                  {SOUND_ALERT_OPTIONS.map((option) => {
                    const isSelected = selectedSound === option.id;
                    const localized = translateSoundOption(option, lang);
                    return (
                      <div key={option.id} onClick={() => handleSelectSound(option.id)} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${isSelected ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs' : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                        <div className="flex items-center gap-2.5 min-w-0 pe-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 text-start">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>{localized.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium shrink-0 ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{localized.tag}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{localized.description}</p>
                          </div>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); previewAlertSound(option.id); }} className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-center space-y-2 flex flex-col items-center justify-center">
                <AppLogo size={56} />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t('app_title')}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{t('about_tagline')}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('about_offline_badge')}</span>
                </div>
              </div>

              {onOpenInstallModal && (
                <button onClick={() => { triggerHaptic('medium'); onClose(); onOpenInstallModal(); }} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition cursor-pointer">
                  <Smartphone className="w-4 h-4" /><span>{t('about_install')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
          <button onClick={() => { triggerHaptic('light'); onClose(); }} className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer">{t('settings_done')}</button>
        </div>
      </div>

      {pendingRestore && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-5"
          onClick={() => setPendingRestore(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mx-auto mb-4">
              <HardDriveUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight text-center mb-2">
              {fbCopy.restoreConfirmTitle}
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-5">
              {fbCopy.restoreConfirmBody(summarizeBackup(pendingRestore))}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { triggerHaptic('light'); setPendingRestore(null); }}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {fbCopy.cancel}
              </button>
              <button
                onClick={confirmFullRestore}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                {fbCopy.restoreConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-5"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-base font-black text-rose-700 dark:text-rose-400 tracking-tight text-center mb-2">
              {fbCopy.resetConfirmTitle}
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-4">
              {fbCopy.resetConfirmBody}
            </p>

            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {fbCopy.resetTypeHint}
            </label>
            <input
              type="text"
              value={resetTyped}
              onChange={(e) => setResetTyped(e.target.value)}
              placeholder={fbCopy.resetTypePlaceholder}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border-2 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white text-sm font-black tracking-widest text-center mb-5 focus:outline-none focus:border-rose-500 transition"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { triggerHaptic('light'); setShowResetConfirm(false); setResetTyped(''); }}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {fbCopy.cancel}
              </button>
              <button
                onClick={() => {
                  if (!resetReady) return;
                  triggerHaptic('heavy');
                  onResetEverything?.();
                  setShowResetConfirm(false);
                  setResetTyped('');
                }}
                disabled={!resetReady}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition cursor-pointer ${
                  resetReady
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {fbCopy.resetConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};