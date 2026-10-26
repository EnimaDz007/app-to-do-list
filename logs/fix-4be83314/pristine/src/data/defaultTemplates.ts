import type { Template, Subtask, Task } from '../types';

type Lang = 'en' | 'fr' | 'ar';

interface TemplateStrings {
  name: string;
  description: string;
  subtasks: Record<string, string>;
}

/* ─────────────────────────────────────────────
   Translations for every built-in template.
   Each subtask has a stable ID used for lookup,
   so switching languages works even on cloned tasks.
   ───────────────────────────────────────────── */

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
    tpl_morning_routine: {
      name: 'Morning Routine',
      description: 'Start the day on purpose — hydrate, move, plan, go.',
      subtasks: {
        tpl_morning_1: 'Drink a full glass of water',
        tpl_morning_2: 'Make the bed',
        tpl_morning_3: 'Stretch or work out (10 min)',
        tpl_morning_4: 'Review today’s top 3 priorities',
        tpl_morning_5: 'Eat breakfast (no phone)',
        tpl_morning_6: 'Leave for work on time',
      },
    },
    tpl_evening_winddown: {
      name: 'Evening Wind-Down',
      description: 'Close the day cleanly so tomorrow starts easy.',
      subtasks: {
        tpl_evening_1: 'Wash the dishes',
        tpl_evening_2: 'Lay out tomorrow’s clothes',
        tpl_evening_3: 'Plan tomorrow’s top 3 priorities',
        tpl_evening_4: 'Journal 3 lines (wins, worries, gratitude)',
        tpl_evening_5: 'Phone on airplane mode',
        tpl_evening_6: 'Lights out by target time',
      },
    },
    tpl_grocery_run: {
      name: 'Grocery Run',
      description: 'A clean, repeatable grocery shopping trip.',
      subtasks: {
        tpl_grocery_1: 'Check fridge & pantry',
        tpl_grocery_2: 'Write shopping list',
        tpl_grocery_3: 'Produce',
        tpl_grocery_4: 'Dairy & eggs',
        tpl_grocery_5: 'Proteins',
        tpl_grocery_6: 'Pantry staples',
        tpl_grocery_7: 'Household items',
        tpl_grocery_8: 'Unpack & store at home',
      },
    },
    tpl_deep_clean: {
      name: 'Deep Clean',
      description: 'Room-by-room reset for the whole home.',
      subtasks: {
        tpl_clean_1: 'Declutter surfaces',
        tpl_clean_2: 'Dust all shelves & sills',
        tpl_clean_3: 'Vacuum floors & rugs',
        tpl_clean_4: 'Mop hard floors',
        tpl_clean_5: 'Clean kitchen counters & stove',
        tpl_clean_6: 'Scrub bathroom sink, tub, toilet',
        tpl_clean_7: 'Change bed sheets',
        tpl_clean_8: 'Take out trash & recycling',
        tpl_clean_9: 'Wipe mirrors & windows',
      },
    },
    tpl_moving_homes: {
      name: 'Moving Homes',
      description: 'End-to-end moving checklist — from packing to new-home setup.',
      subtasks: {
        tpl_move_1: 'Book movers or truck',
        tpl_move_2: 'Forward mail',
        tpl_move_3: 'Transfer utilities',
        tpl_move_4: 'Pack room by room',
        tpl_move_5: 'Label all boxes by room',
        tpl_move_6: 'Pack essentials box (first-night kit)',
        tpl_move_7: 'Take photos of old place for deposit',
        tpl_move_8: 'Clean old place',
        tpl_move_9: 'Move furniture in',
        tpl_move_10: 'Unpack kitchen & bedroom first',
        tpl_move_11: 'Update address with bank, work, subscriptions',
        tpl_move_12: 'Return old keys',
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
    tpl_morning_routine: {
      name: 'Routine matinale',
      description: 'Commencez la journée avec intention — hydratez, bougez, planifiez.',
      subtasks: {
        tpl_morning_1: 'Boire un grand verre d’eau',
        tpl_morning_2: 'Faire le lit',
        tpl_morning_3: 'S’étirer ou s’entraîner (10 min)',
        tpl_morning_4: 'Revoir les 3 priorités du jour',
        tpl_morning_5: 'Prendre le petit-déjeuner (sans téléphone)',
        tpl_morning_6: 'Partir au travail à l’heure',
      },
    },
    tpl_evening_winddown: {
      name: 'Routine du soir',
      description: 'Clôturez la journée proprement pour un lendemain facile.',
      subtasks: {
        tpl_evening_1: 'Faire la vaisselle',
        tpl_evening_2: 'Préparer les vêtements de demain',
        tpl_evening_3: 'Planifier les 3 priorités de demain',
        tpl_evening_4: 'Écrire 3 lignes dans un journal',
        tpl_evening_5: 'Mettre le téléphone en mode avion',
        tpl_evening_6: 'Éteindre les lumières à l’heure cible',
      },
    },
    tpl_grocery_run: {
      name: 'Courses',
      description: 'Une virée courses propre et répétable.',
      subtasks: {
        tpl_grocery_1: 'Vérifier le frigo et les placards',
        tpl_grocery_2: 'Écrire la liste de courses',
        tpl_grocery_3: 'Fruits et légumes',
        tpl_grocery_4: 'Produits laitiers et œufs',
        tpl_grocery_5: 'Protéines',
        tpl_grocery_6: 'Épicerie de base',
        tpl_grocery_7: 'Produits ménagers',
        tpl_grocery_8: 'Ranger à la maison',
      },
    },
    tpl_deep_clean: {
      name: 'Grand nettoyage',
      description: 'Un reset pièce par pièce de toute la maison.',
      subtasks: {
        tpl_clean_1: 'Désencombrer les surfaces',
        tpl_clean_2: 'Épousseter les étagères et rebords',
        tpl_clean_3: 'Passer l’aspirateur',
        tpl_clean_4: 'Laver les sols durs',
        tpl_clean_5: 'Nettoyer les plans de travail et la cuisinière',
        tpl_clean_6: 'Récurer la salle de bain',
        tpl_clean_7: 'Changer les draps',
        tpl_clean_8: 'Sortir les poubelles',
        tpl_clean_9: 'Nettoyer les miroirs et vitres',
      },
    },
    tpl_moving_homes: {
      name: 'Déménagement',
      description: 'Checklist complète — de l’emballage à l’installation.',
      subtasks: {
        tpl_move_1: 'Réserver les déménageurs ou un camion',
        tpl_move_2: 'Faire suivre le courrier',
        tpl_move_3: 'Transférer les services publics',
        tpl_move_4: 'Emballer pièce par pièce',
        tpl_move_5: 'Étiqueter toutes les boîtes par pièce',
        tpl_move_6: 'Préparer une boîte d’essentiels (première nuit)',
        tpl_move_7: 'Prendre des photos de l’ancien logement',
        tpl_move_8: 'Nettoyer l’ancien logement',
        tpl_move_9: 'Installer les meubles',
        tpl_move_10: 'Déballer cuisine et chambre en premier',
        tpl_move_11: 'Mettre à jour l’adresse (banque, travail, abonnements)',
        tpl_move_12: 'Rendre les anciennes clés',
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
    tpl_morning_routine: {
      name: 'روتين الصباح',
      description: 'ابدأ يومك بهدف — اشرب، تحرّك، خطّط، انطلق.',
      subtasks: {
        tpl_morning_1: 'اشرب كوباً كاملاً من الماء',
        tpl_morning_2: 'رتّب السرير',
        tpl_morning_3: 'تمارين إطالة أو رياضة (١٠ دقائق)',
        tpl_morning_4: 'راجع أهم ٣ أولويات لليوم',
        tpl_morning_5: 'تناول الفطور (بدون هاتف)',
        tpl_morning_6: 'اذهب للعمل في الوقت المحدد',
      },
    },
    tpl_evening_winddown: {
      name: 'روتين المساء',
      description: 'أغلق يومك بنظافة ليبدأ غدك بسهولة.',
      subtasks: {
        tpl_evening_1: 'اغسل الأطباق',
        tpl_evening_2: 'جهّز ملابس الغد',
        tpl_evening_3: 'خطّط لأهم ٣ أولويات للغد',
        tpl_evening_4: 'اكتب ٣ أسطر في مفكرتك',
        tpl_evening_5: 'ضع الهاتف على وضع الطيران',
        tpl_evening_6: 'أطفئ الأنوار في الوقت المحدد',
      },
    },
    tpl_grocery_run: {
      name: 'التسوق',
      description: 'رحلة تسوق نظيفة وقابلة للتكرار.',
      subtasks: {
        tpl_grocery_1: 'افحص الثلاجة والخزانة',
        tpl_grocery_2: 'اكتب قائمة التسوق',
        tpl_grocery_3: 'فواكه وخضروات',
        tpl_grocery_4: 'ألبان وبيض',
        tpl_grocery_5: 'بروتينات',
        tpl_grocery_6: 'مواد أساسية',
        tpl_grocery_7: 'مواد منزلية',
        tpl_grocery_8: 'افرغ وارتّب في المنزل',
      },
    },
    tpl_deep_clean: {
      name: 'تنظيف عميق',
      description: 'إعادة ترتيب المنزل غرفة بغرفة.',
      subtasks: {
        tpl_clean_1: 'تخلّص من الفوضى على الأسطح',
        tpl_clean_2: 'امسح الرفوف والحواف',
        tpl_clean_3: 'نظّف الأرضيات والسجاد بالمكنسة',
        tpl_clean_4: 'امسح الأرضيات الصلبة',
        tpl_clean_5: 'نظّف أسطح المطبخ والموقد',
        tpl_clean_6: 'افرك الحمام والمغسلة والمرحاض',
        tpl_clean_7: 'غيّر ملاءات السرير',
        tpl_clean_8: 'أخرج القمامة وإعادة التدوير',
        tpl_clean_9: 'امسح المرايا والنوافذ',
      },
    },
    tpl_moving_homes: {
      name: 'الانتقال إلى منزل جديد',
      description: 'قائمة شاملة للانتقال — من التغليف إلى التركيب.',
      subtasks: {
        tpl_move_1: 'احجز شركة نقل أو شاحنة',
        tpl_move_2: 'حوّل البريد',
        tpl_move_3: 'انقل الخدمات (كهرباء، ماء، إنترنت)',
        tpl_move_4: 'غلّف غرفة بغرفة',
        tpl_move_5: 'ضع لصقات على كل الصندوق حسب الغرفة',
        tpl_move_6: 'جهّز صندوق الضروريات (الليلة الأولى)',
        tpl_move_7: 'صوّر المنزل القديم للتأمين',
        tpl_move_8: 'نظّف المنزل القديم',
        tpl_move_9: 'أدخل الأثاث',
        tpl_move_10: 'افرغ المطبخ وغرفة النوم أولاً',
        tpl_move_11: 'حدّث عنوانك (البنك، العمل، الاشتراكات)',
        tpl_move_12: 'أعد المفاتيح القديمة',
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

const RAW_MORNING: Subtask[] = [
  { id: 'tpl_morning_1', title: '', done: false },
  { id: 'tpl_morning_2', title: '', done: false },
  { id: 'tpl_morning_3', title: '', done: false },
  { id: 'tpl_morning_4', title: '', done: false },
  { id: 'tpl_morning_5', title: '', done: false },
  { id: 'tpl_morning_6', title: '', done: false },
];

const RAW_EVENING: Subtask[] = [
  { id: 'tpl_evening_1', title: '', done: false },
  { id: 'tpl_evening_2', title: '', done: false },
  { id: 'tpl_evening_3', title: '', done: false },
  { id: 'tpl_evening_4', title: '', done: false },
  { id: 'tpl_evening_5', title: '', done: false },
  { id: 'tpl_evening_6', title: '', done: false },
];

const RAW_GROCERY: Subtask[] = [
  { id: 'tpl_grocery_1', title: '', done: false },
  { id: 'tpl_grocery_2', title: '', done: false },
  { id: 'tpl_grocery_3', title: '', done: false },
  { id: 'tpl_grocery_4', title: '', done: false },
  { id: 'tpl_grocery_5', title: '', done: false },
  { id: 'tpl_grocery_6', title: '', done: false },
  { id: 'tpl_grocery_7', title: '', done: false },
  { id: 'tpl_grocery_8', title: '', done: false },
];

const RAW_CLEAN: Subtask[] = [
  { id: 'tpl_clean_1', title: '', done: false },
  { id: 'tpl_clean_2', title: '', done: false },
  { id: 'tpl_clean_3', title: '', done: false },
  { id: 'tpl_clean_4', title: '', done: false },
  { id: 'tpl_clean_5', title: '', done: false },
  { id: 'tpl_clean_6', title: '', done: false },
  { id: 'tpl_clean_7', title: '', done: false },
  { id: 'tpl_clean_8', title: '', done: false },
  { id: 'tpl_clean_9', title: '', done: false },
];

const RAW_MOVE: Subtask[] = [
  { id: 'tpl_move_1', title: '', done: false },
  { id: 'tpl_move_2', title: '', done: false },
  { id: 'tpl_move_3', title: '', done: false },
  { id: 'tpl_move_4', title: '', done: false },
  { id: 'tpl_move_5', title: '', done: false },
  { id: 'tpl_move_6', title: '', done: false },
  { id: 'tpl_move_7', title: '', done: false },
  { id: 'tpl_move_8', title: '', done: false },
  { id: 'tpl_move_9', title: '', done: false },
  { id: 'tpl_move_10', title: '', done: false },
  { id: 'tpl_move_11', title: '', done: false },
  { id: 'tpl_move_12', title: '', done: false },
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
   Build the built-in templates for a given language
   ───────────────────────────────────────────── */

export function getDefaultTemplates(lang: Lang = 'en'): Template[] {
  const copy = TPL_COPY[lang] ?? TPL_COPY.en;
  const CREATED = '2024-01-01T00:00:00.000Z';

  return [
    {
      id: 'tpl_morning_routine',
      name: copy.tpl_morning_routine.name,
      emoji: '🌅',
      description: copy.tpl_morning_routine.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'do_first', estimatedMinutes: 30, contexts: ['home'] },
      subtasks: fillSubtasks(RAW_MORNING, copy.tpl_morning_routine.subtasks),
    },
    {
      id: 'tpl_evening_winddown',
      name: copy.tpl_evening_winddown.name,
      emoji: '🌙',
      description: copy.tpl_evening_winddown.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'schedule', estimatedMinutes: 30, contexts: ['home'] },
      subtasks: fillSubtasks(RAW_EVENING, copy.tpl_evening_winddown.subtasks),
    },
    {
      id: 'tpl_weekly_review',
      name: copy.tpl_weekly_review.name,
      emoji: '📊',
      description: copy.tpl_weekly_review.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'schedule', estimatedMinutes: 45, contexts: ['home', 'computer'] },
      subtasks: fillSubtasks(RAW_REVIEW, copy.tpl_weekly_review.subtasks),
    },
    {
      id: 'tpl_grocery_run',
      name: copy.tpl_grocery_run.name,
      emoji: '🛒',
      description: copy.tpl_grocery_run.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'schedule', estimatedMinutes: 60, contexts: ['errand'] },
      subtasks: fillSubtasks(RAW_GROCERY, copy.tpl_grocery_run.subtasks),
    },
    {
      id: 'tpl_deep_clean',
      name: copy.tpl_deep_clean.name,
      emoji: '🧹',
      description: copy.tpl_deep_clean.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'schedule', estimatedMinutes: 180, contexts: ['home'] },
      subtasks: fillSubtasks(RAW_CLEAN, copy.tpl_deep_clean.subtasks),
    },
    {
      id: 'tpl_trip_planning',
      name: copy.tpl_trip_planning.name,
      emoji: '✈️',
      description: copy.tpl_trip_planning.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'schedule', estimatedMinutes: 120, contexts: ['home', 'errand'] },
      subtasks: fillSubtasks(RAW_TRIP, copy.tpl_trip_planning.subtasks),
    },
    {
      id: 'tpl_moving_homes',
      name: copy.tpl_moving_homes.name,
      emoji: '📦',
      description: copy.tpl_moving_homes.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Personal', quadrant: 'do_first', estimatedMinutes: 480, contexts: ['home', 'errand'] },
      subtasks: fillSubtasks(RAW_MOVE, copy.tpl_moving_homes.subtasks),
    },
    {
      id: 'tpl_product_launch',
      name: copy.tpl_product_launch.name,
      emoji: '🚀',
      description: copy.tpl_product_launch.description,
      isBuiltIn: true,
      createdAt: CREATED,
      preset: { category: 'Product', quadrant: 'do_first', estimatedMinutes: 480, contexts: ['work', 'computer'] },
      subtasks: fillSubtasks(RAW_LAUNCH, copy.tpl_product_launch.subtasks),
    },
  ];
}

/** Default English export kept for backward compatibility. */
export const DEFAULT_TEMPLATES: Template[] = getDefaultTemplates('en');

/* ─────────────────────────────────────────────
   Runtime translation lookups
   ───────────────────────────────────────────── */

const ALL_TEMPLATE_KEYS = [
  'tpl_trip_planning',
  'tpl_product_launch',
  'tpl_weekly_review',
  'tpl_morning_routine',
  'tpl_evening_winddown',
  'tpl_grocery_run',
  'tpl_deep_clean',
  'tpl_moving_homes',
] as const;

const MERGED_SUBTASK_DICTS: Record<Lang, Record<string, string>> = {
  en: {}, fr: {}, ar: {},
};
for (const lang of ['en', 'fr', 'ar'] as const) {
  for (const key of ALL_TEMPLATE_KEYS) {
    Object.assign(MERGED_SUBTASK_DICTS[lang], TPL_COPY[lang][key].subtasks);
  }
}

function buildTitleLookup(target: Lang): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const key of ALL_TEMPLATE_KEYS) {
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

function buildTaskTitleLookup(target: Lang): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const key of ALL_TEMPLATE_KEYS) {
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

function buildDescLookup(target: Lang): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const key of ALL_TEMPLATE_KEYS) {
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
  return MERGED_SUBTASK_DICTS[lang]?.[id] ?? null;
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

/** Recursively translate a subtask tree. Tries ID match, then title match. */
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

/* ─────────────────────────────────────────────
   NEW — localize a cloned task in place.
   Detects whether the task originated from a built-in template
   (via ID or title match) and, if so, replaces its title,
   description, and subtask titles with the target language.
   Custom tasks are returned untouched.
   ───────────────────────────────────────────── */

export function localizeClonedTask(task: Task, lang: Lang): Task {
  const translatedTitle = translateTaskTitle(task.title, lang);
  const translatedDesc = translateTaskDescription(task.description, lang);
  const nextSubtasks = task.subtasks ? translateSubtaskTree(task.subtasks, lang) : undefined;

  const titleChanged = translatedTitle !== null && translatedTitle !== task.title;
  const descChanged = translatedDesc !== null && translatedDesc !== task.description;
  const subsChanged = !!nextSubtasks && JSON.stringify(nextSubtasks) !== JSON.stringify(task.subtasks);

  if (!titleChanged && !descChanged && !subsChanged) return task;

  return {
    ...task,
    title: translatedTitle ?? task.title,
    description: translatedDesc ?? task.description,
    subtasks: nextSubtasks ?? task.subtasks,
  };
}

/** Same as above, but runs over an array (one pass, cheap). */
export function localizeClonedTasks(tasks: Task[], lang: Lang): Task[] {
  let changed = false;
  const next = tasks.map((t) => {
    const localized = localizeClonedTask(t, lang);
    if (localized !== t) changed = true;
    return localized;
  });
  return changed ? next : tasks;
}