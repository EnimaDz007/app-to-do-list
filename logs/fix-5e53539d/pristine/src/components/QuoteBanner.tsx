import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

const QUOTES = {
  en: [
    "Small steps every day lead to big results.",
    "Focus on progress, not perfection.",
    "The best time to start is now.",
    "Discipline beats motivation.",
    "One task at a time.",
    "Your future self will thank you.",
    "Done is better than perfect.",
  ],
  fr: [
    "De petits pas chaque jour mènent à de grands résultats.",
    "Concentrez-vous sur le progrès, pas la perfection.",
    "Le meilleur moment pour commencer, c'est maintenant.",
    "La discipline bat la motivation.",
    "Une tâche à la fois.",
    "Votre futur vous remerciera.",
    "Fait vaut mieux que parfait.",
  ],
  ar: [
    "خطوات صغيرة كل يوم تؤدي إلى نتائج كبيرة.",
    "ركز على التقدم، ليس الكمال.",
    "أفضل وقت للبدء هو الآن.",
    "الانضباط يتفوق على الحماس.",
    "مهمة واحدة في كل مرة.",
    "نسختك المستقبلية ستشكرك.",
    "المنجز أفضل من الكامل.",
  ],
};

const DAILY_QUOTES_AR = [
  "من جد وجد",
  "الصبر مفتاح الفرج",
  "اليد الواحدة لا تصفق",
  "العلم نور",
];

export const QuoteBanner: React.FC = () => {
  const { language } = useLanguage();

  const quote = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const langQuotes = QUOTES[language as keyof typeof QUOTES] || QUOTES.en;

    // 1 in 4 chance to show an Algerian proverb (in any language)
    if (dayIndex % 4 === 0) {
      return DAILY_QUOTES_AR[dayIndex % DAILY_QUOTES_AR.length];
    }

    return langQuotes[dayIndex % langQuotes.length];
  }, [language]);

  return (
    <div className="flex justify-center px-4 pt-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/60 dark:border-violet-500/40 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl px-3.5 py-1.5 max-w-[95%]">
        <span className="text-xs">💭</span>
        <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 truncate">
          {quote}
        </span>
      </div>
    </div>
  );
};
