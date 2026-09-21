import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-4 right-4 z-[9998] mx-auto max-w-md"
        >
          <div
            className="flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-white"
            style={{
              background: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-sm font-semibold truncate">{message}</span>
            <button
              onClick={onUndo}
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-extrabold tracking-wide transition-colors hover:bg-white/20 active:scale-95"
            >
              UNDO
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
