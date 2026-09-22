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
    'client', 'prospect', 'devis', 'rendez-vous client', 'vente', 'partenaire'
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
    'courses', 'supermarché', 'sport', 'gym', 'médecin', 'dentiste', 'santé', 'pharmacie', 'maison', 'personnel'
  ],
};

const QUADRANT_KEYWORDS: Record<QuadrantId, string[]> = {
  do_first: [
    'urgent', 'urgently', 'asap', 'critical', 'critically', 'emergency',
    'immediately', 'immediate', 'today', 'tonight', 'deadline', 'now',
    'high priority', 'top priority', 'pressing',
    'عاجل', 'ضروري', 'فورا', 'الآن', 'طارئ', 'اليوم', 'أولوية قصوى', 'أولوية أولى', 'لازم',
    'urgent', 'très urgent', 'immédiatement', 'tout de suite', 'critique', 'impératif', 'aujourd\'hui'
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

/**
 * Extracts target due date from text — returns ISO string with time.
 * Handles: "in 30 minutes", "in 2 hours", "tomorrow at 5pm",
 * "at 3pm", "tonight", "this afternoon", "next monday", etc.
 */
function extractDueDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  const result = new Date(now.getTime());
  result.setSeconds(0, 0);

  const setTime = (h: number, m: number = 0) => {
    result.setHours(h, m, 0, 0);
  };

  // "in X minutes/hours/days/weeks"
  const inMatch = lower.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|h|days?|d|weeks?|w)\b/i);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2].toLowerCase();
    let ms = 0;
    if (unit.startsWith('min')) ms = n * 60000;
    else if (unit.startsWith('h')) ms = n * 3600000;
    else if (unit.startsWith('d')) ms = n * 86400000;
    else if (unit.startsWith('w')) ms = n * 604800000;
    return new Date(now.getTime() + ms).toISOString();
  }

  // French "dans X minutes/heures/jours"
  const dansMatch = lower.match(/\bdans\s+(\d+)\s*(minutes?|mins?|heures?|jours?|semaines?)\b/i);
  if (dansMatch) {
    const n = parseInt(dansMatch[1], 10);
    const unit = dansMatch[2].toLowerCase();
    let ms = 0;
    if (unit.startsWith('min')) ms = n * 60000;
    else if (unit.startsWith('heure')) ms = n * 3600000;
    else if (unit.startsWith('jour')) ms = n * 86400000;
    else if (unit.startsWith('semaine')) ms = n * 604800000;
    return new Date(now.getTime() + ms).toISOString();
  }

  // Explicit time like "at 3pm" or "at 15:30"
  const timeMatch = lower.match(/(?:at|à|في|الساعة)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let explicitHour: number | null = null;
  let explicitMinute = 0;
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const suffix = (timeMatch[3] || '').toLowerCase();
    if (suffix === 'pm' && h < 12) h += 12;
    if (suffix === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) {
      explicitHour = h;
      explicitMinute = min;
    }
  }

  // Tomorrow
  if (lower.includes('tomorrow') || lower.includes('demain') || lower.includes('غدا') || lower.includes('بكرة')) {
    result.setDate(result.getDate() + 1);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  // Next week
  if (lower.includes('next week') || lower.includes('semaine prochaine') || lower.includes('الأسبوع القادم')) {
    result.setDate(result.getDate() + 7);
    setTime(explicitHour ?? 9, explicitMinute);
    return result.toISOString();
  }

  // Tonight
  if (lower.includes('tonight') || lower.includes('this evening') || lower.includes('ce soir') || lower.includes('الليلة')) {
    setTime(20, 0);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  // Afternoon
  if (lower.includes('afternoon') || lower.includes('après-midi') || lower.includes('بعد الظهر')) {
    setTime(15, 0);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  // Morning
  if (lower.includes('this morning') || lower.includes('ce matin')) {
    setTime(9, 0);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  // Explicit time today (or tomorrow if past)
  if (explicitHour !== null) {
    setTime(explicitHour, explicitMinute);
    if (result.getTime() < now.getTime()) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }

  // Day of week
  const dayNames: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
    lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0,
  };
  for (const [name, dayNum] of Object.entries(dayNames)) {
    if (lower.includes(name)) {
      const currentDay = result.getDay();
      let diff = dayNum - currentDay;
      if (diff <= 0) diff += 7;
      result.setDate(result.getDate() + diff);
      setTime(explicitHour ?? 9, explicitMinute);
      return result.toISOString();
    }
  }

  // Default: 1 hour from now
  return new Date(now.getTime() + 3600000).toISOString();
}

export function parseSpokenTask(rawTranscript: string): ParsedVoiceTask {
  const raw = rawTranscript.trim();
  const lower = raw.toLowerCase();

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

  if (maxCatScore === 0) {
    detectedCategory = 'Engineering';
  }

  let detectedQuadrant: QuadrantId = 'schedule';
  let maxQuadScore = 0;

  for (const [qid, keywords] of Object.entries(QUADRANT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > maxQuadScore) {
      maxQuadScore = score;
      detectedQuadrant = qid as QuadrantId;
    }
  }

  if (maxQuadScore === 0) {
    detectedQuadrant = 'do_first';
  }

  const cleanedTitle = cleanSpeechPrompt(raw);
  const minutes = extractEstimatedMinutes(raw);
  const dueDate = extractDueDate(raw);

  const confidenceScore = Math.min(
    Math.round(((maxCatScore > 0 ? 0.5 : 0.2) + (maxQuadScore > 0 ? 0.5 : 0.2)) * 100),
    98
  );

  return {
    rawTranscript: raw,
    title: cleanedTitle || raw,
    description: raw.length > cleanedTitle.length + 10 ? raw : '',
    category: detectedCategory,
    quadrant: detectedQuadrant,
    priority: PRIORITY_MAP[detectedQuadrant],
    estimatedMinutes: minutes,
    dueDate,
    confidenceScore,
  };
}