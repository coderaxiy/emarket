import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-fade-in',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** Shorthand for the common case: a trigger (usually an icon button) with a text hint. */
export function WithTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
