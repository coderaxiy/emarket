import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/react';

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const label = visible ? t('auth.hidePassword') : t('auth.showPassword');
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={label}
        aria-pressed={visible}
        className="absolute top-0 right-0 inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
