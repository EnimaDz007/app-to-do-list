// ─────────────────────────────────────────────────────────────
//  FILE: src/components/BinderView.tsx
//  Two-level subtasks: task → subtask → sub-subtask
//  ＋ shows on task rows and subtask rows only
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { Task, QuadrantId, Subtask } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';
import { BinderCoverArt } from './BinderCoverArt';
import { BinderInsideCover } from './BinderInsideCover';

interface Props {
  tasks: Task[];
  onToggleStatus: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
  onUpdateSubtasks?: (id: string, next: Subtask[]) => void;
}
interface Q { id: QuadrantId; label: string; meta: string; color: string; accent: string; bg: string; idx: string; }

type LocalLang = 'en' | 'fr' | 'ar';

const QUAD_COPY: Record<LocalLang, Record<QuadrantId, { label: string; meta: string }>> = {
  en: {
    do_first:  { label: 'Do First',  meta: 'Urgent · today' },
    schedule:  { label: 'Schedule',  meta: 'This week' },
    delegate:  { label: 'Delegate',  meta: 'Team · hand off' },
    eliminate: { label: 'Eliminate', meta: 'Drop · let go' },
  },
  fr: {
    do_first:  { label: 'À faire',   meta: 'Urgent · aujourd’hui' },
    schedule:  { label: 'Planifier', meta: 'Cette semaine' },
    delegate:  { label: 'Déléguer',  meta: 'Équipe · transmettre' },
    eliminate: { label: 'Éliminer',  meta: 'Abandonner' },
  },
  ar: {
    do_first:  { label: 'افعل أولاً', meta: 'عاجل · مهم' },
    schedule:  { label: 'جدول',      meta: 'مهم · لاحقاً' },
    delegate:  { label: 'فوّض',      meta: 'عاجل · للفريق' },
    eliminate: { label: 'احذف',      meta: 'غير مهم' },
  },
};

const UI_COPY: Record<LocalLang, {
  addSubtaskPlaceholder: string;
  addSubSubtaskPlaceholder: string;
  addSubtask: string;
  addSubSubtask: string;
  deleteSub: string;
  subtasks: string;
  progress: string;
  emptySection: string;
  openBinder: string;
  openBinderHint: string;
}> = {
  en: {
    addSubtaskPlaceholder: 'Add a subtask…',
    addSubSubtaskPlaceholder: 'Add a sub-subtask…',
    addSubtask: 'subtask',
    addSubSubtask: 'sub-subtask',
    deleteSub: 'Delete',
    subtasks: 'subtasks',
    progress: 'Progress',
    emptySection: 'No tasks in this section yet',
    openBinder: 'Open the binder',
    openBinderHint: 'Tap a folder tab on the right to open a section',
  },
  fr: {
    addSubtaskPlaceholder: 'Ajouter une sous-tâche…',
    addSubSubtaskPlaceholder: 'Ajouter une sous-sous-tâche…',
    addSubtask: 'sous-tâche',
    addSubSubtask: 'sous-sous-tâche',
    deleteSub: 'Supprimer',
    subtasks: 'sous-tâches',
    progress: 'Progrès',
    emptySection: 'Aucune tâche dans cette section',
    openBinder: 'Ouvrir le classeur',
    openBinderHint: 'Touchez un onglet latéral pour ouvrir une section',
  },
  ar: {
    addSubtaskPlaceholder: 'أضف مهمة فرعية…',
    addSubSubtaskPlaceholder: 'أضف مهمة فرعية داخلية…',
    addSubtask: 'مهمة فرعية',
    addSubSubtask: 'مهمة داخلية',
    deleteSub: 'حذف',
    subtasks: 'مهام فرعية',
    progress: 'التقدم',
    emptySection: 'لا توجد مهام في هذا القسم',
    openBinder: 'افتح المفكرة',
    openBinderHint: 'اضغط على تبويب جانبي لفتح قسم',
  },
};

const Q_META = [
  { id: 'do_first'  as QuadrantId, color: '#a02028', accent: '#d04040', bg: 'linear-gradient(135deg,#d84848 0%,#a01828 50%,#4a0810 100%)', idx: '01' },
  { id: 'schedule'  as QuadrantId, color: '#2048a0', accent: '#5080d8', bg: 'linear-gradient(135deg,#5888e0 0%,#2048a8 50%,#0c1a5e 100%)', idx: '02' },
  { id: 'delegate'  as QuadrantId, color: '#207038', accent: '#58b068', bg: 'linear-gradient(135deg,#60b870 0%,#207038 50%,#0a3a1c 100%)', idx: '03' },
  { id: 'eliminate' as QuadrantId, color: '#4a4a58', accent: '#908088', bg: 'linear-gradient(135deg,#9a8a92 0%,#403040 50%,#1a1018 100%)', idx: '04' },
];

const OPEN_MS = 2200;
const FLIP_MS = 900;
const PAPER_BG = 'radial-gradient(ellipse 70% 45% at 22% 12%, #fffaf0 0%, #faf4e0 45%, #f2ecdc 100%)';
const PAPER_SHADOW = 'inset 0 0 0 1px rgba(180,160,120,0.5), inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 20px rgba(0,0,0,0.5)';

let subCounter = 0;
const makeSubId = () => `sub_${Date.now()}_${subCounter++}`;

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0,
  background: 'rgba(255,255,255,0.55)',
  border: '1px solid rgba(140,120,80,0.35)',
  borderRadius: 6,
  padding: '4px 8px',
  fontFamily: "'Kalam','Comic Sans MS',cursive",
  fontSize: 13, lineHeight: 1.3,
  color: '#2a1a08',
  outline: 'none',
};

export const BinderView: React.FC<Props> = ({ tasks, onToggleStatus, onQuadrantSelect, onUpdateSubtasks }) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = QUAD_COPY[lang] ?? QUAD_COPY.en;
  const ui = UI_COPY[lang] ?? UI_COPY.en;

  const QS: Q[] = Q_META.map((m) => ({
    id: m.id,
    label: copy[m.id].label,
    meta: copy[m.id].meta,
    color: m.color, accent: m.accent, bg: m.bg, idx: m.idx,
  }));

  const [currentQ, setCurrentQ] = useState<QuadrantId | null>(null);
  const [prevQ, setPrevQ] = useState<QuadrantId | null>(null);
  const [flip, setFlip] = useState<{ from: QuadrantId; to: QuadrantId; dir: 'fwd' | 'back' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // { taskId, parentSubId } | null — parentSubId === null → add to task root
  const [addingTo, setAddingTo] = useState<{ taskId: string; parentSubId: string | null } | null>(null);
  const [draft, setDraft] = useState('');
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTo && inputRef.current) setTimeout(() => inputRef.current?.focus(), 40);
  }, [addingTo]);

  const tasksFor = (q: QuadrantId) => tasks.filter((t) => t.quadrant === q);
  const clearTimer = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  const toggleExp = (id: string) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Recursive all-done check
  const allDone = (l: Subtask[]): boolean => l.every((st) => st.done && (!st.subtasks?.length || allDone(st.subtasks)));

  const toggleSub = (taskId: string, subId: string) => {
    if (!onUpdateSubtasks) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return;
    const walk = (l: Subtask[]): Subtask[] =>
      l.map((st) => st.id === subId ? { ...st, done: !st.done } : (st.subtasks?.length ? { ...st, subtasks: walk(st.subtasks) } : st));
    const next = walk(task.subtasks);
    onUpdateSubtasks(taskId, next);

    const nowAllDone = next.length > 0 && allDone(next);
    const wasDone = task.status === 'completed';
    if (nowAllDone && !wasDone) setTimeout(() => onToggleStatus(taskId), 220);
    else if (!nowAllDone && wasDone) setTimeout(() => onToggleStatus(taskId), 220);
  };

  const deleteSub = (taskId: string, subId: string) => {
    if (!onUpdateSubtasks) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return;
    const walk = (l: Subtask[]): Subtask[] =>
      l.filter((st) => st.id !== subId).map((st) => st.subtasks?.length ? { ...st, subtasks: walk(st.subtasks) } : st);
    onUpdateSubtasks(taskId, walk(task.subtasks));
    triggerHaptic('medium');
  };

  // parentSubId === null → add at task root; else add as child of that subtask
  const addSubTo = (taskId: string, parentSubId: string | null) => {
    const title = draft.trim();
    if (!title || !onUpdateSubtasks) { setAddingTo(null); setDraft(''); return; }
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newSub: Subtask = { id: makeSubId(), title, done: false };

    if (parentSubId === null) {
      onUpdateSubtasks(taskId, [...(task.subtasks ?? []), newSub]);
    } else {
      const walk = (l: Subtask[]): Subtask[] =>
        l.map((st) => st.id === parentSubId ? { ...st, subtasks: [...(st.subtasks ?? []), newSub] }
          : (st.subtasks?.length ? { ...st, subtasks: walk(st.subtasks) } : st));
      onUpdateSubtasks(taskId, walk(task.subtasks ?? []));
    }

    setExpanded((p) => { const n = new Set(p); n.add(taskId); return n; });
    if (task.status === 'completed') setTimeout(() => onToggleStatus(taskId), 180);
    setDraft('');
    triggerHaptic('success');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const onTab = (q: QuadrantId) => {
    if (busy) return;
    if (!currentQ) { setBusy(true); setCurrentQ(q); setPrevQ(null); onQuadrantSelect?.(q); clearTimer(); timer.current = window.setTimeout(() => setBusy(false), OPEN_MS); return; }
    if (currentQ === q) { setBusy(true); setCurrentQ(null); setPrevQ(null); clearTimer(); timer.current = window.setTimeout(() => setBusy(false), OPEN_MS); return; }
    if (prevQ === q) {
      setBusy(true); setFlip({ from: q, to: currentQ, dir: 'back' }); clearTimer();
      timer.current = window.setTimeout(() => { setCurrentQ(q); setPrevQ(null); setFlip(null); setBusy(false); onQuadrantSelect?.(q); }, FLIP_MS);
      return;
    }
    setBusy(true); setFlip({ from: currentQ, to: q, dir: 'fwd' }); clearTimer();
    timer.current = window.setTimeout(() => { setPrevQ(currentQ); setCurrentQ(q); setFlip(null); setBusy(false); onQuadrantSelect?.(q); }, FLIP_MS);
  };

  const coverOpen = currentQ !== null || flip !== null;
  const stageBg = isDark ? 'radial-gradient(ellipse 95% 75% at 50% 32%, #4a2c1a 0%, #2a1608 45%, #100704 100%)' : 'radial-gradient(ellipse 95% 75% at 50% 32%, #faf3e6 0%, #ead9c0 40%, #d2b992 100%)';
  const stageTex = isDark ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='w'%3E%3CfeTurbulence baseFrequency='0.015 0.5' numOctaves='4' seed='12'/%3E%3CfeColorMatrix values='0 0 0 0 0.28 0 0 0 0 0.14 0 0 0 0 0.06 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23w)'/%3E%3C/svg%3E")` : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='w'%3E%3CfeTurbulence baseFrequency='0.015 0.4' numOctaves='3' seed='14'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.32 0 0 0 0.22 0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23w)'/%3E%3C/svg%3E")`;
  const spot = isDark ? 'radial-gradient(ellipse, rgba(255,215,150,0.28) 0%, rgba(255,190,110,0.10) 35%, transparent 70%)' : 'radial-gradient(ellipse, rgba(255,245,220,0.75) 0%, rgba(255,235,200,0.30) 35%, transparent 70%)';
  const shadowOp = isDark ? 0.95 : 0.32;
  const coverBg = isDark ? 'linear-gradient(155deg,#e0655c 0%,#bd3038 22%,#941a26 52%,#641016 82%,#3d060b 100%)' : 'linear-gradient(155deg,#c84747 0%,#a5222c 25%,#7a1220 55%,#4a0810 85%,#2a0308 100%)';
  const coverShadow = isDark ? 'inset 0 3px 14px rgba(255,228,228,0.34), inset 0 -16px 40px rgba(0,0,0,0.55), inset 0 0 130px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,205,150,0.24), 0 0 38px rgba(214,176,92,0.22), 0 44px 90px rgba(0,0,0,0.95)' : 'inset 0 3px 12px rgba(255,220,220,0.3), inset 0 -16px 40px rgba(0,0,0,0.7), inset 0 0 140px rgba(0,0,0,0.45), 0 44px 90px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.95)';
  const innerLeather = isDark ? 'linear-gradient(155deg,#5c2129 0%,#3e1219 58%,#280a0e 100%)' : 'linear-gradient(155deg,#4a1e22 0%,#33100f 60%,#1e0606 100%)';
  const g1 = isDark ? '#fffaea' : '#fff4d0';
  const g2 = isDark ? '#f6e3b4' : '#f0d8a8';
  const g3 = isDark ? '#dcb873' : '#c8a25c';
  const g4 = isDark ? '#a8853f' : '#8b6f3a';
  const stitchC = isDark ? 'rgba(240,210,140,0.85)' : 'rgba(212,175,90,0.7)';

  // ─── Subtask list ───
  // depth=0 → level-1 subtasks (get a ＋ to add sub-subtasks)
  // depth=1 → level-2 sub-subtasks (no ＋, only checkbox/title/×)
  const subList = (list: Subtask[], depth: number, color: string, tid: string): React.ReactNode => {
    const canAddChildren = depth === 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {list.map((st) => {
          const isHovered = hoveredSub === st.id;
          const isAddingHere = addingTo?.taskId === tid && addingTo?.parentSubId === st.id;
          const childCount = st.subtasks?.length ?? 0;
          const childDone = st.subtasks?.filter((s) => s.done).length ?? 0;
          return (
            <div key={st.id}>
              <div
                onMouseEnter={() => setHoveredSub(st.id)}
                onMouseLeave={() => { if (hoveredSub === st.id) setHoveredSub(null); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  paddingLeft: 8 + depth * 18, paddingRight: 4,
                  paddingTop: 6, paddingBottom: 6,
                  borderRadius: 6,
                  transition: 'background 0.15s',
                  background: isHovered ? 'rgba(120,100,60,0.06)' : 'transparent',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSub(tid, st.id); }}
                  aria-label="Toggle done"
                  style={{
                    width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${color}`,
                    background: st.done ? color : 'rgba(255,255,255,0.7)',
                    marginTop: 1, cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  {st.done && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </button>

                {/* Title */}
                <div
                  onClick={() => toggleSub(tid, st.id)}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  <span
                    dir="auto"
                    style={{
                      fontFamily: "'Kalam','Comic Sans MS',cursive",
                      fontSize: 13, lineHeight: 1.4, display: 'block',
                      color: st.done ? 'rgba(42,26,8,0.4)' : '#3a2a18',
                      textDecoration: st.done ? 'line-through' : 'none',
                      wordBreak: 'break-word',
                    }}
                  >
                    {st.title}
                  </span>
                  {childCount > 0 && (
                    <div dir="ltr" style={{ fontFamily: 'monospace', fontSize: 8, color: '#8a7a58', marginTop: 1, unicodeBidi: 'isolate' }}>
                      {childDone} / {childCount}
                    </div>
                  )}
                </div>

                {/* ＋ Add sub-subtask — only on level-1 subtasks */}
                {canAddChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingTo({ taskId: tid, parentSubId: st.id });
                      setDraft('');
                      setExpanded((p) => { const n = new Set(p); n.add(tid); return n; });
                    }}
                    aria-label={ui.addSubSubtask}
                    title={ui.addSubSubtask}
                    style={{
                      width: 20, height: 20, flexShrink: 0,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(140,110,60,0.7)', fontSize: 13, fontWeight: 700, lineHeight: 1,
                      padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 4, marginTop: 1,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,90,0.22)'; (e.currentTarget as HTMLElement).style.color = '#5a3a10'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(140,110,60,0.7)'; }}
                  >
                    ＋
                  </button>
                )}

                {/* × Delete subtask */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSub(tid, st.id); }}
                  aria-label={ui.deleteSub}
                  title={ui.deleteSub}
                  style={{
                    width: 20, height: 20, flexShrink: 0,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(160,90,60,0.6)', fontSize: 15, lineHeight: 1,
                    padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, marginTop: 1,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,90,90,0.18)'; (e.currentTarget as HTMLElement).style.color = '#8a3020'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(160,90,60,0.6)'; }}
                >
                  ×
                </button>
              </div>

              {/* Nested children — recursive, but depth+1 means no ＋ inside */}
              {st.subtasks?.length ? subList(st.subtasks, depth + 1, color, tid) : null}

              {/* Inline add input for this subtask's children */}
              {isAddingHere && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8 + (depth + 1) * 18, paddingRight: 4, paddingTop: 4, paddingBottom: 4 }}>
                  <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, border: `1.5px dashed ${color}80`, marginTop: 1 }} />
                  <input
                    ref={inputRef}
                    dir="auto"
                    value={draft}
                    placeholder={ui.addSubSubtaskPlaceholder}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addSubTo(tid, st.id); }
                      else if (e.key === 'Escape') { setAddingTo(null); setDraft(''); }
                    }}
                    onBlur={() => { if (!draft.trim()) setAddingTo(null); else addSubTo(tid, st.id); }}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Page body ───
  const pageBody = (q: Q, list: Task[]): React.ReactNode => {
    const done = list.filter((t) => t.status === 'completed').length;
    const pct = list.length > 0 ? (done / list.length) * 100 : 0;
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 30px, rgba(120,140,180,0.13) 30px 31px)', backgroundPosition: '0 62px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 46, width: 1, background: 'rgba(200,90,90,0.3)', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '42px 68px 14px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 12, borderBottom: '1.5px solid #2a1a08', position: 'relative', flexShrink: 0, gap: 10 }}>
            <div dir="auto" style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.05, color: q.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
              {q.label}
            </div>
            <div dir="auto" style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 1.4, textTransform: 'uppercase', color: '#8a7a58', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {q.meta}
            </div>
            <div style={{ position: 'absolute', bottom: -1.5, left: 0, width: 50, height: 1.5, background: 'linear-gradient(90deg,#c8a25c,transparent)' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: 2 }}>
            {list.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 30, opacity: 0.35 }}>✦</div>
                <div dir="auto" style={{ fontFamily: "'Kalam','Comic Sans MS',cursive", fontSize: 13, color: '#6a5a3a', fontStyle: 'italic' }}>
                  {ui.emptySection}
                </div>
              </div>
            ) : list.map((task) => {
              const isDone = task.status === 'completed';
              const hasSub = !!(task.subtasks?.length);
              const subDone = hasSub ? task.subtasks!.filter((s) => s.done && (!s.subtasks?.length || allDone(s.subtasks))).length : 0;
              const isExp = expanded.has(task.id);
              const isAddingHere = addingTo?.taskId === task.id && addingTo?.parentSubId === null;
              return (
                <div key={task.id} style={{ borderBottom: '1px solid rgba(120,100,60,0.14)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 4px 10px 2px', position: 'relative' }}>
                    {hasSub ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExp(task.id); }}
                        aria-label={isExp ? 'Collapse' : 'Expand'}
                        style={{ width: 22, height: 22, flexShrink: 0, marginTop: 3, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#8a7a58', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isExp ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>▶</span>
                      </button>
                    ) : (
                      <span style={{ width: 22, flexShrink: 0 }} />
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(task.id); }}
                      aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
                      style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, cursor: 'pointer', border: `2px solid ${q.color}`, background: isDone ? q.color : 'rgba(255,255,255,0.65)', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.25s', padding: 0 }}
                    >
                      {isDone && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    </button>

                    <div
                      onClick={() => { if (hasSub) toggleExp(task.id); else onToggleStatus(task.id); }}
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer', paddingTop: 2 }}
                    >
                      <div dir="auto" style={{ fontFamily: "'Kalam','Comic Sans MS',cursive", fontSize: 15, lineHeight: 1.35, color: isDone ? 'rgba(42,26,8,0.4)' : '#2a1a08', textDecoration: isDone ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                        {task.title}
                      </div>
                      {hasSub && (
                        <div dir="ltr" style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 0.6, color: '#8a7a58', marginTop: 3, unicodeBidi: 'isolate' }}>
                          {subDone} / {task.subtasks!.length}
                          <span style={{ marginLeft: 6 }}>{ui.subtasks}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtask tree — level 1 (with ＋) and level 2 (no ＋) */}
                  {hasSub && isExp && (
                    <div style={{ paddingTop: 4, paddingBottom: 4, borderLeft: `2px solid ${q.color}33`, marginLeft: 12, marginBottom: 4 }}>
                      {subList(task.subtasks!, 0, q.color, task.id)}
                    </div>
                  )}

                  {/* Root-level "+ subtask" trigger */}
                  {(!hasSub || isExp) && !isAddingHere && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingTo({ taskId: task.id, parentSubId: null });
                        setDraft('');
                        setExpanded((p) => { const n = new Set(p); n.add(task.id); return n; });
                      }}
                      style={{
                        paddingLeft: 34, paddingBottom: 8, paddingTop: 2,
                        fontFamily: "'Kalam','Comic Sans MS',cursive", fontSize: 11,
                        color: 'rgba(140,110,60,0.75)', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>＋</span>
                      <span>{ui.addSubtask}</span>
                    </div>
                  )}

                  {/* Root-level add input */}
                  {isAddingHere && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 34, paddingRight: 4, paddingTop: 2, paddingBottom: 8 }}>
                      <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, border: `1.5px dashed ${q.color}80`, marginTop: 1 }} />
                      <input
                        ref={inputRef}
                        dir="auto"
                        value={draft}
                        placeholder={ui.addSubtaskPlaceholder}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addSubTo(task.id, null); }
                          else if (e.key === 'Escape') { setAddingTo(null); setDraft(''); }
                        }}
                        onBlur={() => { if (!draft.trim()) setAddingTo(null); else addSubTo(task.id, null); }}
                        style={inputStyle}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingTop: 8, borderTop: '1px dashed rgba(120,100,60,0.32)', marginTop: 6, gap: 8 }}>
            <span dir="auto" style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8a7a58' }}>{ui.progress}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(120,100,60,0.18)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${q.color},${q.accent})`, borderRadius: 2, transition: 'width 0.6s' }} />
            </div>
            <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 600, color: '#3a2010' }}>{done} / {list.length}</span>
          </div>
        </div>
      </>
    );
  };

  const cdef = currentQ ? QS.find((x) => x.id === currentQ) ?? null : null;
  const pdef = prevQ ? QS.find((x) => x.id === prevQ) ?? null : null;
  const fromDef = flip ? QS.find((x) => x.id === flip.from) ?? null : null;
  const toDef = flip ? QS.find((x) => x.id === flip.to) ?? null : null;
  const destDef = flip ? (flip.dir === 'fwd' ? toDef : cdef) : cdef;

  const leafFaces = (q: Q): React.ReactNode => (
    <>
      <div style={{ position: 'absolute', inset: 0, background: PAPER_BG, boxShadow: PAPER_SHADOW, borderRadius: 3, overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        {pageBody(q, tasksFor(q.id))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 18%, transparent 42%)', pointerEvents: 'none' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: PAPER_BG, boxShadow: PAPER_SHADOW, borderRadius: 3, overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        {pageBody(q, tasksFor(q.id))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(270deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 18%, transparent 42%)', pointerEvents: 'none' }} />
      </div>
    </>
  );

  return (
    <div dir="ltr" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: stageBg }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: stageTex, mixBlendMode: 'multiply', opacity: isDark ? 0.55 : 0.22 }} />
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: spot, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: isDark ? 'radial-gradient(ellipse 82% 66% at 50% 40%, transparent 34%, rgba(0,0,0,0.52) 100%)' : 'radial-gradient(ellipse 82% 66% at 50% 40%, transparent 32%, rgba(124,92,50,0.30) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 200, pointerEvents: 'none', background: isDark ? 'linear-gradient(0deg, rgba(0,0,0,0.45) 0%, transparent 100%)' : 'linear-gradient(0deg, rgba(118,86,46,0.22) 0%, transparent 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, pointerEvents: 'none', background: isDark ? 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)' : 'linear-gradient(180deg, rgba(255,248,232,0.55) 0%, transparent 100%)' }} />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 2400, padding: '8px 16px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: 'min(74dvh, 660px)', aspectRatio: '4 / 5.3', transformStyle: 'preserve-3d' }}>
          <div style={{ position: 'absolute', bottom: -22, left: '4%', right: '4%', height: 60, background: `radial-gradient(ellipse, rgba(0,0,0,${shadowOp}) 0%, rgba(0,0,0,${shadowOp * 0.5}) 40%, transparent 75%)`, filter: 'blur(14px)', zIndex: 0, pointerEvents: 'none' }} />

          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 18, background: innerLeather, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8), 0 22px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.9)', zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 40, bottom: 40, left: 20, width: 2, backgroundImage: `repeating-linear-gradient(0deg, ${stitchC} 0 8px, transparent 8px 16px)`, filter: 'drop-shadow(0 0 3px rgba(212,175,90,0.45))', zIndex: 3, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='g'%3E%3CfeTurbulence baseFrequency='0.7' numOctaves='3' seed='9'/%3E%3CfeColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.04 0 0 0 0 0.03 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='320' height='320' filter='url(%23g)'/%3E%3C/svg%3E")`, mixBlendMode: 'multiply', opacity: 0.7, pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', top: 38, bottom: 38, left: 0, right: 34, perspective: 1800, perspectiveOrigin: '0% 50%', transformStyle: 'preserve-3d', zIndex: 5 }}>
              <div style={{ position: 'absolute', inset: 0, background: PAPER_BG, boxShadow: PAPER_SHADOW, borderRadius: 3, overflow: 'hidden' }}>
                {destDef ? pageBody(destDef, tasksFor(destDef.id)) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '0 40px' }}>
                    <div style={{ fontSize: 42, opacity: 0.4 }}>📖</div>
                    <div dir="auto" style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 500, fontStyle: 'italic', color: '#2a1a08' }}>{ui.openBinder}</div>
                    <div dir="auto" style={{ fontFamily: "'Kalam','Comic Sans MS',cursive", fontSize: 13, color: '#6a5a3a', lineHeight: 1.5, maxWidth: 240 }}>{ui.openBinderHint}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 13, color: 'rgba(200,162,92,0.75)', letterSpacing: 12, marginTop: 8 }}>✦ ✦ ✦</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ position: 'absolute', top: 60, right: -8, display: 'flex', flexDirection: 'column', gap: 9, zIndex: 30 }}>
            {QS.map((q, idx) => {
              const isActive = currentQ === q.id;
              const count = tasksFor(q.id).filter((t) => t.status !== 'completed').length;
              return (
                <button key={q.id} onClick={() => onTab(q.id)} style={{
                  width: isActive ? 88 : 72, height: 58, borderRadius: '0 10px 10px 0', background: q.bg, color: '#fff', cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none',
                  transition: 'width 0.5s cubic-bezier(0.34,1.4,0.64,1), transform 0.5s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.5s, opacity 0.9s',
                  transform: isActive ? 'translateX(-10px)' : 'translateX(0)', opacity: coverOpen ? 1 : 0.98,
                  transitionDelay: coverOpen ? `${idx * 60}ms` : '0ms',
                  boxShadow: isActive
                    ? `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -3px 10px rgba(0,0,0,0.4), 8px 6px 22px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.7), 0 0 26px ${q.accent}66`
                    : `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -3px 10px rgba(0,0,0,0.45), 5px 4px 16px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.7)`,
                }}>
                  <span style={{ position: 'absolute', top: 3, left: 7, fontSize: 7, fontFamily: 'monospace', letterSpacing: 1, opacity: 0.6 }}>{q.idx}</span>
                  <span style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 1.5, background: 'linear-gradient(90deg,transparent,rgba(255,220,160,0.85),transparent)' }} />
                  <span dir="auto" style={{ fontSize: 10, fontFamily: "'Cormorant Garamond',Georgia,serif", fontWeight: 700, letterSpacing: 0.5, textTransform: lang === 'ar' ? 'none' : 'uppercase', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.5)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingInline: 2 }}>{q.label}</span>
                  <span style={{ fontSize: 18, fontFamily: "'Cormorant Garamond',Georgia,serif", fontWeight: 700, lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginTop: 2 }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className={`binder-cover${coverOpen ? ' binder-cover-open' : ''}`} style={{ position: 'absolute', inset: 0, borderRadius: 18, zIndex: 15, transformStyle: 'preserve-3d', transformOrigin: 'left center', willChange: 'transform', pointerEvents: coverOpen ? 'none' : 'auto' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 18, background: coverBg, boxShadow: coverShadow, backfaceVisibility: 'hidden' }}>
              <BinderCoverArt />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 56% 42% at 30% 12%, rgba(255,240,220,0.14), transparent 64%)', pointerEvents: 'none', zIndex: 3 }} />
              <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%,-50%)', width: '21%', aspectRatio: '1 / 1', opacity: 0.95, zIndex: 6, pointerEvents: 'none' }}>
                <svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="sealGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={g1} /><stop offset="45%" stopColor={g3} /><stop offset="100%" stopColor={g4} />
                    </linearGradient>
                  </defs>
                  <circle cx="65" cy="65" r="48" fill="none" stroke="url(#sealGold)" strokeWidth="1.2" opacity="0.75" />
                  <circle cx="65" cy="65" r="42" fill="none" stroke="url(#sealGold)" strokeWidth="0.5" opacity="0.5" />
                  <circle cx="65" cy="65" r="36" fill="none" stroke="url(#sealGold)" strokeWidth="0.3" opacity="0.35" />
                  {Array.from({ length: 24 }).map((_, i) => {
                    const a = (i / 24) * Math.PI * 2;
                    const r1 = i % 6 === 0 ? 42 : 44, r2 = 48;
                    return <line key={i} x1={65 + Math.cos(a) * r1} y1={65 + Math.sin(a) * r1} x2={65 + Math.cos(a) * r2} y2={65 + Math.sin(a) * r2} stroke="url(#sealGold)" strokeWidth={i % 6 === 0 ? 0.9 : 0.4} opacity={i % 6 === 0 ? 0.85 : 0.5} />;
                  })}
                  <path d="M 50 66 L 61 77 L 82 54" fill="none" stroke="url(#sealGold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                </svg>
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '56%', transform: 'translateY(-50%)', textAlign: 'center', zIndex: 7, pointerEvents: 'none' }}>
                <div style={{ fontFamily: "'Cinzel',Georgia,serif", fontSize: 22, fontWeight: 600, letterSpacing: 8, textTransform: 'uppercase', backgroundImage: `linear-gradient(180deg,${g1} 0%,${g2} 25%,${g3} 55%,${g4} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>MerakiList</div>
                <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 7, letterSpacing: 4, color: 'rgba(232,200,160,0.55)', textTransform: 'uppercase' }}>Task Priority · Est. 2026</div>
                <div style={{ marginTop: 10, height: 1, width: 60, marginLeft: 'auto', marginRight: 'auto', background: 'linear-gradient(90deg,transparent,rgba(212,175,90,0.7),transparent)' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%) rotate(-2deg)', width: 22, height: 70, background: 'linear-gradient(180deg,#7a1020 0%,#5a0810 60%,#3a0408 100%)', borderRadius: 2, boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5), inset 2px 0 3px rgba(255,120,120,0.15), 0 4px 10px rgba(0,0,0,0.7)', zIndex: 8, overflow: 'hidden', pointerEvents: 'none' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', background: innerLeather, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(212,175,90,0.45)', pointerEvents: 'none' }}>
              <BinderInsideCover />
            </div>
          </div>

          <div style={{ position: 'absolute', top: 38, bottom: 38, left: 0, right: 34, perspective: 1800, perspectiveOrigin: '0% 50%', transformStyle: 'preserve-3d', transform: 'translateZ(30px)', zIndex: 25, pointerEvents: 'none' }}>
            {pdef && !flip && (
              <div style={{ position: 'absolute', inset: 0, transformOrigin: 'left center', transform: 'rotateY(-180deg)', transformStyle: 'preserve-3d' }}>
                {leafFaces(pdef)}
              </div>
            )}
            {flip && fromDef && (
              <div style={{ position: 'absolute', inset: 0, transformOrigin: 'left center', transformStyle: 'preserve-3d', animation: `${flip.dir === 'fwd' ? 'leafTurnFwd' : 'leafTurnBack'} ${FLIP_MS}ms cubic-bezier(0.55, 0.05, 0.35, 1) forwards` }}>
                {leafFaces(fromDef)}
              </div>
            )}
            {cdef && !flip && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: -16, width: 32, background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.13) 30%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.13) 70%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }} />
            )}
          </div>
        </div>
      </div>

      <style>{`
        .binder-cover { transform: rotateY(0deg); transition: transform ${OPEN_MS}ms cubic-bezier(0.4,0.05,0.2,1); transform-origin: left center; will-change: transform; }
        .binder-cover-open { transform: rotateY(-178deg); }
        @keyframes leafTurnFwd  { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(-180deg); } }
        @keyframes leafTurnBack { 0% { transform: rotateY(-180deg); } 100% { transform: rotateY(0deg); } }
      `}</style>
    </div>
  );
};