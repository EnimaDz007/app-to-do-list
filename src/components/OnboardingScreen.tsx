import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Flame, Mic, Target, Bell, ChevronRight,
  ChevronLeft, X, Check,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface OnboardingScreenProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
}

interface Slide {
  id: string;
  emoji: string;
  gradient: string;
  accent: string;
  title: string;
  subtitle: string;
  bullets: { emoji: string; text: string }[];
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    emoji: '🎯',
    gradient: 'from-violet-600 via-indigo-600 to-blue-700',
    accent: '#6366F1',
    title: 'Meet your priority engine',
    subtitle: 'Stop drowning in tasks. Start crushing what matters.',
    bullets: [
      { emoji: '⚡', text: 'Eisenhower matrix at the core' },
      { emoji: '📴', text: '100% offline — your data stays yours' },
      { emoji: '🔒', text: 'No accounts. No tracking. No cloud.' },
    ],
  },
  {
    id: 'matrix',
    emoji: '🎛️',
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accent: '#E11D48',
    title: 'The 4-quadrant method',
    subtitle: 'Every task gets sorted by urgency and importance.',
    bullets: [
      { emoji: '🔥', text: 'Do First — urgent + important' },
      { emoji: '📅', text: 'Schedule — important, not urgent' },
      { emoji: '👥', text: 'Delegate — urgent, not important' },
      { emoji: '🗑️', text: 'Eliminate — neither' },
    ],
  },
  {
    id: 'capture',
    emoji: '🎙️',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    accent: '#059669',
    title: 'Capture in 3 seconds',
    subtitle: 'Type or speak. Smart Parse handles the rest.',
    bullets: [
      { emoji: '🗣️', text: 'Say: "Report tomorrow 3pm urgent @work"' },
      { emoji: '⚡', text: 'Auto-detects: date, priority, quadrant, context' },
      { emoji: '🌍', text: 'Speaks English · Français · العربية' },
    ],
  },
  {
    id: 'progress',
    emoji: '✨',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    accent: '#F59E0B',
    title: 'Watch your progress grow',
    subtitle: 'Karma points, streaks, and levels — because showing up matters.',
    bullets: [
      { emoji: '🔥', text: 'Daily streaks for consistency' },
      { emoji: '✨', text: 'Karma points for every action' },
      { emoji: '🎯', text: 'Habit heatmaps + weekly reviews' },
      { emoji: '🏆', text: '8 levels from Beginner to Grandmaster' },
    ],
  },
  {
    id: 'ready',
    emoji: '🚀',
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-700',
    accent: '#A855F7',
    title: 'You\'re all set',
    subtitle: 'A few things we packed in for you:',
    bullets: [
      { emoji: '📱', text: 'Home screen widget with live status' },
      { emoji: '⏰', text: 'Native alarms + escalating nags' },
      { emoji: '🎨', text: '8 UI designs — pick your vibe' },
      { emoji: '🌅', text: 'Daily digest of what\'s due' },
    ],
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  isOpen,
  onComplete,
}) => {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  const handleNext = () => {
    triggerHaptic('medium');
    if (isLast) {
      onComplete();
    } else {
      setCurrent((i) => Math.min(i + 1, SLIDES.length - 1));
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    setCurrent((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    triggerHaptic('light');
    onComplete();
  };

  const handleDotClick = (index: number) => {
    triggerHaptic('light');
    setCurrent(index);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
        >
          {/* ═══ Top: skip button ═══ */}
          <div className="flex justify-end p-4 pt-6 shrink-0">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <span>Skip</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ═══ Middle: animated slide ═══ */}
          <div className="flex-1 min-h-0 flex flex-col px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                {/* Emoji hero */}
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 18,
                    delay: 0.1,
                  }}
                  className={`w-28 h-28 rounded-[32px] bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-2xl shadow-black/40 mb-8`}
                  style={{
                    boxShadow: `0 20px 60px ${slide.accent}55`,
                  }}
                >
                  <span className="text-5xl">{slide.emoji}</span>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-[28px] font-black text-white tracking-tight leading-tight mb-3 max-w-sm"
                >
                  {slide.title}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[14px] text-white/70 font-medium leading-relaxed mb-8 max-w-xs"
                >
                  {slide.subtitle}
                </motion.p>

                {/* Bullets */}
                <motion.ul
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3 max-w-sm w-full"
                >
                  {slide.bullets.map((bullet, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + idx * 0.08 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                        style={{ backgroundColor: `${slide.accent}30` }}
                      >
                        {bullet.emoji}
                      </div>
                      <span className="text-[13px] font-semibold text-white/90 leading-snug">
                        {bullet.text}
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ═══ Bottom: dots + nav ═══ */}
          <div className="shrink-0 px-6 pb-10 pt-6">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => handleDotClick(idx)}
                  className="transition-all cursor-pointer"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      idx === current
                        ? 'w-7 h-2 bg-white'
                        : idx < current
                        ? 'w-2 h-2 bg-white/60 hover:bg-white'
                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-3">
              {current > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition cursor-pointer shrink-0"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={handleNext}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition-all active:scale-[0.98] cursor-pointer bg-gradient-to-r ${slide.gradient}`}
                style={{
                  boxShadow: `0 12px 40px ${slide.accent}55`,
                }}
              >
                {isLast ? (
                  <>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    <span className="text-white">Let's start</span>
                  </>
                ) : (
                  <>
                    <span className="text-white">Continue</span>
                    <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                  </>
                )}
              </button>
            </div>

            {/* Tiny footer */}
            <p className="text-center text-[10px] text-white/40 mt-6 font-semibold uppercase tracking-widest">
              Task Priority · v1.0
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};