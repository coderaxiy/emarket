---
name: storefront
description: Conventions and gotchas for the emarket customer storefront (Astro 7 + React 19 + Tailwind v4). Read before changing anything in this repo.
---

# emarket storefront — conventions

Full onboarding lives in the owner's "Customer Website — Agent Guide"; the API contract lives in
`sdk-contract` (spec beats docs, backend beats both). This file records what's specific to this
repo and what we learned building it.

## Process
- Work in phases of **≤5 files**, verify, then stop for owner approval.
- Done = `npx tsc --noEmit`, `npm run lint` (zero warnings) and `npx astro check` all clean.
- Dev server: `npx astro dev --background`; `npx astro dev stop | status | logs`.

## Stack pins and why
- **TypeScript is pinned to `~6.0`**: `typescript-eslint` supports `<6.1` and `@astrojs/check`
  supports `^5 || ^6`. TS 7 (latest) breaks both. Revisit when they add support.
- TS 6 deprecates `baseUrl`; `tsconfig.json` uses `paths` only (`@/*` → `./src/*`).
- `eslint-plugin-astro@3` declares `node ^22.22.3`; it works on 22.22.2 with an EBADENGINE warning.
- ESLint uses `defineConfig` from `eslint/config` (`tseslint.config` is deprecated).

## Gotchas
- `astro.config.mjs` splits the Vite cache for `build`/`check` (`node_modules/.vite-build`) so a
  running `astro dev` doesn't get `_jsxDEV is not a function`. If it happens anyway:
  `astro dev stop && rm -rf node_modules/.vite && astro dev --background`.
- Env vars: declare in `astro.config.mjs` → `env.schema`, read from `astro:env/client`, run
  `npx astro sync` after changing the schema. Never `import.meta.env`.
- `.astro` → React: pass `className`, never `class`.
- Pages are on-demand (`output: 'server'`). Don't set `prerender = true`; middleware only runs
  per request.
- `PageProgress.astro` animates `transform` only. No Tailwind `scale-x-*`.
- Theme: `getTheme(Astro.cookies)` in `src/lib/preferences.ts` → `<html data-theme>`.

## Styling
See `DESIGN.md`. Tokens only — never raw palette colours.
