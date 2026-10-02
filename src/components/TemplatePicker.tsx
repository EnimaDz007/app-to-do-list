import React, { useMemo, useState } from 'react';
import { X, LayoutTemplate, Search, Trash2 } from 'lucide-react';
import type { Template } from '../types';
import { countTemplateSubtasks } from '../utils/templateHelpers';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onPick: (template: Template) => void;
  onDelete?: (templateId: string) => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  builtIn: string;
  noMatch: string;
  noTemplates: string;
  noTemplatesHint: string;
  deleteConfirm: string;   // {name}
  deleteTitle: string;
  closeAria: string;
  footer: string;
  itemSingular: string;    // {count} item
  itemPlural: string;      // {count} items
  categories: Record<string, string>;
}> = {
  en: {
    title: 'Use a Template',
    subtitle: 'Pre-built task with checklist',
    searchPlaceholder: 'Search templates…',
    builtIn: 'BUILT-IN',
    noMatch: 'No templates match your search',
    noTemplates: 'No templates yet',
    noTemplatesHint: 'Save any task as a template from the task card menu to reuse it later.',
    deleteConfirm: 'Delete template "{name}"?',
    deleteTitle: 'Delete template',
    closeAria: 'Close template picker',
    footer: 'Picking a template fills the form — you can still edit everything before saving.',
    itemSingular: '{count} item',
    itemPlural: '{count} items',
    categories: {
      Personal: 'Personal',
      Product: 'Product',
      Engineering: 'Engineering',
      Operations: 'Operations',
      Design: 'Design',
      Client: 'Client',
      Marketing: 'Marketing',
    },
  },
  fr: {
    title: 'Utiliser un modèle',
    subtitle: 'Tâche pré-construite avec checklist',
    searchPlaceholder: 'Rechercher des modèles…',
    builtIn: 'INTÉGRÉ',
    noMatch: 'Aucun modèle ne correspond',
    noTemplates: 'Aucun modèle',
    noTemplatesHint: 'Enregistrez une tâche comme modèle depuis le menu de la carte pour la réutiliser.',
    deleteConfirm: 'Supprimer le modèle « {name} » ?',
    deleteTitle: 'Supprimer le modèle',
    closeAria: 'Fermer le sélecteur de modèles',
    footer: 'Choisir un modèle remplit le formulaire — tout reste modifiable avant sauvegarde.',
    itemSingular: '{count} élément',
    itemPlural: '{count} éléments',
    categories: {
      Personal: 'Personnel',
      Product: 'Produit',
      Engineering: 'Ingénierie',
      Operations: 'Opérations',
      Design: 'Design',
      Client: 'Client',
      Marketing: 'Marketing',
    },
  },
  ar: {
    title: 'استخدم قالباً',
    subtitle: 'مهمة جاهزة مع قائمة مهام',
    searchPlaceholder: 'ابحث في القوالب…',
    builtIn: 'مدمج',
    noMatch: 'لا توجد قوالب مطابقة',
    noTemplates: 'لا توجد قوالب بعد',
    noTemplatesHint: 'احفظ أي مهمة كقالب من قائمة البطاقة لإعادة استخدامها لاحقاً.',
    deleteConfirm: 'حذف القالب "{name}"؟',
    deleteTitle: 'حذف القالب',
    closeAria: 'إغلاق منتقي القوالب',
    footer: 'اختيار قالب يملأ النموذج — يمكنك تعديل كل شيء قبل الحفظ.',
    itemSingular: 'عنصر واحد',
    itemPlural: '{count} عنصراً',
    categories: {
      Personal: 'شخصي',
      Product: 'منتج',
      Engineering: 'هندسة',
      Operations: 'عمليات',
      Design: 'تصميم',
      Client: 'عملاء',
      Marketing: 'تسويق',
    },
  },
};

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  isOpen,
  onClose,
  templates,
  onPick,
  onDelete,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
    );
  }, [templates, query]);

  if (!isOpen) return null;

  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                {copy.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label={copy.closeAria}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="relative">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition`}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-30">📋</div>
              <p className="text-xs text-slate-400 italic">
                {query ? copy.noMatch : copy.noTemplates}
              </p>
              {!query && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                  {copy.noTemplatesHint}
                </p>
              )}
            </div>
          ) : (
            filtered.map((tpl) => {
              const count = countTemplateSubtasks(tpl.subtasks);
              const itemsLabel = count === 1
                ? copy.itemSingular.replace('{count}', String(count))
                : copy.itemPlural.replace('{count}', String(count));
              const catLabel = tpl.preset.category
                ? (copy.categories[tpl.preset.category] ?? tpl.preset.category)
                : null;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    triggerHaptic('success');
                    onPick(tpl);
                    onClose();
                  }}
                  className="group relative flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    {tpl.emoji}
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tpl.name}
                      </span>
                      {tpl.isBuiltIn && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold shrink-0">
                          {copy.builtIn}
                        </span>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      {catLabel && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {catLabel}
                        </span>
                      )}
                      {count > 0 && (
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          📋 {itemsLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {!tpl.isBuiltIn && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('heavy');
                        if (window.confirm(copy.deleteConfirm.replace('{name}', tpl.name))) {
                          onDelete(tpl.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                      title={copy.deleteTitle}
                      aria-label={copy.deleteTitle}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
              {copy.footer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};