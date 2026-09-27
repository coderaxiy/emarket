import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon, FolderIcon, LayoutGridIcon, XIcon } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/state';
import { useTranslation } from '@/i18n/react';
import { CATEGORY_TREE_QUERY_KEY, CATEGORY_TREE_STALE_MS, fetchCategoryTreeClient } from '@/lib/api/catalog';
import type { CategoryNodeRead } from '@/lib/api/types';
import { categoryName, nonEmptyCategories } from '@/lib/catalog';
import { cn } from '@/lib/utils';

// The header's "Catalog" button (md and up): a panel with top-level categories on the
// left and the hovered/focused one's subcategories on the right. The tree loads on first
// open and is cached like the API says (5 min). Small screens use the Catalog tab page.

const GRANDCHILDREN_SHOWN = 5;
const categoryHref = (category: CategoryNodeRead) => `/catalog/${encodeURIComponent(category.slug)}`;

export function CatalogMenu() {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const tree = useQuery({
    queryKey: CATEGORY_TREE_QUERY_KEY,
    queryFn: fetchCategoryTreeClient,
    staleTime: CATEGORY_TREE_STALE_MS,
    enabled: open,
  });

  const roots = tree.data ? nonEmptyCategories(tree.data) : [];
  const active = roots.find((root) => root.id === activeId) ?? roots[0];
  const name = (category: CategoryNodeRead) => categoryName(category, locale);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="accent" className="hidden h-11 rounded-full px-5 md:inline-flex" aria-haspopup="dialog">
          {open ? <XIcon aria-hidden="true" /> : <LayoutGridIcon aria-hidden="true" />}
          {t('header.catalogButton')}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          collisionPadding={16}
          aria-label={t('header.catalogButton')}
          className="z-50 flex min-h-72 max-h-[min(36rem,calc(100dvh-7rem))] w-[min(60rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-zoom-in"
        >
          {tree.isPending ? (
            <LoadingState label={t('common.loading')} className="w-full" />
          ) : tree.isError ? (
            <ErrorState
              title={t('state.loadFailed')}
              onRetry={() => void tree.refetch()}
              retryLabel={t('common.retry')}
              className="w-full"
            />
          ) : roots.length === 0 ? (
            <p className="w-full p-8 text-center text-sm text-muted-foreground">{t('catalog.emptyTitle')}</p>
          ) : (
            <>
              <ul className="w-64 shrink-0 overflow-y-auto border-r border-border bg-muted/40 p-2">
                {roots.map((root) => (
                  <li key={root.id}>
                    <a
                      href={categoryHref(root)}
                      onMouseEnter={() => setActiveId(root.id)}
                      onFocus={() => setActiveId(root.id)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        root.id === active?.id ? 'bg-card font-medium text-accent shadow-sm' : 'hover:bg-card',
                      )}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md text-muted-foreground">
                        {root.icon_url ? (
                          <img src={root.icon_url} alt="" className="size-6 object-contain" loading="lazy" />
                        ) : (
                          <FolderIcon className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{name(root)}</span>
                      {root.children.length > 0 && <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                    </a>
                  </li>
                ))}
              </ul>
              {active && (
                <div className="min-w-0 flex-1 overflow-y-auto p-6">
                  <a
                    href={categoryHref(active)}
                    onClick={() => setOpen(false)}
                    className="font-display text-xl font-semibold tracking-tight hover:text-accent"
                  >
                    {name(active)}
                  </a>
                  {nonEmptyCategories(active.children).length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                      {nonEmptyCategories(active.children).map((child) => (
                        <div key={child.id} className="flex flex-col gap-1.5">
                          <a href={categoryHref(child)} onClick={() => setOpen(false)} className="text-sm font-semibold hover:text-accent">
                            {name(child)}
                          </a>
                          {child.children.length > 0 && (
                            <ul className="flex flex-col gap-1">
                              {child.children.slice(0, GRANDCHILDREN_SHOWN).map((grandchild) => (
                                <li key={grandchild.id}>
                                  <a
                                    href={categoryHref(grandchild)}
                                    onClick={() => setOpen(false)}
                                    className="text-sm text-muted-foreground hover:text-accent"
                                  >
                                    {name(grandchild)}
                                  </a>
                                </li>
                              ))}
                              {child.children.length > GRANDCHILDREN_SHOWN && (
                                <li>
                                  <a href={categoryHref(child)} onClick={() => setOpen(false)} className="text-sm font-medium text-accent hover:underline">
                                    {t('catalog.showAll', { count: child.children.length })}
                                  </a>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2">
                      <a href={categoryHref(active)} onClick={() => setOpen(false)} className="text-sm font-medium text-accent hover:underline">
                        {t('header.allInCategory', { category: name(active) })}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
