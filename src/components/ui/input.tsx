import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const inputClassName =
  'flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 sm:text-sm';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" type={type} className={cn(inputClassName, className)} {...props} />;
}
