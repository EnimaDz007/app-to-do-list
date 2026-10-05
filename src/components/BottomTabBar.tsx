// ─────────────────────────────────────────────────────────────
//  FILE: src/components/BottomTabBar.tsx
//  Leather Binder default theme + premium animated bars
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutGrid, List, CalendarDays, Target, MoreHorizontal,
} from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useUIDesign, UIDesign } from '../hooks/useUIDesign';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface BottomTabBarProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  onOpenMore: () => void;
  urgentCount?: number;
}

const CALENDAR_TABS: TabView[] = ['timeline', 'calendar', 'flow'];
const MORE_TABS: TabView[] = ['analytics', 'review', 'archive', 'export'];

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  matrix: string;
  tasks: string;
  calendar: string;
  habits: string;
  more: string;
}> = {
  en: { matrix: 'Matrix',   tasks: 'Tasks',    calendar: 'Calendar',   habits: 'Habits',    more: 'More' },
  fr: { matrix: 'Matrice',  tasks: 'Tâches',   calendar: 'Calendrier', habits: 'Habitudes', more: 'Plus' },
  ar: { matrix: 'المصفوفة', tasks: 'المهام',   calendar: 'التقويم',    habits: 'العادات',   more: 'المزيد' },
};

interface TabDef {
  id: string;
  label: string;
  onClick: () => void;
  badge?: number;
}

interface BarProps {
  tabs: TabDef[];
  activeIndex: number;
  urgentCount: number;
  isRTL: boolean;
  isDark: boolean;
}

const ICONS = [LayoutGrid, List, CalendarDays, Target, MoreHorizontal];

/* ═════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════ */

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenMore,
  urgentCount = 0,
}) => {
  const { language, isRTL } = useLanguage();
  const { uiDesign } = useUIDesign();
  const { isDark } = useTheme();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const isCalendarActive = CALENDAR_TABS.includes(activeTab);
  const isMoreActive = MORE_TABS.includes(activeTab);

  const tabs = useMemo<TabDef[]>(() => [
    { id: 'matrix',   label: copy.matrix,   onClick: () => onChangeTab('matrix'), badge: urgentCount },
    { id: 'list',     label: copy.tasks,    onClick: () => onChangeTab('list') },
    { id: 'calendar', label: copy.calendar, onClick: () => { if (!isCalendarActive) onChangeTab('calendar'); } },
    { id: 'habits',   label: copy.habits,   onClick: () => onChangeTab('habits') },
    { id: 'more',     label: copy.more,     onClick: onOpenMore },
  ], [activeTab, copy, urgentCount, isCalendarActive, onChangeTab, onOpenMore]);

  const activeIndex = (() => {
    if (activeTab === 'matrix') return 0;
    if (activeTab === 'list') return 1;
    if (isCalendarActive) return 2;
    if (activeTab === 'habits') return 3;
    if (isMoreActive) return 4;
    return 0;
  })();

  const theme = uiDesign;
  const barProps: BarProps = { tabs, activeIndex, urgentCount, isRTL, isDark };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed z-40 left-3 right-3 bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto">
        {theme === 'binder' && <BinderBar {...barProps} />}
        {theme === 'classic' && <ClassicBar {...barProps} />}
        {theme === 'neumorphic' && <PearlBar {...barProps} />}
        {theme === 'stacked' && <StackedBar {...barProps} />}
        {theme === 'radial' && <RadialBar {...barProps} />}
        {theme === 'tarot' && <TarotBar {...barProps} />}
        {theme === 'hive' && <HiveBar {...barProps} />}
        {theme === 'kanban' && <KanbanBar {...barProps} />}
        {theme === 'vending' && <VendingBar {...barProps} />}
        {theme === 'detective' && <DetectiveBar {...barProps} />}
      </div>

      <SharedKeyframes />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   SHARED TAB ROW
   ═════════════════════════════════════════════════════════════ */

interface TabRowProps {
  tabs: TabDef[];
  activeIndex: number;
  iconColor: (i: number) => string;
  labelColor: (i: number) => string;
  onTabClick: (i: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}

const TabRow: React.FC<TabRowProps> = ({ tabs, activeIndex, iconColor, labelColor, onTabClick }) => (
  <div className="relative flex items-center justify-between h-full px-2 z-[3]">
    {tabs.map((tab, i) => {
      const Icon = ICONS[i];
      const showBadge = i === 0 && (tab.badge || 0) > 0;
      const isActive = i === activeIndex;
      return (
        <button
          key={tab.id}
          onClick={(e) => onTabClick(i, e)}
          className="flex-1 h-full flex flex-col items-center justify-center gap-[3px] px-1 bg-transparent border-none cursor-pointer active:scale-[0.94] transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          title={tab.label}
        >
          <div className="ic relative">
            <Icon
              className="w-[20px] h-[20px] transition-transform duration-500"
              style={{
                color: iconColor(i),
                strokeWidth: isActive ? 2.4 : 2,
                transform: isActive ? 'translateY(-0.5px)' : 'none',
              }}
            />
            {showBadge && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold"
                style={{ animation: 'badgePulse 2.2s ease-in-out infinite' }}
              >
                {tab.badge! > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
          <span
            className="lb text-[10px] font-semibold leading-none tracking-tight"
            style={{ color: labelColor(i), opacity: isActive ? 1 : 0.65 }}
          >
            {tab.label}
          </span>
        </button>
      );
    })}
  </div>
);

/* ═════════════════════════════════════════════════════════════
   0 — LEATHER BINDER  (DEFAULT THEME)
   ═════════════════════════════════════════════════════════════ */

const BINDER_COLORS = {
  dark: {
    barBg: 'linear-gradient(180deg, #3a0810 0%, #24040a 42%, #150206 100%)',
    barShadow: `
      inset 0 1px 0 rgba(255,220,160,0.22),
      inset 0 -2px 0 rgba(0,0,0,0.7),
      inset 0 0 40px rgba(0,0,0,0.6),
      0 24px 55px rgba(0,0,0,0.95),
      0 0 0 1.5px rgba(212,175,90,0.35),
      0 0 0 3px rgba(0,0,0,0.9),
      0 0 80px -25px rgba(212,175,90,0.35)
    `,
    pillBg: 'linear-gradient(180deg, #f7e2b8 0%, #e0be7a 28%, #c2a05e 62%, #8b6f3a 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,248,220,0.95),
      inset 0 -2px 6px rgba(70,45,15,0.5),
      0 8px 20px rgba(0,0,0,0.6),
      0 0 30px rgba(212,175,90,0.55)
    `,
    iconActive: '#2a0808',
    iconInactive: 'rgba(232,200,160,0.7)',
    labelActive: '#2a0808',
    labelInactive: 'rgba(232,200,160,0.7)',
    seam: 'rgba(245,220,160,0.95)',
    stitch: 'rgba(212,175,90,0.5)',
  },
  light: {
    barBg: 'linear-gradient(180deg, #5a1018 0%, #3a0810 42%, #24040a 100%)',
    barShadow: `
      inset 0 1px 0 rgba(255,220,160,0.28),
      inset 0 -2px 0 rgba(0,0,0,0.65),
      inset 0 0 40px rgba(0,0,0,0.55),
      0 24px 55px rgba(0,0,0,0.9),
      0 0 0 1.5px rgba(212,175,90,0.42),
      0 0 0 3px rgba(0,0,0,0.85),
      0 0 80px -25px rgba(212,175,90,0.45)
    `,
    pillBg: 'linear-gradient(180deg, #f7e2b8 0%, #e0be7a 28%, #c2a05e 62%, #8b6f3a 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,248,220,0.95),
      inset 0 -2px 6px rgba(70,45,15,0.5),
      0 8px 20px rgba(0,0,0,0.55),
      0 0 30px rgba(212,175,90,0.55)
    `,
    iconActive: '#2a0808',
    iconInactive: '#e8c8a0',
    labelActive: '#2a0808',
    labelInactive: '#e8c8a0',
    seam: 'rgba(245,220,160,0.95)',
    stitch: 'rgba(212,175,90,0.55)',
  },
};

const BinderBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const c = isDark ? BINDER_COLORS.dark : BINDER_COLORS.light;

  // Pill position follows activeIndex. More is an ACTION, not a tab,
  // so tapping it doesn't change activeIndex → pill stays on the real tab.
  useEffect(() => {
    if (pillRef.current) {
      pillRef.current.style.left = `${activeIndex * 20}%`;
    }
  }, [activeIndex]);

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    // NOTE: no manual pill move here — the useEffect above handles it.
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    const btn = e.currentTarget;
    if (!bar) return;

    // ripple inside the tab
    const tr = btn.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position:absolute;
      left:${e.clientX - tr.left}px;
      top:${e.clientY - tr.top}px;
      width:14px;height:14px;margin-left:-7px;margin-top:-7px;
      border-radius:50%;
      background:radial-gradient(circle, rgba(255,245,215,0.95) 0%, rgba(240,208,144,0.6) 45%, transparent 100%);
      pointer-events:none;z-index:8;
      animation: binderTabRipple 0.95s cubic-bezier(0.34,1.6,0.64,1) forwards;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1000);

    // sparkles from click point
    const br = bar.getBoundingClientRect();
    const cx = e.clientX - br.left;
    const cy = e.clientY - br.top;
    for (let s = 0; s < 12; s++) {
      const spark = document.createElement('div');
      const ang  = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 46;
      spark.style.cssText = `
        position:absolute;left:${cx}px;top:${cy}px;
        width:5px;height:5px;margin-left:-2.5px;margin-top:-2.5px;
        border-radius:50%;
        background:radial-gradient(circle, #fff8d0 0%, #f0d8a8 40%, rgba(230,200,138,0.4) 70%, transparent 100%);
        box-shadow: 0 0 10px #e6c88a, 0 0 18px rgba(230,200,138,0.7);
        pointer-events:none;z-index:9;
        --sx:${Math.cos(ang)*dist}px;--sy:${Math.sin(ang)*dist}px;
        animation: binderTabSpark 1s cubic-bezier(0.15,0.6,0.4,1) ${s*18}ms forwards;
      `;
      bar.appendChild(spark);
      setTimeout(() => spark.remove(), 1200);
    }
  };

  return (
    <div
      ref={barRef}
      className="binder-bar relative w-full h-[78px] rounded-[20px] overflow-hidden"
      style={{ background: c.barBg, boxShadow: c.barShadow, isolation: 'isolate' }}
    >
      {/* top gold seam */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none z-[6]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(212,175,90,0.55) 12%, ${c.seam} 50%, rgba(212,175,90,0.55) 88%, transparent 100%)`,
          filter: 'drop-shadow(0 0 5px rgba(212,175,90,0.7))',
        }}
      />

      {/* bottom stitch */}
      <div
        className="absolute bottom-[4px] left-[14px] right-[14px] h-[1px] pointer-events-none z-[6] opacity-75"
        style={{ backgroundImage: `repeating-linear-gradient(90deg, ${c.stitch} 0 5px, transparent 5px 11px)` }}
      />

      {/* shine sweep */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
        style={{
          left: '-45%', width: '45%',
          background: 'linear-gradient(105deg, transparent 0%, rgba(255,240,200,0.06) 35%, rgba(255,245,215,0.22) 50%, rgba(255,240,200,0.06) 65%, transparent 100%)',
          transform: 'skewX(-18deg)',
          mixBlendMode: 'screen',
          animation: 'binderShine 8s ease-in-out infinite',
        }}
      />

      {/* pill wrapper — matches TabRow's px-2 content box (8px inset each side) */}
      <div
        className="absolute pointer-events-none z-[2]"
        style={{ top: 9, bottom: 9, left: 8, right: 8 }}
      >
        <div
          ref={pillRef}
          className="absolute top-0 bottom-0"
          style={{
            width: '20%',
            left: `${activeIndex * 20}%`,
            transition: 'left 0.9s cubic-bezier(0.34,1.4,0.64,1)',
          }}
        >
          <div
            className="absolute inset-[4px] rounded-[14px]"
            style={{
              background: c.pillBg,
              boxShadow: c.pillShadow,
              animation: 'binderPillBreathe 3.6s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   1 — CLASSIC MATRIX
   ═════════════════════════════════════════════════════════════ */

const CLASSIC_COLORS = {
  dark: {
    barBg: 'linear-gradient(180deg, rgba(30,27,55,0.85) 0%, rgba(12,10,26,0.95) 100%), radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15), transparent 60%)',
    barShadow: `
      inset 0 1px 0 rgba(255,255,255,0.12),
      inset 0 -1px 0 rgba(0,0,0,0.45),
      inset 0 0 0 1px rgba(139,92,246,0.14),
      0 1px 0 rgba(255,255,255,0.06),
      0 24px 60px -20px rgba(0,0,0,0.9),
      0 8px 24px -12px rgba(139,92,246,0.35)
    `,
    pillBg: 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.35),
      inset 0 -2px 6px rgba(0,0,0,0.25),
      0 8px 20px -6px rgba(139,92,246,0.75),
      0 0 0 1px rgba(139,92,246,0.4)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(148,163,184,0.55)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(148,163,184,0.55)',
    gridV1: 'rgba(225,29,72,0.35)',
    gridV2: 'rgba(79,70,229,0.35)',
    gridV3: 'rgba(5,150,105,0.35)',
    gridH: 'rgba(148,163,184,0.3)',
  },
  light: {
    barBg: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(243,240,255,0.95) 100%), radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08), transparent 60%)',
    barShadow: `
      inset 0 1px 0 rgba(255,255,255,1),
      inset 0 -1px 0 rgba(139,92,246,0.1),
      inset 0 0 0 1px rgba(139,92,246,0.12),
      0 1px 0 rgba(255,255,255,0.8),
      0 20px 50px -20px rgba(80,50,150,0.28),
      0 8px 24px -12px rgba(139,92,246,0.25)
    `,
    pillBg: 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 -2px 6px rgba(0,0,0,0.15),
      0 8px 20px -6px rgba(139,92,246,0.55),
      0 0 0 1px rgba(139,92,246,0.35)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(100,116,139,0.75)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(100,116,139,0.75)',
    gridV1: 'rgba(225,29,72,0.45)',
    gridV2: 'rgba(79,70,229,0.45)',
    gridV3: 'rgba(5,150,105,0.45)',
    gridH: 'rgba(100,116,139,0.4)',
  },
};

const ClassicBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const c = isDark ? CLASSIC_COLORS.dark : CLASSIC_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;
    const cy = r.top - br.top + r.height / 2;

    const cross = document.createElement('div');
    cross.style.cssText = `
      position:absolute; left:${cx}px; top:${cy}px;
      width:30px; height:30px; margin-left:-15px; margin-top:-15px;
      border-radius:50%;
      border:1.5px solid ${isDark ? 'rgba(167,139,250,0.7)' : 'rgba(139,92,246,0.6)'};
      pointer-events:none; z-index:15;
      animation: crosshairExpand 0.8s cubic-bezier(0.15,0.6,0.4,1) forwards;
    `;
    bar.appendChild(cross);
    setTimeout(() => cross.remove(), 900);
  };

  return (
    <div
      ref={barRef}
      className="relative w-full h-[68px] rounded-full group"
      style={{
        background: c.barBg,
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        boxShadow: c.barShadow,
        transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[2]">
        <span className="absolute top-3 bottom-3 w-px" style={{ left: '25%', background: c.gridV1 }} />
        <span className="absolute top-3 bottom-3 w-px" style={{ left: '50%', background: c.gridV2 }} />
        <span className="absolute top-3 bottom-3 w-px" style={{ left: '75%', background: c.gridV3 }} />
        <span className="absolute left-3 right-3 h-px" style={{ top: '50%', background: c.gridH }} />
      </div>

      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-[26px] z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1), box-shadow 0.4s',
        }}
      />

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   2 — AURORA PEARL
   ═════════════════════════════════════════════════════════════ */

const PEARL_HUES_DARK = [
  { c1: '#4F46E5', c2: '#6366F1' },
  { c1: '#7C3AED', c2: '#8B5CF6' },
  { c1: '#0369A1', c2: '#0EA5E9' },
  { c1: '#047857', c2: '#10B981' },
  { c1: '#B45309', c2: '#F59E0B' },
];

const PEARL_HUES_LIGHT = [
  { c1: '#E0E7FF', c2: '#C7D2FE' },
  { c1: '#EDE9FE', c2: '#DDD6FE' },
  { c1: '#E0F2FE', c2: '#BAE6FD' },
  { c1: '#D1FAE5', c2: '#A7F3D0' },
  { c1: '#FEF3C7', c2: '#FDE68A' },
];

const PEARL_COLORS = {
  dark: {
    barBg: 'linear-gradient(145deg, #263349 0%, #1E293B 45%, #16202E 100%)',
    barShadow: `
      inset 0 2px 0 rgba(255,255,255,0.06),
      inset 0 -2px 6px rgba(0,0,0,0.5),
      inset 0 0 0 1px rgba(148,163,184,0.12),
      6px 6px 14px #0F172A,
      -6px -6px 14px #334155,
      0 0 60px -20px rgba(99,102,241,0.35)
    `,
    iridescent: 'radial-gradient(circle at var(--ix, 50%) 50%, rgba(99,102,241,0.55) 0%, rgba(139,92,246,0.45) 25%, rgba(56,189,248,0.35) 50%, rgba(252,211,77,0.3) 70%, transparent 90%)',
    pillShadow: `
      inset 0 2px 0 rgba(255,255,255,0.12),
      inset 0 -2px 8px rgba(0,0,0,0.4),
      4px 4px 10px #0F172A,
      -4px -4px 10px #334155,
      0 6px 18px -4px rgba(99,102,241,0.55)
    `,
    iconActive: '#F1F5F9',
    iconInactive: '#94A3B8',
    labelActive: '#F1F5F9',
    labelInactive: '#94A3B8',
  },
  light: {
    barBg: 'linear-gradient(145deg, #F8FAFC 0%, #EDF1F7 45%, #E4E9F1 100%)',
    barShadow: `
      inset 0 2px 0 #FFFFFF,
      inset 0 -2px 6px rgba(200,206,216,0.4),
      inset 0 0 0 1px rgba(255,255,255,0.6),
      6px 6px 14px #C8CED8,
      -6px -6px 14px #FFFFFF,
      0 0 60px -20px rgba(99,102,241,0.35)
    `,
    iridescent: 'radial-gradient(circle at var(--ix, 50%) 50%, rgba(99,102,241,0.45) 0%, rgba(139,92,246,0.35) 25%, rgba(56,189,248,0.3) 50%, rgba(252,211,77,0.25) 70%, transparent 90%)',
    pillShadow: `
      inset 0 2px 0 #FFFFFF,
      inset 0 -2px 8px rgba(200,206,216,0.5),
      4px 4px 10px #C8CED8,
      -4px -4px 10px #FFFFFF,
      0 6px 18px -4px rgba(99,102,241,0.4)
    `,
    iconActive: '#6366F1',
    iconInactive: '#94A3B8',
    labelActive: '#6366F1',
    labelInactive: '#94A3B8',
  },
};

const PearlBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const iridRef = useRef<HTMLDivElement>(null);
  const c = isDark ? PEARL_COLORS.dark : PEARL_COLORS.light;
  const hues = isDark ? PEARL_HUES_DARK : PEARL_HUES_LIGHT;

  useEffect(() => {
    if (pillRef.current) {
      pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
      const hue = hues[activeIndex] ?? hues[0];
      pillRef.current.style.setProperty('--pearl-c1', hue.c1);
      pillRef.current.style.setProperty('--pearl-c2', hue.c2);
    }
  }, [activeIndex, isDark]); // eslint-disable-line

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!iridRef.current || !barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    iridRef.current.style.setProperty('--ix', `${x}%`);
  };

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) {
      pillRef.current.style.transform = `translateX(${i * 100}%)`;
      const hue = hues[i] ?? hues[0];
      pillRef.current.style.setProperty('--pearl-c1', hue.c1);
      pillRef.current.style.setProperty('--pearl-c2', hue.c2);
    }
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;
    const cy = r.top - br.top + r.height / 2;

    const palette = ['#C7D2FE', '#DDD6FE', '#BAE6FD', '#A7F3D0', '#FDE68A', '#FBCFE8'];
    for (let s = 0; s < 12; s++) {
      const sp = document.createElement('div');
      const angle = (s / 12) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 55 + Math.random() * 35;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist - 15;
      sp.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:6px; height:6px; margin-left:-3px; margin-top:-3px;
        border-radius:50%; pointer-events:none; z-index:20;
        background:${palette[s % palette.length]};
        box-shadow: 0 0 12px ${palette[s % palette.length]}, 0 0 24px ${palette[s % palette.length]};
        --px: ${px}px; --py: ${py}px;
        animation: prismFly 1s cubic-bezier(0.15,0.6,0.4,1) ${s * 20}ms forwards;
      `;
      bar.appendChild(sp);
      setTimeout(() => sp.remove(), 1200);
    }
  };

  return (
    <div
      ref={barRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[68px] rounded-[34px] overflow-hidden group"
      style={{
        background: c.barBg,
        boxShadow: c.barShadow,
        transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        ref={iridRef}
        className="absolute inset-0 pointer-events-none z-[1] opacity-0 group-hover:opacity-100"
        style={{
          background: c.iridescent,
          filter: 'blur(20px) saturate(160%)',
          mixBlendMode: 'overlay',
          transition: 'opacity 0.7s ease',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none z-[2] opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='9'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.5 0'/></filter><rect width='120' height='120' filter='url(%23g)'/></svg>")`,
          backgroundSize: '120px 120px',
          mixBlendMode: 'overlay',
        }}
      />

      <div
        className="absolute top-0 bottom-0 w-[120px] pointer-events-none z-[2]"
        style={{
          background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 70%, transparent 100%)',
          transform: 'skewX(-18deg)',
          mixBlendMode: 'overlay',
          animation: 'pearlSweep 7s cubic-bezier(0.4,0,0.2,1) infinite',
        }}
      />

      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-[26px] z-[2] pointer-events-none"
        style={{
          background: 'linear-gradient(145deg, #FFFFFF 0%, var(--pearl-c1, #E0E7FF) 45%, var(--pearl-c2, #C7D2FE) 100%)',
          boxShadow: c.pillShadow,
          transition: 'transform 0.7s cubic-bezier(0.34,1.42,0.64,1), box-shadow 0.5s, background 0.5s',
        }}
      />

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   3 — STACKED CARDS
   ═════════════════════════════════════════════════════════════ */

const STACKED_COLORS = {
  dark: {
    deckBg: 'linear-gradient(180deg, #1E4E68 0%, #0C3A52 100%)',
    deckBg2: 'linear-gradient(180deg, #18425A 0%, #093048 100%)',
    barBg: 'linear-gradient(180deg, #1A3D56 0%, #0C2438 100%)',
    barShadow: `
      inset 0 1px 0 rgba(125,211,252,0.35),
      inset 0 -1px 0 rgba(0,0,0,0.4),
      0 0 0 1px rgba(125,211,252,0.28),
      0 30px 60px -18px rgba(0,0,0,0.85),
      0 10px 30px -10px rgba(14,165,233,0.4)
    `,
    pillBg: 'linear-gradient(180deg, #0EA5E9 0%, #0369A1 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.4),
      inset 0 -2px 8px rgba(0,0,0,0.3),
      0 10px 22px -6px rgba(14,165,233,0.8)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(148,163,184,0.7)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(148,163,184,0.7)',
  },
  light: {
    deckBg: 'linear-gradient(180deg, #BAE6FD 0%, #7DD3FC 100%)',
    deckBg2: 'linear-gradient(180deg, #A5DCFB 0%, #6BC8F5 100%)',
    barBg: 'linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 100%)',
    barShadow: `
      inset 0 1px 0 rgba(255,255,255,0.8),
      inset 0 -1px 0 rgba(7,89,133,0.15),
      0 0 0 1px rgba(14,165,233,0.3),
      0 24px 50px -18px rgba(7,89,133,0.35),
      0 8px 24px -10px rgba(14,165,233,0.35)
    `,
    pillBg: 'linear-gradient(180deg, #0EA5E9 0%, #0369A1 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 -2px 8px rgba(0,0,0,0.15),
      0 8px 20px -6px rgba(14,165,233,0.6)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(12,74,110,0.7)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(12,74,110,0.7)',
  },
};

const StackedBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const c = isDark ? STACKED_COLORS.dark : STACKED_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;

    const card = document.createElement('div');
    card.style.cssText = `
      position:absolute; left:${cx}px; top:6px;
      width:40px; height:26px; margin-left:-20px;
      border-radius:6px;
      background: linear-gradient(135deg, #0EA5E9, #0369A1);
      box-shadow: 0 8px 24px -4px rgba(14,165,233,0.9);
      pointer-events:none; z-index:15;
      animation: stackFly 1s cubic-bezier(0.4,0,0.6,1) forwards;
    `;
    bar.appendChild(card);
    setTimeout(() => card.remove(), 1100);
  };

  return (
    <div
      ref={barRef}
      className="relative w-full"
      onMouseEnter={() => { if (deckRef.current) deckRef.current.style.opacity = '1'; }}
      onMouseLeave={() => { if (deckRef.current) deckRef.current.style.opacity = '0'; }}
    >
      <div
        ref={deckRef}
        className="absolute left-[14%] right-[14%] top-0 h-3 rounded-t-3xl pointer-events-none"
        style={{
          background: c.deckBg,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
          opacity: 0,
          transition: 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          transform: 'translateY(0) scaleX(0.9)',
          zIndex: 0,
        }}
      />
      <div
        className="absolute left-[20%] right-[20%] -top-2 h-3 rounded-t-3xl pointer-events-none"
        style={{ background: c.deckBg2, opacity: 0.35, zIndex: -1 }}
      />

      <div
        className="relative w-full h-[68px] rounded-[20px] z-[1]"
        style={{
          background: c.barBg,
          boxShadow: c.barShadow,
        }}
      >
        <div
          ref={pillRef}
          className="absolute top-1 bottom-1 left-2 w-[calc(20%-1.6px)] rounded-2xl z-[2] pointer-events-none"
          style={{
            background: c.pillBg,
            boxShadow: c.pillShadow,
            transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
          }}
        />
        <TabRow
          tabs={tabs}
          activeIndex={activeIndex}
          onTabClick={handleTabClick}
          iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
          labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
        />
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   4 — RADIAL ORBIT
   ═════════════════════════════════════════════════════════════ */

const RADIAL_COLORS = {
  dark: {
    barBg: 'radial-gradient(ellipse at 50% 120%, rgba(139,92,246,0.35), transparent 60%), linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.98) 100%)',
    barShadow: `
      inset 0 1px 0 rgba(167,139,250,0.22),
      inset 0 -1px 0 rgba(0,0,0,0.6),
      0 0 0 1px rgba(139,92,246,0.28),
      0 30px 70px -18px rgba(0,0,0,0.95),
      0 0 80px -20px rgba(139,92,246,0.6)
    `,
    pillBg: 'radial-gradient(circle at 50% 30%, #8B5CF6 0%, #4C1D95 70%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.35),
      0 0 30px -4px rgba(139,92,246,0.9),
      0 0 0 1px rgba(167,139,250,0.5)
    `,
    iconActive: '#F5F3FF',
    iconInactive: 'rgba(148,163,184,0.55)',
    labelActive: '#F5F3FF',
    labelInactive: 'rgba(148,163,184,0.55)',
    ringBorder: 'rgba(196,181,253,0.6)',
  },
  light: {
    barBg: 'radial-gradient(ellipse at 50% 120%, rgba(139,92,246,0.28), transparent 60%), linear-gradient(180deg, #FAF7FF 0%, #F3EEFF 45%, #FDF5FF 100%)',
    barShadow: `
      inset 0 1px 0 rgba(255,255,255,0.9),
      inset 0 -1px 0 rgba(139,92,246,0.15),
      0 0 0 1px rgba(139,92,246,0.2),
      0 24px 60px -18px rgba(90,60,160,0.35),
      0 0 60px -20px rgba(139,92,246,0.4)
    `,
    pillBg: 'radial-gradient(circle at 50% 30%, #8B5CF6 0%, #6D28D9 70%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.5),
      0 0 30px -4px rgba(139,92,246,0.65),
      0 0 0 1px rgba(139,92,246,0.4)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(109,106,138,0.75)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(109,106,138,0.75)',
    ringBorder: 'rgba(139,92,246,0.55)',
  },
};

const RadialBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const c = isDark ? RADIAL_COLORS.dark : RADIAL_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!orbitRef.current || !barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    orbitRef.current.style.left = `${x}px`;
  };

  const handleMouseLeave = () => {
    if (orbitRef.current) orbitRef.current.style.left = '50%';
  };

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;
    const cy = r.top - br.top + r.height / 2;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const dist = 80 + Math.random() * 40;
    const comet = document.createElement('div');
    comet.style.cssText = `
      position:absolute; left:${cx}px; top:${cy}px;
      width:10px; height:10px; margin-left:-5px; margin-top:-5px;
      border-radius:50%; background:#FCD34D;
      box-shadow: 0 0 16px #FCD34D, 0 0 32px #FCD34D;
      pointer-events:none; z-index:20;
      --cx: ${Math.cos(angle) * dist}px;
      --cy: ${Math.sin(angle) * dist}px;
      animation: cometLaunch 1.1s cubic-bezier(0.15,0.6,0.4,1) forwards;
    `;
    bar.appendChild(comet);
    setTimeout(() => comet.remove(), 1200);
  };

  return (
    <div
      ref={barRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[68px] rounded-[34px] overflow-hidden group"
      style={{
        background: c.barBg,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: c.barShadow,
      }}
    >
      <div
        ref={orbitRef}
        className="absolute top-1/2 pointer-events-none z-[1] opacity-0 group-hover:opacity-100"
        style={{
          left: '50%',
          width: 110,
          height: 110,
          marginLeft: -55,
          marginTop: -55,
          transition: 'left 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
        }}
      >
        <div
          className="absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: c.ringBorder, animation: 'orbitSpin 6s linear infinite' }}
        >
          <span className="absolute -top-1 left-1/2 -ml-1 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_12px_#FCD34D,0_0_24px_#FCD34D]" />
          <span className="absolute -bottom-1 left-1/2 -ml-1 w-2 h-2 rounded-full bg-violet-300 shadow-[0_0_12px_#C4B5FD]" />
        </div>
      </div>

      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-[26px] z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
        }}
      />

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   5 — TAROT CARDS
   ═════════════════════════════════════════════════════════════ */

const TAROT_COLORS = {
  dark: {
    barBg: 'linear-gradient(180deg, rgba(30,27,75,0.95) 0%, rgba(15,23,42,0.98) 100%)',
    barShadow: `
      inset 0 1px 0 rgba(252,211,77,0.25),
      inset 0 -1px 0 rgba(0,0,0,0.5),
      0 0 0 1.5px rgba(252,211,77,0.55),
      0 0 0 2.5px rgba(49,46,129,0.9),
      0 30px 70px -18px rgba(0,0,0,0.95),
      0 0 80px -20px rgba(252,211,77,0.4)
    `,
    pillBg: 'linear-gradient(180deg, #FCD34D 0%, #B45309 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,250,220,0.9),
      inset 0 -2px 8px rgba(60,40,0,0.35),
      0 8px 24px -6px rgba(252,211,77,0.85),
      0 0 0 1px rgba(252,211,77,0.6)
    `,
    iconActive: '#FEF3C7',
    iconInactive: 'rgba(196,181,253,0.65)',
    labelActive: '#FEF3C7',
    labelInactive: 'rgba(196,181,253,0.65)',
  },
  light: {
    barBg: 'linear-gradient(180deg, rgba(250,245,255,0.96) 0%, rgba(237,233,254,0.98) 50%, rgba(221,214,254,0.98) 100%)',
    barShadow: `
      inset 0 1px 0 rgba(255,255,255,0.9),
      inset 0 -1px 0 rgba(124,58,237,0.2),
      0 0 0 1.5px rgba(252,211,77,0.75),
      0 0 0 2.5px rgba(250,245,255,0.9),
      0 24px 60px -18px rgba(124,58,237,0.3),
      0 0 60px -20px rgba(252,211,77,0.4)
    `,
    pillBg: 'linear-gradient(180deg, #A855F7 0%, #7C3AED 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 -2px 8px rgba(60,20,100,0.25),
      0 8px 20px -6px rgba(168,85,247,0.65),
      0 0 0 1px rgba(252,211,77,0.55)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(124,58,237,0.7)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(124,58,237,0.7)',
  },
};

const TarotBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const c = isDark ? TAROT_COLORS.dark : TAROT_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;
    const cy = r.top - br.top + r.height / 2;

    for (let c2 = 0; c2 < 5; c2++) {
      const fanAngle = -40 + (c2 / 4) * 80;
      const rad = (fanAngle * Math.PI) / 180;
      const dist = 70 + Math.random() * 15;
      const tx = Math.sin(rad) * dist;
      const ty = -Math.cos(rad) * dist;
      const card = document.createElement('div');
      card.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:22px; height:32px; margin-left:-11px; margin-top:-16px;
        border-radius:4px;
        background: linear-gradient(160deg, #2D1B4E 0%, #1a0f33 100%);
        border: 1px solid rgba(252,211,77,0.85);
        box-shadow: 0 6px 18px rgba(0,0,0,0.6), 0 0 12px rgba(252,211,77,0.5);
        pointer-events:none; z-index:20; opacity:0;
        display:flex; align-items:center; justify-content:center;
        color:#FCD34D; font-size:12px; font-weight:900;
        --tx: ${tx}px; --ty: ${ty}px; --ty2: ${ty + 30}px;
        --rot: ${fanAngle}deg; --rot2: ${fanAngle * 1.4}deg;
        animation: tarotFly 1.4s cubic-bezier(0.34,1.32,0.64,1) ${c2 * 45}ms forwards;
      `;
      card.textContent = '✦';
      bar.appendChild(card);
      setTimeout(() => card.remove(), 2000);
    }
    for (let s = 0; s < 8; s++) {
      const sp = document.createElement('span');
      const angle = (s / 8) * Math.PI * 2;
      const dist = 50 + Math.random() * 30;
      sp.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:3px; height:3px; margin-left:-1.5px; margin-top:-1.5px;
        border-radius:50%; background:#FCD34D;
        box-shadow: 0 0 10px #FCD34D, 0 0 20px #FCD34D;
        pointer-events:none; z-index:25;
        --px: ${Math.cos(angle) * dist}px; --py: ${Math.sin(angle) * dist - 15}px;
        animation: tarotSparkleBurst 1s cubic-bezier(0.15,0.6,0.4,1) forwards;
      `;
      bar.appendChild(sp);
      setTimeout(() => sp.remove(), 1100);
    }
  };

  return (
    <div
      ref={barRef}
      className="relative w-full h-[68px] rounded-[34px]"
      style={{
        background: c.barBg,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: c.barShadow,
      }}
    >
      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-[26px] z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
        }}
      />
      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   6 — HONEYCOMB HIVE
   ═════════════════════════════════════════════════════════════ */

const HIVE_COLORS = {
  dark: {
    barBg: 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)',
    barShadow: `
      inset 0 2px 0 rgba(251,191,36,0.4),
      inset 0 -3px 0 rgba(0,0,0,0.5),
      0 0 0 1px rgba(251,191,36,0.35),
      0 30px 70px -18px rgba(0,0,0,0.9),
      0 10px 30px -8px rgba(251,191,36,0.25)
    `,
    pillBg: 'linear-gradient(180deg, #FCD34D 0%, #D97706 100%)',
    pillShadow: `
      inset 0 2px 0 rgba(255,245,200,0.55),
      inset 0 -3px 10px rgba(0,0,0,0.3),
      0 10px 28px -6px rgba(251,191,36,0.7)
    `,
    iconActive: '#FEF3C7',
    iconInactive: 'rgba(251,191,36,0.65)',
    labelActive: '#FEF3C7',
    labelInactive: 'rgba(251,191,36,0.65)',
  },
  light: {
    barBg: 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)',
    barShadow: `
      inset 0 2px 0 rgba(255,255,255,0.8),
      inset 0 -3px 0 rgba(120,53,15,0.25),
      0 0 0 1px rgba(180,83,9,0.35),
      0 24px 60px -18px rgba(120,53,15,0.35),
      0 10px 30px -8px rgba(251,191,36,0.4)
    `,
    pillBg: 'linear-gradient(180deg, #D97706 0%, #92400E 100%)',
    pillShadow: `
      inset 0 2px 0 rgba(255,240,180,0.5),
      inset 0 -3px 10px rgba(0,0,0,0.4),
      0 10px 28px -6px rgba(217,119,6,0.65)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(146,64,14,0.75)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(146,64,14,0.75)',
  },
};

const HiveBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const beeRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const targetRef = useRef({ x: 0, y: 0 });
  const curRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const lastPollenRef = useRef(0);
  const c = isDark ? HIVE_COLORS.dark : HIVE_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const startLoop = () => {
    if (rafRef.current != null) return;
    const loop = () => {
      const bee = beeRef.current;
      const bar = barRef.current;
      if (!bee || !bar) { rafRef.current = null; return; }
      curRef.current.x += (targetRef.current.x - curRef.current.x) * 0.14;
      curRef.current.y += (targetRef.current.y - curRef.current.y) * 0.14;
      bee.style.left = `${curRef.current.x}px`;
      bee.style.top = `${bar.offsetHeight / 2 + curRef.current.y * 0.3}px`;

      const now = Date.now();
      if (hoverRef.current && now - lastPollenRef.current > 150) {
        lastPollenRef.current = now;
        const p = document.createElement('span');
        p.style.cssText = `
          position:absolute; left:${curRef.current.x}px; top:${bar.offsetHeight / 2 + curRef.current.y * 0.3}px;
          width:4px; height:4px; margin-left:-2px; margin-top:-2px;
          border-radius:50%; background:#FCD34D; box-shadow: 0 0 6px #FCD34D;
          pointer-events:none; z-index:4;
          animation: pollenFade 1.2s ease-out forwards;
        `;
        bar.appendChild(p);
        setTimeout(() => p.remove(), 1300);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    curRef.current.x = targetRef.current.x = e.clientX - r.left;
    curRef.current.y = targetRef.current.y = e.clientY - r.top;
    hoverRef.current = true;
    if (beeRef.current) beeRef.current.style.opacity = '1';
    startLoop();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    targetRef.current.x = e.clientX - r.left;
    targetRef.current.y = e.clientY - r.top;
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    if (beeRef.current) beeRef.current.style.opacity = '0';
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;
    const cy = r.top - br.top + r.height / 2;

    const bee = beeRef.current;
    if (bee) {
      bee.style.left = `${cx}px`;
      bee.style.top = `${cy}px`;
      bee.classList.remove('jump');
      void bee.offsetWidth;
      bee.classList.add('jump');
      setTimeout(() => bee.classList.remove('jump'), 950);
    }

    const drip = document.createElement('div');
    drip.style.cssText = `
      position:absolute; left:${cx}px; top:45%;
      width:3px; border-radius: 0 0 3px 3px;
      background: linear-gradient(180deg, #F4C430, #B8860B);
      pointer-events:none; z-index:15;
      animation: honeyDrip 1.4s ease-in forwards;
    `;
    bar.appendChild(drip);
    setTimeout(() => drip.remove(), 1500);

    for (let p = 0; p < 10; p++) {
      const pol = document.createElement('span');
      pol.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:4px; height:4px; margin-left:-2px; margin-top:-2px;
        border-radius:50%; background:#FCD34D; box-shadow: 0 0 6px #FCD34D;
        pointer-events:none; z-index:4;
        transform: translate(${(Math.random() - 0.5) * 70}px, ${(Math.random() - 0.5) * 40}px);
        animation: pollenFade 1.2s ease-out forwards;
      `;
      bar.appendChild(pol);
      setTimeout(() => pol.remove(), 1300);
    }
  };

  return (
    <div
      ref={barRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[68px] rounded-[34px]"
      style={{ background: c.barBg, boxShadow: c.barShadow }}
    >
      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-[26px] z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
        }}
      />

      <div
        ref={beeRef}
        className="absolute top-1/2 left-1/2 pointer-events-none z-[5] opacity-0"
        style={{
          fontSize: 20,
          transform: 'translate(-50%, -50%)',
          transition: 'opacity 0.4s ease',
          filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.9))',
          willChange: 'transform, left, top',
        }}
      >
        <span className="inline-block" style={{ animation: 'beeHover 1.4s ease-in-out infinite' }}>🐝</span>
      </div>

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   7 — PRIORITY BOARD (KANBAN)
   ═════════════════════════════════════════════════════════════ */

const KANBAN_COLORS = {
  dark: {
    barBg: '#1E293B',
    barShadow: `
      inset 0 1px 0 rgba(255,255,255,0.06),
      inset 0 -1px 0 rgba(0,0,0,0.35),
      0 0 0 1px rgba(255,255,255,0.06),
      0 20px 50px -18px rgba(0,0,0,0.8),
      0 4px 14px -6px rgba(0,0,0,0.5)
    `,
    pillBg: 'linear-gradient(180deg, #334155 0%, #1E293B 100%)',
    pillShadow: '0 4px 14px -2px rgba(0,0,0,0.5), inset 0 0 0 2px #6366F1',
    iconActive: '#A5B4FC',
    iconInactive: 'rgba(148,163,184,0.7)',
    labelActive: '#A5B4FC',
    labelInactive: 'rgba(148,163,184,0.7)',
    cardBg: 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
    cardShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.05)',
    cardLine1: 'rgba(148,163,184,0.35)',
    cardLine2: 'rgba(148,163,184,0.2)',
  },
  light: {
    barBg: '#FFFFFF',
    barShadow: `
      inset 0 1px 0 #FFFFFF,
      inset 0 -1px 0 rgba(15,23,42,0.05),
      0 0 0 1px rgba(15,23,42,0.07),
      0 20px 50px -18px rgba(15,23,42,0.35),
      0 4px 14px -6px rgba(15,23,42,0.15)
    `,
    pillBg: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)',
    pillShadow: '0 4px 14px -2px rgba(15,23,42,0.15), inset 0 0 0 2px #6366F1',
    iconActive: '#4F46E5',
    iconInactive: 'rgba(100,116,139,0.85)',
    labelActive: '#4F46E5',
    labelInactive: 'rgba(100,116,139,0.85)',
    cardBg: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
    cardShadow: '0 4px 10px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,1), 0 0 0 1px rgba(15,23,42,0.05)',
    cardLine1: 'rgba(100,116,139,0.25)',
    cardLine2: 'rgba(100,116,139,0.15)',
  },
};

const KanbanBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const c = isDark ? KANBAN_COLORS.dark : KANBAN_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleTabClick = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();

    const bar = barRef.current;
    if (!bar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const cx = r.left - br.left + r.width / 2;
    const cy = r.top - br.top + r.height / 2;

    const card = document.createElement('div');
    card.style.cssText = `
      position:absolute; left:${cx}px; top:4px;
      width:44px; height:20px; margin-left:-22px;
      border-radius:5px;
      background: ${c.cardBg};
      box-shadow: ${c.cardShadow};
      pointer-events:none; z-index:15;
      animation: kanbanFly 1s cubic-bezier(0.4,0,0.6,1) forwards;
    `;
    bar.appendChild(card);
    setTimeout(() => card.remove(), 1100);

    const check = document.createElement('div');
    check.textContent = '✓';
    check.style.cssText = `
      position:absolute; left:${cx}px; top:${cy}px;
      font-size:22px; font-weight:900; color:#10B981;
      margin-left:-11px; margin-top:-11px;
      pointer-events:none; z-index:20;
      text-shadow: 0 0 12px rgba(16,185,129,0.9);
      animation: checkPop 1s cubic-bezier(0.34,1.56,0.64,1) forwards;
    `;
    bar.appendChild(check);
    setTimeout(() => check.remove(), 1100);
  };

  return (
    <div
      ref={barRef}
      className="relative w-full h-[68px] rounded-[18px] overflow-visible group"
      style={{ background: c.barBg, boxShadow: c.barShadow }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[18px] z-[2]"
        style={{
          background: 'linear-gradient(90deg, #E11D48 0% 20%, #4F46E5 20% 40%, #059669 40% 60%, #64748B 60% 80%, #F59E0B 80% 100%)',
        }}
      />

      {[20, 38, 50, 62, 80].map((left, idx) => (
        <div
          key={idx}
          className="absolute -top-2.5 w-11 h-5 rounded-[5px] pointer-events-none opacity-0 group-hover:opacity-100 z-[1]"
          style={{
            left: `${left}%`,
            marginLeft: -22,
            background: c.cardBg,
            boxShadow: c.cardShadow,
            transform: 'translateY(0)',
            transition: `transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${idx * 80}ms, opacity 0.5s ease ${idx * 80}ms`,
          }}
        >
          <div className="absolute top-[5px] left-1.5 right-1.5 h-0.5 rounded" style={{ background: c.cardLine1 }} />
          <div className="absolute top-2.5 left-1.5 w-1/2 h-0.5 rounded" style={{ background: c.cardLine2 }} />
        </div>
      ))}

      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-2xl z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
        }}
      />

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   8 — VENDING MACHINE
   ═════════════════════════════════════════════════════════════ */

const VENDING_COLORS = {
  dark: {
    barBg: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
    barShadow: `
      inset 0 1px 0 rgba(6,182,212,0.3),
      inset 0 -2px 0 rgba(0,0,0,0.5),
      0 0 0 1.5px rgba(6,182,212,0.35),
      0 30px 70px -18px rgba(0,0,0,0.9),
      0 0 60px -20px rgba(6,182,212,0.4)
    `,
    pillBg: 'linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.4),
      inset 0 -2px 8px rgba(0,0,0,0.35),
      0 8px 22px -6px rgba(6,182,212,0.75),
      0 0 0 1px rgba(6,182,212,0.5)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(148,163,184,0.7)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(148,163,184,0.7)',
    ledColor: '#00FF64',
    cyanLine: 'linear-gradient(90deg, #06B6D4 0%, #0891B2 100%)',
  },
  light: {
    barBg: 'linear-gradient(180deg, #334155 0%, #1E293B 100%)',
    barShadow: `
      inset 0 1px 0 rgba(6,182,212,0.35),
      inset 0 -2px 0 rgba(0,0,0,0.55),
      0 0 0 1.5px rgba(6,182,212,0.45),
      0 24px 60px -18px rgba(15,23,42,0.55),
      0 0 60px -20px rgba(6,182,212,0.4)
    `,
    pillBg: 'linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)',
    pillShadow: `
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 -2px 8px rgba(0,0,0,0.3),
      0 8px 20px -6px rgba(6,182,212,0.7),
      0 0 0 1px rgba(6,182,212,0.55)
    `,
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(148,163,184,0.75)',
    labelActive: '#FFFFFF',
    labelInactive: 'rgba(148,163,184,0.75)',
    ledColor: '#00FF64',
    cyanLine: 'linear-gradient(90deg, #06B6D4 0%, #0891B2 100%)',
  },
};

const VendingBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const pillRef = useRef<HTMLDivElement>(null);
  const c = isDark ? VENDING_COLORS.dark : VENDING_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleTabClick = (i: number) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();
  };

  return (
    <div
      className="relative w-full h-[68px] rounded-[18px] overflow-hidden"
      style={{ background: c.barBg, boxShadow: c.barShadow }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${c.ledColor} 50%, transparent 100%)`,
          opacity: 0.5,
          boxShadow: `0 0 10px ${c.ledColor}`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[18px] pointer-events-none"
        style={{ background: c.cyanLine, boxShadow: '0 0 14px rgba(6,182,212,0.6)' }}
      />

      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-2xl z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
        }}
      />

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   9 — DETECTIVE BOARD
   ═════════════════════════════════════════════════════════════ */

const DETECTIVE_COLORS = {
  dark: {
    barBg: 'radial-gradient(circle at 30% 40%, #2A1810 0%, #1A0F08 70%, #0F0805 100%)',
    barShadow: `
      inset 0 2px 0 rgba(253,230,138,0.15),
      inset 0 -2px 0 rgba(0,0,0,0.6),
      0 0 0 2px rgba(120,53,15,0.7),
      0 0 0 3px rgba(42,24,16,0.9),
      0 30px 70px -18px rgba(0,0,0,0.95),
      0 0 70px -20px rgba(220,38,38,0.4)
    `,
    pillBg: 'radial-gradient(circle at 30% 25%, #FF9090, #DC2626 55%, #7F1D1D)',
    pillShadow: `
      inset 0 2px 0 rgba(255,255,255,0.35),
      inset 0 -2px 8px rgba(0,0,0,0.5),
      0 8px 22px -6px rgba(220,38,38,0.8),
      0 0 0 1px rgba(252,211,77,0.5)
    `,
    iconActive: '#FEF3C7',
    iconInactive: 'rgba(253,230,138,0.55)',
    labelActive: '#FEF3C7',
    labelInactive: 'rgba(253,230,138,0.55)',
    corkDot: 'rgba(0,0,0,0.4)',
    stringColor: '#DC2626',
  },
  light: {
    barBg: 'radial-gradient(circle at 30% 40%, #A0603A 0%, #7A3D14 60%, #3A1E08 100%)',
    barShadow: `
      inset 0 2px 0 rgba(253,230,138,0.4),
      inset 0 -2px 0 rgba(0,0,0,0.5),
      0 0 0 2px rgba(120,53,15,0.9),
      0 0 0 3px rgba(60,30,10,0.9),
      0 24px 60px -18px rgba(58,30,8,0.75),
      0 0 60px -20px rgba(220,38,38,0.4)
    `,
    pillBg: 'radial-gradient(circle at 30% 25%, #FF9090, #DC2626 55%, #7F1D1D)',
    pillShadow: `
      inset 0 2px 0 rgba(255,255,255,0.4),
      inset 0 -2px 8px rgba(0,0,0,0.45),
      0 8px 22px -6px rgba(220,38,38,0.75),
      0 0 0 1px rgba(252,211,77,0.55)
    `,
    iconActive: '#FEF3C7',
    iconInactive: 'rgba(253,230,138,0.7)',
    labelActive: '#FEF3C7',
    labelInactive: 'rgba(253,230,138,0.7)',
    corkDot: 'rgba(0,0,0,0.5)',
    stringColor: '#DC2626',
  },
};

const DetectiveBar: React.FC<BarProps> = ({ tabs, activeIndex, isDark }) => {
  const pillRef = useRef<HTMLDivElement>(null);
  const c = isDark ? DETECTIVE_COLORS.dark : DETECTIVE_COLORS.light;

  useEffect(() => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${activeIndex * 100}%)`;
  }, [activeIndex]);

  const handleTabClick = (i: number) => {
    if (pillRef.current) pillRef.current.style.transform = `translateX(${i * 100}%)`;
    triggerHaptic('light');
    tabs[i].onClick();
  };

  return (
    <div
      className="relative w-full h-[68px] rounded-[18px] overflow-hidden"
      style={{ background: c.barBg, boxShadow: c.barShadow }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle, ${c.corkDot} 1px, transparent 1.5px)`,
          backgroundSize: '6px 6px',
        }}
      />
      <div
        className="absolute top-2 left-4 right-4 h-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${c.stringColor} 20%, ${c.stringColor} 80%, transparent 100%)`,
          opacity: 0.75,
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      />

      <div
        ref={pillRef}
        className="absolute top-1.5 bottom-1.5 left-2 w-[calc(20%-1.6px)] rounded-2xl z-[2] pointer-events-none"
        style={{
          background: c.pillBg,
          boxShadow: c.pillShadow,
          transition: 'transform 0.62s cubic-bezier(0.34,1.42,0.64,1)',
        }}
      />

      <TabRow
        tabs={tabs}
        activeIndex={activeIndex}
        onTabClick={handleTabClick}
        iconColor={(i) => (i === activeIndex ? c.iconActive : c.iconInactive)}
        labelColor={(i) => (i === activeIndex ? c.labelActive : c.labelInactive)}
      />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   SHARED KEYFRAMES
   ═════════════════════════════════════════════════════════════ */

const SharedKeyframes: React.FC = () => (
  <style>{`
    @keyframes badgePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.7); }
      50% { box-shadow: 0 0 0 6px rgba(244,63,94,0); }
    }
    @keyframes crosshairExpand {
      0% { transform: scale(0.2); opacity: 1; }
      100% { transform: scale(3); opacity: 0; }
    }
    @keyframes prismFly {
      0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
      40% { transform: translate(calc(-50% + var(--px, 0)), calc(-50% + var(--py, 0))) scale(1.3); opacity: 1; }
      100% { transform: translate(calc(-50% + var(--px, 0)), calc(-50% + var(--py, 0))) scale(0.5); opacity: 0; }
    }
    @keyframes pearlSweep {
      0%   { left: -20%; opacity: 0; }
      15%  { opacity: 1; }
      65%  { opacity: 1; }
      100% { left: 120%; opacity: 0; }
    }
    @keyframes stackFly {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(-140px) rotate(70deg) scale(0.4); opacity: 0; }
    }
    @keyframes orbitSpin { to { transform: rotate(360deg); } }
    @keyframes cometLaunch {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--cx, 0px), var(--cy, 0px)) scale(0.2); opacity: 0; }
    }
    @keyframes tarotFly {
      0% { transform: translate(0, 0) rotate(0deg) scale(0.4); opacity: 0; }
      20% { transform: translate(0, -10px) rotate(-8deg) scale(1.1); opacity: 1; }
      60% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty2)) rotate(var(--rot2)) scale(0.8); opacity: 0; }
    }
    @keyframes tarotSparkleBurst {
      0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
      60% { transform: translate(calc(-50% + var(--px, 0)), calc(-50% + var(--py, 0))) scale(1.3); opacity: 1; }
      100% { transform: translate(calc(-50% + var(--px, 0)), calc(-50% + var(--py, 0))) scale(0.4); opacity: 0; }
    }
    @keyframes beeHover {
      0%, 100% { transform: rotate(0deg) translateY(0); }
      33% { transform: rotate(-8deg) translateY(-3px); }
      66% { transform: rotate(8deg) translateY(2px); }
    }
    @keyframes pollenFade {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.3) translateY(-6px); }
    }
    @keyframes honeyDrip {
      0% { height: 0; opacity: 1; }
      100% { height: 24px; opacity: 0; }
    }
    @keyframes kanbanFly {
      0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translate(0, -100px) rotate(-25deg) scale(0.7); opacity: 0; }
    }
    @keyframes checkPop {
      0% { transform: scale(0) rotate(-20deg); opacity: 0; }
      45% { transform: scale(1.3) rotate(0deg); opacity: 1; }
      70% { transform: scale(1) rotate(0deg); opacity: 1; }
      100% { transform: scale(1) translateY(-30px) rotate(0deg); opacity: 0; }
    }

    /* ── BINDER (default theme) ── */
    @keyframes binderShine {
      0%, 55%   { left: -45%; opacity: 0; }
      58%       { opacity: 1; }
      100%      { left: 145%; opacity: 0; }
    }
    @keyframes binderPillBreathe {
      0%, 100% {
        box-shadow:
          inset 0 1px 0 rgba(255,248,220,0.95),
          inset 0 -2px 6px rgba(70,45,15,0.5),
          0 8px 20px rgba(0,0,0,0.55),
          0 0 30px rgba(212,175,90,0.55);
      }
      50% {
        box-shadow:
          inset 0 1px 0 rgba(255,248,220,0.95),
          inset 0 -2px 6px rgba(70,45,15,0.5),
          0 8px 20px rgba(0,0,0,0.55),
          0 0 46px rgba(212,175,90,0.85);
      }
    }
    @keyframes binderTabRipple {
      0%   { transform: scale(0); opacity: 1; }
      100% { transform: scale(18); opacity: 0; }
    }
    @keyframes binderTabSpark {
      0%   { opacity: 0; transform: scale(0.3); }
      20%  { opacity: 1; transform: scale(1.4); }
      100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.2); }
    }

    /* Binder-specific hover effects */
    .binder-bar button .ic {
      transition: transform 0.45s cubic-bezier(0.34,1.6,0.64,1), filter 0.4s ease;
    }
    .binder-bar button:hover .ic {
      transform: translateY(-3px) scale(1.14);
      filter: drop-shadow(0 0 10px rgba(240,208,144,0.9));
    }
    .binder-bar button .lb {
      transition: transform 0.4s cubic-bezier(0.34,1.4,0.64,1), letter-spacing 0.4s ease;
    }
    .binder-bar button:hover .lb {
      transform: translateY(1px);
      letter-spacing: 1px;
    }
    .binder-bar button::before {
      content: '';
      position: absolute; inset: 4px;
      border-radius: 12px;
      background: radial-gradient(ellipse at center,
        rgba(240,208,144,0.32) 0%,
        rgba(212,175,90,0.14) 45%,
        transparent 72%);
      opacity: 0;
      transition: opacity 0.45s ease;
      pointer-events: none;
      z-index: 0;
    }
    .binder-bar button:hover::before { opacity: 1; }
    .binder-bar button.active::after {
      content: '';
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 16px; height: 2px;
      border-radius: 1px;
      background: #2a0808;
      opacity: 0.75;
      pointer-events: none;
    }
  `}</style>
);