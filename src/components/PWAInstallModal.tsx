import React from 'react';
import { Download, Share2, PlusSquare, CheckCircle2, X, Smartphone, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  return (
    <div id="pwa-install-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div id="pwa-install-modal" className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-6 shadow-2xl text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('pwa_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('pwa_subtitle')}</p>
            </div>
          </div>
          <button
            id="btn-close-install-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label={t('pwa_dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 space-y-2">
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">{t('pwa_benefits_title')}</div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>{t('pwa_benefit_1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>{t('pwa_benefit_2')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>{t('pwa_benefit_3')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>{t('pwa_benefit_4')}</span>
              </li>
            </ul>
          </div>

          {/* Conditional platform flow */}
          {isIOS ? (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{t('pwa_ios_instructions_title')}</span>
              </div>
              <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>{t('pwa_ios_step_1')}</li>
                <li>{t('pwa_ios_step_2')}</li>
                <li>{t('pwa_ios_step_3')}</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              {isInstallable ? (
                <button
                  id="btn-trigger-pwa-install"
                  onClick={async () => {
                    await install();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {t('pwa_btn_install_now')}
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Android & Desktop Chrome / Edge</span>
                  </div>
                  <p className="leading-relaxed">
                    {t('pwa_android_instructions')}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('pwa_footer_notice')}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              {t('pwa_footer_link')} <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </div>

        <button
          id="btn-close-modal-footer"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
        >
          {t('pwa_dismiss')}
        </button>
      </div>
    </div>
  );
};
