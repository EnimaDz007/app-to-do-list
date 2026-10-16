import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLanguage } from '../context/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language, isRTL } = useLanguage();

  const offlineText = isRTL
    ? 'وضع عدم الاتصال — يتم استخدام البيانات المحفوظة'
    : language === 'fr'
    ? 'Mode hors ligne — Données en cache utilisées'
    : 'Offline Mode — Cached data is being used';

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          id="offline-indicator"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-2 rounded-full bg-amber-500/95 text-slate-950 font-semibold px-3.5 py-1.5 text-xs shadow-lg backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span className="whitespace-nowrap">{offlineText}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};