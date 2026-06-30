import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, type Lang } from './translations';

interface LangCtx {
  lang: Lang;
  t: (key: string) => string;
  tr: (name: string) => string;
  toggleLang: () => void;
}

const Ctx = createContext<LangCtx>({ lang: 'zh', t: () => '', tr: (n: string) => n, toggleLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');

  const t = useCallback((key: string): string => {
    if (!translations[key]) return key;
    return translations[key][lang];
  }, [lang]);

  // Translate region name — tries 'region.<name>' key, falls back to original
  const tr = useCallback((name: string): string => {
    const key = `region.${name}`;
    if (!translations[key]) return name;
    return translations[key][lang];
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'zh' ? 'en' : 'zh');
  }, []);

  return (
    <Ctx.Provider value={{ lang, t, tr, toggleLang }}>
      {children}
    </Ctx.Provider>
  );
}

export function useT() {
  const { t, tr, lang, toggleLang } = useContext(Ctx);
  return { t, tr, lang, toggleLang };
}
