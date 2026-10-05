import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, QuadrantId, Subtask } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface HoneycombHiveViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
  onUpdateSubtasks?: (taskId: string, nextSubtasks: Subtask[]) => void;
}

const HEX_RADIUS = 75;

const QUADS: { id: QuadrantId; emoji: string; color: string; lightBg: string; darkBg: string; cx: number; cy: number }[] = [
  { id: 'do_first',  emoji: '🔥', color: '#E11D48', lightBg: '#FFF1F2', darkBg: '#2A1520', cx: 103, cy: 144 },
  { id: 'schedule',  emoji: '📅', color: '#4F46E5', lightBg: '#EEF2FF', darkBg: '#1A1B3A', cx: 232, cy: 144 },
  { id: 'delegate',  emoji: '👥', color: '#059669', lightBg: '#ECFDF5', darkBg: '#0F2A24', cx: 167, cy: 256 },
  { id: 'eliminate', emoji: '🗑️', color: '#475569', lightBg: '#F8FAFC', darkBg: '#1E2430', cx: 297, cy: 256 },
];

const hexPoints = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
};

type LocalLang = 'en' | 'fr' | 'ar';
const COPY: Record<LocalLang, { chip: string; titleA: string; titleB: string; subtitle: string }> = {
  en: { chip: '⬢ HIVE ACTIVE', titleA: 'Your', titleB: 'Hive', subtitle: '{n} cells · {pct}% done' },
  fr: { chip: '⬢ RUCHE ACTIVE', titleA: 'Votre', titleB: 'Ruche', subtitle: '{n} cellules · {pct}% fait' },
  ar: { chip: '⬢ الخلية نشطة', titleA: 'خلية', titleB: 'النحل', subtitle: '{n} خلية · {pct}% مكتمل' },
};

export const HoneycombHiveView: React.FC<HoneycombHiveViewProps> = ({ tasks, onToggleStatus, onDeleteTask, onQuadrantSelect, onUpdateSubtasks }) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);
  const isLow = typeof document !== 'undefined' && document.documentElement.classList.contains('perf-low');

  const BG = isDark ? 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)' : 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)';
  const TEXT = isDark ? '#F1F5F9' : '#451A03';
  const TEXT_MUT = isDark ? '#FBBF24' : '#92400E';

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tasksFor = (q: QuadrantId) => tasks.filter((t) => t.quadrant === q);
  const countFor = (q: QuadrantId) => tasksFor(q).length;

  const handleOpen = (q: QuadrantId) => { setOpenQuadrant(q); if (onQuadrantSelect) onQuadrantSelect(q); };

  const currentTasks = openQuadrant ? tasksFor(openQuadrant) : [];
  const currentQuad = openQuadrant ? QUADS.find((q) => q.id === openQuadrant) : null;

  return (
    <div className="w-full" style={{ background: BG, color: TEXT, minHeight: '100dvh', padding: '24px 20px 0', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', position: 'relative', overflow: 'hidden' }}>
      {!isLow && (
        <>
          <div style={{ position: 'absolute', top: '15%', left: '-10%', fontSize: 22, animation: 'beeFly1 12s linear infinite', zIndex: 5, pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🐝</div>
          <div style={{ position: 'absolute', top: '55%', left: '-10%', fontSize: 18, animation: 'beeFly2 15s linear infinite 2s', zIndex: 5, pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🐝</div>
          <div style={{ position: 'absolute', top: '35%', right: '-10%', fontSize: 16, animation: 'beeFly3 14s linear infinite 5s', zIndex: 5, pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🐝</div>
        </>
      )}

      <div className="text-center mb-6">
        <div className="inline-block px-3 py-1 rounded-full mb-2" style={{ border: `1px solid ${isDark ? 'rgba(251,191,36,0.5)' : 'rgba(180,83,9,0.4)'}`, background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.6)' }}>
          <span className="text-[9px] font-extrabold tracking-[3px] uppercase" style={{ color: isDark ? '#FBBF24' : '#92400E' }}>{copy.chip}</span>
        </div>
        <h1 className="text-[26px] font-black tracking-tight leading-none" style={{ color: TEXT }}>
          {copy.titleA} <span style={{ color: isDark ? '#FCD34D' : '#D97706' }}>{copy.titleB}</span>
        </h1>
        <p className="text-[11px] font-semibold mt-1.5" style={{ color: TEXT_MUT }}>
          {copy.subtitle.replace('{n}', String(total)).replace('{pct}', String(pct))}
        </p>
      </div>

      <div className="flex justify-center items-center w-full" style={{ minHeight: 'calc(100dvh - 300px)' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 380, aspectRatio: '1' }}>
          <svg viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {QUADS.map((q) => (
              <g key={q.id}>
                {!isLow && <polygon points={hexPoints(q.cx, q.cy, HEX_RADIUS + 4)} fill={q.color} opacity={isDark ? 0.18 : 0.1} style={{ filter: `drop-shadow(0 6px 16px ${q.color}66)` }} />}
                <polygon points={hexPoints(q.cx, q.cy, HEX_RADIUS)} fill={isDark ? q.darkBg : q.lightBg} stroke={q.color} strokeWidth={2.5} strokeOpacity={isDark ? 0.75 : 0.55} style={{ filter: isLow ? 'none' : `drop-shadow(0 4px 14px ${q.color}44)`, cursor: 'pointer', transition: 'fill 0.2s' }} onClick={() => handleOpen(q.id)} />
              </g>
            ))}
          </svg>

          {QUADS.map((q) => {
            const count = countFor(q.id);
            const leftPct = (q.cx / 400) * 100;
            const topPct = (q.cy / 400) * 100;
            return (
              <button key={q.id} onClick={() => handleOpen(q.id)} style={{ position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)', width: '30%', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, zIndex: 2 }}>
                <span style={{ fontSize: 26, lineHeight: 1, marginBottom: 4 }}>{q.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: isDark ? '#F1F5F9' : q.color, letterSpacing: -0.3, textAlign: 'center', lineHeight: 1.1, marginBottom: 4 }}>{t(`quad_${q.id}`)}</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: q.color, lineHeight: 1 }}>{count}</span>
                <div style={{ position: 'absolute', top: '-4%', right: '-4%', minWidth: 24, height: 24, padding: '0 6px', borderRadius: '50%', background: q.color, color: 'white', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isLow ? 'none' : `0 3px 10px ${q.color}88`, border: isDark ? '2px solid #0F172A' : '2px solid white' }}>{count}</div>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {openQuadrant && currentQuad && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setOpenQuadrant(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[80vh] rounded-3xl flex flex-col overflow-hidden" style={{ background: isDark ? '#1E293B' : 'white', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.4)' }}>
              <div className="flex items-center justify-between p-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: isDark ? '#0F172A' : `${currentQuad.color}15` }}>{currentQuad.emoji}</div>
                  <div>
                    <div className="text-base font-black" style={{ color: isDark ? '#F1F5F9' : currentQuad.color }}>{t(`quad_${currentQuad.id}`)}</div>
                    <div className="text-xs font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{currentTasks.length} {t('tasks_count')}</div>
                  </div>
                </div>
                <button onClick={() => setOpenQuadrant(null)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: isDark ? '#0F172A' : '#F1F5F9', border: 'none', cursor: 'pointer' }}>
                  <X size={16} strokeWidth={2.5} style={{ color: currentQuad.color }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {currentTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3 opacity-30">{currentQuad.emoji}</div>
                    <p className="text-sm italic" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{t('no_tasks_yet')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {currentTasks.map((task) => (
                      <SwipeableTaskItem key={task.id} task={task} categoryColor={currentQuad.color} categoryLight={currentQuad.color} categoryPale={isDark ? '#0F172A' : `${currentQuad.color}11`} categoryGradient={currentQuad.color} onComplete={(id) => onToggleStatus(id)} onDelete={(id) => onDeleteTask && onDeleteTask(id)} onTogglePin={() => {}} onUpdateSubtasks={onUpdateSubtasks} />
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${isDark ? '#334155' : '#F1F5F9'}` }}>
                <button onClick={() => setOpenQuadrant(null)} className="w-full py-3 rounded-2xl text-sm font-bold text-white" style={{ background: currentQuad.color, border: 'none', cursor: 'pointer' }}>{t('done_btn')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};