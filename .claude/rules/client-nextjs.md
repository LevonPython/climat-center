---
paths:
  - "client/**/*.{ts,tsx}"
---

# Client / Next.js public site

Pages Router only (`client/pages/`). App Router advice from the `vercel:nextjs` or `nextjs-developer` skills (Server Components, Server Actions, `app/`) does not apply here.

## Pages
The public site is data, not code. `pages/[...slug].tsx` and `pages/index.tsx` render any page from `GET /api/pages/:lang/:slug` through `components/PageView.tsx`, and `components/sections/` holds one component per block type (`SECTION_COMPONENTS`). A new page in the admin needs no code. A new block type needs a component there.
- Only `booking` and `quiz` are separate files, and they use `loadCommonPropsSafely`.
- `sitemap.xml` and `robots.txt` are generated from the published pages.
- Old addresses (`/about`, `/contacts`, `/services`) redirect in `next.config.js`.

## Data fetching
- ISR with `revalidate: 60` and `fallback: 'blocking'`.
- If the API fails, `getStaticProps` throws so the last good page stays up. A page with no title in this language is a 404: languages don't fall back to each other.
- A save in the admin refreshes the edited page through `pages/api/revalidate.ts`. Changes that touch every page, such as menus and settings, show within 60 seconds.
- Next can't serialize `undefined`, so pass `value ?? null` in props.

## i18n
- Default locale is `hy`. Always pass `nextI18nextConfig` as the third argument to `serverSideTranslations`.
- Every user-facing string goes through `useTranslation`. Interface text edited in the admin is merged over the bundled catalogue in `lib/site.ts`, and `components/site/PageTranslations.tsx` renders from each page's merged text. Don't go back to `appWithTranslation`: on the server it reads one shared store that never sees those edits.

## Components and pages
- Functional components with explicit prop types in `client/components/`. No state library.
- Wrap pages in `<Layout title={...}>`. `useSite()` gives menus, settings and services, and `useRequestPopup()` opens the request form.
- `apiFetch<T>` from `client/lib/api.ts`. Reuse `client/lib/phone.ts` and `client/lib/contactPhone.ts`.
- Only `NEXT_PUBLIC_*` reaches the browser. `REVALIDATE_SECRET` stays server-side.
- `dangerouslySetInnerHTML` appears only in `components/site/RichText.tsx`. The server sanitizes that HTML on save, so never add another use.
- Confirmations say what happened in plain words ("Request sent"), with no IDs or technical errors.

## Accessibility
One `h1` per page, labelled inputs (`htmlFor`), real `button` and `a` elements, form errors announced near the field.
