import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

interface AchievementPopupProps {
  achievement: Achievement | null;
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({ achievement }) => {
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl text-white"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899, #FBBF24)',
              boxShadow: '0 20px 60px rgba(124,58,237,0.6), 0 0 40px rgba(236,72,153,0.5), 0 0 0 4px rgba(255,255,255,0.3)',
            }}
          >
            <div className="text-3xl">{achievement.emoji}</div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[2px] opacity-90">
                Achievement Unlocked
              </div>
              <div className="text-sm font-extrabold mt-0.5">{achievement.title}</div>
              <div className="text-[10px] opacity-90 mt-0.5">{achievement.description}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
