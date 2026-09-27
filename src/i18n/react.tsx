import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createT, INTL_LOCALES, type Locale, type TFunction } from './index';

interface LocaleContextValue {
  locale: Locale;
  intlLocale: string;
  t: TFunction;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, intlLocale: INTL_LOCALES[locale], t: createT(locale) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useTranslation must be used inside <LocaleProvider>');
  return value;
}
