---
paths:
  - "client/**/*.{tsx,css}"
  - "admin/**/*.{tsx,css}"
---

# Styling

Tailwind CSS 3 utility classes only. No CSS-in-JS, CSS modules or component libraries.

## Tailwind content paths
- The client scans only `client/pages/` and `client/components/`. Classes written anywhere else, such as `client/lib/`, are not generated.
- Write full class names. Tailwind can't see dynamic ones like `` `bg-${color}-500` ``.

## Tokens
- Color: `slate-*` throughout. `emerald-*` only for success states and positive actions.
- Radius: `rounded-2xl` for cards and sections, `rounded-xl` for buttons and inputs.
- Layout: `max-w-6xl mx-auto` containers, `px-4 py-8` page padding, `p-4` to `p-6` in cards.

## Components
- Card: `rounded-2xl border border-slate-200 bg-white p-4`
- Primary button: `rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white`
- Secondary button: `rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold`
- Disabled: `disabled:opacity-60`
- Active nav: `bg-slate-900 text-white`, otherwise `text-slate-700 hover:bg-slate-50`

## Responsive
Mobile-first with `md:` and `lg:`. Grids: `grid gap-4 md:grid-cols-3`, sidebar `lg:grid-cols-[260px_1fr]`. Check 360px width in Armenian, which usually has the longest strings; nothing may overflow.

## Accessibility
- Text contrast meets WCAG AA (4.5:1). Avoid `text-slate-400` on white for body text.
- Interactive elements get a visible `focus-visible:` ring, and touch targets are at least 44px.
- Don't signal state with color alone.
