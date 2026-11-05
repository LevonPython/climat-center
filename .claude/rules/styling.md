---
paths:
  - "client/**/*.{tsx,css}"
  - "admin/**/*.{tsx,css}"
---

# Styling

Tailwind CSS 3 utility classes only. No CSS-in-JS, CSS modules or component libraries. The only hand-written CSS is `.rich-text` in `client/styles/globals.css`, for HTML that comes from the admin.

## Tailwind content paths
- The client scans only `client/pages/` and `client/components/`. Classes written anywhere else, such as `client/lib/`, are not generated.
- Write full class names. Tailwind can't see dynamic ones like `` `bg-${color}-500` ``.

## Public site tokens
The look copies climatecentr.ru, defined in `client/tailwind.config.js`:
- Colors: `brand` (`#00ADEF`), `ink` (headings), `body` (text), `panel`, `tint`, `mist`, `leaf`.
- Container: `max-w-site` (1240px), with a 240px sidebar.
- Breakpoints: `desk:` from 931px and `max-desk:` below it, where the mobile bar replaces the header. `wide:` from 1200px, where the hero buttons sit around the picture.
- `max-sm:` and `max-md:` exist only because they are declared in the config, widest first. Adding a custom max-width screen turns off the automatic ones, and later ones win in the stylesheet. `client/__tests__/tailwindScreens.test.ts` checks both.
- Fonts: Roboto, with Noto Sans Armenian for Armenian letters. Both come from `next/font` in `client/pages/_app.tsx`.
- Sprites and icons taken from the old site are in `client/public/theme/`.

White on `brand` does not reach 4.5:1 contrast. It is kept because the brief was to copy the design as it is, and it goes in the improvements list, so don't copy it onto new body text.

## Admin tokens
- Color: `slate-*` throughout. `emerald-*` only for success states and positive actions.
- Radius: `rounded-2xl` for cards and sections, `rounded-xl` for buttons and inputs.
- Card: `rounded-2xl border border-slate-200 bg-white p-4`
- Primary button: `rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white`
- Secondary button: `rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold`
- Disabled: `disabled:opacity-60`

## Responsive
Check 360px width in Armenian, which usually has the longest strings; nothing may overflow. `e2e/tests/mobile.spec.ts` checks this on every page type.

## Accessibility
- Interactive elements get a visible `focus-visible:` ring, and touch targets are at least 44px.
- Don't signal state with color alone.
