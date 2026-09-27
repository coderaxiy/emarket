# Storefront design system — "Modern Silk Road bazaar"

Consumer-facing, warm, product-first, mobile-first. Rooted in Uzbekistan without being kitsch.
The *system* matches the sibling apps (tokens, `light-dark()`, elevation order, cva primitives,
honest data); the *identity* is deliberately different from their neutral SaaS look.

## Tokens

All colours live in `src/styles/global.css` as CSS variables defined with `light-dark()` and are
exposed to Tailwind through `@theme inline` (`bg-card`, `text-muted-foreground`, …).

| Token | Role |
|---|---|
| `background` / `foreground` | Warm paper / deep ink (light) — warm charcoal / cream (dark) |
| `muted` / `muted-foreground` | Recessed surfaces, secondary text |
| `card`, `popover` | Raised surfaces |
| `primary` | Saffron-pomegranate. **Commerce actions only**: add to cart, checkout, price highlights |
| `accent` | Samarkand-tile turquoise. Links, info, selected filters, focus ring |
| `secondary` | Quiet buttons, chips |
| `destructive`, `success`, `warning` | Status |
| `sale` | Reserved for discounts, distinct from `destructive`. Unused until the backend supports discounts |
| `border`, `input`, `ring` | Lines and focus |

`--radius: 1rem`; `rounded-sm|md|lg|xl` derive from it.

**Elevation (both themes):** `background` < `muted` < `card`/`popover`. In dark mode, raised
surfaces are *lighter*. Getting this backwards makes cards recede.

**Theme** comes from the `theme` cookie (`light | dark | system`), rendered server-side as
`<html data-theme>`. `system` leaves `color-scheme: light dark` so the OS decides; `light`/`dark`
pin `color-scheme`. The `dark:` variant targets `[data-theme='dark']` only, so prefer tokens over
`dark:` overrides.

## Typography

- **Display — Unbounded Variable** (`font-display`): hero, section and page titles only.
- **Body/UI — Onest Variable** (`font-sans`, the default).
- Both self-hosted via `@fontsource-variable/*`, both cover Latin + Cyrillic.
- Not Inter/Geist (generic) and not Manrope (the siblings' face).
- Prices: body font, `font-semibold tabular-nums`, formatted with `Intl.NumberFormat` in UZS.

## Pattern

`.pattern-girih` — an eight-point-star lattice tinted with `accent`. Use sparingly: section
dividers, empty states, the footer. **Never behind product imagery.**

## Motion

150–250 ms, purposeful: cart drawer slide, add-to-cart badge bump + toast, skeleton shimmer.
Skeletons over spinners. `prefers-reduced-motion` is honoured globally in `global.css`.

## Do

- Use tokens for every colour. Add a token if you need a new semantic colour.
- Let product photos be the hero; chrome recedes.
- `tabular-nums` on prices, counts and dates.
- Visible focus ring (`ring-ring` / global `:focus-visible`), `aria-label` on icon-only buttons.
- WCAG AA contrast in both themes.

## Don't

- Raw Tailwind palette colours (`bg-white`, `text-gray-500`, `bg-green-100`).
- Fabricated ratings, reviews, "only 3 left", discounts, sold counts or delivery estimates.
- Fake promos in the hero — editorial copy only.
- Tailwind v4 `scale-x-*` on the page progress bar (it sets CSS `scale`, not `transform`).
