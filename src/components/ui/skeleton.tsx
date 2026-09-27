import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Shimmer placeholder. Prefer skeletons over spinners for grids and product pages. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded-md bg-muted', className)}
      {...props}
    />
  );
}
