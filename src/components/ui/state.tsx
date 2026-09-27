import { AlertTriangleIcon, InboxIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// Loading, empty and error are three different states. A failed load must never
// render as an empty one ("0 products", an empty cart).

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function LoadingState({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex items-center justify-center gap-3 py-12 text-muted-foreground', className)}>
      <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, className, icon }: StateProps & { icon?: ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <div className="relative flex size-16 items-center justify-center">
        <div className="pattern-girih absolute inset-0 rounded-full opacity-80" aria-hidden="true" />
        <div className="relative flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon ?? <InboxIcon aria-hidden="true" />}
        </div>
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps extends StateProps {
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title, description, action, onRetry, retryLabel, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && retryLabel && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
      {action}
    </div>
  );
}
