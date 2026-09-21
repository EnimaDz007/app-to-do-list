import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingActionButtonProps {
  onNewTask: () => void;
  onPushToTalk: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onNewTask,
  onPushToTalk,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const closeAndRun = (action: () => void) => {
    setIsOpen(false);
    setTimeout(action, 150);
  };

  return (
    <>
      {/* Dark backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">

        {/* Push to Talk action */}
        <AnimatePresence>
          {isOpen && (
            <motion.button
              key="ptt"
              initial={{ opacity: 0, y: 20, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => closeAndRun(onPushToTalk)}
              className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(244,63,94,0.45)] active:scale-95"
            >
              <Mic size={18} strokeWidth={2.5} />
              <span className="whitespace-nowrap">{t('ptt_btn_title')}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* New Task action */}
        <AnimatePresence>
          {isOpen && (
            <motion.button
              key="new-task"
              initial={{ opacity: 0, y: 20, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }}
              onClick={() => closeAndRun(onNewTask)}
              className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(99,102,241,0.45)] active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              <span className="whitespace-nowrap">{t('btn_new_task')}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Main FAB button (+ that rotates to ×) */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white shadow-[0_8px_24px_rgba(99,102,241,0.5)] ring-4 ring-white/20"
        >
          <Plus size={26} strokeWidth={2.5} />
        </motion.button>
      </div>
    </>
  );
};
