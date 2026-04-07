"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  type Locale,
  type TranslationKey,
  translate,
  getSavedLocale,
  saveLocale,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = getSavedLocale();
    setLocaleState(saved);
    // Sync localStorage value to cookie so server components stay in sync
    saveLocale(saved);
    // Correct the html lang attribute in case it differs from the saved locale
    document.documentElement.lang = saved;
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    saveLocale(next);
    document.documentElement.lang = next;
    // Re-fetch server components so they render in the new locale.
    // The cookie is already set by saveLocale above, so the server
    // will read the correct locale on the next render pass.
    router.refresh();
  }, [router]);

  const t = useCallback(
    (key: TranslationKey | string, vars?: Record<string, string | number>) =>
      translate(mounted ? locale : "en", key, vars),
    [locale, mounted]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
