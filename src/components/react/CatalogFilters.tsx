import { navigate } from 'astro:transitions/client';
import { SlidersHorizontalIcon } from 'lucide-react';
import { useId, useState, type ReactNode, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Locale, TranslationKey } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import type { BrandFacetRead, CatalogSort, Money } from '@/lib/api/types';
import { filtersToUrl, type CatalogFilters } from '@/lib/catalog';
import { formatNumber } from '@/lib/format';
import { AppProviders } from './AppProviders';

// Catalog filters and sort. Two islands share one panel: `CatalogSidebar` (desktop,
// applies each change at once) and `CatalogToolbar` (sort, plus a bottom sheet on
// mobile that applies on "Show results"). Every change is a navigation to a new URL,
// so results stay server-rendered and shareable. Islands remount per page, so state
// initialised from props is always current.

/** A filterable attribute with its options, label already localized by the page. */
export interface FilterAttribute {
  key: string;
  label: string;
  unit: string | null;
  options: string[];
}

export interface FilterData {
  /** From `/products/facets`; empty when facets failed to load. */
  brands: BrandFacetRead[];
  price: { min: Money | null; max: Money | null };
  attributes: FilterAttribute[];
}

type FilterValue = Pick<CatalogFilters, 'brandIds' | 'priceMin' | 'priceMax' | 'inStock' | 'attrs'>;

interface IslandProps {
  locale: Locale;
  filters: CatalogFilters;
  /** Page path without query, e.g. `/catalog/phones`. */
  basePath: string;
  data: FilterData;
}

const COLLAPSED_COUNT = 8;

const SORT_LABELS: Record<CatalogSort, TranslationKey> = {
  relevance: 'catalog.sortRelevance',
  newest: 'catalog.sortNewest',
  price_asc: 'catalog.sortPriceAsc',
  price_desc: 'catalog.sortPriceDesc',
};

function hrefFor(basePath: string, filters: CatalogFilters): string {
  const query = filtersToUrl({ ...filters, page: 1 }).toString();
  return query ? `${basePath}?${query}` : basePath;
}

function activeFilterCount(value: FilterValue): number {
  return (
    value.brandIds.length +
    (value.priceMin || value.priceMax ? 1 : 0) +
    (value.inStock ? 1 : 0) +
    Object.values(value.attrs).reduce((sum, values) => sum + values.length, 0)
  );
}

const EMPTY: FilterValue = { brandIds: [], priceMin: undefined, priceMax: undefined, inStock: false, attrs: {} };

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

// --- Panel -----------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckRow({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md py-1 text-sm hover:text-accent">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 shrink-0 cursor-pointer accent-accent" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
    </label>
  );
}

function CollapsibleList<T>({ items, render }: { items: readonly T[]; render: (item: T) => ReactNode }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  return (
    <>
      {visible.map(render)}
      {items.length > COLLAPSED_COUNT && (
        <Button variant="link" size="sm" className="w-fit" onClick={() => setExpanded(!expanded)}>
          {expanded ? t('catalog.showLess') : t('catalog.showAll', { count: items.length })}
        </Button>
      )}
    </>
  );
}

function PriceFields({ value, data, onChange }: { value: FilterValue; data: FilterData; onChange: (next: FilterValue) => void }) {
  const { t, intlLocale } = useTranslation();
  const id = useId();
  const [min, setMin] = useState(value.priceMin ?? '');
  const [max, setMax] = useState(value.priceMax ?? '');
  const hint = (amount: Money | null) => (amount ? formatNumber(Math.floor(Number.parseFloat(amount)), intlLocale) : undefined);
  const digits = (input: string) => input.replace(/\D/g, '').slice(0, 12);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    let low = min || undefined;
    let high = max || undefined;
    if (low && high && Number(low) > Number(high)) [low, high] = [high, low];
    onChange({ ...value, priceMin: low, priceMax: high });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-min`} className="sr-only">
          {t('catalog.priceMin')}
        </label>
        <Input
          id={`${id}-min`}
          inputMode="numeric"
          value={min}
          onChange={(event) => setMin(digits(event.target.value))}
          placeholder={hint(data.price.min) ?? t('catalog.priceMin')}
          className="tabular-nums"
        />
        <span className="text-muted-foreground" aria-hidden="true">
          –
        </span>
        <label htmlFor={`${id}-max`} className="sr-only">
          {t('catalog.priceMax')}
        </label>
        <Input
          id={`${id}-max`}
          inputMode="numeric"
          value={max}
          onChange={(event) => setMax(digits(event.target.value))}
          placeholder={hint(data.price.max) ?? t('catalog.priceMax')}
          className="tabular-nums"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" className="w-fit">
        {t('catalog.apply')}
      </Button>
    </form>
  );
}

function FilterPanel({ value, data, onChange }: { value: FilterValue; data: FilterData; onChange: (next: FilterValue) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Section title={t('catalog.availability')}>
        <CheckRow label={t('catalog.inStockOnly')} checked={value.inStock} onChange={() => onChange({ ...value, inStock: !value.inStock })} />
      </Section>

      <Section title={t('catalog.price')}>
        <PriceFields value={value} data={data} onChange={onChange} />
      </Section>

      {data.brands.length > 0 && (
        <Section title={t('catalog.brands')}>
          <CollapsibleList
            items={data.brands}
            render={(brand) => (
              <CheckRow
                key={brand.id}
                label={brand.name}
                count={brand.count}
                checked={value.brandIds.includes(brand.id)}
                onChange={() => onChange({ ...value, brandIds: toggle(value.brandIds, brand.id) })}
              />
            )}
          />
        </Section>
      )}

      {data.attributes.map((attribute) => {
        const selected = value.attrs[attribute.key] ?? [];
        return (
          <Section key={attribute.key} title={attribute.unit ? `${attribute.label}, ${attribute.unit}` : attribute.label}>
            <CollapsibleList
              items={attribute.options}
              render={(option) => (
                <CheckRow
                  key={option}
                  label={option}
                  checked={selected.includes(option)}
                  onChange={() => {
                    const nextValues = toggle(selected, option);
                    const attrs = { ...value.attrs, [attribute.key]: nextValues };
                    if (nextValues.length === 0) delete attrs[attribute.key];
                    onChange({ ...value, attrs });
                  }}
                />
              )}
            />
          </Section>
        );
      })}
    </div>
  );
}

// --- Islands ---------------------------------------------------------------------

function Sidebar({ filters, basePath, data }: Omit<IslandProps, 'locale'>) {
  const { t } = useTranslation();
  // Updated right away so a checkbox flips before the navigation finishes.
  const [value, setValue] = useState<FilterValue>(filters);

  function apply(next: FilterValue) {
    setValue(next);
    void navigate(hrefFor(basePath, { ...filters, ...next }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('catalog.filters')}</h2>
        {activeFilterCount(value) > 0 && (
          <Button variant="link" size="sm" onClick={() => apply(EMPTY)}>
            {t('catalog.resetFilters')}
          </Button>
        )}
      </div>
      <FilterPanel value={value} data={data} onChange={apply} />
    </div>
  );
}

/** Desktop sidebar. Hydrate it only on wide screens (`client:media`). */
export function CatalogSidebar({ locale, ...props }: IslandProps) {
  return (
    <AppProviders locale={locale}>
      <Sidebar {...props} />
    </AppProviders>
  );
}

function Toolbar({ filters, basePath, data }: Omit<IslandProps, 'locale'>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValue>(filters);
  const active = activeFilterCount(filters);

  const sorts: CatalogSort[] = filters.q ? ['relevance', 'newest', 'price_asc', 'price_desc'] : ['newest', 'price_asc', 'price_desc'];
  const sort = filters.sort && sorts.includes(filters.sort) ? filters.sort : sorts[0];

  function openChange(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function showResults() {
    setOpen(false);
    void navigate(hrefFor(basePath, { ...filters, ...draft }));
  }

  return (
    <div className="flex items-center justify-between gap-3 lg:justify-end">
      <Sheet open={open} onOpenChange={openChange}>
        <SheetTrigger asChild>
          <Button variant="outline" className="rounded-full lg:hidden">
            <SlidersHorizontalIcon aria-hidden="true" />
            {t('catalog.filters')}
            {active > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground tabular-nums">
                {active}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" closeLabel={t('common.close')} aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">{t('catalog.filters')}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <FilterPanel value={draft} data={data} onChange={setDraft} />
          </SheetBody>
          <SheetFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDraft(EMPTY)} disabled={activeFilterCount(draft) === 0}>
              {t('catalog.resetFilters')}
            </Button>
            <Button variant="accent" className="flex-1" onClick={showResults}>
              {t('catalog.showResults')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Select
        value={sort}
        onValueChange={(next) => void navigate(hrefFor(basePath, { ...filters, sort: next as CatalogSort }))}
      >
        <SelectTrigger aria-label={t('catalog.sort')} className="w-auto min-w-44 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {sorts.map((option) => (
            <SelectItem key={option} value={option}>
              {t(SORT_LABELS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Sort menu on every screen, plus the filters sheet below `lg`. */
export function CatalogToolbar({ locale, ...props }: IslandProps) {
  return (
    <AppProviders locale={locale}>
      <Toolbar {...props} />
    </AppProviders>
  );
}
