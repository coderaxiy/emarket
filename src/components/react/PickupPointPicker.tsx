import { useQuery } from '@tanstack/react-query';
import { CheckIcon, ClockIcon, LocateFixedIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/i18n/react';
import { fetchNearbyPickupPoints, fetchPickupPoints, fetchRegions } from '@/lib/api/checkout';
import type { NearbyPickupPointRead, PickupPointRead } from '@/lib/api/types';
import { addressLandmark, formatAddress, todaysHours } from '@/lib/pickupPoints';
import { cn } from '@/lib/utils';

// Choose the one pickup point the whole order goes to: near the buyer's location, or
// by region. A list, not a map: the map needs the Yandex Maps key (a later phase).

interface PickupPointPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: PickupPointRead | null;
  onSelect: (point: PickupPointRead) => void;
}

type Located = { status: 'idle' } | { status: 'locating' } | { status: 'denied' } | { status: 'ok'; lat: number; lng: number };

function PointOption({
  point,
  selected,
  onSelect,
}: {
  point: PickupPointRead | NearbyPickupPointRead;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, locale } = useTranslation();
  const address = formatAddress(point.address);
  const landmark = addressLandmark(point.address);
  const hours = todaysHours(point.operating_hours);
  // One decimal, locale separator; by hand like all island numbers (see src/lib/format.ts).
  const distance =
    'distance_km' in point ? point.distance_km.toFixed(1).replace('.', locale === 'en' ? '.' : ',') : undefined;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          selected ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-accent',
        )}
      >
        <MapPinIcon className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-accent' : 'text-muted-foreground')} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{point.name}</span>
          {address && <span className="text-sm text-muted-foreground">{address}</span>}
          {landmark && <span className="text-xs text-muted-foreground">{landmark}</span>}
          {hours && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              {t('checkout.todayHours', { hours })}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {distance && <span className="text-xs text-muted-foreground tabular-nums">{t('checkout.distanceKm', { km: distance })}</span>}
          {selected && <CheckIcon className="size-5 text-accent" aria-hidden="true" />}
        </span>
      </button>
    </li>
  );
}

function PointList({
  points,
  selectedId,
  onSelect,
  emptyTitle,
}: {
  points: (PickupPointRead | NearbyPickupPointRead)[];
  selectedId: number | undefined;
  onSelect: (point: PickupPointRead) => void;
  emptyTitle: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? points.filter((point) => `${point.name} ${formatAddress(point.address)}`.toLowerCase().includes(needle))
    : points;

  if (points.length === 0) return <EmptyState title={emptyTitle} className="py-8" />;
  return (
    <div className="flex flex-col gap-3">
      {points.length > 5 && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('checkout.filterPoints')}
            aria-label={t('checkout.filterPoints')}
            className="pl-9"
          />
        </div>
      )}
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('checkout.noPointsMatch')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((point) => (
            <PointOption key={point.id} point={point} selected={point.id === selectedId} onSelect={() => onSelect(point)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NearMe({ selectedId, onSelect }: { selectedId: number | undefined; onSelect: (point: PickupPointRead) => void }) {
  const { t } = useTranslation();
  const [located, setLocated] = useState<Located>({ status: 'idle' });
  const nearby = useQuery({
    queryKey: ['pickup-points', 'nearby', located.status === 'ok' ? [located.lat, located.lng] : null],
    queryFn: () => (located.status === 'ok' ? fetchNearbyPickupPoints(located.lat, located.lng) : Promise.resolve([])),
    enabled: located.status === 'ok',
  });

  function locate() {
    if (!('geolocation' in navigator)) {
      setLocated({ status: 'denied' });
      return;
    }
    setLocated({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => setLocated({ status: 'ok', lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocated({ status: 'denied' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  if (located.status === 'idle' || located.status === 'denied') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          {located.status === 'denied' ? t('checkout.locationDenied') : t('checkout.locationHint')}
        </p>
        <Button variant="accent" className="rounded-full" onClick={locate}>
          <LocateFixedIcon aria-hidden="true" />
          {t('checkout.useMyLocation')}
        </Button>
      </div>
    );
  }
  if (located.status === 'locating' || nearby.isPending) return <LoadingState label={t('common.loading')} />;
  if (nearby.isError) {
    return <ErrorState title={t('state.loadFailed')} onRetry={() => void nearby.refetch()} retryLabel={t('common.retry')} />;
  }
  return <PointList points={nearby.data} selectedId={selectedId} onSelect={onSelect} emptyTitle={t('checkout.noPointsNearby')} />;
}

function ByRegion({
  initialRegionId,
  selectedId,
  onSelect,
}: {
  initialRegionId: number | undefined;
  selectedId: number | undefined;
  onSelect: (point: PickupPointRead) => void;
}) {
  const { t } = useTranslation();
  const [regionId, setRegionId] = useState(initialRegionId);
  const regions = useQuery({ queryKey: ['regions'], queryFn: fetchRegions, staleTime: 3_600_000 });
  const points = useQuery({
    queryKey: ['pickup-points', 'region', regionId],
    queryFn: () => fetchPickupPoints(regionId!),
    enabled: regionId !== undefined,
  });

  if (regions.isPending) return <LoadingState label={t('common.loading')} />;
  if (regions.isError) {
    return <ErrorState title={t('state.loadFailed')} onRetry={() => void regions.refetch()} retryLabel={t('common.retry')} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Select value={regionId === undefined ? undefined : String(regionId)} onValueChange={(value) => setRegionId(Number(value))}>
        <SelectTrigger aria-label={t('checkout.region')}>
          <SelectValue placeholder={t('checkout.chooseRegion')} />
        </SelectTrigger>
        <SelectContent>
          {regions.data.map((region) => (
            <SelectItem key={region.id} value={String(region.id)}>
              {region.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {regionId !== undefined &&
        (points.isPending ? (
          <LoadingState label={t('common.loading')} />
        ) : points.isError ? (
          <ErrorState title={t('state.loadFailed')} onRetry={() => void points.refetch()} retryLabel={t('common.retry')} />
        ) : (
          <PointList
            key={regionId}
            points={points.data}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyTitle={t('checkout.noPointsInRegion')}
          />
        ))}
    </div>
  );
}

export function PickupPointPicker({ open, onOpenChange, selected, onSelect }: PickupPointPickerProps) {
  const { t } = useTranslation();

  function choose(point: PickupPointRead) {
    onSelect(point);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')} className="flex max-h-[min(40rem,calc(100dvh-2rem))] max-w-xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{t('checkout.choosePoint')}</DialogTitle>
          <DialogDescription>{t('checkout.onePointNote')}</DialogDescription>
        </DialogHeader>
        {/* Start on "by region" when a point is already chosen: its region's list opens ready. */}
        <Tabs defaultValue={selected ? 'region' : 'nearby'} className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsList className="w-full">
            <TabsTrigger value="nearby" className="flex-1">
              {t('checkout.nearMe')}
            </TabsTrigger>
            <TabsTrigger value="region" className="flex-1">
              {t('checkout.byRegion')}
            </TabsTrigger>
          </TabsList>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
            <TabsContent value="nearby">
              <NearMe selectedId={selected?.id} onSelect={choose} />
            </TabsContent>
            <TabsContent value="region">
              <ByRegion initialRegionId={selected?.region_id} selectedId={selected?.id} onSelect={choose} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
