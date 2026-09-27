import { Toaster } from '@/components/ui/toast';
import type { Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { AppProviders } from './AppProviders';

// The page's one toast viewport, as its own island at the end of <body> (persisted across
// navigations). It must not live inside the header: the header's backdrop-filter makes it
// the containing block for `position: fixed`, which pinned toasts to the header's bottom
// edge instead of the screen's.

function Region() {
  const { t } = useTranslation();
  return <Toaster closeLabel={t('common.close')} />;
}

export function ToastRegion({ locale }: { locale: Locale }) {
  return (
    <AppProviders locale={locale}>
      <Region />
    </AppProviders>
  );
}
