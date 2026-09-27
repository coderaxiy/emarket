import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Receives the ids to wire onto the control (`id`, `aria-describedby`, `aria-invalid`). */
  children: (control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode;
}

/** Label + control + hint/error, with the accessibility wiring done once. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div data-slot="field" className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-describedby': message ? messageId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}
