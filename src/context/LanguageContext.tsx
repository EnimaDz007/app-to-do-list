import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TranslationKey, translations, SUPPORTED_LANGUAGES, LanguageOption } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('taskflow_language');
      if (saved === 'en' || saved === 'fr' || saved === 'ar') {
        return saved;
      }
      // Check browser preferences
      const navLang = navigator.language.slice(0, 2);
      if (navLang === 'fr') return 'fr';
      if (navLang === 'ar') return 'ar';
    } catch {
      // ignore
    }
    return 'en';
  });

  const isRTL = language === 'ar';
  const dir: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    try {
      localStorage.setItem('taskflow_language', language);
    } catch {
      // ignore
    }

    const html = document.documentElement;
    html.setAttribute('lang', language);
    html.setAttribute('dir', dir);
  }, [language, dir]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.en;
    let str: string = (langDict as Record<string, string>)[key] || (translations.en as Record<string, string>)[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return str;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL,
        dir,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        let str: string = (translations.en as Record<string, string>)[key] || key;
        if (params) {
          Object.entries(params).forEach(([paramKey, paramVal]) => {
            str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
          });
        }
        return str;
      },
      isRTL: false,
      dir: 'ltr',
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
