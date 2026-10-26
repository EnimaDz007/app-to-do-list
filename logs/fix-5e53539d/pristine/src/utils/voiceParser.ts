import { TaskCategory, QuadrantId, PriorityLevel } from '../types';

export interface ParsedVoiceTask {
  rawTranscript: string;
  title: string;
  description: string;
  category: TaskCategory;
  quadrant: QuadrantId;
  priority: PriorityLevel;
  estimatedMinutes: number;
  dueDate: string;
  contexts: string[];
  confidenceScore: number;
}

const CATEGORY_KEYWORDS: Record<TaskCategory, string[]> = {
  Engineering: [
    'code', 'coding', 'engineer', 'developer', 'dev', 'bug', 'fix', 'deploy',
    'api', 'backend', 'frontend', 'server', 'database', 'db', 'sql', 'git',
    'github', 'pr', 'pull request', 'test', 'build', 'docker', 'auth',
    'react', 'node', 'python', 'script', 'refactor', 'typescript',
    'برمجة', 'كود', 'مطور', 'مهندس', 'إصلاح', 'خادم', 'سيرفر', 'قاعدة بيانات', 'اختبار', 'تقني',
    'développement', 'bogue', 'serveur', 'programmer', 'codeur', 'technique'
  ],
  Product: [
    'product', 'roadmap', 'feature', 'sprint', 'spec', 'specification',
    'release', 'milestone', 'launch', 'requirement', 'user story', 'backlog',
    'mvp', 'user test', 'metrics', 'kpi',
    'منتج', 'خريطة طريق', 'ميزة', 'إطلاق', 'سبرنت', 'متطلبات', 'مواصفات',
    'produit', 'fonctionnalité', 'version', 'jalon', 'spécification'
  ],
  Design: [
    'design', 'designer', 'figma', 'wireframe', 'prototype', 'mockup',
    'ui', 'ux', 'logo', 'banner', 'graphic', 'illustration', 'sketch',
    'icon', 'layout', 'color', 'palette', 'theme', 'typography',
    'تصميم', 'واجهة', 'فيجما', 'شعار', 'رسم', 'أيقونة', 'ألوان',
    'maquette', 'conception', 'graphisme', 'visuel', 'icône', 'charte'
  ],
  Operations: [
    'operation', 'operations', 'invoice', 'billing', 'bill', 'payment',
    'cod', 'cash on delivery', 'legal', 'contract', 'finance', 'payroll',
    'tax', 'accounting', 'budget', 'compliance', 'vendor', 'supplier',
    'logistics', 'shipping', 'order', 'delivery',
    'فواتير', 'دفع', 'دفع عند الاستلام', 'مالية', 'عقود', 'قانوني', 'رواتب', 'شحن', 'توريد', 'محاسبة',
    'facturation', 'finances', 'compta', 'juridique', 'contrat', 'logistique', 'administratif', 'fournisseur'
  ],
  Client: [
    'client', 'customer', 'presentation', 'pitch', 'proposal', 'sales',
    'demo', 'account', 'partner', 'partnership', 'meeting with client',
    'sponsor', 'prospect', 'lead',
    'عميل', 'زبون', 'عرض تقديمي', 'اجتماع عميل', 'مقترح', 'مبيعات', 'صفقة', 'شريك',
    'prospect', 'devis', 'rendez-vous client', 'vente', 'partenaire'
  ],
  Marketing: [
    'marketing', 'ad', 'ads', 'campaign', 'promo', 'promotion', 'seo',
    'social media', 'post', 'twitter', 'linkedin', 'instagram', 'tiktok',
    'newsletter', 'blog', 'content', 'advertisement',
    'اعلان', 'تسويق', 'حملة', 'ترويج', 'منشور', 'شبكات اجتماعية', 'محتوى', 'سيو',
    'publicité', 'campagne', 'réseaux sociaux', 'pub', 'communication', 'contenu'
  ],
  Personal: [
    'personal', 'buy', 'grocery', 'groceries', 'gym', 'workout', 'exercise',
    'fitness', 'doctor', 'clinic', 'dentist', 'medicine', 'pharmacy',
    'health', 'walk', 'cook', 'dinner', 'lunch', 'breakfast', 'clean',
    'cleaning', 'house', 'home', 'family', 'call mom', 'shopping', 'haircut',
    'شخصي', 'تسوق', 'بقالة', 'نادي', 'رياضة', 'طبيب', 'أسنان', 'دواء', 'صيدلية', 'صحة', 'بيت', 'تنظيف', 'غداء', 'عشاء', 'عائلة', 'شراء',
    'supermarché', 'sport', 'médecin', 'dentiste', 'santé', 'pharmacie', 'maison', 'personnel'
  ],
};

const QUADRANT_KEYWORDS: Record<QuadrantId, string[]> = {
  do_first: [
    'urgent', 'urgently', 'asap', 'critical', 'critically', 'emergency',
    'immediately', 'immediate', 'today', 'tonight', 'deadline', 'now',
    'high priority', 'top priority', 'pressing',
    'عاجل', 'ضروري', 'فورا', 'الآن', 'طارئ', 'اليوم', 'أولوية قصوى', 'أولوية أولى', 'لازم',
    'très urgent', 'immédiatement', 'tout de suite', 'critique', 'impératif'
  ],
  schedule: [
    'schedule', 'plan', 'planning', 'tomorrow', 'next week', 'future',
    'strategy', 'strategic', 'deep work', 'study', 'research', 'learn',
    'prepare', 'preparation', 'draft',
    'جدولة', 'تخطيط', 'غدا', 'بكرة', 'الأسبوع القادم', 'استراتيجية', 'دراسة', 'تعلم', 'تحضير',
    'planifier', 'demain', 'semaine prochaine', 'stratégie', 'étudier', 'préparer'
  ],
  delegate: [
    'delegate', 'assign', 'forward', 'route', 'hand over', 'ask someone',
    'outsource', 'assistant', 'follow up with', 'team',
    'تفويض', 'تكليف', 'اسأل', 'متابعة مع', 'إسناد', 'تحويل',
    'déléguer', 'assigner', 'confier', 'demander à', 'transférer'
  ],
  eliminate: [
    'eliminate', 'maybe', 'someday', 'optional', 'low priority', 'distraction',
    'browse', 'backlog', 'whenever', 'archive',
    'حذف', 'إلغاء', 'ربما', 'غير مهم', 'مستقبلا', 'اختياري',
    'facultatif', 'peut-être', 'éliminer', 'annuler', 'accessoire'
  ],
};

const PRIORITY_MAP: Record<QuadrantId, PriorityLevel> = {
  do_first: 'urgent',
  schedule: 'high',
  delegate: 'medium',
  eliminate: 'low',
};

const PRIORITY_TO_QUADRANT: Record<PriorityLevel, QuadrantId> = {
  urgent: 'do_first',
  high: 'schedule',
  medium: 'delegate',
  low: 'eliminate',
};

const CONTEXT_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: 'home',     keywords: ['home', 'house', 'kitchen', 'bedroom', 'garage', 'garden', 'laundry', 'dishes', 'maison', 'بيت', 'منزل'] },
  { id: 'work',     keywords: ['work', 'office', 'meeting', 'standup', 'client', 'boss', 'team', 'bureau', 'réunion', 'عمل', 'اجتماع'] },
  { id: 'call',     keywords: ['call', 'phone', 'text', 'whatsapp', 'dm', 'message', 'appeler', 'téléphone', 'اتصال', 'مكالمة', 'هاتف'] },
  { id: 'computer', keywords: ['code', 'coding', 'email', 'deep work', 'focus', 'writing', 'docs', 'ordi', 'écrire', 'برمجة', 'كتابة'] },
  { id: 'errand',   keywords: ['buy', 'pick up', 'drop off', 'store', 'market', 'mall', 'supermarket', 'grocery', 'courses', 'acheter', 'تسوق', 'بقالة'] },
  { id: 'health',   keywords: ['gym', 'workout', 'run', 'yoga', 'doctor', 'medical', 'therapy', 'dentist', 'sport', 'santé', 'طبيب', 'رياضة'] },
];

// ─────────────────────────────────────────────
//   Arabic digit normalization
// ─────────────────────────────────────────────

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] ?? d);
}

// ─────────────────────────────────────────────
//   Helpers
// ─────────────────────────────────────────────

function cleanSpeechPrompt(raw: string): string {
  let cleaned = raw.trim();

  cleaned = cleaned.replace(
    /^(please\s+)?(add(\s+a)?\s+task(\s+to|\s+for)?|remind\s+me\s+to|i\s+need\s+to|create(\s+a)?\s+task(\s+for|\s+to)?|todo|to-do|schedule(\s+a)?\s+task(\s+for|\s+to)?|note\s+down\s+that\s+i\s+have\s+to)\s+/i,
    ''
  );

  cleaned = cleaned.replace(
    /^(s'il\s+te\s+plaît\s+)?(ajoute(\s+une)?\s+tâche(\s+pour|\s+de)?|rappelle-moi\s+de|je\s+dois|créer\s+une\s+tâche(\s+pour)?)\s+/i,
    ''
  );

  cleaned = cleaned.replace(
    /^(من\s+فضلك\s+)?(أضف\s+مهمة(\s+لـ|\s+عن)?|تذكير\s+بـ|أريد\s+أن|يجب\s+أن|سجل\s+مهمة(\s+لـ)?)\s+/i,
    ''
  );

  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function extractEstimatedMinutes(text: string): number {
  const lower = text.toLowerCase();

  const hoursMatch = lower.match(/(\d+)\s*(hours?|hrs?|heures?|ساعات|ساعة|h)\b/i);
  if (hoursMatch) {
    const hrs = parseInt(hoursMatch[1], 10);
    return isNaN(hrs) ? 60 : hrs * 60;
  }

  if (lower.includes('half an hour') || lower.includes('demi-heure') || lower.includes('نصف ساعة')) {
    return 30;
  }

  const minsMatch = lower.match(/(\d+)\s*(minutes?|mins?|دقيقة|min)\b/i);
  if (minsMatch) {
    const mins = parseInt(minsMatch[1], 10);
    return isNaN(mins) ? 30 : Math.min(Math.max(mins, 5), 480);
  }

  return 30;
}

function extractExplicitPriority(text: string): PriorityLevel | null {
  const m = text.match(/!(p[1-4]|urgent|high|medium|low)\b/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (v === 'p1') return 'urgent';
  if (v === 'p2') return 'high';
  if (v === 'p3') return 'medium';
  if (v === 'p4') return 'low';
  return v as PriorityLevel;
}

function extractExplicitMinutes(text: string): number | null {
  const m = text.match(/~(\d+)\s*(m|min|minutes?|h|hr|hours?)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (isNaN(n)) return null;
  const unit = m[2].toLowerCase();
  const mins = unit.startsWith('h') ? n * 60 : n;
  return Math.min(Math.max(mins, 5), 480);
}

function extractExplicitQuadrant(text: string): QuadrantId | null {
  const m = text.match(/#(do|do_first|schedule|delegate|eliminate)\b/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (v === 'do' || v === 'do_first') return 'do_first';
  return v as QuadrantId;
}

function stripExplicitTokens(text: string): string {
  return text
    .replace(/!(p[1-4]|urgent|high|medium|low)\b/gi, ' ')
    .replace(/~(\d+)\s*(m|min|minutes?|h|hr|hours?)\b/gi, ' ')
    .replace(/#(do|do_first|schedule|delegate|eliminate)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TIME_REGEX = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i;

function normalizeMatch(m: RegExpMatchArray): { hour: number; minute: number } | null {
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = (m[3] || '').toLowerCase();

  if (suffix === 'p' && h < 12) h += 12;
  if (suffix === 'a' && h === 12) h = 0;

  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

function findExplicitTime(lower: string): { hour: number; minute: number } | null {
  // ── 1. Single-word times ──
  // "noon" / "at noon" / "ظهراً" / "الظهر"
  if (/\b(?:at\s+)?noon\b/i.test(lower) || /(?:الساعة\s+)?ظهرا|ظهراً|(?:في\s+)?الظهر/.test(lower)) {
    return { hour: 12, minute: 0 };
  }
  // "midnight" / "at midnight" / "منتصف الليل"
  if (/\b(?:at\s+)?midnight\b/i.test(lower) || /منتصف\s+الليل/.test(lower)) {
    return { hour: 0, minute: 0 };
  }

  // ── 2. H / H:MM with explicit am/pm ──
  const introPatterns: RegExp[] = [
    /(?:set\s+time\s+to)\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i,
    /(?:set\s+(?:a\s+)?reminder\s+(?:at|in|for))\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i,
    /(?:remind\s+me\s+(?:at|in|for))\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i,
    /(?:at|@)\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i,
    /(?:à|في|الساعة)\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i,
  ];

  for (const re of introPatterns) {
    const m = lower.match(re);
    if (m) return normalizeMatch(m);
  }

  const bare = lower.match(TIME_REGEX);
  if (bare) return normalizeMatch(bare);

  // ── 3. "H morning/afternoon/evening/night" (English qualifier) ──
  const enQual = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:in\s+the\s+)?(morning|afternoon|evening|night)\b/i);
  if (enQual) {
    let h = parseInt(enQual[1], 10);
    const min = enQual[2] ? parseInt(enQual[2], 10) : 0;
    const q = enQual[3].toLowerCase();
    if (q === 'morning') {
      if (h === 12) h = 0;           // 12 morning = midnight
    } else if (q === 'afternoon' || q === 'evening') {
      if (h < 12) h += 12;           // 3 evening = 15
    } else if (q === 'night') {
      if (h === 12) h = 0;           // 12 night = midnight
      else if (h < 12) h += 12;
    }
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }

  // ── 4. "H صباحاً / مساءً / ظهراً / ليلاً" (Arabic qualifier) ──
  const arQual = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(?:في\s+)?(صباحا|صباحاً|صباح|مساء|مساءً|مساءا|ظهرا|ظهراً|ليلا|ليلاً)/);
  if (arQual) {
    let h = parseInt(arQual[1], 10);
    const min = arQual[2] ? parseInt(arQual[2], 10) : 0;
    const q = arQual[3];
    if (/صباح/.test(q)) {
      if (h === 12) h = 0;
    } else if (/مساء|ليلا|ليلاً/.test(q)) {
      if (h < 12) h += 12;
    } else if (/ظهرا|ظهراً/.test(q)) {
      h = 12;
    }
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }

  // ── 5. Bare "at H" (no am/pm, no qualifier) — apply heuristic ──
  // 1–7 → PM (afternoon/evening), 8–11 → AM, 12 → noon
  const atBare = lower.match(/(?:at|@|à|في|الساعة)\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (atBare) {
    let h = parseInt(atBare[1], 10);
    const min = atBare[2] ? parseInt(atBare[2], 10) : 0;
    if (h >= 1 && h <= 7) h += 12;
    else if (h === 12) h = 12;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }

  return null;
}

const DAY_NAMES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function extractDueDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  const result = new Date(now.getTime());
  result.setSeconds(0, 0);

  const setTime = (h: number, m: number = 0) => {
    result.setHours(h, m, 0, 0);
  };

  const inMatch = lower.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|d|weeks?|w|months?|mos?)\b/i);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2].toLowerCase();
    const r = new Date(now.getTime());
    if (unit.startsWith('min')) r.setMinutes(r.getMinutes() + n);
    else if (unit.startsWith('h')) r.setHours(r.getHours() + n);
    else if (unit.startsWith('d')) r.setDate(r.getDate() + n);
    else if (unit.startsWith('w')) r.setDate(r.getDate() + n * 7);
    else if (unit.startsWith('mo')) r.setMonth(r.getMonth() + n);
    return r.toISOString();
  }

  const inIndefinite = lower.match(/\bin\s+(?:a|an)\s+(minute|hour|day|week|month|year)\b/i);
  if (inIndefinite) {
    const unit = inIndefinite[1].toLowerCase();
    const r = new Date(now.getTime());
    if (unit === 'minute') r.setMinutes(r.getMinutes() + 1);
    else if (unit === 'hour') r.setHours(r.getHours() + 1);
    else if (unit === 'day') r.setDate(r.getDate() + 1);
    else if (unit === 'week') r.setDate(r.getDate() + 7);
    else if (unit === 'month') r.setMonth(r.getMonth() + 1);
    else if (unit === 'year') r.setFullYear(r.getFullYear() + 1);
    return r.toISOString();
  }

  const dansMatch = lower.match(/\bdans\s+(\d+)\s*(minutes?|mins?|heures?|jours?|semaines?|mois)\b/i);
  if (dansMatch) {
    const n = parseInt(dansMatch[1], 10);
    const unit = dansMatch[2].toLowerCase();
    const r = new Date(now.getTime());
    if (unit.startsWith('min')) r.setMinutes(r.getMinutes() + n);
    else if (unit.startsWith('heure')) r.setHours(r.getHours() + n);
    else if (unit.startsWith('jour')) r.setDate(r.getDate() + n);
    else if (unit.startsWith('semaine')) r.setDate(r.getDate() + n * 7);
    else if (unit.startsWith('mois')) r.setMonth(r.getMonth() + n);
    return r.toISOString();
  }

  const explicit = findExplicitTime(lower);
  const explicitHour = explicit ? explicit.hour : null;
  const explicitMinute = explicit ? explicit.minute : 0;

  if (/\bday\s+after\s+tomorrow\b|\baprès-demain\b|\bبعد\s+غد\b/i.test(lower)) {
    result.setDate(result.getDate() + 2);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  if (/\btomorrow\s+night\b/i.test(lower)) {
    result.setDate(result.getDate() + 1);
    setTime(explicitHour ?? 21, explicitMinute);
    return result.toISOString();
  }
  if (/\btomorrow\s+(?:morning|matin)\b/i.test(lower)) {
    result.setDate(result.getDate() + 1);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }
  if (/\btomorrow\s+(?:afternoon|après-midi)\b/i.test(lower)) {
    result.setDate(result.getDate() + 1);
    setTime(explicitHour ?? 15, explicitMinute);
    return result.toISOString();
  }
  if (/\btomorrow\s+(?:evening|soir)\b/i.test(lower)) {
    result.setDate(result.getDate() + 1);
    setTime(explicitHour ?? 20, explicitMinute);
    return result.toISOString();
  }

  if (/\btomorrow\b|\bdemain\b|\bغدا\b|\bبكرة\b/i.test(lower)) {
    result.setDate(result.getDate() + 1);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  const weekendMatch = lower.match(/\b(next|this)\s+weekend\b/i);
  if (weekendMatch) {
    const kind = weekendMatch[1].toLowerCase();
    const today = now.getDay();
    let daysToSat = (6 - today + 7) % 7;
    if (kind === 'next' && daysToSat === 0) daysToSat = 7;
    if (kind === 'this' && daysToSat === 0) daysToSat = 0;
    result.setDate(result.getDate() + daysToSat);
    setTime(explicitHour ?? 10, explicitMinute);
    return result.toISOString();
  }

  if (/\bend\s+of\s+(?:the\s+)?week\b/i.test(lower)) {
    const today = now.getDay();
    const daysToSun = (7 - today) % 7 || 7;
    result.setDate(result.getDate() + daysToSun);
    setTime(explicitHour ?? 18, explicitMinute);
    return result.toISOString();
  }

  if (/\bend\s+of\s+(?:the\s+)?month\b/i.test(lower)) {
    const y = result.getFullYear();
    const m = result.getMonth();
    const last = lastDayOfMonth(y, m);
    result.setDate(last);
    setTime(explicitHour ?? 18, explicitMinute);
    return result.toISOString();
  }

  if (/\bend\s+of\s+(?:the\s+)?year\b/i.test(lower)) {
    result.setMonth(11);
    result.setDate(31);
    setTime(explicitHour ?? 18, explicitMinute);
    return result.toISOString();
  }

  if (/\btonight\b|\bthis\s+evening\b|\bce\s+soir\b|\bالليلة\b/i.test(lower)) {
    setTime(explicitHour ?? 20, explicitMinute);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  if (/\bthis\s+afternoon\b|\baprès-midi\b|\bبعد الظهر\b/i.test(lower)) {
    setTime(explicitHour ?? 15, explicitMinute);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  if (/\bthis\s+morning\b|\bce\s+matin\b/i.test(lower)) {
    setTime(explicitHour ?? 9, explicitMinute);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  if (/\bnext\s+week\b|\bsemaine\s+prochaine\b|\bالأسبوع\s+القادم\b/i.test(lower)) {
    result.setDate(result.getDate() + 7);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  if (/\bnext\s+month\b|\bmois\s+prochain\b/i.test(lower)) {
    result.setMonth(result.getMonth() + 1);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  const nextDaysMatch = lower.match(/\b(?:next|within)\s+(\d+)\s+days?\b/i);
  if (nextDaysMatch) {
    const n = parseInt(nextDaysMatch[1], 10);
    result.setDate(result.getDate() + n);
    setTime(explicitHour ?? 18, explicitMinute);
    return result.toISOString();
  }

  const afterNextMatch = lower.match(/\b(?:the\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+after\s+next\b/i);
  if (afterNextMatch) {
    const targetDay = DAY_NAMES[afterNextMatch[1].toLowerCase()];
    const currentDay = result.getDay();
    let diff = (targetDay - currentDay + 7) % 7;
    diff += 7;
    if (diff === 0) diff = 14;
    result.setDate(result.getDate() + diff);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  const nextDayMatch = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i);
  if (nextDayMatch) {
    const targetDay = DAY_NAMES[nextDayMatch[1].toLowerCase()];
    if (targetDay !== undefined) {
      const currentDay = result.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      result.setDate(result.getDate() + diff);
      setTime(explicitHour ?? 9, explicitMinute);
      return result.toISOString();
    }
  }

  if (explicitHour !== null) {
    setTime(explicitHour, explicitMinute);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  for (const [name, dayNum] of Object.entries(DAY_NAMES)) {
    const re = new RegExp(`\\b${name}\\b`, 'i');
    if (re.test(lower)) {
      const currentDay = result.getDay();
      let diff = dayNum - currentDay;
      if (diff <= 0) diff += 7;
      result.setDate(result.getDate() + diff);
      setTime(explicitHour ?? 9, explicitMinute);
      return result.toISOString();
    }
  }

  return new Date(now.getTime() + 3600000).toISOString();
}

function extractContexts(raw: string): string[] {
  const lower = raw.toLowerCase();
  const found = new Set<string>();

  const explicit = raw.match(/@([a-zA-Z\u0600-\u06FF]+)/g) || [];
  explicit.forEach((m) => {
    found.add(m.slice(1).toLowerCase());
  });

  for (const ctx of CONTEXT_KEYWORDS) {
    for (const kw of ctx.keywords) {
      const re = new RegExp(`\\b${kw.toLowerCase()}\\b`, 'i');
      if (re.test(lower)) {
        found.add(ctx.id);
        break;
      }
    }
  }

  return Array.from(found);
}

function stripTimePhrasesFromTitle(text: string): string {
  let out = text;

  out = out.replace(/\bset\s+time\s+to\s+\d{1,2}(?::\d{2})?\s*[ap]?\.?\s*m?\.?/gi, ' ');
  out = out.replace(/\bset\s+(?:a\s+)?reminder\s+(?:at|in|for)\s+\d{1,2}(?::\d{2})?\s*[ap]?\.?\s*m?\.?/gi, ' ');
  out = out.replace(/\bremind\s+me\s+(?:at|in|for)\s+\d{1,2}(?::\d{2})?\s*[ap]?\.?\s*m?\.?/gi, ' ');
  out = out.replace(/\breminder\s+(?:at|in|for)\s+\d{1,2}(?::\d{2})?\s*[ap]?\.?\s*m?\.?/gi, ' ');

  out = out.replace(/\bday\s+after\s+tomorrow\b/gi, ' ');
  out = out.replace(/\b(?:the\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+after\s+next\b/gi, ' ');
  out = out.replace(/\b(?:next|this)\s+weekend\b/gi, ' ');
  out = out.replace(/\bend\s+of\s+(?:the\s+)?(week|month|year)\b/gi, ' ');
  out = out.replace(/\b(?:next|within)\s+\d+\s+days?\b/gi, ' ');
  out = out.replace(/\bnext\s+month\b/gi, ' ');
  out = out.replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi, ' ');

  // Strip "at H am/pm" (existing behavior)
  out = out.replace(/\b(?:at|@)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|[ap])?\.?\s*m?\.?\b/gi, ' ');
  out = out.replace(/\b(?:à|في|الساعة)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|[ap])?\.?\s*m?\.?\b/gi, ' ');
  // Bare times: "9am", "9:30pm"
  out = out.replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, ' ');

  // 🆕 Strip "H morning/afternoon/evening/night" (English qualifier)
  out = out.replace(/\b\d{1,2}(?::\d{2})?\s*(?:in\s+the\s+)?(?:morning|afternoon|evening|night)\b/gi, ' ');
  // 🆕 Strip "H صباحاً / مساءً / ظهراً / ليلاً" (Arabic qualifier)
  out = out.replace(/\b\d{1,2}(?::\d{2})?\s*(?:في\s+)?(?:صباحا|صباحاً|صباح|مساء|مساءً|مساءا|ظهرا|ظهراً|ليلا|ليلاً)/g, ' ');

  // 🆕 Strip standalone noon / midnight keywords
  out = out.replace(/\b(?:at\s+)?noon\b/gi, ' ');
  out = out.replace(/\b(?:at\s+)?midnight\b/gi, ' ');
  out = out.replace(/(?:الساعة\s+)?(?:ظهرا|ظهراً|الظهر)/g, ' ');
  out = out.replace(/منتصف\s+الليل/g, ' ');

  out = out.replace(/\b(?:tomorrow|today)\s+(?:night|morning|afternoon|evening|matin|soir|après-midi)\b/gi, ' ');
  out = out.replace(/\b(?:غدا|بكرة|اليوم)\s+(?:الليلة|صباحا|مساء|بعد\s+الظهر)\b/gi, ' ');

  out = out.replace(/\b(?:tomorrow|today|tonight)\b/gi, ' ');
  out = out.replace(/\b(?:demain|ce\s+soir|ce\s+matin|après-midi|après-demain)\b/gi, ' ');
  out = out.replace(/\b(?:غدا|بكرة|الليلة|اليوم|بعد\s+غد)\b/gi, ' ');
  out = out.replace(/\bthis\s+(?:morning|afternoon|evening|week|night|weekend)\b/gi, ' ');
  out = out.replace(/\bnext\s+week\b/gi, ' ');

  out = out.replace(/\bin\s+\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|mos?)\b/gi, ' ');
  out = out.replace(/\bin\s+(?:a|an)\s+(?:minute|hour|day|week|month|year)\b/gi, ' ');
  out = out.replace(/\bdans\s+\d+\s*(?:minutes?|mins?|heures?|jours?|semaines?|mois)\b/gi, ' ');
  out = out.replace(/بعد\s+\d+\s*(?:دقيقة|دقائق|دقيقه|ساعة|ساعات|ساعه|يوم|أيام|اسبوع|أسابيع|شهر|أشهر)/g, ' ');

  out = out.replace(/@([a-zA-Z\u0600-\u06FF]+)/g, ' ');

  out = out.replace(/\bset\s+(?:a\s+)?reminder\b/gi, ' ');
  out = out.replace(/\bremind\s+me\b/gi, ' ');

  // Remove trailing dangling connectors
  out = out.replace(/\s+(?:at|on|in|by|before|after|for|around|@|à|في|الساعة)\s*$/gi, '');

  return out.replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────
//   MAIN PARSER
// ─────────────────────────────────────────────

export function parseSpokenTask(rawTranscript: string): ParsedVoiceTask {
  // Normalize Arabic numerals to ASCII so all regexes work uniformly
  const raw = normalizeDigits(rawTranscript.trim());
  const lower = raw.toLowerCase();

  const explicitPriority = extractExplicitPriority(raw);
  const explicitMinutes = extractExplicitMinutes(raw);
  const explicitQuadrant = extractExplicitQuadrant(raw);

  // ── Category ──
  let detectedCategory: TaskCategory = 'Personal';
  let maxCatScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > maxCatScore) {
      maxCatScore = score;
      detectedCategory = cat as TaskCategory;
    }
  }
  if (maxCatScore === 0) detectedCategory = 'Engineering';

  // ── Quadrant (explicit > priority-derived > keyword) ──
  let detectedQuadrant: QuadrantId;
  let detectedPriority: PriorityLevel;

  if (explicitPriority) {
    detectedPriority = explicitPriority;
    detectedQuadrant = PRIORITY_TO_QUADRANT[explicitPriority];
  } else if (explicitQuadrant) {
    detectedQuadrant = explicitQuadrant;
    detectedPriority = PRIORITY_MAP[explicitQuadrant];
  } else {
    let maxQuadScore = 0;
    let keywordQuadrant: QuadrantId = 'do_first';
    for (const [qid, keywords] of Object.entries(QUADRANT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          score += kw.length > 5 ? 2 : 1;
        }
      }
      if (score > maxQuadScore) {
        maxQuadScore = score;
        keywordQuadrant = qid as QuadrantId;
      }
    }
    detectedQuadrant = keywordQuadrant;
    detectedPriority = PRIORITY_MAP[keywordQuadrant];
  }

  // ── Title ──
  const cleanedTitle = cleanSpeechPrompt(raw);
  const noExplicitTokens = stripExplicitTokens(cleanedTitle);
  const titleStripped = stripTimePhrasesFromTitle(noExplicitTokens);

  // ── Minutes ──
  const minutes = explicitMinutes ?? extractEstimatedMinutes(raw);

  // ── Due date ──
  const dueDate = extractDueDate(raw);

  // ── Contexts ──
  const contexts = extractContexts(raw);

  const confidenceScore = Math.min(
    Math.round(((maxCatScore > 0 ? 0.5 : 0.2) + (explicitPriority || explicitQuadrant ? 0.5 : 0.2)) * 100),
    98
  );

  const finalTitle = titleStripped.length >= 2 ? titleStripped : noExplicitTokens;

  return {
    rawTranscript: raw,
    title: finalTitle || raw,
    description: raw.length > cleanedTitle.length + 10 ? raw : '',
    category: detectedCategory,
    quadrant: detectedQuadrant,
    priority: detectedPriority,
    estimatedMinutes: minutes,
    dueDate,
    contexts,
    confidenceScore,
  };
}