import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { Locale, TranslationKey } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { apiErrorMessage } from '@/lib/api/errors';
import { cancelOrderGroup } from '@/lib/api/orders';
import { cn } from '@/lib/utils';
import { AppProviders } from './AppProviders';

// "Cancel" for one shop's part of an order, with a reason the shop sees. Shown only while
// cancelling is free (pending / confirmed). On success the page reloads: order and group
// statuses are computed server-side.

interface CancelGroupButtonProps {
  locale: Locale;
  orderId: number;
  groupId: number;
}

const REASONS: TranslationKey[] = ['cancel.reasonChangedMind', 'cancel.reasonMistake', 'cancel.reasonTooLong', 'cancel.reasonOther'];

function CancelGroup({ orderId, groupId }: Omit<CancelGroupButtonProps, 'locale'>) {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<TranslationKey>(REASONS[0]!);
  const [details, setDetails] = useState('');
  const isOther = reason === 'cancel.reasonOther';

  const cancel = useMutation({
    mutationFn: () => cancelOrderGroup(orderId, groupId, isOther ? details.trim() : t(reason)),
    onSuccess: () => window.location.reload(),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        {t('cancel.button')}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !cancel.isPending && setOpen(next)}>
        <DialogContent closeLabel={t('common.close')}>
          <DialogHeader>
            <DialogTitle>{t('cancel.title')}</DialogTitle>
            <DialogDescription>{t('cancel.body')}</DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t('cancel.reason')}</legend>
            {REASONS.map((key) => (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                  reason === key ? 'border-accent bg-accent/10' : 'border-border hover:border-accent',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-reason`}
                  checked={reason === key}
                  onChange={() => setReason(key)}
                  className="size-4 accent-accent"
                />
                {t(key)}
              </label>
            ))}
            {isOther && (
              <Textarea
                aria-label={t('cancel.details')}
                placeholder={t('cancel.details')}
                rows={3}
                maxLength={500}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            )}
          </fieldset>
          {cancel.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(cancel.error, t('cancel.failed'))}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" disabled={cancel.isPending} onClick={() => setOpen(false)}>
              {t('cancel.keep')}
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending || (isOther && details.trim() === '')}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? t('cancel.cancelling') : t('cancel.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CancelGroupButton({ locale, ...props }: CancelGroupButtonProps) {
  return (
    <AppProviders locale={locale}>
      <CancelGroup {...props} />
    </AppProviders>
  );
}
