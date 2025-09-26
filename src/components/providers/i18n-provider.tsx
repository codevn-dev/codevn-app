'use client';

import { createContext, useContext, useMemo, useRef, useEffect } from 'react';
import { useI18nStore, type Locale } from '@/stores/i18n-store';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // Sync store with initialLocale synchronously ONLY once on first render
  const hasInitializedRef = useRef(false);
  if (!hasInitializedRef.current && initialLocale) {
    useI18nStore.setState({ locale: initialLocale });
    hasInitializedRef.current = true;
  }

  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const translate = useI18nStore((s) => s.t);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: translate }),
    [locale, setLocale, translate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
