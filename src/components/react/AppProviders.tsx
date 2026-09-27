import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Locale } from '@/i18n';
import { LocaleProvider } from '@/i18n/react';
import { queryClient } from '@/lib/api/queryClient';

/**
 * Every island's root wraps itself in this. The QueryClient is a module singleton, so
 * all islands share one cache that survives ClientRouter navigations.
 */
export function AppProviders({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider locale={locale}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
