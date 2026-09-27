import type { UserRead } from '@/lib/api/types';

/** The slice of the session user islands receive as a prop (serialized into the page). */
export type SessionUser = Pick<UserRead, 'email' | 'full_name'>;

export function toSessionUser(user: UserRead | null): SessionUser | null {
  return user ? { email: user.email, full_name: user.full_name } : null;
}
