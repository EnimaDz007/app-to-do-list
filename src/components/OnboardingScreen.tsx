import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface OnboardingScreenProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
}

type LocalLang = 'en' | 'fr' | 'ar';

interface SlideDef {
  id: string;
  emoji: string;
  gradient: string;
  accent: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  bullets: { emoji: string; textKey: TranslationKey }[];
}

const SLIDES: SlideDef[] = [
  {
    id: 'welcome',
    emoji: '🎯',
    gradient: 'from-violet-600 via-indigo-600 to-blue-700',
    accent: '#6366F1',
    titleKey: 'onboard_s1_title' as TranslationKey,
    subtitleKey: 'onboard_s1_subtitle' as TranslationKey,
    bullets: [
      { emoji: '⚡', textKey: 'onboard_s1_b1' as TranslationKey },
      { emoji: '📴', textKey: 'onboard_s1_b2' as TranslationKey },
      { emoji: '🔒', textKey: 'onboard_s1_b3' as TranslationKey },
    ],
  },
  {
    id: 'matrix',
    emoji: '🎛️',
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accent: '#E11D48',
    titleKey: 'onboard_s2_title' as TranslationKey,
    subtitleKey: 'onboard_s2_subtitle' as TranslationKey,
    bullets: [
      { emoji: '🔥', textKey: 'onboard_s2_b1' as TranslationKey },
      { emoji: '📅', textKey: 'onboard_s2_b2' as TranslationKey },
      { emoji: '👥', textKey: 'onboard_s2_b3' as TranslationKey },
      { emoji: '🗑️', textKey: 'onboard_s2_b4' as TranslationKey },
    ],
  },
  {
    id: 'capture',
    emoji: '🎙️',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    accent: '#059669',
    titleKey: 'onboard_s3_title' as TranslationKey,
    subtitleKey: 'onboard_s3_subtitle' as TranslationKey,
    bullets: [
      { emoji: '🗣️', textKey: 'onboard_s3_b1' as TranslationKey },
      { emoji: '⚡', textKey: 'onboard_s3_b2' as TranslationKey },
      { emoji: '🌍', textKey: 'onboard_s3_b3' as TranslationKey },
    ],
  },
  {
    id: 'progress',
    emoji: '✨',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    accent: '#F59E0B',
    titleKey: 'onboard_s4_title' as TranslationKey,
    subtitleKey: 'onboard_s4_subtitle' as TranslationKey,
    bullets: [
      { emoji: '🔥', textKey: 'onboard_s4_b1' as TranslationKey },
      { emoji: '✨', textKey: 'onboard_s4_b2' as TranslationKey },
      { emoji: '🎯', textKey: 'onboard_s4_b3' as TranslationKey },
      { emoji: '🏆', textKey: 'onboard_s4_b4' as TranslationKey },
    ],
  },
  {
    id: 'ready',
    emoji: '🚀',
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-700',
    accent: '#A855F7',
    titleKey: 'onboard_s5_title' as TranslationKey,
    subtitleKey: 'onboard_s5_subtitle' as TranslationKey,
    bullets: [
      { emoji: '📱', textKey: 'onboard_s5_b1' as TranslationKey },
      { emoji: '⏰', textKey: 'onboard_s5_b2' as TranslationKey },
      { emoji: '🎨', textKey: 'onboard_s5_b3' as TranslationKey },
      { emoji: '🌅', textKey: 'onboard_s5_b4' as TranslationKey },
    ],
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  isOpen,
  onComplete,
}) => {
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const isRtl = lang === 'ar';

  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  const handleNext = () => {
    triggerHaptic('medium');
    if (isLast) onComplete();
    else setCurrent((i) => Math.min(i + 1, SLIDES.length - 1));
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

  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          dir={isRtl ? 'rtl' : 'ltr'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
        >
          <div className="flex justify-end p-4 pt-6 shrink-0">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <span>{t('onboard_skip' as TranslationKey)}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, x: isRtl ? -30 : 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: isRtl ? 30 : -30, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                  className={`w-28 h-28 rounded-[32px] bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-2xl shadow-black/40 mb-8`}
                  style={{ boxShadow: `0 20px 60px ${slide.accent}55` }}
                >
                  <span className="text-5xl">{slide.emoji}</span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-[28px] font-black text-white tracking-tight leading-tight mb-3 max-w-sm"
                >
                  {t(slide.titleKey)}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[14px] text-white/70 font-medium leading-relaxed mb-8 max-w-xs"
                >
                  {t(slide.subtitleKey)}
                </motion.p>

                <motion.ul
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3 max-w-sm w-full"
                >
                  {slide.bullets.map((bullet, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + idx * 0.08 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-start"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                        style={{ backgroundColor: `${slide.accent}30` }}
                      >
                        {bullet.emoji}
                      </div>
                      <span className="text-[13px] font-semibold text-white/90 leading-snug">
                        {t(bullet.textKey)}
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 px-6 pb-10 pt-6">
            <div className="flex items-center justify-center gap-2 mb-8">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => handleDotClick(idx)}
                  className="transition-all cursor-pointer"
                  aria-label={t('onboard_slide_aria' as TranslationKey, { n: idx + 1 })}
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

            <div className="flex items-center gap-3">
              {current > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition cursor-pointer shrink-0"
                  aria-label={t('onboard_prev' as TranslationKey)}
                >
                  <BackIcon className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={handleNext}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition-all active:scale-[0.98] cursor-pointer bg-gradient-to-r ${slide.gradient}`}
                style={{ boxShadow: `0 12px 40px ${slide.accent}55` }}
              >
                {isLast ? (
                  <>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    <span className="text-white">{t('onboard_start' as TranslationKey)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-white">{t('onboard_continue' as TranslationKey)}</span>
                    <NextIcon className="w-5 h-5 text-white" strokeWidth={3} />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-white/40 mt-6 font-semibold uppercase tracking-widest">
              {t('onboard_footer' as TranslationKey)}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};