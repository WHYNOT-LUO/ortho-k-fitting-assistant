import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { zh, type MessageKey } from './zh';
import { en } from './en';

export type Lang = 'zh' | 'en';

const dictionaries: Record<Lang, Record<MessageKey, string>> = { zh, en };
const LANG_STORAGE_KEY = 'orthok.lang';

export type Params = Record<string, string | number>;

/** Look up a message and fill in {placeholders}. Pure, so it works outside React too. */
export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const template = dictionaries[lang][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Params) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // storage blocked: fall back to Chinese
  }
  return 'zh';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const t = (key: MessageKey, params?: Params) => translate(lang, key, params);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const value = useContext(LangContext);
  if (!value) throw new Error('useLang must be used inside <LangProvider>');
  return value;
}

export type { MessageKey };
