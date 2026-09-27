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

## Layout of the code
- `src/lib/api/` — `client.ts` (the one axios instance), `endpoints.ts` (every path),
  `errors.ts` (`apiErrorMessage`, `isForbidden`, …), `queryClient.ts`, `server.ts` (SSR fetch
  with cookie forwarding, `fetchSessionUser`), `types/` (hand-written, one file per entity,
  cross-checked against `sdk-contract/openapi/api.yaml`).
- `src/lib/auth.ts` — `PROTECTED_PATHS`, `safeNextPath` (open-redirect guard), `redirectToLogin`.
- `src/middleware.ts` — resolves `Astro.locals.user` on every request; only redirects on
  protected paths. Skips `/auth/me` when there's no `access_token` cookie.
- `src/i18n/` — `locales/en.ts` is the shape; `index.ts` (`getLocale`, `createT`, `translate`,
  `pickTranslation`, `INTL_LOCALES`); `react.tsx` (`LocaleProvider`, `useTranslation`).
- `src/components/ui/` — generic primitives. `src/components/react/` — app islands.
  `.astro` components in `src/components/` for static chrome (footer, tab bar, placeholders).

## Islands
- Every island's root wraps itself in `<AppProviders locale={locale}>` (QueryClient +
  LocaleProvider + TooltipProvider). Pass `locale` from `getLocale(Astro.cookies)`.
- The header is `transition:persist="site-header"`: it keeps state across navigations and gets
  new props. Reset per-page state by keying a child on the prop (`<SearchBar key={query} />`).
- Pass islands the minimum user slice (`toSessionUser`) — props are serialized into the HTML.
- `toast()` from `ui/toast` works from any island; the single `<Toaster />` lives in the header.
- Login, logout and locale change are hard navigations (`window.location`), theme is not.

## Styling
See `DESIGN.md`. Tokens only — never raw palette colours.
- `.pattern-girih` is itself a CSS mask: never put `mask-image` on the same element (it
  replaces the pattern and renders stripes). Fade it with a `.pattern-fade-*` wrapper.
- Tailwind v4 `translate-*` uses the CSS `translate` property, so keyframes animating
  `transform: scale()` compose with centered dialogs without extra work.

## Verifying in a browser
- Playwright screenshots hide the caret by injecting styles, which can surface as a React
  hydration-mismatch warning on inputs. Re-check without screenshots before chasing it.
