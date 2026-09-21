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

/**
 * Strips leading speech commands to extract clean task title
 */
function cleanSpeechPrompt(raw: string): string {
  let cleaned = raw.trim();

  // English prefixes
  cleaned = cleaned.replace(
    /^(please\s+)?(add(\s+a)?\s+task(\s+to|\s+for)?|remind\s+me\s+to|i\s+need\s+to|create(\s+a)?\s+task(\s+for|\s+to)?|todo|to-do|schedule(\s+a)?\s+task(\s+for|\s+to)?|note\s+down\s+that\s+i\s+have\s+to)\s+/i,
    ''
  );

  // French prefixes
  cleaned = cleaned.replace(
    /^(s'il\s+te\s+plaît\s+)?(ajoute(\s+une)?\s+tâche(\s+pour|\s+de)?|rappelle-moi\s+de|je\s+dois|créer\s+une\s+tâche(\s+pour)?)\s+/i,
    ''
  );

  // Arabic prefixes
  cleaned = cleaned.replace(
    /^(من\s+فضلك\s+)?(أضف\s+مهمة(\s+لـ|\s+عن)?|تذكير\s+بـ|أريد\s+أن|يجب\s+أن|سجل\s+مهمة(\s+لـ)?)\s+/i,
    ''
  );

  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Extracts estimated duration from text
 */
function extractEstimatedMinutes(text: string): number {
  const lower = text.toLowerCase();

  // 1 hour, 2 hours, 1h, 2h
  const hoursMatch = lower.match(/(\d+)\s*(hours?|hrs?|heures?|ساعات|ساعة|h)\b/i);
  if (hoursMatch) {
    const hrs = parseInt(hoursMatch[1], 10);
    return isNaN(hrs) ? 60 : hrs * 60;
  }

  // Half an hour / 30 min
  if (lower.includes('half an hour') || lower.includes('demi-heure') || lower.includes('نصف ساعة')) {
    return 30;
  }

  // Minutes
  const minsMatch = lower.match(/(\d+)\s*(minutes?|mins?|دقيقة|min)\b/i);
  if (minsMatch) {
    const mins = parseInt(minsMatch[1], 10);
    return isNaN(mins) ? 30 : Math.min(Math.max(mins, 5), 480);
  }

  return 30; // default 30 min
}

/**
 * Extracts target due date from text
 */
function extractDueDate(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();

  if (
    lower.includes('tomorrow') ||
    lower.includes('demain') ||
    lower.includes('غدا') ||
    lower.includes('بكرة')
  ) {
    const tom = new Date(today.getTime() + 86400000);
    return tom.toISOString().split('T')[0];
  }

  if (
    lower.includes('next week') ||
    lower.includes('semaine prochaine') ||
    lower.includes('الأسبوع القادم')
  ) {
    const nextW = new Date(today.getTime() + 86400000 * 7);
    return nextW.toISOString().split('T')[0];
  }

  // default to today
  return today.toISOString().split('T')[0];
}

/**
 * Parses spoken speech or written task prompt into a structured task
 */
export function parseSpokenTask(rawTranscript: string): ParsedVoiceTask {
  const raw = rawTranscript.trim();
  const lower = raw.toLowerCase();

  // Detect Category
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

  // If no category detected, default to Engineering if code-sounding or Operations if business, else Personal
  if (maxCatScore === 0) {
    detectedCategory = 'Engineering';
  }

  // Detect Quadrant
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

  // If no specific quadrant words found, default to 'do_first' if it sounds urgent or 'schedule'
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
