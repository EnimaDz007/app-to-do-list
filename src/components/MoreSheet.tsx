import React from 'react';
import { X, BarChart3, Star, Archive, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabView } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  title: string;
  items: {
    analytics: { title: string; desc: string };
    review: { title: string; desc: string };
    archive: { title: string; desc: string };
    export: { title: string; desc: string };
  };
}> = {
  en: {
    title: 'More',
    items: {
      analytics: { title: 'Analytics', desc: 'Your productivity trends' },
      review: { title: 'Weekly Review', desc: 'This week at a glance' },
      archive: { title: 'Archive', desc: 'Completed & archived tasks' },
      export: { title: 'Diagnostics', desc: 'App status, backups & tools' },
    },
  },
  fr: {
    title: 'Plus',
    items: {
      analytics: { title: 'Analyses', desc: 'Vos tendances de productivité' },
      review: { title: 'Revue hebdo', desc: 'Cette semaine en un coup d’œil' },
      archive: { title: 'Archives', desc: 'Tâches terminées et archivées' },
      export: { title: 'Diagnostics', desc: 'État, sauvegardes et outils' },
    },
  },
  ar: {
    title: 'المزيد',
    items: {
      analytics: { title: 'التحليلات', desc: 'اتجاهات إنتاجيتك' },
      review: { title: 'المراجعة الأسبوعية', desc: 'هذا الأسبوع في لمحة' },
      archive: { title: 'الأرشيف', desc: 'المهام المكتملة والمؤرشفة' },
      export: { title: 'التشخيص', desc: 'حالة التطبيق والنسخ والأدوات' },
    },
  },
};

export const MoreSheet: React.FC<MoreSheetProps> = ({ isOpen, onClose, activeTab, onSelectTab }) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const items: { id: TabView; title: string; desc: string; Icon: React.ComponentType<{ className?: string }>; bg: string; color: string }[] = [
    { id: 'analytics', title: copy.items.analytics.title, desc: copy.items.analytics.desc, Icon: BarChart3, bg: 'bg-indigo-100 dark:bg-indigo-950/60', color: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'review',    title: copy.items.review.title,    desc: copy.items.review.desc,    Icon: Star,      bg: 'bg-violet-100 dark:bg-violet-950/60', color: 'text-violet-600 dark:text-violet-400' },
    { id: 'archive',   title: copy.items.archive.title,   desc: copy.items.archive.desc,   Icon: Archive,   bg: 'bg-slate-100 dark:bg-slate-800',       color: 'text-slate-600 dark:text-slate-300' },
    { id: 'export',    title: copy.items.export.title,    desc: copy.items.export.desc,    Icon: Activity,  bg: 'bg-emerald-100 dark:bg-emerald-950/60', color: 'text-emerald-600 dark:text-emerald-400' },
  ];

  const handleSelect = (id: TabView) => {
    triggerHaptic('medium');
    onSelectTab(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 pt-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {copy.title}
              </h2>
              <div className="w-8" />
            </div>

            {/* Items */}
            <div className="p-4 space-y-2.5 overflow-y-auto">
              {items.map(({ id, title, desc, Icon, bg, color }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelect(id)}
                    className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all cursor-pointer text-left rtl:text-right ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        {title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {desc}
                      </div>
                    </div>
                    <div className={`w-11 h-11 shrink-0 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Safe area spacer */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};