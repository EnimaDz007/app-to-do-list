import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLanguage } from '../context/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language, isRTL } = useLanguage();

  if (isOnline) return null;

  const offlineText = isRTL
    ? 'وضع عدم الاتصال — يتم استخدام البيانات المحفوظة'
    : language === 'fr'
    ? 'Mode hors ligne — Données en cache utilisées'
    : 'Offline Mode — Cached data is being used';

  return (
    <div
      id="offline-indicator"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 text-slate-950 font-semibold px-3.5 py-1 text-xs shadow-lg backdrop-blur animate-pulse"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>{offlineText}</span>
    </div>
  );
};
