import { LayoutGridIcon, ShoppingBagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toast';
import { WithTooltip } from '@/components/ui/tooltip';
import type { Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import type { Theme } from '@/lib/preferences';
import { AccountMenu } from './AccountMenu';
import { AppProviders } from './AppProviders';
import { CartBadge } from './CartCount';
import { Logo } from './Logo';
import { PreferencesMenu } from './PreferencesMenu';
import { SearchBar } from './SearchBar';
import type { SessionUser } from './types';

interface HeaderProps {
  locale: Locale;
  theme: Theme;
  user: SessionUser | null;
  /** Current path + search, for `?next=` on the sign-in links. */
  currentPath: string;
  /** Current `?q=` on the search page, empty elsewhere. */
  query: string;
  /** A cart can exist (signed in or `cart_token` cookie): only then fetch the count. */
  hasCart: boolean;
}

/**
 * Sticky site header. Rendered with `transition:persist`, so it stays mounted across
 * ClientRouter navigations and receives new props: never seed state from props
 * expecting a per-page reset — key the child by the prop instead (see SearchBar).
 */
export function Header({ locale, ...props }: HeaderProps) {
  return (
    <AppProviders locale={locale}>
      <HeaderContent {...props} />
    </AppProviders>
  );
}

function HeaderContent({ theme, user, currentPath, query, hasCart }: Omit<HeaderProps, 'locale'>) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 md:h-[4.5rem]">
        <a
          href="/"
          className="flex shrink-0 items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={t('nav.home')}
        >
          <Logo className="h-8" />
        </a>

        <Button asChild variant="accent" className="hidden h-11 rounded-full px-5 md:inline-flex">
          <a href="/catalog">
            <LayoutGridIcon aria-hidden="true" />
            {t('header.catalogButton')}
          </a>
        </Button>

        <SearchBar key={query} defaultQuery={query} />

        <div className="flex shrink-0 items-center gap-0.5">
          <PreferencesMenu theme={theme} />
          <div className="hidden items-center gap-0.5 md:flex">
            <AccountMenu user={user} currentPath={currentPath} />
            <WithTooltip label={t('header.cartLabel')}>
              <Button asChild variant="ghost" size="icon" className="relative">
                <a href="/cart">
                  <ShoppingBagIcon aria-hidden="true" />
                  <span className="sr-only">{t('header.cartLabel')}</span>
                  <CartBadge hasCart={hasCart} />
                </a>
              </Button>
            </WithTooltip>
          </div>
        </div>
      </div>
      <Toaster closeLabel={t('common.close')} />
    </header>
  );
}
