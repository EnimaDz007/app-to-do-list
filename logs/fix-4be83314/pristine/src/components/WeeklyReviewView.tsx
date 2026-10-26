import React, { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Flame, Target, Trophy,
  Calendar, CheckCircle2, Sparkles, Award,
} from 'lucide-react';
import { Task, Habit, HabitCheckIn, QuadrantId } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface WeeklyReviewViewProps {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  streakCount: number;
}

type LocalLang = 'en' | 'fr' | 'ar';

const QUADRANT_COLORS: Record<QuadrantId, { color: string; emoji: string }> = {
  do_first: { color: '#E11D48', emoji: '🔥' },
  schedule: { color: '#4F46E5', emoji: '📅' },
  delegate: { color: '#059669', emoji: '👥' },
  eliminate: { color: '#64748B', emoji: '🗑️' },
};

const COPY: Record<LocalLang, {
  locale: string;
  weeklyReview: string;
  weekAtGlance: string;
  completed: string;
  sameAsLastWeek: string;
  vsLastWeek: string;         // "+{n} vs last week"  (positive and negative)
  streak: string;
  keepFireBurning: string;
  startOneToday: string;
  bestQuadrant: string;
  na: string;
  tasksDone: string;          // "{n} tasks done"
  noCompletionsYet: string;
  topHabit: string;
  checkIns: string;           // "{n} check-ins"
  noCheckInsYet: string;
  quadrantBreakdown: string;
  topHabitsThisWeek: string;
  noCheckInsThisWeek: string;
  daysActive: string;
  quadrants: Record<QuadrantId, string>;
  msgDefault: string;
  msgEmpty: string;
  msgMore: string;            // "You crushed it — {n} more than last week! 🔥"
  msgAmazing: string;         // "Incredible week — {n} tasks done! 🏆"
  msgConsistency: string;     // "You showed up {n} days this week. Consistency wins. ⭐"
  msgSlower: string;          // "Slower than last week — let's bounce back next week. 💪"
}> = {
  en: {
    locale: 'en-US',
    weeklyReview: 'Weekly Review',
    weekAtGlance: 'Your week at a glance',
    completed: 'Completed',
    sameAsLastWeek: 'Same as last week',
    vsLastWeek: '{sign}{n} vs last week',
    streak: 'Streak',
    keepFireBurning: 'Keep the fire burning 🔥',
    startOneToday: 'Start one today',
    bestQuadrant: 'Best Quadrant',
    na: 'N/A',
    tasksDone: '{n} tasks done',
    noCompletionsYet: 'No completions yet',
    topHabit: 'Top Habit',
    checkIns: '{n} check-ins',
    noCheckInsYet: 'No check-ins yet',
    quadrantBreakdown: 'Quadrant breakdown',
    topHabitsThisWeek: 'Top habits this week',
    noCheckInsThisWeek: 'No check-ins this week yet. Make today count! 🌱',
    daysActive: 'Days active',
    quadrants: {
      do_first: 'Do First',
      schedule: 'Schedule',
      delegate: 'Delegate',
      eliminate: 'Eliminate',
    },
    msgDefault: 'Keep going — steady wins the race.',
    msgEmpty: 'Fresh week ahead. One task. Today. Go. 🌱',
    msgMore: 'You crushed it — {n} more than last week! 🔥',
    msgAmazing: 'Incredible week — {n} tasks done! 🏆',
    msgConsistency: 'You showed up {n} days this week. Consistency wins. ⭐',
    msgSlower: "Slower than last week — let's bounce back next week. 💪",
  },
  fr: {
    locale: 'fr-FR',
    weeklyReview: 'Bilan hebdomadaire',
    weekAtGlance: 'Votre semaine en un coup d’œil',
    completed: 'Terminées',
    sameAsLastWeek: 'Identique à la semaine dernière',
    vsLastWeek: '{sign}{n} vs la semaine dernière',
    streak: 'Série',
    keepFireBurning: 'Gardez le feu allumé 🔥',
    startOneToday: 'Commencez aujourd’hui',
    bestQuadrant: 'Meilleur quadrant',
    na: 'N/D',
    tasksDone: '{n} tâches terminées',
    noCompletionsYet: 'Aucune tâche terminée',
    topHabit: 'Meilleure habitude',
    checkIns: '{n} enregistrements',
    noCheckInsYet: 'Aucun enregistrement',
    quadrantBreakdown: 'Répartition par quadrant',
    topHabitsThisWeek: 'Meilleures habitudes cette semaine',
    noCheckInsThisWeek: 'Aucun enregistrement cette semaine. Faites de ce jour une réussite ! 🌱',
    daysActive: 'Jours actifs',
    quadrants: {
      do_first: 'À faire',
      schedule: 'Planifier',
      delegate: 'Déléguer',
      eliminate: 'Éliminer',
    },
    msgDefault: 'Continuez — la régularité gagne.',
    msgEmpty: 'Une nouvelle semaine commence. Une tâche. Aujourd’hui. Allez. 🌱',
    msgMore: 'Superbe — {n} de plus que la semaine dernière ! 🔥',
    msgAmazing: 'Semaine incroyable — {n} tâches terminées ! 🏆',
    msgConsistency: 'Vous étiez présent {n} jours cette semaine. La régularité gagne. ⭐',
    msgSlower: 'Plus lent que la semaine dernière — on reprend la semaine prochaine. 💪',
  },
  ar: {
    locale: 'ar-EG',
    weeklyReview: 'المراجعة الأسبوعية',
    weekAtGlance: 'أسبوعك في لمحة',
    completed: 'مكتملة',
    sameAsLastWeek: 'مثل الأسبوع الماضي',
    vsLastWeek: '{sign}{n} عن الأسبوع الماضي',
    streak: 'السلسلة',
    keepFireBurning: 'حافظ على اللهيب مشتعلاً 🔥',
    startOneToday: 'ابدأ واحدة اليوم',
    bestQuadrant: 'أفضل ربع',
    na: 'غ.م',
    tasksDone: '{n} مهمة منجزة',
    noCompletionsYet: 'لا إنجازات بعد',
    topHabit: 'أفضل عادة',
    checkIns: '{n} تسجيل',
    noCheckInsYet: 'لا تسجيلات بعد',
    quadrantBreakdown: 'توزيع أرباع أيزنهاور',
    topHabitsThisWeek: 'أفضل العادات هذا الأسبوع',
    noCheckInsThisWeek: 'لا تسجيلات هذا الأسبوع بعد. اجعل اليوم مميزاً! 🌱',
    daysActive: 'الأيام النشطة',
    quadrants: {
      do_first: 'ابدأ به فوراً',
      schedule: 'جدولة وتخطيط',
      delegate: 'تفويض',
      eliminate: 'استبعاد وإلغاء',
    },
    msgDefault: 'واصل — الانتظام يفوز.',
    msgEmpty: 'أسبوع جديد يبدأ. مهمة واحدة. اليوم. هيا. 🌱',
    msgMore: 'أحسنت — {n} أكثر من الأسبوع الماضي! 🔥',
    msgAmazing: 'أسبوع رائع — {n} مهمة منجزة! 🏆',
    msgConsistency: 'حضرت {n} أيام هذا الأسبوع. الانتظام يفوز. ⭐',
    msgSlower: 'أبطأ من الأسبوع الماضي — لنعوّض الأسبوع القادم. 💪',
  },
};

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const WeeklyReviewView: React.FC<WeeklyReviewViewProps> = ({
  tasks,
  habits,
  checkIns,
  streakCount,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekCompleted = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d >= weekAgo;
    });

    const lastWeekCompleted = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d >= twoWeeksAgo && d < weekAgo;
    });

    const completionDelta = thisWeekCompleted.length - lastWeekCompleted.length;

    const quadrantCounts: Record<QuadrantId, number> = {
      do_first: 0, schedule: 0, delegate: 0, eliminate: 0,
    };
    thisWeekCompleted.forEach((t) => {
      quadrantCounts[t.quadrant] = (quadrantCounts[t.quadrant] || 0) + 1;
    });

    let bestQuadrant: QuadrantId | null = null;
    let bestCount = 0;
    const quadrantKeys = Object.keys(quadrantCounts) as QuadrantId[];
    for (const q of quadrantKeys) {
      const c = quadrantCounts[q];
      if (c > bestCount) {
        bestCount = c;
        bestQuadrant = q;
      }
    }

    const weekAgoKey = toLocalDateKey(weekAgo);
    const thisWeekCheckIns = checkIns.filter((ci) => ci.date >= weekAgoKey);

    const habitTotals: Record<string, number> = {};
    thisWeekCheckIns.forEach((ci) => {
      habitTotals[ci.habitId] = (habitTotals[ci.habitId] || 0) + ci.count;
    });

    const topHabits = habits
      .filter((h) => !h.archivedAt)
      .map((h) => ({ habit: h, count: habitTotals[h.id] || 0 }))
      .sort((a, b) => b.count - a.count);

    const topHabit = (topHabits[0]?.count ?? 0) > 0 ? topHabits[0] : null;

    const completedDays = new Set<string>();
    thisWeekCompleted.forEach((t) => {
      if (t.completedAt) completedDays.add(toLocalDateKey(new Date(t.completedAt)));
    });

    let message = copy.msgDefault;
    if (thisWeekCompleted.length === 0) {
      message = copy.msgEmpty;
    } else if (completionDelta > 0) {
      message = copy.msgMore.replace('{n}', String(completionDelta));
    } else if (thisWeekCompleted.length >= 10) {
      message = copy.msgAmazing.replace('{n}', String(thisWeekCompleted.length));
    } else if (completedDays.size >= 5) {
      message = copy.msgConsistency.replace('{n}', String(completedDays.size));
    } else if (completionDelta < 0) {
      message = copy.msgSlower;
    }

    return {
      weekAgo,
      today,
      thisWeekCompleted,
      lastWeekCompleted,
      completionDelta,
      quadrantCounts,
      bestQuadrant: bestQuadrant as QuadrantId | null,
      bestCount,
      topHabits,
      topHabit,
      completedDays: completedDays.size,
      message,
    };
    // eslint-disable-next-line
  }, [tasks, habits, checkIns, lang]);

  const formatRange = () => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${stats.weekAgo.toLocaleDateString(copy.locale, opts)} – ${stats.today.toLocaleDateString(copy.locale, opts)}`;
  };

  const maxQuadrantCount = Math.max(1, ...Object.values(stats.quadrantCounts));

  return (
    <div className="w-full space-y-4 pb-4">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest opacity-90">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{copy.weeklyReview}</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight">
          {copy.weekAtGlance}
        </h1>
        <div className="mt-1 flex items-center gap-1.5 text-xs opacity-90">
          <Calendar className="w-3 h-3" />
          <span>{formatRange()}</span>
        </div>
        <p className="mt-3 text-[13px] leading-snug opacity-95">
          {stats.message}
        </p>
      </div>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>{copy.completed}</span>
          </div>
          <div className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white leading-none">
            {stats.thisWeekCompleted.length}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold">
            {stats.completionDelta === 0 ? (
              <span className="text-slate-400">{copy.sameAsLastWeek}</span>
            ) : stats.completionDelta > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {copy.vsLastWeek.replace('{sign}', '+').replace('{n}', String(stats.completionDelta))}
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                {copy.vsLastWeek.replace('{sign}', '').replace('{n}', String(stats.completionDelta))}
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Flame className="w-3 h-3" />
            <span>{copy.streak}</span>
          </div>
          <div className="mt-1.5 text-2xl font-black text-orange-500 leading-none">
            {streakCount}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-slate-400">
            {streakCount > 0 ? copy.keepFireBurning : copy.startOneToday}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Target className="w-3 h-3" />
            <span>{copy.bestQuadrant}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 leading-none">
            <span className="text-xl">
              {stats.bestQuadrant ? QUADRANT_COLORS[stats.bestQuadrant].emoji : '—'}
            </span>
            <span
              className="text-sm font-black truncate"
              style={{ color: stats.bestQuadrant ? QUADRANT_COLORS[stats.bestQuadrant].color : '#64748B' }}
            >
              {stats.bestQuadrant ? copy.quadrants[stats.bestQuadrant] : copy.na}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-slate-400">
            {stats.bestCount > 0 ? copy.tasksDone.replace('{n}', String(stats.bestCount)) : copy.noCompletionsYet}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Trophy className="w-3 h-3" />
            <span>{copy.topHabit}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 leading-none">
            <span className="text-xl">
              {stats.topHabit ? stats.topHabit.habit.emoji : '—'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">
              {stats.topHabit ? stats.topHabit.habit.name : copy.na}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-slate-400">
            {stats.topHabit ? copy.checkIns.replace('{n}', String(stats.topHabit.count)) : copy.noCheckInsYet}
          </div>
        </div>
      </div>

      {/* Quadrant breakdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          {copy.quadrantBreakdown}
        </h3>
        <div className="space-y-2.5">
          {(Object.keys(QUADRANT_COLORS) as QuadrantId[]).map((q) => {
            const count = stats.quadrantCounts[q];
            const pct = Math.round((count / maxQuadrantCount) * 100);
            return (
              <div key={q}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <span>{QUADRANT_COLORS[q].emoji}</span>
                    <span>{copy.quadrants[q]}</span>
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: QUADRANT_COLORS[q].color,
                      opacity: count > 0 ? 1 : 0.15,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top habits list */}
      {stats.topHabits.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {copy.topHabitsThisWeek}
          </h3>
          <div className="space-y-1.5">
            {stats.topHabits.slice(0, 5).map(({ habit, count }, idx) => (
              <div
                key={habit.id}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40"
              >
                <span className="text-[10px] font-black text-slate-400 w-4 text-center">
                  {idx + 1}
                </span>
                <span className="text-lg">{habit.emoji}</span>
                <span className="flex-1 min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {habit.name}
                </span>
                <span
                  className="text-[11px] font-black"
                  style={{ color: habit.color }}
                >
                  {count}
                </span>
              </div>
            ))}
            {stats.topHabits.every((h) => h.count === 0) && (
              <p className="text-[11px] text-slate-400 italic text-center py-2">
                {copy.noCheckInsThisWeek}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Days active */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-200/50 dark:border-emerald-900/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {copy.daysActive}
            </div>
            <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white leading-none">
              {stats.completedDays}
              <span className="text-base font-bold text-slate-400 ms-1">/ 7</span>
            </div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(stats.today);
              d.setDate(d.getDate() - (6 - i));
              const key = toLocalDateKey(d);
              const active = tasks.some(
                (t) => t.completedAt && toLocalDateKey(new Date(t.completedAt)) === key
              );
              return (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${
                    active
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                  title={key}
                >
                  {active ? '✓' : ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};