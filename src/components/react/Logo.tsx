import { cn } from '@/lib/utils';

/** Wordmark: an eight-point star (girih motif) + "emarket". Colours come from tokens. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <svg viewBox="0 0 32 32" className="h-full w-auto" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path
          d="M16 5.5l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z"
          className="fill-primary-foreground"
        />
      </svg>
      {!compact && (
        <span className="hidden font-display text-xl leading-none font-semibold tracking-tight sm:inline">
          emarket
        </span>
      )}
    </span>
  );
}
