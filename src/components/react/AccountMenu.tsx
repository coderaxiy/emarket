import { useMutation } from '@tanstack/react-query';
import { LogInIcon, LogOutIcon, PackageIcon, UserIcon, UserPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { useTranslation } from '@/i18n/react';
import { apiClient } from '@/lib/api/client';
import { AUTH_ENDPOINTS } from '@/lib/api/endpoints';
import { apiErrorMessage } from '@/lib/api/errors';
import type { SessionUser } from './types';

export function AccountMenu({ user, currentPath }: { user: SessionUser | null; currentPath: string }) {
  const { t } = useTranslation();

  const signOut = useMutation({
    mutationFn: () => apiClient.post(AUTH_ENDPOINTS.logout),
    // Hard navigation: every island and the server-rendered session must reset.
    onSuccess: () => window.location.assign('/'),
    onError: (error) => toast({ variant: 'error', title: apiErrorMessage(error, t('header.signOutFailed')) }),
  });

  const next = encodeURIComponent(currentPath);
  const displayName = user?.full_name?.trim() || user?.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-3" aria-label={t('header.account')}>
          <UserIcon aria-hidden="true" />
          <span className="hidden max-w-32 truncate lg:inline">{user ? displayName : t('header.signIn')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {user ? (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
              {user.full_name && <span className="truncate">{user.email}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/account">
                <UserIcon aria-hidden="true" />
                {t('header.myAccount')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/orders">
                <PackageIcon aria-hidden="true" />
                {t('header.myOrders')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={signOut.isPending}
              onSelect={(event) => {
                event.preventDefault();
                signOut.mutate();
              }}
            >
              <LogOutIcon aria-hidden="true" />
              {t('header.signOut')}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <a href={`/login?next=${next}`}>
                <LogInIcon aria-hidden="true" />
                {t('header.signIn')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/register?next=${next}`}>
                <UserPlusIcon aria-hidden="true" />
                {t('header.register')}
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
