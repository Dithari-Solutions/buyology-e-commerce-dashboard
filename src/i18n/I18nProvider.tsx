import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { messages, SUPPORTED_LANGS, type Lang } from "./messages";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = "buyology.dashboard.lang";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGS as string[]).includes(stored)) return stored as Lang;
  const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
  if ((SUPPORTED_LANGS as string[]).includes(browser)) return browser as Lang;
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    // Mirror dir on <html> so RTL layouts kick in for Arabic.
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", next);
      document.documentElement.setAttribute("dir", next === "ar" ? "rtl" : "ltr");
    }
  }, []);

  // Apply on mount.
  useEffect(() => {
    setLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = messages[lang] ?? messages.en;
      return dict[key] ?? messages.en[key] ?? fallback ?? key;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): (key: string, fallback?: string) => string {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback so components imported in tests/storyless contexts don't crash.
    return (key: string, fallback?: string) => fallback ?? key;
  }
  return ctx.t;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
