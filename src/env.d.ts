/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    // Resolved by src/middleware.ts on every request (phase 2). `null` = logged out.
    // Typed as `unknown` until the `UserRead` type lands in src/lib/api/types/.
    user: unknown;
  }
}
