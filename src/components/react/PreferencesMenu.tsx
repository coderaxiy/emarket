import { LanguagesIcon, MonitorIcon, MoonIcon, Settings2Icon, SunIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WithTooltip } from '@/components/ui/tooltip';
import { isLocale, LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { applyTheme, isTheme, setPreferenceCookie, THEMES, type Theme } from '@/lib/preferences';

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const;

export function PreferencesMenu({ theme: serverTheme }: { theme: Theme }) {
  const { t, locale } = useTranslation();
  // Theme changes apply without a reload, so the island owns it after first render.
  // (The header is persisted: this state intentionally survives navigations.)
  const [theme, setTheme] = useState<Theme>(serverTheme);

  function onThemeChange(value: string) {
    if (!isTheme(value)) return;
    applyTheme(value);
    setTheme(value);
  }

  function onLocaleChange(value: string) {
    if (!isLocale(value) || value === locale) return;
    setPreferenceCookie(LOCALE_COOKIE, value);
    // Hard reload so every island and all server-rendered text agree.
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <WithTooltip label={t('header.settings')}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('header.settings')}>
            <Settings2Icon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
      </WithTooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <LanguagesIcon className="size-3.5" aria-hidden="true" />
          {t('locale.label')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={onLocaleChange}>
          {LOCALES.map((code: Locale) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {LOCALE_NAMES[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={onThemeChange}>
          {THEMES.map((value) => {
            const Icon = THEME_ICONS[value];
            return (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon aria-hidden="true" />
                {t(`theme.${value}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
