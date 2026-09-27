import { useMutation } from '@tanstack/react-query';
import { AlertCircleIcon } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Locale, TranslationKey } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import { apiClient } from '@/lib/api/client';
import { AUTH_ENDPOINTS } from '@/lib/api/endpoints';
import { apiErrorMessage } from '@/lib/api/errors';
import type { LoginRequest, RegisterRequest, TokenResponse, UserRead } from '@/lib/api/types';
import { AppProviders } from './AppProviders';
import { PasswordInput } from './PasswordInput';

type Mode = 'login' | 'register';

interface AuthFormProps {
  locale: Locale;
  mode: Mode;
  /** Already sanitised by the page with `safeNextPath`. */
  next: string;
}

export function AuthForm({ locale, ...props }: AuthFormProps) {
  return (
    <AppProviders locale={locale}>
      <AuthFormContent {...props} />
    </AppProviders>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<'email' | 'password', TranslationKey>>;

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email) errors.email = 'auth.emailRequired';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'auth.emailInvalid';
  if (!password) errors.password = 'auth.passwordRequired';
  return errors;
}

/** Thrown when registration succeeded but the follow-up sign-in didn't. */
class SignInAfterRegisterError extends Error {}

function AuthFormContent({ mode, next }: Omit<AuthFormProps, 'locale'>) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = useMutation({
    mutationFn: async () => {
      const credentials: LoginRequest = { email: email.trim(), password };
      if (mode === 'register') {
        const body: RegisterRequest = { ...credentials, full_name: fullName.trim() || null };
        await apiClient.post<UserRead>(AUTH_ENDPOINTS.register, body);
        try {
          await apiClient.post<TokenResponse>(AUTH_ENDPOINTS.login, credentials);
        } catch {
          throw new SignInAfterRegisterError();
        }
        return;
      }
      await apiClient.post<TokenResponse>(AUTH_ENDPOINTS.login, credentials);
    },
    // Hard navigation so the server-rendered session and every island pick up the cookie.
    onSuccess: () => window.location.assign(next),
    onError: (error) => {
      if (error instanceof SignInAfterRegisterError) {
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      }
    },
  });

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(email.trim(), password);
    setErrors(found);
    if (Object.keys(found).length === 0) submit.mutate();
  }

  const fallback = mode === 'login' ? t('auth.loginFailed') : t('auth.registerFailed');
  const serverError =
    submit.isError && !(submit.error instanceof SignInAfterRegisterError)
      ? apiErrorMessage(submit.error, fallback)
      : null;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {mode === 'register' && (
        <Field label={t('auth.fullName')}>
          {(control) => (
            <Input {...control} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          )}
        </Field>
      )}

      <Field label={t('auth.email')} error={errors.email && t(errors.email)}>
        {(control) => (
          <Input
            {...control}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <Field label={t('auth.password')} error={errors.password && t(errors.password)}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submit.isPending}>
        {submit.isPending && (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        )}
        {mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
      </Button>
    </form>
  );
}
