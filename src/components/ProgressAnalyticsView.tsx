import React from 'react';
import { Award, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { QUADRANT_CONFIGS } from '../data/initialTasks';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface ProgressAnalyticsViewProps {
  tasks: Task[];
}

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({ tasks }) => {
  const { t } = useLanguage();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const totalMinutes = tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const completedMinutes = completedTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  // Quadrant distribution
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

  return (
    <div id="progress-analytics-view" className="space-y-4 pb-4">
      {/* Top Velocity Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-800/80 via-indigo-900 to-slate-900 dark:from-indigo-900/60 dark:via-slate-900 dark:to-slate-900 border border-indigo-500/30 p-4 shadow-sm text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{t('analytics_velocity_title')}</h3>
              <p className="text-xs text-indigo-200 dark:text-slate-400">{t('analytics_velocity_desc')}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-indigo-200 dark:text-indigo-400">{completionRate}%</div>
            <span className="text-[10px] text-emerald-400 font-medium">{t('analytics_on_track')}</span>
          </div>
        </div>

        {/* Big Progress Track */}
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

      {/* Mobile Optimization Audit */}
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
