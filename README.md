# emarket — customer storefront

The public shopping site of the emarket marketplace (Uzbekistan, UZS, pickup-point fulfillment):
browse, search, product pages, multi-shop cart, checkout, order tracking, refunds.

Astro 7 (SSR, `@astrojs/node` standalone) · React 19 islands · Tailwind v4 · radix-ui ·
TanStack Query + axios.

## Getting started

```sh
nvm use            # Node >= 22.12
npm install
cp .env.example .env
npx astro sync
npm run dev        # or: npx astro dev --background
```

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Serve the build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | `astro check` (types in `.astro` files) |
| `npm run lint` | ESLint, zero warnings allowed |

## Environment

See `.env.example`. All client vars are `PUBLIC_`-prefixed and declared in `astro.config.mjs`.

## Docs

- `DESIGN.md` — tokens, typography, do's and don'ts.
- `.claude/skills/storefront/SKILL.md` — repo conventions and gotchas.
