import { cva } from 'class-variance-authority';
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon, XIcon } from 'lucide-react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

// Module-level store: any island can call `toast()`; the single <Toaster /> (mounted in
// the persisted header island) renders them. Islands share this module instance.

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  open: boolean;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => items;
const EMPTY: ToastItem[] = [];
const getServerSnapshot = () => EMPTY;

export function toast(input: { title: string; description?: string; variant?: ToastVariant }): void {
  const item: ToastItem = { id: nextId++, variant: input.variant ?? 'info', title: input.title, description: input.description, open: true };
  emit([...items, item].slice(-3));
}

function dismiss(id: number) {
  emit(items.map((item) => (item.id === id ? { ...item, open: false } : item)));
  // Leave time for the exit animation before unmounting.
  setTimeout(() => emit(items.filter((item) => item.id !== id)), 200);
}

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border bg-popover p-4 pr-10 text-popover-foreground shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-slide-in-bottom data-[swipe=end]:animate-fade-out data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
  {
    variants: {
      variant: {
        info: 'border-border [&>svg]:text-accent',
        success: 'border-success/40 [&>svg]:text-success',
        error: 'border-destructive/40 [&>svg]:text-destructive',
      },
    },
  },
);

const ICONS = { info: InfoIcon, success: CheckCircle2Icon, error: AlertCircleIcon } as const;

export function Toaster({ closeLabel }: { closeLabel: string }) {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {toasts.map((item) => {
        const Icon = ICONS[item.variant];
        return (
          <ToastPrimitive.Root
            key={item.id}
            open={item.open}
            onOpenChange={(open) => !open && dismiss(item.id)}
            type={item.variant === 'error' ? 'foreground' : 'background'}
            className={toastVariants({ variant: item.variant })}
          >
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <ToastPrimitive.Title className="text-sm font-semibold">{item.title}</ToastPrimitive.Title>
              {item.description && (
                <ToastPrimitive.Description className="text-sm text-muted-foreground">
                  {item.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label={closeLabel}
              className="absolute top-3 right-3 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport
        className={cn(
          'fixed right-0 bottom-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none',
          // Clear the mobile bottom tab bar.
          'mb-[calc(4rem+env(safe-area-inset-bottom))] md:mb-0',
        )}
      />
    </ToastPrimitive.Provider>
  );
}
