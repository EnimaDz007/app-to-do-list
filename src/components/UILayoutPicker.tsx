import React from 'react';
import { X, LayoutGrid, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIDesign, UI_DESIGNS, UIDesign } from '../hooks/useUIDesign';
import { triggerThemeTransition } from '../hooks/useThemeTransition';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface UILayoutPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

interface DesignCopy {
  name: string;
  desc: string;
}

interface PickerCopy {
  title: string;
  subtitle: string;
  close: string;
  designs: Record<UIDesign, DesignCopy>;
}

const COPY: Record<LocalLang, PickerCopy> = {
  en: {
    title: 'UI Layout',
    subtitle: 'Pick your Matrix view style',
    close: 'Close layout picker',
    designs: {
      binder:     { name: 'Leather Binder',    desc: 'Brass & leather' },
      classic:    { name: 'Classic Matrix',    desc: 'Your current layout' },
      neumorphic: { name: 'Soft Neumorphic',   desc: 'Pillow shadows' },
      stacked:    { name: 'Stacked Cards',     desc: '3D layered depth' },
      radial:     { name: 'Circular Radial',   desc: 'Orbit layout' },
      tarot:      { name: 'Tarot Cards',       desc: 'Swipe to decide' },
      hive:       { name: 'Honeycomb Hive',    desc: 'Hex grid + bees' },
      vending:    { name: 'Vending Machine',   desc: 'Arcade dispenser' },
      detective:  { name: 'Detective Board',   desc: 'Cork + red strings' },
      kanban:     { name: 'Priority Board',    desc: 'Drag between quadrants' },
    },
  },
  fr: {
    title: 'Disposition',
    subtitle: 'Choisissez votre style de matrice',
    close: 'Fermer le sélecteur',
    designs: {
      binder:     { name: 'Classeur cuir',     desc: 'Laiton et cuir' },
      classic:    { name: 'Matrice classique', desc: 'Disposition actuelle' },
      neumorphic: { name: 'Néomorphique doux', desc: 'Ombres en coussin' },
      stacked:    { name: 'Cartes empilées',   desc: 'Profondeur 3D' },
      radial:     { name: 'Radial circulaire', desc: 'Disposition orbite' },
      tarot:      { name: 'Cartes Tarot',      desc: 'Glissez pour décider' },
      hive:       { name: 'Ruche alvéolée',    desc: 'Grille hexagonale' },
      vending:    { name: 'Distributeur',      desc: 'Distributeur arcade' },
      detective:  { name: 'Tableau enquête',   desc: 'Liège et ficelles rouges' },
      kanban:     { name: 'Tableau priorités', desc: 'Glissez entre quadrants' },
    },
  },
  ar: {
    title: 'تخطيط الواجهة',
    subtitle: 'اختر نمط عرض المصفوفة',
    close: 'إغلاق منتقي التخطيط',
    designs: {
      binder:     { name: 'مجلد جلدي',           desc: 'نحاس وجلد' },
      classic:    { name: 'المصفوفة الكلاسيكية', desc: 'تخطيطك الحالي' },
      neumorphic: { name: 'نيومورفي ناعم',        desc: 'ظلال وسائدية' },
      stacked:    { name: 'بطاقات متراكمة',        desc: 'عمق ثلاثي الأبعاد' },
      radial:     { name: 'دائري شعاعي',           desc: 'تخطيط مداري' },
      tarot:      { name: 'بطاقات التارو',         desc: 'اسحب للاختيار' },
      hive:       { name: 'خلية النحل',            desc: 'شبكة سداسية مع نحل' },
      vending:    { name: 'آلة البيع',             desc: 'موزّع أركيد' },
      detective:  { name: 'لوح التحقيق',           desc: 'فلين وخيوط حمراء' },
      kanban:     { name: 'لوح الأولويات',         desc: 'اسحب بين الأرباع' },
    },
  },
};

export const UILayoutPicker: React.FC<UILayoutPickerProps> = ({ isOpen, onClose }) => {
  const { uiDesign } = useUIDesign();
  const { language } = useLanguage();

  if (!isOpen) return null;

  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const handleSelect = (id: UIDesign) => {
    triggerHaptic('success');
    // Persist immediately. The transition overlay applies the theme at the PEAK of its
    // animation (~1.5s later) and only writes storage then — so a user who closed the
    // app inside that window would lose their choice. Writing here closes that gap.
    try { localStorage.setItem('taskflow_ui_design', id); } catch { /* storage blocked */ }
    // Trigger the themed transition — it applies the design at the peak
    // of the animation and clears itself when done.
    triggerThemeTransition(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[61] w-[92%] max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {copy.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {copy.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label={copy.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {UI_DESIGNS.map((design) => {
                const isSelected = uiDesign === design.id;
                const local = copy.designs[design.id];
                const name = local?.name ?? design.name;
                const desc = local?.desc ?? design.desc;
                return (
                  <button
                    key={design.id}
                    onClick={() => handleSelect(design.id)}
                    className={`relative flex items-center gap-2.5 rounded-xl p-2.5 transition text-left rtl:text-right cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 ring-2 ring-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`text-xl flex-shrink-0 w-8 text-center ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    >
                      {design.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[11px] font-bold truncate ${
                          isSelected
                            ? 'text-indigo-900 dark:text-indigo-200'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {name}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                        {desc}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};