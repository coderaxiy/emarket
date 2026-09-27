import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LocateFixedIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/state';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/i18n/react';
import { fetchNearbyPickupPoints } from '@/lib/api/checkout';
import type { NearbyPickupPointRead, PickupPointRead } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import {
  DEFAULT_CENTER,
  geocodeUri,
  hasSuggestKey,
  loadYmaps3,
  suggestAddresses,
  type AddressSuggestion,
  type LngLat,
  type YMapEntity,
  type YMapInstance,
} from '@/lib/yandexMaps';
import { PointOption } from './PickupPointOption';

// Map mode of the pickup-point picker (md and up, with a Yandex Maps key), like the big
// marketplaces: address search and the points near the map's centre on the left, the
// map with a marker per point on the right. Moving the map reloads the points around the
// new centre (`/pickup-points/nearby`). If the map can't load, `onUnavailable` hands back
// to the list picker.

interface PickupPointMapPanelProps {
  selected: PickupPointRead | null;
  onSelect: (point: PickupPointRead) => void;
  onUnavailable: () => void;
}

const START_ZOOM = 13;
const NO_POINTS: NearbyPickupPointRead[] = [];
const pointLngLat = (point: Pick<PickupPointRead, 'latitude' | 'longitude'>): LngLat => [Number(point.longitude), Number(point.latitude)];
/** ~100 m: small moves of the map don't refetch. */
const roundCenter = ([lng, lat]: LngLat): LngLat => [Math.round(lng * 1000) / 1000, Math.round(lat * 1000) / 1000];

function currentTheme(): 'light' | 'dark' {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** A marker: a pin with the point's name, drawn as a real button for keyboard users. */
function markerElement(point: PickupPointRead, selected: boolean, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', point.name);
  button.setAttribute('aria-pressed', String(selected));
  button.className = cn(
    'flex -translate-x-1/2 -translate-y-full cursor-pointer items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs font-semibold whitespace-nowrap shadow-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-card text-foreground',
  );
  const dot = document.createElement('span');
  dot.className = cn('size-5 rounded-full border-4', selected ? 'border-accent-foreground bg-accent' : 'border-primary bg-card');
  dot.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = point.name;
  button.append(dot, label);
  button.addEventListener('click', onClick);
  return button;
}

function AddressSearch({ onPick }: { onPick: (center: LngLat) => void }) {
  const { t, locale } = useTranslation();
  const id = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const query = useDebouncedValue(text.trim(), 300);
  const suggestions = useQuery({
    queryKey: ['address-suggest', locale, query],
    queryFn: ({ signal }) => suggestAddresses(query, locale, signal),
    enabled: hasSuggestKey && open && query.length >= 3,
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });
  const items = open && query.length >= 3 ? (suggestions.data ?? []) : [];

  async function pick(item: AddressSuggestion) {
    setText(item.title);
    setOpen(false);
    setActive(-1);
    setError(false);
    try {
      const center = item.uri ? await geocodeUri(item.uri, locale) : undefined;
      if (center) onPick(center);
      else setError(true);
    } catch {
      setError(true);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && items.length > 0) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length === 0) return;
      setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[active] ?? items[0];
      if (item) void pick(item);
    }
  }

  if (!hasSuggestKey) return null;
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        aria-autocomplete="list"
        aria-label={t('checkout.addressSearch')}
        placeholder={t('checkout.addressSearch')}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="pr-9 pl-9"
      />
      {text && (
        <button
          type="button"
          aria-label={t('checkout.clearAddress')}
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      )}
      <ul
        id={`${id}-list`}
        role="listbox"
        hidden={items.length === 0}
        className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-10 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
      >
        {items.map((item, index) => (
          <li
            key={`${item.title}-${item.subtitle ?? ''}`}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void pick(item)}
            onMouseEnter={() => setActive(index)}
            className={cn('flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm', index === active && 'bg-muted')}
          >
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{item.title}</span>
              {item.subtitle && <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-xs text-destructive">{t('checkout.addressNotFound')}</p>}
    </div>
  );
}

export function PickupPointMapPanel({ selected, onSelect, onUnavailable }: PickupPointMapPanelProps) {
  const { t, locale } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMapInstance | null>(null);
  const apiRef = useRef<Awaited<ReturnType<typeof loadYmaps3>> | null>(null);
  const markersRef = useRef<YMapEntity[]>([]);
  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState<LngLat>(() => (selected ? pointLngLat(selected) : DEFAULT_CENTER));
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // Create the map once; tear it down with the dialog.
  useEffect(() => {
    let cancelled = false;
    loadYmaps3(locale).then(
      (api) => {
        const element = containerRef.current;
        if (cancelled || !element) return;
        const map = new api.YMap(element, { location: { center, zoom: START_ZOOM } });
        map.addChild(new api.YMapDefaultSchemeLayer({ theme: currentTheme() }));
        map.addChild(new api.YMapDefaultFeaturesLayer({}));
        map.addChild(
          new api.YMapListener({
            onActionEnd: (event) => {
              const next = event.location?.center ?? map.center;
              if (next) setCenter(roundCenter(next));
            },
          }),
        );
        apiRef.current = api;
        mapRef.current = map;
        setReady(true);
      },
      () => {
        if (!cancelled) onUnavailable();
      },
    );
    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      markersRef.current = [];
    };
    // Mount-only: later centre changes move the existing map (flyTo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedCenter = useDebouncedValue(center, 400);
  const nearby = useQuery({
    queryKey: ['pickup-points', 'nearby', roundCenter(debouncedCenter)],
    queryFn: () => fetchNearbyPickupPoints(debouncedCenter[1], debouncedCenter[0]),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const points = nearby.data ?? NO_POINTS;
  // Markers call the latest onSelect without being rebuilt when the parent re-renders.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Redraw markers when the points or the selection change.
  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!ready || !map || !api) return;
    for (const marker of markersRef.current) map.removeChild(marker);
    markersRef.current = points.map((point) => {
      const isSelected = point.id === selected?.id;
      const marker = new api.YMapMarker(
        { coordinates: pointLngLat(point), zIndex: isSelected ? 10 : 1 },
        markerElement(point, isSelected, () => onSelectRef.current(point)),
      );
      map.addChild(marker);
      return marker;
    });
  }, [ready, points, selected?.id]);

  function flyTo(next: LngLat) {
    setCenter(roundCenter(next));
    mapRef.current?.update({ location: { center: next, zoom: START_ZOOM, duration: 400 } });
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setLocationDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLocationDenied(false);
        flyTo([position.coords.longitude, position.coords.latitude]);
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)] gap-4">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <AddressSearch onPick={flyTo} />
          </div>
          <Button variant="outline" size="icon" aria-label={t('checkout.useMyLocation')} disabled={locating} onClick={locate}>
            <LocateFixedIcon aria-hidden="true" />
          </Button>
        </div>
        {locationDenied && <p className="text-xs text-muted-foreground">{t('checkout.locationDenied')}</p>}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {nearby.isPending ? (
            <LoadingState label={t('common.loading')} />
          ) : points.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('checkout.noPointsOnMap')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {points.map((point) => (
                <PointOption
                  key={point.id}
                  point={point}
                  selected={point.id === selected?.id}
                  onSelect={() => {
                    onSelect(point);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="relative min-h-0 overflow-hidden rounded-lg bg-muted">
        <div ref={containerRef} className="absolute inset-0" />
        {!ready && <LoadingState label={t('checkout.mapLoading')} className="absolute inset-0" />}
      </div>
    </div>
  );
}
