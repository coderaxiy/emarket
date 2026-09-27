import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        primary: 'bg-primary text-primary-foreground',
        accent: 'bg-accent/15 text-accent',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/20 text-foreground',
        destructive: 'bg-destructive/15 text-destructive',
        sale: 'bg-sale text-sale-foreground',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
