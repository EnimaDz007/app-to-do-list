import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, Trophy, Zap } from 'lucide-react';
import { KarmaState, KARMA_LEVELS } from '../hooks/useKarma';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface KarmaViewProps {
  isOpen: boolean;
  onClose: () => void;
  karma: KarmaState;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  karma: string;
  topLevel: string;
  toNext: string;
  todaysGoals: string;
  tasks: string;
  habits: string;
  whereComesFrom: string;
  streak: string;
  milestones: string;
  latePenalties: string;
  levels: string;
  you: string;
  karmaSuffix: string;
  earnBold: string;
  earnRest: string;
  loseBold: string;
  loseRest: string;
  levelNames: Record<string, string>;
}> = {
  en: {
    karma: 'Karma',
    topLevel: 'Top level',
    toNext: '{n} to {level}',
    todaysGoals: "Today's goals",
    tasks: 'Tasks',
    habits: 'Habits',
    whereComesFrom: 'Where your karma comes from',
    streak: 'Streak',
    milestones: 'Milestones',
    latePenalties: 'Late penalties',
    levels: 'Levels',
    you: 'You',
    karmaSuffix: 'karma',
    earnBold: 'Earn karma',
    earnRest: ' by completing tasks (+5 Do First, +3 Schedule, +2 Delegate, +1 Eliminate), checking habits (+2), and keeping your streak.',
    loseBold: 'Lose karma',
    loseRest: ' when a Do First task is overdue by 24h+ (−2 each).',
    levelNames: {
      Beginner: 'Beginner',
      Novice: 'Novice',
      Intermediate: 'Intermediate',
      Professional: 'Professional',
      Expert: 'Expert',
      Master: 'Master',
      Enlightened: 'Enlightened',
      Grandmaster: 'Grandmaster',
    },
  },
  fr: {
    karma: 'Karma',
    topLevel: 'Niveau max',
    toNext: '{n} pour {level}',
    todaysGoals: 'Objectifs du jour',
    tasks: 'Tâches',
    habits: 'Habitudes',
    whereComesFrom: 'D’où vient votre karma',
    streak: 'Série',
    milestones: 'Jalons',
    latePenalties: 'Pénalités de retard',
    levels: 'Niveaux',
    you: 'Vous',
    karmaSuffix: 'karma',
    earnBold: 'Gagnez du karma',
    earnRest: ' en terminant des tâches (+5 Faire, +3 Planifier, +2 Déléguer, +1 Éliminer), en cochant des habitudes (+2) et en maintenant votre série.',
    loseBold: 'Perdez du karma',
    loseRest: ' quand une tâche « À faire » est en retard de 24 h+ (−2 chacune).',
    levelNames: {
      Beginner: 'Débutant',
      Novice: 'Novice',
      Intermediate: 'Intermédiaire',
      Professional: 'Professionnel',
      Expert: 'Expert',
      Master: 'Maître',
      Enlightened: 'Éclairé',
      Grandmaster: 'Grand Maître',
    },
  },
  ar: {
    karma: 'الكارما',
    topLevel: 'أعلى مستوى',
    toNext: '{n} للوصول إلى {level}',
    todaysGoals: 'أهداف اليوم',
    tasks: 'المهام',
    habits: 'العادات',
    whereComesFrom: 'من أين تأتي كارماك',
    streak: 'السلسلة',
    milestones: 'الأهداف',
    latePenalties: 'عقوبات التأخير',
    levels: 'المستويات',
    you: 'أنت',
    karmaSuffix: 'كارما',
    earnBold: 'اكسب كارما',
    earnRest: ' بإكمال المهام (+5 ابدأ به فوراً، +3 جدولة، +2 تفويض، +1 استبعاد)، وتسجيل العادات (+2)، والحفاظ على سلسلتك.',
    loseBold: 'اخسر كارما',
    loseRest: ' عندما تتأخر مهمة "ابدأ به فوراً" بأكثر من ٢٤ ساعة (−2 لكل مهمة).',
    levelNames: {
      Beginner: 'مبتدئ',
      Novice: 'متدرب',
      Intermediate: 'متوسط',
      Professional: 'محترف',
      Expert: 'خبير',
      Master: 'أستاذ',
      Enlightened: 'مستنير',
      Grandmaster: 'أستاذ كبير',
    },
  },
};

function localLevelName(name: string, copy: typeof COPY.en): string {
  return copy.levelNames[name] ?? name;
}

const Ring: React.FC<{
  value: number;
  goal: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
  label: string;
  emoji: string;
}> = ({ value, goal, size, strokeWidth, color, trackColor, label, emoji }) => {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, goal > 0 ? value / goal : 0);
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base leading-none">{emoji}</span>
          <span className="text-[13px] font-black text-slate-900 dark:text-white leading-none mt-0.5">
            {value}
          </span>
          <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">
            / {goal}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
};

export const KarmaView: React.FC<KarmaViewProps> = ({ isOpen, onClose, karma }) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const levelIdx = KARMA_LEVELS.indexOf(karma.level);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="fixed left-1/2 top-1/2 z-[81] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 text-white shrink-0">
              <button
                onClick={onClose}
                className="absolute top-3 end-3 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-90">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{copy.karma}</span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shrink-0">
                  {karma.level.emoji}
                </div>
                <div className="min-w-0 text-start">
                  <div className="text-2xl font-black leading-none">
                    {karma.total}
                  </div>
                  <div className="text-[12px] font-bold opacity-90 mt-0.5">
                    {localLevelName(karma.level.name, copy)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-bold opacity-90 mb-1">
                  <span>{localLevelName(karma.level.name, copy)}</span>
                  {karma.nextLevel ? (
                    <span>
                      {copy.toNext
                        .replace('{n}', String(karma.pointsToNext))
                        .replace('{level}', localLevelName(karma.nextLevel.name, copy))}
                    </span>
                  ) : (
                    <span>{copy.topLevel}</span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${Math.round(karma.progressToNext * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Rings */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  {copy.todaysGoals}
                </div>
                <div className="flex items-center justify-around">
                  <Ring
                    value={karma.rings.tasksDoneToday}
                    goal={karma.rings.tasksGoal}
                    size={90}
                    strokeWidth={8}
                    color="#6366F1"
                    trackColor="#E0E7FF"
                    label={copy.tasks}
                    emoji="✅"
                  />
                  <Ring
                    value={karma.rings.habitsCheckedToday}
                    goal={karma.rings.habitsGoal}
                    size={90}
                    strokeWidth={8}
                    color="#10B981"
                    trackColor="#D1FAE5"
                    label={copy.habits}
                    emoji="🎯"
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  {copy.whereComesFrom}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <BreakdownCard
                    label={copy.tasks}
                    value={karma.breakdown.fromTasks}
                    emoji="🔥"
                    color="text-rose-600 dark:text-rose-400"
                    bg="bg-rose-50 dark:bg-rose-950/40"
                  />
                  <BreakdownCard
                    label={copy.habits}
                    value={karma.breakdown.fromHabits}
                    emoji="🎯"
                    color="text-emerald-600 dark:text-emerald-400"
                    bg="bg-emerald-50 dark:bg-emerald-950/40"
                  />
                  <BreakdownCard
                    label={copy.streak}
                    value={karma.breakdown.fromStreak}
                    emoji="🔥"
                    color="text-amber-600 dark:text-amber-400"
                    bg="bg-amber-50 dark:bg-amber-950/40"
                  />
                  <BreakdownCard
                    label={copy.milestones}
                    value={karma.breakdown.fromMilestones}
                    emoji="🎯"
                    color="text-violet-600 dark:text-violet-400"
                    bg="bg-violet-50 dark:bg-violet-950/40"
                  />
                  {karma.breakdown.fromPenalties < 0 && (
                    <BreakdownCard
                      label={copy.latePenalties}
                      value={karma.breakdown.fromPenalties}
                      emoji="⚠️"
                      color="text-rose-600 dark:text-rose-400"
                      bg="bg-rose-50 dark:bg-rose-950/40"
                    />
                  )}
                </div>
              </div>

              {/* Levels */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3" />
                  {copy.levels}
                </div>
                <div className="space-y-1">
                  {KARMA_LEVELS.map((lvl, i) => {
                    const unlocked = i <= levelIdx;
                    const isCurrent = i === levelIdx;
                    return (
                      <div
                        key={lvl.name}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                          isCurrent
                            ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-300 dark:border-violet-800'
                            : unlocked
                            ? 'bg-slate-50 dark:bg-slate-800/40'
                            : 'bg-slate-50/50 dark:bg-slate-900/40 opacity-60'
                        }`}
                      >
                        <span className="text-lg">{unlocked ? lvl.emoji : '🔒'}</span>
                        <div className="flex-1 min-w-0 text-start">
                          <div
                            className={`text-[12px] font-bold ${
                              isCurrent
                                ? 'text-violet-700 dark:text-violet-300'
                                : unlocked
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-500 dark:text-slate-500'
                            }`}
                          >
                            {localLevelName(lvl.name, copy)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {lvl.max === Infinity
                              ? `${lvl.min}+ ${copy.karmaSuffix}`
                              : `${lvl.min}–${lvl.max} ${copy.karmaSuffix}`}
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/60">
                            {copy.you}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug text-start">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{copy.earnBold}</span>
                  {copy.earnRest}{' '}
                  <span className="font-bold text-rose-600 dark:text-rose-400">{copy.loseBold}</span>
                  {copy.loseRest}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const BreakdownCard: React.FC<{
  label: string;
  value: number;
  emoji: string;
  color: string;
  bg: string;
}> = ({ label, value, emoji, color, bg }) => (
  <div className={`p-2.5 rounded-xl ${bg} flex items-center gap-2`}>
    <span className="text-base shrink-0">{emoji}</span>
    <div className="min-w-0 flex-1 text-start">
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
        {label}
      </div>
      <div className={`text-[14px] font-black ${color}`}>
        {value > 0 ? '+' : ''}{value}
      </div>
    </div>
  </div>
);