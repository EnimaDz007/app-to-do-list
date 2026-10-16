import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

interface UndoToastProps {
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  onUndo,
  onDismiss,
  duration = 4000,
}) => {
  // Haptic on appearance
  useEffect(() => {
    if (!message) return;
    triggerHaptic('light');
  }, [message]);

  // Auto-dismiss
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  const handleUndo = () => {
    triggerHaptic('success');
    onUndo();
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-40 sm:bottom-24 left-4 right-4 z-[9998] mx-auto max-w-md"
          role="status"
          aria-live="polite"
        >
          <div
            className="relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-white"
            style={{
              background: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-sm font-semibold truncate">{message}</span>
            <button
              onClick={handleUndo}
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-extrabold tracking-wide transition-colors hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              UNDO
            </button>

            {/* Progress bar — tells the user how long they have */}
            <motion.div
              key={message}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-0.5 origin-left bg-white/40"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};