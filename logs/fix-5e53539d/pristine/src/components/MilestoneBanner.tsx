import React, { useMemo } from 'react';
import { Target, ChevronRight } from 'lucide-react';
import { Milestone } from '../types';

interface MilestoneBannerProps {
  milestones: Milestone[];
  onOpen: () => void;
}

interface CountdownInfo {
  text: string;
  color: string;
  urgent: boolean;
}

function formatCountdown(targetDate: string): CountdownInfo {
  const target = new Date(targetDate).getTime();
  if (isNaN(target)) return { text: '—', color: '#64748B', urgent: false };
  const now = Date.now();
  const diff = target - now;
  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / 86400000);
  const hours = Math.floor(absDiff / 3600000);

  if (diff < 0) {
    return {
      text: days > 0 ? `Overdue by ${days}d` : `Overdue by ${hours}h`,
      color: '#E11D48',
      urgent: true,
    };
  }
  if (hours < 24) {
    return { text: `${hours}h left`, color: '#E11D48', urgent: true };
  }
  if (days < 7) {
    return { text: `${days}d left`, color: '#F59E0B', urgent: false };
  }
  if (days < 30) {
    return { text: `${days}d left`, color: '#4F46E5', urgent: false };
  }
  const months = Math.floor(days / 30);
  return { text: `${months}mo left`, color: '#4F46E5', urgent: false };
}

export const MilestoneBanner: React.FC<MilestoneBannerProps> = ({ milestones, onOpen }) => {
  // Pick the *next* upcoming milestone, or the most recent overdue one
  const active = useMemo(() => {
    const now = Date.now();
    const list = milestones.filter((m) => !m.archivedAt);
    if (list.length === 0) return null;

    const future = list
      .filter((m) => new Date(m.targetDate).getTime() > now)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
    if (future.length > 0) return future[0];

    const overdue = list
      .filter((m) => new Date(m.targetDate).getTime() <= now)
      .sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime());
    return overdue[0] || null;
  }, [milestones]);

  if (!active) return null;

  const cd = formatCountdown(active.targetDate);
  const targetLabel = new Date(active.targetDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      onClick={onOpen}
      className={`w-full flex items-center gap-2.5 px-4 py-2 border-b transition cursor-pointer group ${
        cd.urgent
          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/60 dark:hover:bg-rose-950/50'
          : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
      }`}
      title="Manage milestones"
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: `${active.color}22` }}
      >
        {active.emoji}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className="text-[12px] font-bold truncate"
          style={{ color: active.color }}
        >
          {active.name}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
          {targetLabel}
        </span>
      </div>

      <span
        className={`text-[11px] font-black shrink-0 ${cd.urgent ? 'animate-pulse' : ''}`}
        style={{ color: cd.color }}
      >
        {cd.urgent && '🔥 '}{cd.text}
      </span>

      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
};