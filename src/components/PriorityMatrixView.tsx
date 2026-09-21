import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useStreak } from '../hooks/useStreak';
import { useAchievements } from '../hooks/useAchievements';
import { QuoteBanner } from './QuoteBanner';
import { AchievementPopup } from './AchievementPopup';
import { UndoToast } from './UndoToast';
import { SwipeableTaskItem } from './SwipeableTaskItem';
import { particleCount } from '../utils/deviceTier';

interface PriorityMatrixViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

interface CategoryConfig {
  title: string;
  subtitle: string;
  emoji: string;
  secondaryEmoji: string;
  color: string;
  colorLight: string;
  colorPale: string;
  gradient: string;
  messages: string[];
}

const QUADRANT_CONFIGS: Record<QuadrantId, CategoryConfig> = {
  do_first: {
    title: 'Do First', subtitle: 'Urgent · Important', emoji: '🔥', secondaryEmoji: '💥',
    color: '#E11D48', colorLight: '#FB7185', colorPale: '#FFE4E6',
    gradient: 'linear-gradient(135deg, #F43F5E, #E11D48)',
    messages: ['SAHIT! 🔥', 'ON FIRE! 🔥', 'BOOM! 💥', 'CRUSHED! 🔥'],
  },
  schedule: {
    title: 'Schedule', subtitle: 'Important · Later', emoji: '📅', secondaryEmoji: '⭐',
    color: '#4F46E5', colorLight: '#818CF8', colorPale: '#E0E7FF',
    gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    messages: ['PLANNED! 📅', 'ON TRACK! ⭐', 'NICE! 📅', 'SMOOTH! ✨'],
  },
  delegate: {
    title: 'Delegate', subtitle: 'Urgent · Later', emoji: '👥', secondaryEmoji: '✨',
    color: '#059669', colorLight: '#34D399', colorPale: '#D1FAE5',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    messages: ['DELEGATED! 👥', 'TEAM WORK! 💪', 'DONE! ✓', 'MGRIEG! ✨'],
  },
  eliminate: {
    title: 'Eliminate', subtitle: 'Not Important', emoji: '🗑️', secondaryEmoji: '✓',
    color: '#64748B', colorLight: '#94A3B8', colorPale: '#F1F5F9',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
    messages: ['CLEANED! 🗑️', 'GONE! 💨', 'NICE! ✓', 'FOCUS! 🎯'],
  },
};

export const PriorityMatrixView: React.FC<PriorityMatrixViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  // ✅ Read tier from HTML class (set by useDevicePerformance hook in App.tsx)
  const [tier, setTier] = useState<'low' | 'mid' | 'high'>('mid');
  useEffect(() => {
    const root = document.documentElement;
    const readTier = () => {
      if (root.classList.contains('perf-low')) return 'low';
      if (root.classList.contains('perf-high')) return 'high';
      return 'mid';
    };
    setTier(readTier());
    // Re-check after 2 seconds (when FPS measurement finishes)
    const t = setTimeout(() => setTier(readTier()), 2500);
    return () => clearTimeout(t);
  }, []);
  const isLow = tier === 'low';
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const [deletedTaskIndex, setDeletedTaskIndex] = useState<number>(-1);
  const { t } = useLanguage();
  const streakData = useStreak(completedTasks);
  const { newlyUnlocked } = useAchievements(completedTasks, streakData.currentStreak);
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);
  const [pulseQuadrant, setPulseQuadrant] = useState<QuadrantId | null>(null);
  const prevCountsRef = useRef<Record<QuadrantId, number>>({
    do_first: 0, schedule: 0, delegate: 0, eliminate: 0,
  });
  const fxLayerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const victoryMsgRef = useRef<HTMLDivElement>(null);

  const totalTasks = tasks.length;

  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const quadrantTasks = (qId: QuadrantId) => tasks.filter((t) => t.quadrant === qId);
  const quadrantCount = (qId: QuadrantId) => quadrantTasks(qId).length;
  const quadrantDone = (qId: QuadrantId) =>
    quadrantTasks(qId).filter((t) => t.status === 'completed').length;

  useEffect(() => {
    if (openQuadrant && onQuadrantSelect) {
      onQuadrantSelect(openQuadrant);
    }
  }, [openQuadrant, onQuadrantSelect]);

  useEffect(() => {
    (Object.keys(QUADRANT_CONFIGS) as QuadrantId[]).forEach((qId) => {
      const current = tasks.filter((t) => t.quadrant === qId).length;
      const prev = prevCountsRef.current[qId];
      if (current > prev && prev !== 0) {
        setPulseQuadrant(qId);
        setTimeout(() => setPulseQuadrant(null), 900);
      }
      prevCountsRef.current[qId] = current;
    });
  }, [tasks]);

  const appendFx = (el: HTMLDivElement, ttl: number) => {
    if (!fxLayerRef.current) return;
    fxLayerRef.current.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, ttl);
  };

  const fireConfetti = (x: number, y: number, cfg: CategoryConfig) => {
    const colors = [cfg.color, cfg.colorLight, cfg.colorPale, '#FBBF24', '#FFFFFF'];
    for (let i = 0; i < particleCount(30, tier); i++) {
      const c = document.createElement('div');
      c.style.position = 'absolute';
      c.style.left = x + 'px'; c.style.top = y + 'px';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.width = 6 + Math.random() * 6 + 'px';
      c.style.height = 6 + Math.random() * 8 + 'px';
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      c.style.pointerEvents = 'none'; c.style.zIndex = '999';
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.6;
      const distance = 100 + Math.random() * 100;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance + 40;
      const rot = Math.random() * 1080 - 540;
      c.style.transition = `transform ${1 + Math.random() * 0.5}s cubic-bezier(0.15, 0.6, 0.4, 1), opacity ${1 + Math.random() * 0.5}s`;
      c.style.transform = 'translate(0,0) rotate(0deg)';
      requestAnimationFrame(() => {
        c.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
        c.style.opacity = '0';
      });
      appendFx(c, 1800);
    }
  };

  const fireSparkles = (x: number, y: number, cfg: CategoryConfig) => {
    const emojis = [cfg.emoji, cfg.secondaryEmoji, '✨', '⭐'];
    for (let i = 0; i < particleCount(14, tier); i++) {
      const s = document.createElement('div');
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      s.style.position = 'absolute';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.fontSize = 12 + Math.random() * 10 + 'px';
      s.style.pointerEvents = 'none'; s.style.zIndex = '998';
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 70;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const delay = Math.random() * 0.25;
      s.style.transition = `transform 1s ease-out ${delay}s, opacity 1s ease-out ${delay}s`;
      s.style.transform = 'translate(0,0) scale(0) rotate(0deg)';
      requestAnimationFrame(() => {
        s.style.transform = `translate(${tx}px, ${ty}px) scale(1.2) rotate(360deg)`;
        s.style.opacity = '0';
      });
      appendFx(s, 1500);
    }
  };

  const fireParticles = (x: number, y: number, cfg: CategoryConfig) => {
    const colors = [cfg.color, cfg.colorLight, '#FFFFFF'];
    for (let i = 0; i < particleCount(24, tier); i++) {
      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      const size = 4 + Math.random() * 4;
      p.style.width = size + 'px'; p.style.height = size + 'px';
      p.style.borderRadius = '50%';
      p.style.boxShadow = `0 0 10px ${cfg.colorLight}`;
      p.style.pointerEvents = 'none'; p.style.zIndex = '999';
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.4;
      const distance = 90 + Math.random() * 80;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      p.style.transition = `transform ${1 + Math.random() * 0.4}s cubic-bezier(0.15, 0.6, 0.4, 1), opacity ${1 + Math.random() * 0.4}s`;
      requestAnimationFrame(() => {
        p.style.transform = `translate(${tx}px, ${ty}px) scale(0.3)`;
        p.style.opacity = '0';
      });
      appendFx(p, 1500);
    }
  };

  const fireRings = (x: number, y: number, cfg: CategoryConfig) => {
    for (let i = 0; i < 3; i++) {
      const r = document.createElement('div');
      r.style.position = 'absolute';
      r.style.left = x - 40 + 'px'; r.style.top = y - 40 + 'px';
      r.style.width = '80px'; r.style.height = '80px';
      r.style.borderRadius = '50%';
      r.style.border = `4px solid ${i === 0 ? cfg.color : cfg.colorLight}`;
      r.style.pointerEvents = 'none'; r.style.zIndex = '997';
      r.style.transition = `transform 0.9s ease-out ${i * 0.12}s, opacity 0.9s ease-out ${i * 0.12}s`;
      requestAnimationFrame(() => {
        r.style.transform = 'scale(4)';
        r.style.opacity = '0';
      });
      appendFx(r, 1400);
    }
  };

  const fireShockwave = (cfg: CategoryConfig) => {
    const s = document.createElement('div');
    s.style.position = 'absolute';
    s.style.left = '50%'; s.style.top = '50%';
    s.style.width = '100px'; s.style.height = '100px';
    s.style.borderRadius = '50%';
    s.style.background = `radial-gradient(circle, ${cfg.colorLight}99 0%, ${cfg.color}44 50%, transparent 70%)`;
    s.style.transform = 'translate(-50%, -50%) scale(0.5)';
    s.style.pointerEvents = 'none'; s.style.zIndex = '995';
    s.style.transition = 'transform 1.4s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 1.4s';
    requestAnimationFrame(() => {
      s.style.transform = 'translate(-50%, -50%) scale(8)';
      s.style.opacity = '0';
    });
    appendFx(s, 1600);
  };

  const fireStarburst = (x: number, y: number, cfg: CategoryConfig) => {
    for (let i = 0; i < particleCount(12, tier); i++) {
      const b = document.createElement('div');
      b.style.position = 'absolute';
      b.style.left = x + 'px'; b.style.top = y + 'px';
      b.style.width = '4px'; b.style.height = '40px';
      b.style.borderRadius = '2px';
      b.style.background = `linear-gradient(to top, ${cfg.color}, transparent)`;
      b.style.transformOrigin = 'center center';
      b.style.pointerEvents = 'none'; b.style.zIndex = '996';
      const rot = i * 30;
      b.style.transform = `translate(-50%, -50%) rotate(${rot}deg) translateY(0) scaleY(0.3)`;
      b.style.transition = `transform 1s cubic-bezier(0.2, 0.8, 0.4, 1) ${i * 0.02}s, opacity 1s ease-out ${i * 0.02}s`;
      requestAnimationFrame(() => {
        b.style.transform = `translate(-50%, -50%) rotate(${rot}deg) translateY(-140px) scaleY(0.5)`;
        b.style.opacity = '0';
      });
      appendFx(b, 1300);
    }
  };

  const fireBeams = (x: number, y: number, cfg: CategoryConfig) => {
    for (let i = 0; i < particleCount(8, tier); i++) {
      const beam = document.createElement('div');
      beam.style.position = 'absolute';
      beam.style.left = x + 'px'; beam.style.top = y + 'px';
      beam.style.width = '80px'; beam.style.height = '4px';
      beam.style.borderRadius = '2px';
      beam.style.background = `linear-gradient(90deg, ${cfg.colorLight}, transparent)`;
      beam.style.boxShadow = `0 0 12px ${cfg.colorLight}`;
      beam.style.transformOrigin = '0 0';
      beam.style.pointerEvents = 'none'; beam.style.zIndex = '994';
      const rot = i * 45;
      beam.style.transform = `rotate(${rot}deg) translateX(0) scaleX(0)`;
      beam.style.opacity = '1';
      beam.style.transition = `transform 1s ease-out, opacity 1s ease-out`;
      requestAnimationFrame(() => {
        beam.style.transform = `rotate(${rot}deg) translateX(220px) scaleX(0.3)`;
        beam.style.opacity = '0';
      });
      appendFx(beam, 1200);
    }
  };

  const firePlusOne = (x: number, y: number, cfg: CategoryConfig) => {
    const p = document.createElement('div');
    p.textContent = '+1';
    p.style.position = 'absolute';
    p.style.left = x + 20 + 'px'; p.style.top = y - 10 + 'px';
    p.style.fontSize = '28px'; p.style.fontWeight = '900';
    p.style.color = cfg.color;
    p.style.textShadow = `0 4px 20px ${cfg.colorLight}cc, 0 0 30px ${cfg.colorLight}88`;
    p.style.pointerEvents = 'none'; p.style.zIndex = '1000';
    p.style.transition = 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1.4s';
    requestAnimationFrame(() => {
      p.style.transform = 'translateY(-100px) scale(0.8)';
      p.style.opacity = '0';
    });
    appendFx(p, 1700);
  };

  const fireCheckBurst = (x: number, y: number, cfg: CategoryConfig) => {
    const c = document.createElement('div');
    c.textContent = '✓';
    c.style.position = 'absolute';
    c.style.left = x + 'px'; c.style.top = y + 'px';
    c.style.fontSize = '60px'; c.style.fontWeight = '900';
    c.style.color = cfg.color;
    c.style.textShadow = `0 6px 30px ${cfg.colorLight}cc, 0 0 60px ${cfg.colorLight}66`;
    c.style.pointerEvents = 'none'; c.style.zIndex = '999';
    c.style.transform = 'translate(-50%, 0) scale(0) rotate(-30deg)';
    c.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1.2s';
    requestAnimationFrame(() => {
      c.style.transform = 'translate(-50%, -120px) scale(0.6) rotate(20deg)';
      c.style.opacity = '0';
    });
    appendFx(c, 1400);
  };

  const fireEmojiRain = (cfg: CategoryConfig) => {
    for (let i = 0; i < particleCount(20, tier); i++) {
      setTimeout(() => {
        const e = document.createElement('div');
        e.textContent = Math.random() > 0.5 ? cfg.emoji : cfg.secondaryEmoji;
        e.style.position = 'absolute';
        e.style.left = Math.random() * 340 + 'px';
        e.style.top = '-30px';
        e.style.fontSize = 16 + Math.random() * 14 + 'px';
        e.style.pointerEvents = 'none'; e.style.zIndex = '999';
        e.style.transition = `transform ${2 + Math.random() * 1.5}s cubic-bezier(0.4, 0, 0.6, 1), opacity ${2 + Math.random() * 1.5}s`;
        requestAnimationFrame(() => {
          e.style.transform = `translateY(800px) rotate(360deg) scale(0.8)`;
          e.style.opacity = '0';
        });
        appendFx(e, 4200);
      }, i * 35);
    }
  };

  const fireFlash = (cfg: CategoryConfig) => {
    const f = flashRef.current;
    if (!f) return;
    f.style.background = `radial-gradient(circle at 50% 50%, ${cfg.colorLight}cc, ${cfg.color}55 40%, transparent 70%)`;
    f.style.transition = 'opacity 0.9s ease-out';
    f.style.opacity = '0.6';
    setTimeout(() => { f.style.opacity = '0'; }, 100);
  };

  const fireVictoryMessage = (cfg: CategoryConfig) => {
    const msg = victoryMsgRef.current;
    if (!msg) return;
    const text = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    msg.textContent = text;
    msg.style.background = cfg.gradient;
    msg.style.boxShadow = `0 20px 60px ${cfg.colorLight}88, 0 0 80px ${cfg.colorLight}66, 0 0 0 6px rgba(255,255,255,0.4)`;
    msg.style.transition = 'none';
    msg.style.opacity = '0';
    msg.style.transform = 'translate(-50%, -50%) scale(0.3) rotate(-10deg)';
    requestAnimationFrame(() => {
      msg.style.transition = 'opacity 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
      msg.style.opacity = '1';
      msg.style.transform = 'translate(-50%, -50%) scale(1.15) rotate(3deg)';
      setTimeout(() => { msg.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)'; }, 250);
      setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(5deg)';
      }, 1400);
    });
  };

  const fireMegaVictory = () => {
    const rainbow = ['#E11D48', '#6366F1', '#10B981', '#FBBF24', '#EC4899', '#A855F7'];
    for (let i = 0; i < particleCount(120, tier); i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        c.style.position = 'absolute';
        c.style.left = Math.random() * 340 + 'px';
        c.style.top = '-30px';
        c.style.background = rainbow[Math.floor(Math.random() * rainbow.length)];
        c.style.width = 6 + Math.random() * 8 + 'px';
        c.style.height = 6 + Math.random() * 12 + 'px';
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        c.style.pointerEvents = 'none'; c.style.zIndex = '999';
        const tx = (Math.random() - 0.5) * 240;
        const ty = 800;
        const rot = Math.random() * 1440 - 720;
        c.style.transition = `transform ${2 + Math.random() * 2}s linear, opacity ${2 + Math.random() * 2}s linear`;
        requestAnimationFrame(() => {
          c.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
          c.style.opacity = '0';
        });
        appendFx(c, 4500);
      }, i * 25);
    }
    const msg = victoryMsgRef.current;
    if (msg) {
      msg.textContent = '🏆 ' + t('all_done') + ' 🏆';
      msg.style.background = 'linear-gradient(135deg, #7C3AED, #EC4899, #FBBF24)';
      msg.style.boxShadow = '0 20px 80px rgba(124,58,237,0.6), 0 0 100px rgba(236,72,153,0.5)';
      msg.style.fontSize = '22px';
      msg.style.transition = 'none';
      msg.style.opacity = '0';
      msg.style.transform = 'translate(-50%, -50%) scale(0.3)';
      requestAnimationFrame(() => {
        msg.style.transition = 'opacity 0.3s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        msg.style.opacity = '1';
        msg.style.transform = 'translate(-50%, -50%) scale(1)';
        setTimeout(() => { msg.style.opacity = '0'; }, 2200);
      });
    }
  };

  const handleTogglePin = (taskId: string) => {
    const saved = localStorage.getItem('taskflow_tasks_list');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const updated = parsed.map((t: Task) =>
        t.id === taskId ? { ...t, pinned: !t.pinned } : t
      );
      localStorage.setItem('taskflow_tasks_list', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tasks-updated'));
    } catch (e) {}
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const saved = localStorage.getItem('taskflow_tasks_list');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const updated = parsed.map((t: Task) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: (t.subtasks || []).map((s) =>
            s.id === subtaskId ? { ...s, done: !s.done } : s
          ),
        };
      });
      localStorage.setItem('taskflow_tasks_list', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tasks-updated'));
    } catch (e) {}
  };

  const handleDeleteWithUndo = (taskId: string) => {
    const index = tasks.findIndex((t) => t.id === taskId);
    const task = tasks[index];
    if (!task) return;
    setDeletedTask(task);
    setDeletedTaskIndex(index);
    if (onDeleteTask) onDeleteTask(taskId);
  };

  const handleUndoDelete = () => {
    if (!deletedTask) return;
    const saved = localStorage.getItem('taskflow_tasks_list');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      parsed.splice(deletedTaskIndex, 0, deletedTask);
      localStorage.setItem('taskflow_tasks_list', JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('tasks-updated'));
      setDeletedTask(null);
      setDeletedTaskIndex(-1);
    } catch (e) {}
  };

  const handleTaskDestroy = (taskId: string, taskQuadrant: QuadrantId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const cfg = QUADRANT_CONFIGS[taskQuadrant];

    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    fireConfetti(x, y, cfg);
    fireSparkles(x, y, cfg);
    fireParticles(x, y, cfg);
    fireRings(x, y, cfg);
    fireShockwave(cfg);
    fireStarburst(x, y, cfg);
    fireBeams(x, y, cfg);
    firePlusOne(x, y, cfg);
    fireCheckBurst(x, y, cfg);
    fireEmojiRain(cfg);
    fireFlash(cfg);
    fireVictoryMessage(cfg);

    const remaining = tasks.filter((t) => t.id !== taskId).length;
    if (remaining === 0 && tasks.length > 0) {
      setTimeout(fireMegaVictory, 800);
    }

        setTimeout(() => {
      onToggleStatus(taskId);
    }, 600);
  };

  const handleOpenQuadrant = (qId: QuadrantId) => {
    setOpenQuadrant(qId);
    if (onQuadrantSelect) onQuadrantSelect(qId);
  };

  const currentTasks = openQuadrant ? quadrantTasks(openQuadrant) : [];
  const currentCfg = openQuadrant ? QUADRANT_CONFIGS[openQuadrant] : null;

  return (
    <div className="relative w-full flex flex-col overflow-hidden" style={{ minHeight: 'calc(100dvh - 130px)' }}>

      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBFF] via-[#F5F3FF] to-[#FDFBFF]" />
        <div className="absolute left-[-50%] w-[200%] h-[60px] opacity-35 blur-[8px]"
          style={{ top: '5%', background: 'linear-gradient(90deg, transparent, #8B5CF6, #6366F1, transparent)', transform: 'rotate(-12deg)', animation: 'prismFloat1 6s ease-in-out infinite' }} />
        <div className="absolute left-[-50%] w-[200%] h-[60px] opacity-35 blur-[8px]"
          style={{ top: '22%', background: 'linear-gradient(90deg, transparent, #EC4899, #F472B6, transparent)', transform: 'rotate(8deg)', animation: 'prismFloat2 8s ease-in-out infinite' }} />
        <div className="absolute left-[-50%] w-[200%] h-[60px] opacity-35 blur-[8px]"
          style={{ top: '45%', background: 'linear-gradient(90deg, transparent, #10B981, #34D399, transparent)', transform: 'rotate(-6deg)', animation: 'prismFloat1 7s ease-in-out infinite' }} />
        <div className="absolute left-[-50%] w-[200%] h-[60px] opacity-35 blur-[8px]"
          style={{ top: '68%', background: 'linear-gradient(90deg, transparent, #6366F1, #8B5CF6, transparent)', transform: 'rotate(10deg)', animation: 'prismFloat2 9s ease-in-out infinite' }} />
      </div>

      <div ref={fxLayerRef} className="absolute inset-0 pointer-events-none z-[100] overflow-hidden" />
      <div ref={flashRef} className="absolute inset-0 pointer-events-none z-[996] opacity-0" />
      <AchievementPopup achievement={newlyUnlocked} />
      <div
        ref={victoryMsgRef}
        className="absolute left-1/2 top-1/2 pointer-events-none z-[1002] whitespace-nowrap font-black uppercase tracking-wider text-white flex items-center gap-2.5"
        style={{ transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0, padding: '22px 44px', borderRadius: '100px', fontSize: '26px' }}
      />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 pt-4 pb-2 px-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/60 bg-white/80 backdrop-blur-xl px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 8px #10B981' }} />
            <span className="text-[9px] font-extrabold tracking-[2px] uppercase text-violet-600">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
            </span>
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-slate-900 leading-none">
            {t('matrix_welcome')}{' '}
            <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, background: 'linear-gradient(135deg, #7C3AED, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {t('matrix_em')}
            </em>
          </h1>
          <QuoteBanner />
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center px-3 py-2">
          <div className="relative w-full aspect-square mx-auto" style={{ maxWidth: 'min(100%, 72dvh)', maxHeight: '100%' }}>
            <div className="absolute inset-[6%] rounded-full border border-dashed border-violet-400/40" style={{ animation: 'ringRotate 60s linear infinite' }} />
            <div className="absolute inset-[18%] rounded-full border border-indigo-300/30" />
            <div className="absolute inset-[28%] rounded-full border border-dotted border-violet-400/40" style={{ animation: 'ringRotate 40s linear infinite reverse' }} />

            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[3]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <line x1="50" y1="50" x2="16" y2="16" stroke="url(#connGrad)" strokeWidth="0.3" strokeDasharray="1.2 1.2" style={{ animation: 'dashMove 3s linear infinite' }} />
              <line x1="50" y1="50" x2="84" y2="16" stroke="url(#connGrad)" strokeWidth="0.3" strokeDasharray="1.2 1.2" style={{ animation: 'dashMove 3s linear infinite' }} />
              <line x1="50" y1="50" x2="16" y2="84" stroke="url(#connGrad)" strokeWidth="0.3" strokeDasharray="1.2 1.2" style={{ animation: 'dashMove 3s linear infinite' }} />
              <line x1="50" y1="50" x2="84" y2="84" stroke="url(#connGrad)" strokeWidth="0.3" strokeDasharray="1.2 1.2" style={{ animation: 'dashMove 3s linear infinite' }} />
            </svg>

            <div className="absolute left-1/2 top-[8%] -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-white/90 backdrop-blur-md px-2.5 py-1 z-10 whitespace-nowrap">
              <span className="w-1 h-1 rounded-full bg-violet-600" />
              <span className="text-[8px] font-extrabold text-violet-600 tracking-wider">{t('streak_label')} · {streakData.currentStreak}{t('streak_days')} 🔥</span>
            </div>
            <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-white/90 backdrop-blur-md px-2.5 py-1 z-10 whitespace-nowrap">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-extrabold text-violet-600 tracking-wider">{completedTasks} {t('done_today')}</span>
            </div>

            <motion.div
              key={totalTasks}
              initial={isLow ? false : { scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={isLow ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center z-10 bg-gradient-to-br from-violet-500 to-purple-600"
              style={{ width: '40%', aspectRatio: '1', boxShadow: '0 20px 60px rgba(124,58,237,0.3), 0 0 0 6px rgba(255,255,255,0.85), 0 0 0 7px rgba(139,92,246,0.2)' }}
            >
              <span className="text-[8px] font-extrabold tracking-[2.5px] text-violet-700 uppercase">{t('total')}</span>
              <motion.span
                key={totalTasks}
                initial={isLow ? false : { scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={isLow ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 15 }}
                className="text-4xl font-extrabold text-violet-700"
              >
                {totalTasks}
              </motion.span>
              <span className="text-[9px] font-bold text-violet-400 mt-1">{completionPct}% {t('done_btn').toUpperCase()}</span>
              <div className="w-[55%] h-[2px] bg-violet-200/60 rounded mt-2 overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  initial={isLow ? false : { width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={isLow ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
                  style={{ background: 'linear-gradient(90deg, #7C3AED, #6366F1)' }}
                />
              </div>
            </motion.div>

            {(Object.keys(QUADRANT_CONFIGS) as QuadrantId[]).map((quadrantId) => {
              const config = QUADRANT_CONFIGS[quadrantId];
              const count = quadrantCount(quadrantId);
              const done = quadrantDone(quadrantId);
              const pct = count > 0 ? Math.round((done / count) * 100) : 0;
              const isPulsing = pulseQuadrant === quadrantId;

              const positions: Record<QuadrantId, string> = {
                do_first: 'top-0 left-0',
                schedule: 'top-0 right-0',
                delegate: 'bottom-0 left-0',
                eliminate: 'bottom-0 right-0',
              };

              return (
                <motion.button
                  key={quadrantId}
                  onClick={() => handleOpenQuadrant(quadrantId)}
                  whileHover={isLow ? undefined : { scale: 1.03 }}
                  whileTap={isLow ? undefined : { scale: 0.97 }}
                  animate={isLow ? { scale: 1 } : (isPulsing ? { scale: [1, 1.12, 1] } : { scale: 1 })}
                  transition={isLow ? { duration: 0 } : (isPulsing ? { duration: 0.7, ease: 'easeInOut' } : { type: 'spring', stiffness: 400, damping: 25 })}
                  className={`absolute ${positions[quadrantId]} z-[8] text-left rounded-2xl bg-white/95 backdrop-blur-xl p-2.5`}
                  style={{
                    width: '30%', maxWidth: '130px',
                    boxShadow: isPulsing ? `0 12px 40px ${config.color}66, 0 0 0 12px ${config.color}22` : '0 12px 32px rgba(139,92,246,0.15), 0 0 0 1px rgba(255,255,255,0.8)',
                    border: `1px solid ${config.color}33`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <motion.div
                      animate={isLow ? { rotate: 0, scale: 1 } : (isPulsing ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.3, 1] } : { rotate: 0, scale: 1 })}
                      transition={isLow ? { duration: 0 } : { duration: 0.6 }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: `${config.color}22` }}
                    >
                      {config.emoji}
                    </motion.div>
                    <motion.span
                      key={count}
                      initial={isLow ? false : { scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={isLow ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 15 }}
                      className="text-[18px] font-black tracking-tighter leading-none"
                      style={{ color: config.color }}
                    >
                      {count}
                    </motion.span>
                  </div>
                  <div className="mt-1.5">
                    <div className="text-[9px] font-extrabold tracking-wider uppercase leading-tight" style={{ color: config.color }}>
                      {t(`quad_${quadrantId}`)}
                    </div>
                    <div className="text-[7px] font-semibold text-slate-400 mt-0.5 truncate">
                      {t(`quad_${quadrantId}_sub`)}
                    </div>
                  </div>
                  <div className="h-[2px] bg-slate-100 rounded mt-1.5 overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: config.color, transition: isLow ? 'none' : 'width 0.6s' }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0" style={{ height: 'calc(80px + env(safe-area-inset-bottom))' }} />
      </div>

      <AnimatePresence>
        {openQuadrant && currentCfg && (
          <>
            <motion.div
              initial={isLow ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isLow ? undefined : { opacity: 0 }}
              onClick={() => setOpenQuadrant(null)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-md"
            />
            <motion.div
              initial={isLow ? false : { opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={isLow ? undefined : { opacity: 0, scale: 0.9, y: 20 }}
              transition={isLow ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed top-1/2 left-1/2 z-50 w-[92%] max-w-md max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.4)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${currentCfg.colorPale}` }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: currentCfg.colorPale }}
                  >
                    {currentCfg.emoji}
                  </div>
                  <div>
                    <div className="text-base font-extrabold" style={{ color: currentCfg.color }}>
                      {t(`quad_${openQuadrant}`)}
                    </div>
                    <div className="text-xs font-semibold text-slate-400">
                      {currentTasks.length} {t('tasks_count')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpenQuadrant(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: currentCfg.colorPale, color: currentCfg.color }}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {currentTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3 opacity-30">{currentCfg.emoji}</div>
                    <p className="text-sm text-slate-400 italic">{t('no_tasks_yet')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {currentTasks.map((task) => (
                      <SwipeableTaskItem
                        key={task.id}
                        task={task}
                        categoryColor={currentCfg.color}
                        categoryLight={currentCfg.colorLight}
                        categoryPale={currentCfg.colorPale}
                        categoryGradient={currentCfg.gradient}
                        onComplete={(id) => handleTaskDestroy(id, openQuadrant)}
                        onDelete={(id) => handleDeleteWithUndo(id)}
                        onTogglePin={handleTogglePin}
                        onToggleSubtask={handleToggleSubtask}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${currentCfg.colorPale}` }}>
                <button
                  onClick={() => setOpenQuadrant(null)}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: currentCfg.gradient }}
                >
                  {t('done_btn')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <UndoToast
        message={deletedTask ? `"${deletedTask.title}" deleted` : null}
        onUndo={handleUndoDelete}
        onDismiss={() => { setDeletedTask(null); setDeletedTaskIndex(-1); }}
      />
      <style>{`
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dashMove { to { stroke-dashoffset: -12; } }
        @keyframes prismFloat1 { 0%, 100% { transform: rotate(-12deg) translateY(0); } 50% { transform: rotate(-12deg) translateY(-20px); } }
        @keyframes prismFloat2 { 0%, 100% { transform: rotate(8deg) translateY(0); } 50% { transform: rotate(8deg) translateY(20px); } }
      `}</style>
    </div>
  );
};
