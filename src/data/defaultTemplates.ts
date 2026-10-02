import type { Template, Subtask } from '../types';

type Lang = 'en' | 'fr' | 'ar';

interface TemplateStrings {
  name: string;
  description: string;
  subtasks: Record<string, string>;
}

const TPL_COPY: Record<Lang, Record<string, TemplateStrings>> = {
  en: {
    tpl_trip_planning: {
      name: 'Trip Planning',
      description: 'Everything to prepare before a trip — bookings, packing, documents.',
      subtasks: {
        tpl_trip_1: 'Bookings',
        tpl_trip_1_1: 'Flights',
        tpl_trip_1_2: 'Hotel / Airbnb',
        tpl_trip_1_3: 'Airport transfer',
        tpl_trip_1_4: 'Travel insurance',
        tpl_trip_2: 'Documents',
        tpl_trip_2_1: 'Check passport validity',
        tpl_trip_2_2: 'Visa requirements',
        tpl_trip_2_3: 'Print / save boarding passes',
        tpl_trip_3: 'Packing',
        tpl_trip_3_1: 'Clothes',
        tpl_trip_3_2: 'Toiletries',
        tpl_trip_3_3: 'Chargers & adapters',
        tpl_trip_3_4: 'Medications',
        tpl_trip_4: 'Before Leaving',
        tpl_trip_4_1: 'Water plants / pets',
        tpl_trip_4_2: 'Empty fridge',
        tpl_trip_4_3: 'Lock windows & doors',
        tpl_trip_4_4: 'Turn off appliances',
      },
    },
    tpl_product_launch: {
      name: 'Product Launch',
      description: 'From concept to release — pre-launch, launch day, and post-launch.',
      subtasks: {
        tpl_launch_1: 'Pre-Launch',
        tpl_launch_1_1: 'Finalize feature scope',
        tpl_launch_1_2: 'QA & bug bash',
        tpl_launch_1_3: 'Write release notes',
        tpl_launch_1_4: 'Prepare marketing assets',
        tpl_launch_1_5: 'Brief support team',
        tpl_launch_2: 'Launch Day',
        tpl_launch_2_1: 'Deploy to production',
        tpl_launch_2_2: 'Publish blog post',
        tpl_launch_2_3: 'Send email announcement',
        tpl_launch_2_4: 'Social media posts',
        tpl_launch_2_5: 'Monitor error dashboard',
        tpl_launch_3: 'Post-Launch (Week 1)',
        tpl_launch_3_1: 'Collect user feedback',
        tpl_launch_3_2: 'Fix critical bugs',
        tpl_launch_3_3: 'Write post-mortem',
        tpl_launch_3_4: 'Plan next iteration',
      },
    },
    tpl_weekly_review: {
      name: 'Weekly Review',
      description: 'Your weekly reset ritual — review, plan, and clear the decks.',
      subtasks: {
        tpl_review_1: 'Clear inbox to zero',
        tpl_review_2: "Review last week's completed tasks",
        tpl_review_3: 'Check habit streaks',
        tpl_review_4: 'Plan next week',
        tpl_review_4_1: 'Set top 3 priorities',
        tpl_review_4_2: 'Schedule deep work blocks',
        tpl_review_4_3: 'Review upcoming deadlines',
        tpl_review_5: 'Update milestones',
        tpl_review_6: 'Tidy workspace',
      },
    },
  },

  fr: {
    tpl_trip_planning: {
      name: 'Planification de voyage',
      description: 'Tout à préparer avant un voyage — réservations, bagages, documents.',
      subtasks: {
        tpl_trip_1: 'Réservations',
        tpl_trip_1_1: 'Vols',
        tpl_trip_1_2: 'Hôtel / Airbnb',
        tpl_trip_1_3: 'Transfert aéroport',
        tpl_trip_1_4: 'Assurance voyage',
        tpl_trip_2: 'Documents',
        tpl_trip_2_1: 'Vérifier la validité du passeport',
        tpl_trip_2_2: 'Exigences de visa',
        tpl_trip_2_3: 'Imprimer / sauvegarder les cartes d’embarquement',
        tpl_trip_3: 'Bagages',
        tpl_trip_3_1: 'Vêtements',
        tpl_trip_3_2: 'Articles de toilette',
        tpl_trip_3_3: 'Chargeurs et adaptateurs',
        tpl_trip_3_4: 'Médicaments',
        tpl_trip_4: 'Avant de partir',
        tpl_trip_4_1: 'Arroser les plantes / animaux',
        tpl_trip_4_2: 'Vider le frigo',
        tpl_trip_4_3: 'Fermer fenêtres et portes',
        tpl_trip_4_4: 'Éteindre les appareils',
      },
    },
    tpl_product_launch: {
      name: 'Lancement de produit',
      description: 'Du concept à la sortie — avant, jour J, et après.',
      subtasks: {
        tpl_launch_1: 'Avant le lancement',
        tpl_launch_1_1: 'Finaliser le périmètre des fonctionnalités',
        tpl_launch_1_2: 'QA & chasse aux bugs',
        tpl_launch_1_3: 'Rédiger les notes de version',
        tpl_launch_1_4: 'Préparer les supports marketing',
        tpl_launch_1_5: 'Briefer l’équipe support',
        tpl_launch_2: 'Jour J',
        tpl_launch_2_1: 'Déployer en production',
        tpl_launch_2_2: 'Publier l’article de blog',
        tpl_launch_2_3: 'Envoyer l’email d’annonce',
        tpl_launch_2_4: 'Publications sur les réseaux sociaux',
        tpl_launch_2_5: 'Surveiller le tableau de bord des erreurs',
        tpl_launch_3: 'Après le lancement (semaine 1)',
        tpl_launch_3_1: 'Recueillir les retours utilisateurs',
        tpl_launch_3_2: 'Corriger les bugs critiques',
        tpl_launch_3_3: 'Rédiger le post-mortem',
        tpl_launch_3_4: 'Planifier la prochaine itération',
      },
    },
    tpl_weekly_review: {
      name: 'Revue hebdomadaire',
      description: 'Votre rituel hebdomadaire — réviser, planifier, faire le vide.',
      subtasks: {
        tpl_review_1: 'Vider la boîte de réception',
        tpl_review_2: 'Passer en revue les tâches terminées de la semaine',
        tpl_review_3: 'Vérifier les séries d’habitudes',
        tpl_review_4: 'Planifier la semaine prochaine',
        tpl_review_4_1: 'Définir les 3 priorités principales',
        tpl_review_4_2: 'Planifier les plages de travail profond',
        tpl_review_4_3: 'Passer en revue les échéances à venir',
        tpl_review_5: 'Mettre à jour les jalons',
        tpl_review_6: 'Ranger l’espace de travail',
      },
    },
  },

  ar: {
    tpl_trip_planning: {
      name: 'تخطيط الرحلة',
      description: 'كل ما تحتاجه قبل الرحلة — الحجوزات، التغليف، المستندات.',
      subtasks: {
        tpl_trip_1: 'الحجوزات',
        tpl_trip_1_1: 'الطيران',
        tpl_trip_1_2: 'الفندق / Airbnb',
        tpl_trip_1_3: 'التوصيل من المطار',
        tpl_trip_1_4: 'تأمين السفر',
        tpl_trip_2: 'المستندات',
        tpl_trip_2_1: 'التحقق من صلاحية جواز السفر',
        tpl_trip_2_2: 'متطلبات التأشيرة',
        tpl_trip_2_3: 'طباعة / حفظ بطاقات الصعود',
        tpl_trip_3: 'التغليف',
        tpl_trip_3_1: 'الملابس',
        tpl_trip_3_2: 'مستحضرات العناية',
        tpl_trip_3_3: 'الشواحن والمحولات',
        tpl_trip_3_4: 'الأدوية',
        tpl_trip_4: 'قبل المغادرة',
        tpl_trip_4_1: 'سقاية النباتات / رعاية الحيوانات',
        tpl_trip_4_2: 'تفريغ الثلاجة',
        tpl_trip_4_3: 'إغلاق النوافذ والأبواب',
        tpl_trip_4_4: 'إطفاء الأجهزة',
      },
    },
    tpl_product_launch: {
      name: 'إطلاق المنتج',
      description: 'من الفكرة إلى الإصدار — ما قبل الإطلاق، يوم الإطلاق، وما بعده.',
      subtasks: {
        tpl_launch_1: 'قبل الإطلاق',
        tpl_launch_1_1: 'تحديد نطاق الميزات النهائي',
        tpl_launch_1_2: 'اختبار الجودة ومطاردة الأخطاء',
        tpl_launch_1_3: 'كتابة ملاحظات الإصدار',
        tpl_launch_1_4: 'تجهيز المواد التسويقية',
        tpl_launch_1_5: 'إبلاغ فريق الدعم',
        tpl_launch_2: 'يوم الإطلاق',
        tpl_launch_2_1: 'النشر إلى الإنتاج',
        tpl_launch_2_2: 'نشر المقالة في المدونة',
        tpl_launch_2_3: 'إرسال إعلان بالبريد الإلكتروني',
        tpl_launch_2_4: 'منشورات وسائل التواصل',
        tpl_launch_2_5: 'مراقبة لوحة الأخطاء',
        tpl_launch_3: 'بعد الإطلاق (الأسبوع الأول)',
        tpl_launch_3_1: 'جمع ملاحظات المستخدمين',
        tpl_launch_3_2: 'إصلاح الأخطاء الحرجة',
        tpl_launch_3_3: 'كتابة التقرير الختامي',
        tpl_launch_3_4: 'التخطيط للنسخة التالية',
      },
    },
    tpl_weekly_review: {
      name: 'المراجعة الأسبوعية',
      description: 'طقسك الأسبوعي — راجع، خطّط، وصفّح المهام.',
      subtasks: {
        tpl_review_1: 'تفريغ صندوق الوارد',
        tpl_review_2: 'مراجعة مهام الأسبوع الماضي',
        tpl_review_3: 'التحقق من سلاسل العادات',
        tpl_review_4: 'التخطيط للأسبوع القادم',
        tpl_review_4_1: 'تحديد أهم ٣ أولويات',
        tpl_review_4_2: 'جدولة فترات العمل العميق',
        tpl_review_4_3: 'مراجعة المواعيد النهائية',
        tpl_review_5: 'تحديث الأهداف',
        tpl_review_6: 'ترتيب مساحة العمل',
      },
    },
  },
};

/* ─────────────────────────────────────────────
   Raw subtask trees (language-agnostic — IDs only)
   ───────────────────────────────────────────── */

const RAW_TRIP: Subtask[] = [
  { id: 'tpl_trip_1', title: '', done: false, subtasks: [
    { id: 'tpl_trip_1_1', title: '', done: false },
    { id: 'tpl_trip_1_2', title: '', done: false },
    { id: 'tpl_trip_1_3', title: '', done: false },
    { id: 'tpl_trip_1_4', title: '', done: false },
  ]},
  { id: 'tpl_trip_2', title: '', done: false, subtasks: [
    { id: 'tpl_trip_2_1', title: '', done: false },
    { id: 'tpl_trip_2_2', title: '', done: false },
    { id: 'tpl_trip_2_3', title: '', done: false },
  ]},
  { id: 'tpl_trip_3', title: '', done: false, subtasks: [
    { id: 'tpl_trip_3_1', title: '', done: false },
    { id: 'tpl_trip_3_2', title: '', done: false },
    { id: 'tpl_trip_3_3', title: '', done: false },
    { id: 'tpl_trip_3_4', title: '', done: false },
  ]},
  { id: 'tpl_trip_4', title: '', done: false, subtasks: [
    { id: 'tpl_trip_4_1', title: '', done: false },
    { id: 'tpl_trip_4_2', title: '', done: false },
    { id: 'tpl_trip_4_3', title: '', done: false },
    { id: 'tpl_trip_4_4', title: '', done: false },
  ]},
];

const RAW_LAUNCH: Subtask[] = [
  { id: 'tpl_launch_1', title: '', done: false, subtasks: [
    { id: 'tpl_launch_1_1', title: '', done: false },
    { id: 'tpl_launch_1_2', title: '', done: false },
    { id: 'tpl_launch_1_3', title: '', done: false },
    { id: 'tpl_launch_1_4', title: '', done: false },
    { id: 'tpl_launch_1_5', title: '', done: false },
  ]},
  { id: 'tpl_launch_2', title: '', done: false, subtasks: [
    { id: 'tpl_launch_2_1', title: '', done: false },
    { id: 'tpl_launch_2_2', title: '', done: false },
    { id: 'tpl_launch_2_3', title: '', done: false },
    { id: 'tpl_launch_2_4', title: '', done: false },
    { id: 'tpl_launch_2_5', title: '', done: false },
  ]},
  { id: 'tpl_launch_3', title: '', done: false, subtasks: [
    { id: 'tpl_launch_3_1', title: '', done: false },
    { id: 'tpl_launch_3_2', title: '', done: false },
    { id: 'tpl_launch_3_3', title: '', done: false },
    { id: 'tpl_launch_3_4', title: '', done: false },
  ]},
];

const RAW_REVIEW: Subtask[] = [
  { id: 'tpl_review_1', title: '', done: false },
  { id: 'tpl_review_2', title: '', done: false },
  { id: 'tpl_review_3', title: '', done: false },
  { id: 'tpl_review_4', title: '', done: false, subtasks: [
    { id: 'tpl_review_4_1', title: '', done: false },
    { id: 'tpl_review_4_2', title: '', done: false },
    { id: 'tpl_review_4_3', title: '', done: false },
  ]},
  { id: 'tpl_review_5', title: '', done: false },
  { id: 'tpl_review_6', title: '', done: false },
];

/* ─────────────────────────────────────────────
   Fill helper — injects translated titles by id
   ───────────────────────────────────────────── */

function fillSubtasks(tree: Subtask[], dict: Record<string, string>): Subtask[] {
  return tree.map((node) => ({
    ...node,
    title: dict[node.id] ?? node.title,
    subtasks: node.subtasks ? fillSubtasks(node.subtasks, dict) : undefined,
  }));
}

/* ─────────────────────────────────────────────
   Build the three templates for a given language
   ───────────────────────────────────────────── */

export function getDefaultTemplates(lang: Lang = 'en'): Template[] {
  const copy = TPL_COPY[lang] ?? TPL_COPY.en;
  const t1 = copy.tpl_trip_planning;
  const t2 = copy.tpl_product_launch;
  const t3 = copy.tpl_weekly_review;

  return [
    {
      id: 'tpl_trip_planning',
      name: t1.name,
      emoji: '✈️',
      description: t1.description,
      isBuiltIn: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      preset: {
        category: 'Personal',
        quadrant: 'schedule',
        estimatedMinutes: 120,
        impactScore: 4,
        effortScore: 3,
        contexts: ['home', 'errand'],
      },
      subtasks: fillSubtasks(RAW_TRIP, t1.subtasks),
    },
    {
      id: 'tpl_product_launch',
      name: t2.name,
      emoji: '🚀',
      description: t2.description,
      isBuiltIn: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      preset: {
        category: 'Product',
        quadrant: 'do_first',
        estimatedMinutes: 480,
        impactScore: 5,
        effortScore: 4,
        contexts: ['work', 'computer'],
      },
      subtasks: fillSubtasks(RAW_LAUNCH, t2.subtasks),
    },
    {
      id: 'tpl_weekly_review',
      name: t3.name,
      emoji: '📊',
      description: t3.description,
      isBuiltIn: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      preset: {
        category: 'Personal',
        quadrant: 'schedule',
        estimatedMinutes: 45,
        impactScore: 4,
        effortScore: 2,
        contexts: ['home', 'computer'],
      },
      subtasks: fillSubtasks(RAW_REVIEW, t3.subtasks),
    },
  ];
}

/** Default English export kept for backward compatibility. */
export const DEFAULT_TEMPLATES: Template[] = getDefaultTemplates('en');

/* ─────────────────────────────────────────────
   Runtime translation lookups
   (for rendering already-saved tasks in the
   current language — even if IDs were regenerated)
   ───────────────────────────────────────────── */

const MERGED_SUBTASK_DICTS: Record<Lang, Record<string, string>> = {
  en: {
    ...TPL_COPY.en.tpl_trip_planning.subtasks,
    ...TPL_COPY.en.tpl_product_launch.subtasks,
    ...TPL_COPY.en.tpl_weekly_review.subtasks,
  },
  fr: {
    ...TPL_COPY.fr.tpl_trip_planning.subtasks,
    ...TPL_COPY.fr.tpl_product_launch.subtasks,
    ...TPL_COPY.fr.tpl_weekly_review.subtasks,
  },
  ar: {
    ...TPL_COPY.ar.tpl_trip_planning.subtasks,
    ...TPL_COPY.ar.tpl_product_launch.subtasks,
    ...TPL_COPY.ar.tpl_weekly_review.subtasks,
  },
};

/* Build reverse map: any-language title → translated title for target lang.
   Catches subtasks whose IDs were regenerated at clone time. */
function buildTitleLookup(target: Lang): Record<string, string> {
  const lookup: Record<string, string> = {};
  const keys = ['tpl_trip_planning', 'tpl_product_launch', 'tpl_weekly_review'] as const;

  for (const key of keys) {
    const enSubs = TPL_COPY.en[key].subtasks;
    for (const id of Object.keys(enSubs)) {
      const targetTitle = TPL_COPY[target][key].subtasks[id];
      if (!targetTitle) continue;
      const enTitle = TPL_COPY.en[key].subtasks[id];
      const frTitle = TPL_COPY.fr[key].subtasks[id];
      const arTitle = TPL_COPY.ar[key].subtasks[id];
      if (enTitle) lookup[enTitle] = targetTitle;
      if (frTitle) lookup[frTitle] = targetTitle;
      if (arTitle) lookup[arTitle] = targetTitle;
    }
  }
  return lookup;
}

const TITLE_LOOKUP: Record<Lang, Record<string, string>> = {
  en: buildTitleLookup('en'),
  fr: buildTitleLookup('fr'),
  ar: buildTitleLookup('ar'),
};

/* Template title lookup: any-language template name → target-language name. */
function buildTaskTitleLookup(target: Lang): Record<string, string> {
  const lookup: Record<string, string> = {};
  const keys = ['tpl_trip_planning', 'tpl_product_launch', 'tpl_weekly_review'] as const;
  for (const key of keys) {
    const targetName = TPL_COPY[target][key].name;
    lookup[TPL_COPY.en[key].name] = targetName;
    lookup[TPL_COPY.fr[key].name] = targetName;
    lookup[TPL_COPY.ar[key].name] = targetName;
  }
  return lookup;
}

const TASK_TITLE_LOOKUP: Record<Lang, Record<string, string>> = {
  en: buildTaskTitleLookup('en'),
  fr: buildTaskTitleLookup('fr'),
  ar: buildTaskTitleLookup('ar'),
};

/* Description lookup: source description (any language) → target description. */
function buildDescLookup(target: Lang): Record<string, string> {
  const lookup: Record<string, string> = {};
  const keys = ['tpl_trip_planning', 'tpl_product_launch', 'tpl_weekly_review'] as const;
  for (const key of keys) {
    const targetDesc = TPL_COPY[target][key].description;
    lookup[TPL_COPY.en[key].description] = targetDesc;
    lookup[TPL_COPY.fr[key].description] = targetDesc;
    lookup[TPL_COPY.ar[key].description] = targetDesc;
  }
  return lookup;
}

const TASK_DESC_LOOKUP: Record<Lang, Record<string, string>> = {
  en: buildDescLookup('en'),
  fr: buildDescLookup('fr'),
  ar: buildDescLookup('ar'),
};

/** Returns translated title for a built-in template subtask id, or null if custom. */
export function translateSubtaskTitle(id: string, lang: Lang): string | null {
  const dict = MERGED_SUBTASK_DICTS[lang];
  return dict?.[id] ?? null;
}

/** Returns translated description if it matches a built-in template description, else null. */
export function translateTaskDescription(desc: string | undefined, lang: Lang): string | null {
  if (!desc) return null;
  return TASK_DESC_LOOKUP[lang]?.[desc] ?? null;
}

/** Returns translated title if it matches a built-in template name, else null. */
export function translateTaskTitle(title: string | undefined, lang: Lang): string | null {
  if (!title) return null;
  return TASK_TITLE_LOOKUP[lang]?.[title] ?? null;
}

/** Recursively translate a subtask tree.
 *  Tries ID match first, then title match (for cloned tasks with regenerated IDs). */
export function translateSubtaskTree(tree: Subtask[], lang: Lang): Subtask[] {
  const titleMap = TITLE_LOOKUP[lang] ?? {};
  return tree.map((node) => {
    const byId = translateSubtaskTitle(node.id, lang);
    const byTitle = node.title ? titleMap[node.title] ?? null : null;
    const nextTitle = byId ?? byTitle ?? node.title;
    return {
      ...node,
      title: nextTitle,
      subtasks: node.subtasks ? translateSubtaskTree(node.subtasks, lang) : undefined,
    };
  });
}