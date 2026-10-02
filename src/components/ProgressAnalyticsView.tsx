import React from 'react';
import { Award, Zap, CheckCircle2, AlertCircle, Flame, Clock, TrendingUp } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { QUADRANT_CONFIGS } from '../data/initialTasks';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import {
  getTodayStats,
  getWeekStats,
  getTopTasks,
  getStreak,
  getTotalStats,
} from '../utils/pomodoroHistory';

interface ProgressAnalyticsViewProps {
  tasks: Task[];
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  todaysFocus: string;
  minutesShort: string;
  noSessionsYet: string;
  sessionsSummary: string;   // "{sessions} session(s) · {done} completed"
  session: string;
  sessions: string;
  focusStreak: string;
  days: string;
  startFirstSession: string;
  keepGoing: string;
  onFire: string;
  thisWeek: string;
  emptyWeek: string;
  topFocusedTasks: string;
  byTimeSpent: string;
  minSuffix: string;
  allTimeSummary: string;    // "{min} min total across {sessions} sessions"
  completionRate: string;    // "{percent}% completion"
}> = {
  en: {
    todaysFocus: "Today's Focus",
    minutesShort: 'min',
    noSessionsYet: 'No sessions yet',
    sessionsSummary: '{sessions} · {done} completed',
    session: 'session',
    sessions: 'sessions',
    focusStreak: 'Focus Streak',
    days: 'days',
    startFirstSession: 'Complete 1 session to start',
    keepGoing: 'Keep it going!',
    onFire: "You're on fire 🔥",
    thisWeek: 'This Week',
    emptyWeek: 'Start your first focus session to see your week.',
    topFocusedTasks: 'Top Focused Tasks',
    byTimeSpent: 'by time spent',
    minSuffix: 'min',
    allTimeSummary: '{min} min total across {sessions} sessions',
    completionRate: '{percent}% completion',
  },
  fr: {
    todaysFocus: "Focus du jour",
    minutesShort: 'min',
    noSessionsYet: 'Aucune session',
    sessionsSummary: '{sessions} · {done} terminées',
    session: 'session',
    sessions: 'sessions',
    focusStreak: 'Série de focus',
    days: 'jours',
    startFirstSession: 'Terminez 1 session pour commencer',
    keepGoing: 'Continuez comme ça !',
    onFire: 'Vous êtes en feu 🔥',
    thisWeek: 'Cette semaine',
    emptyWeek: 'Démarrez votre première session pour voir votre semaine.',
    topFocusedTasks: 'Tâches les plus travaillées',
    byTimeSpent: 'par temps passé',
    minSuffix: 'min',
    allTimeSummary: '{min} min au total sur {sessions} sessions',
    completionRate: '{percent}% terminées',
  },
  ar: {
    todaysFocus: 'تركيز اليوم',
    minutesShort: 'د',
    noSessionsYet: 'لا توجد جلسات بعد',
    sessionsSummary: '{sessions} · {done} مكتملة',
    session: 'جلسة',
    sessions: 'جلسات',
    focusStreak: 'سلسلة التركيز',
    days: 'يوم',
    startFirstSession: 'أكمل جلسة واحدة للبدء',
    keepGoing: 'واصل التقدم!',
    onFire: 'أنت مشتعل 🔥',
    thisWeek: 'هذا الأسبوع',
    emptyWeek: 'ابدأ أول جلسة تركيز لرؤية أسبوعك.',
    topFocusedTasks: 'أكثر المهام تركيزاً',
    byTimeSpent: 'حسب الوقت المستغرق',
    minSuffix: 'د',
    allTimeSummary: '{min} دقيقة إجمالاً خلال {sessions} جلسة',
    completionRate: 'إنجاز {percent}%',
  },
};

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({ tasks }) => {
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const totalMinutes = tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const completedMinutes = completedTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  const quadrantStats: Record<QuadrantId, number> = {
    do_first: tasks.filter((t) => t.quadrant === 'do_first').length,
    schedule: tasks.filter((t) => t.quadrant === 'schedule').length,
    delegate: tasks.filter((t) => t.quadrant === 'delegate').length,
    eliminate: tasks.filter((t) => t.quadrant === 'eliminate').length,
  };

  const quadrantI18n: Record<QuadrantId, { titleKey: TranslationKey; subtitleKey: TranslationKey }> = {
    do_first: { titleKey: 'matrix_q1_title', subtitleKey: 'matrix_q1_subtitle' },
    schedule: { titleKey: 'matrix_q2_title', subtitleKey: 'matrix_q2_subtitle' },
    delegate: { titleKey: 'matrix_q3_title', subtitleKey: 'matrix_q3_subtitle' },
    eliminate: { titleKey: 'matrix_q4_title', subtitleKey: 'matrix_q4_subtitle' },
  };

  const today = getTodayStats();
  const week = getWeekStats();
  const topTasks = getTopTasks(5);
  const streak = getStreak();
  const totals = getTotalStats();

  const maxWeekMinutes = Math.max(1, ...week.map((d) => d.minutes));
  const hasAnySessions = totals.totalSessions > 0;

  const sessionsLabel = (n: number) => (n === 1 ? copy.session : copy.sessions);

  return (
    <div id="progress-analytics-view" className="space-y-4 pb-4">
      {/* Top Velocity Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-800/80 via-indigo-900 to-slate-900 dark:from-indigo-900/60 dark:via-slate-900 dark:to-slate-900 border border-indigo-500/30 p-4 shadow-sm text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-start">
              <h3 className="text-sm font-semibold text-white">{t('analytics_velocity_title')}</h3>
              <p className="text-xs text-indigo-200 dark:text-slate-400">{t('analytics_velocity_desc')}</p>
            </div>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold font-mono text-indigo-200 dark:text-indigo-400">{completionRate}%</div>
            <span className="text-[10px] text-emerald-400 font-medium">{t('analytics_on_track')}</span>
          </div>
        </div>

        <div className="mt-3.5 space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-950/40 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-indigo-200 dark:text-slate-400 font-mono">
            <span>{t('analytics_completed', { count: completedTasks.length })}</span>
            <span>{t('analytics_in_progress', { count: inProgressTasks.length })}</span>
            <span>{t('analytics_pending', { count: totalTasks - completedTasks.length - inProgressTasks.length })}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{t('analytics_time_invested')}</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
            {completedMinutes} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {totalMinutes}m</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('analytics_hours_logged', { hours: Math.round((completedMinutes / 60) * 10) / 10 })}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>{t('analytics_high_impact_ratio')}</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {Math.round(
              (tasks.filter((t) => t.impactScore >= 4 && t.status === 'completed').length /
                Math.max(1, tasks.filter((t) => t.impactScore >= 4).length)) *
                100
            )}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('analytics_critical_fulfilled')}</p>
        </div>
      </div>

      {/* Today's Focus + Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white p-3.5 shadow-md shadow-violet-500/20">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
            <Clock className="w-3.5 h-3.5" />
            <span>{copy.todaysFocus}</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {today.minutes}<span className="text-xs font-normal ms-0.5">{copy.minutesShort}</span>
          </div>
          <p className="mt-1 text-[10px] text-white/80">
            {today.count === 0
              ? copy.noSessionsYet
              : copy.sessionsSummary
                  .replace('{sessions}', `${today.count} ${sessionsLabel(today.count)}`)
                  .replace('{done}', String(today.completedCount))}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3.5 shadow-md shadow-orange-500/20">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
            <Flame className="w-3.5 h-3.5" />
            <span>{copy.focusStreak}</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {streak}<span className="text-xs font-normal ms-0.5">{copy.days}</span>
          </div>
          <p className="mt-1 text-[10px] text-white/80">
            {streak === 0
              ? copy.startFirstSession
              : streak === 1
              ? copy.keepGoing
              : copy.onFire}
          </p>
        </div>
      </div>

      {/* Week Bar Chart */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{copy.thisWeek}</h4>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {week.reduce((sum, d) => sum + d.minutes, 0)} {copy.minutesShort}
          </span>
        </div>

        {!hasAnySessions ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2 opacity-40">🍅</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.emptyWeek}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between gap-1.5 h-24">
              {week.map((day) => {
                const heightPct = day.minutes > 0
                  ? Math.max(8, (day.minutes / maxWeekMinutes) * 100)
                  : 4;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 h-3">
                      {day.minutes > 0 ? day.minutes : ''}
                    </div>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        day.isToday
                          ? 'bg-gradient-to-t from-violet-500 to-fuchsia-400'
                          : day.minutes > 0
                          ? 'bg-indigo-400 dark:bg-indigo-500'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${heightPct}%`, minHeight: '4px' }}
                      title={`${day.dayLabel}: ${day.minutes} ${copy.minutesShort}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-1.5">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`flex-1 text-center text-[10px] font-bold uppercase tracking-wider ${
                    day.isToday
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {day.dayLabel.slice(0, 2)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Top Tasks */}
      {topTasks.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{copy.topFocusedTasks}</h4>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {copy.byTimeSpent}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {topTasks.map((item, idx) => (
              <div
                key={`${item.taskId ?? 'title'}-${idx}`}
                className="flex items-center gap-3 py-1.5"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {item.taskTitle}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {item.sessions} {sessionsLabel(item.sessions)}
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  {item.minutes}{copy.minSuffix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-time summary */}
      {hasAnySessions && (
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="text-slate-600 dark:text-slate-400">
              {copy.allTimeSummary
                .replace('{min}', String(totals.totalMinutes))
                .replace('{sessions}', String(totals.totalSessions))}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
              {copy.completionRate.replace('{percent}', String(totals.completionRate))}
            </span>
          </div>
        </div>
      )}

      {/* Quadrant Balance Breakdown */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{t('analytics_distribution_title')}</h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('analytics_4_quadrants')}</span>
        </div>

        <div className="mt-3 space-y-3">
          {(Object.keys(QUADRANT_CONFIGS) as QuadrantId[]).map((qid) => {
            const conf = QUADRANT_CONFIGS[qid];
            const count = quadrantStats[qid];
            const qPercent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
            const qDone = tasks.filter((t) => t.quadrant === qid && t.status === 'completed').length;
            const { titleKey, subtitleKey } = quadrantI18n[qid];

            return (
              <div key={qid} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: conf.color }}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{t(titleKey)}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">({t(subtitleKey)})</span>
                  </div>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                    {t('analytics_q_done_ratio', { done: qDone, total: count, percent: qPercent })}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${qPercent}%`,
                      backgroundColor: conf.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Native Health */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-xs space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>{t('analytics_native_health_title')}</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
          {t('analytics_native_health_desc')}
        </p>
      </div>
    </div>
  );
};