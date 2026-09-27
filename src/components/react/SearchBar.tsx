import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FolderIcon, ImageIcon, SearchIcon } from 'lucide-react';
import { navigate } from 'astro:transitions/client';
import { useId, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/i18n/react';
import {
  CATEGORY_TREE_QUERY_KEY,
  CATEGORY_TREE_STALE_MS,
  fetchCategoryTreeClient,
  fetchProductSuggestions,
} from '@/lib/api/catalog';
import type { CategoryNodeRead, ProductCardRead } from '@/lib/api/types';
import { categoryName } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

// The header search pill with suggestions (ARIA combobox): matching categories from the
// cached tree, a few products from `GET /products?q=`, and "Search for …". Submitting
// still goes to /search, so it works before hydration and without suggestions.

interface SearchBarProps {
  /** The current `?q=`. The header keys this component by it, so it resets per page. */
  defaultQuery: string;
  className?: string;
}

const MIN_CHARS = 2;
const MAX_PRODUCTS = 5;
const MAX_CATEGORIES = 3;

type Suggestion =
  | { kind: 'category'; category: CategoryNodeRead; href: string }
  | { kind: 'product'; product: ProductCardRead; href: string }
  | { kind: 'search'; href: string };

function flatten(tree: readonly CategoryNodeRead[]): CategoryNodeRead[] {
  return tree.flatMap((node) => [node, ...flatten(node.children)]);
}

const searchHref = (q: string) => (q ? `/search?q=${encodeURIComponent(q)}` : '/search');

export function SearchBar({ defaultQuery, className }: SearchBarProps) {
  const { t, locale, intlLocale } = useTranslation();
  const id = useId();
  const listId = `${id}-suggestions`;
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const q = query.trim();
  const debounced = useDebouncedValue(q, 250);
  const wanted = open && debounced.length >= MIN_CHARS;

  const products = useQuery({
    queryKey: ['search-suggestions', debounced],
    queryFn: ({ signal }) => fetchProductSuggestions(debounced, MAX_PRODUCTS, signal),
    enabled: wanted,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const tree = useQuery({
    queryKey: CATEGORY_TREE_QUERY_KEY,
    queryFn: fetchCategoryTreeClient,
    staleTime: CATEGORY_TREE_STALE_MS,
    enabled: wanted,
  });

  const needle = debounced.toLocaleLowerCase();
  const categories = wanted
    ? flatten(tree.data ?? [])
        .filter((node) => node.product_count > 0)
        .filter((node) => [node.slug, ...node.translations.map((entry) => entry.name)].some((text) => text.toLocaleLowerCase().includes(needle)))
        .slice(0, MAX_CATEGORIES)
    : [];

  const suggestions: Suggestion[] = wanted
    ? [
        ...categories.map((category): Suggestion => ({ kind: 'category', category, href: `/catalog/${encodeURIComponent(category.slug)}` })),
        ...(products.data ?? []).map(
          (product): Suggestion => ({
            kind: 'product',
            product,
            href: `/shops/${encodeURIComponent(product.shop.slug)}/${encodeURIComponent(product.slug)}`,
          }),
        ),
        { kind: 'search', href: searchHref(debounced) },
      ]
    : [];
  const showList = open && suggestions.length > 0;

  function go(href: string) {
    setOpen(false);
    setActiveIndex(-1);
    void navigate(href);
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = suggestions[activeIndex];
    go(showList && active ? active.href : searchHref(q));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      // A search input clears itself on Escape by default; here Escape only closes the list.
      if (showList) event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setOpen(true);
    if (suggestions.length === 0) return;
    // -1 is the input itself: Down from the last option wraps to it, Up from it to the last.
    const step = event.key === 'ArrowDown' ? 1 : -1;
    setActiveIndex((current) => {
      const next = current + step;
      if (next >= suggestions.length) return -1;
      if (next < -1) return suggestions.length - 1;
      return next;
    });
  }

  const activeId = activeIndex >= 0 && activeIndex < suggestions.length ? `${id}-option-${activeIndex}` : undefined;

  return (
    <form role="search" onSubmit={onSubmit} className={cn('relative flex min-w-0 flex-1', className)}>
      <label htmlFor="site-search" className="sr-only">
        {t('header.searchLabel')}
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={activeId}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
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

      <ul
        id={listId}
        role="listbox"
        aria-label={t('header.suggestions')}
        hidden={!showList}
        className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(28rem,calc(100dvh-6rem))] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.kind === 'category' ? `c${suggestion.category.id}` : suggestion.kind === 'product' ? `p${suggestion.product.id}` : 'search'}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // Keep focus in the input so blur doesn't close the list before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => go(suggestion.href)}
            onMouseEnter={() => setActiveIndex(index)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
              index === activeIndex && 'bg-muted',
              suggestion.kind === 'search' && 'border-t border-border',
            )}
          >
            {suggestion.kind === 'category' && (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <FolderIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{categoryName(suggestion.category, locale)}</span>
                  <span className="text-xs text-muted-foreground">{t('header.suggestionCategory')}</span>
                </span>
              </>
            )}
            {suggestion.kind === 'product' && (
              <>
                <span className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                  {suggestion.product.image_url ? (
                    <img src={suggestion.product.image_url} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-4" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{suggestion.product.title}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(suggestion.product.price_min, intlLocale)}</span>
              </>
            )}
            {suggestion.kind === 'search' && (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
                  <SearchIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate">{t('header.searchFor', { query: debounced })}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </form>
  );
}
