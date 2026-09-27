/// <reference types="astro/client" />

import type { UserRead } from './lib/api/types';

declare global {
  namespace App {
    interface Locals {
      /** Resolved by src/middleware.ts on every request. `null` = logged out. */
      user: UserRead | null;
    }
  }
}
