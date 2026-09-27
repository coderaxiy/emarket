import { SearchIcon } from 'lucide-react';
import { navigate } from 'astro:transitions/client';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from '@/i18n/react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  /** The current `?q=`. The header keys this component by it, so it resets per page. */
  defaultQuery: string;
  className?: string;
}

export function SearchBar({ defaultQuery, className }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(defaultQuery);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    void navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn('relative flex min-w-0 flex-1', className)}>
      <label htmlFor="site-search" className="sr-only">
        {t('header.searchLabel')}
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('header.searchPlaceholder')}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full min-w-0 rounded-full border-2 border-primary/70 bg-card pr-14 pl-4 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label={t('header.searchSubmit')}
        className="absolute top-1 right-1 bottom-1 inline-flex w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
      >
        <SearchIcon className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
