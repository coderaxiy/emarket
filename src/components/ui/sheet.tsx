import { cva, type VariantProps } from 'class-variance-authority';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { DialogOverlay } from './dialog';

// A dialog that slides in from an edge: the cart drawer, mobile filters (bottom sheet), menus.
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

const sheetVariants = cva(
  'fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-xl outline-none',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-dvh w-[min(26rem,100vw)] border-l border-border data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right',
        left: 'inset-y-0 left-0 h-dvh w-[min(22rem,100vw)] border-r border-border data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left',
        bottom:
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t border-border pb-[env(safe-area-inset-bottom)] data-[state=closed]:animate-slide-out-bottom data-[state=open]:animate-slide-in-bottom',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

interface SheetContentProps
  extends ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  closeLabel?: string;
}

export function SheetContent({ className, children, side, closeLabel, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content data-slot="sheet-content" className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {closeLabel && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute top-4 right-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('flex flex-col gap-1 border-b border-border p-4 pr-14', className)} {...props} />
  );
}

export function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-body" className={cn('flex-1 overflow-y-auto p-4', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('border-t border-border p-4', className)} {...props} />;
}
