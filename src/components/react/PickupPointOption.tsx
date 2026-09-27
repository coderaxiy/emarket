import { CheckIcon, ClockIcon, MapPinIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/react';
import type { NearbyPickupPointRead, PickupPointRead } from '@/lib/api/types';
import { addressLandmark, formatAddress, todaysHours } from '@/lib/pickupPoints';
import { cn } from '@/lib/utils';

// One selectable pickup point in a list: name, address, landmark, today's hours and, from
// `/pickup-points/nearby`, the distance. Shared by the list and map pickers.

export function PointOption({
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
