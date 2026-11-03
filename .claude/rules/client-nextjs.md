---
paths:
  - "client/**/*.{ts,tsx}"
---

# Client / Next.js public site

Pages Router only (`client/pages/`). App Router advice from the `vercel:nextjs` or `nextjs-developer` skills (Server Components, Server Actions, `app/`) does not apply here.

## Data fetching
- ISR with `revalidate: 60`: home, about, contacts, services. SSR: booking, quiz.
- **A new ISR page must be added to `pathsForEvent`** in `client/pages/api/revalidate.ts`, or admin saves won't refresh it.
- Wrap API calls in `getStaticProps` in try/catch so builds survive an offline API.
- Next can't serialize `undefined`, so pass `value ?? null` in props.

```tsx
export const getStaticProps: GetStaticProps<Props> = async ({ locale }) => {
  const lang = locale || 'hy';
  let title: string | undefined;
  try {
    const content = await apiFetch<{ pages: any }>(`/api/content/${lang}`);
    if (content.ok) title = content.pages?.home?.hero?.title;
  } catch {
    // API may be offline during build
  }
  return {
    props: { ...(await serverSideTranslations(lang, ['common'], nextI18nextConfig)), title: title ?? null },
    revalidate: 60
  };
};
```

## i18n
- Default locale is `hy`. Always pass `nextI18nextConfig` as the third argument to `serverSideTranslations`.
- Every user-facing string goes through `useTranslation`, with `content ?? t('key')` for DB-backed fields.

## Components and pages
- Functional components with explicit prop types in `client/components/`. No state library.
- Wrap pages in `<Layout title={...}>`. New pages need a translated title and meta description.
- `apiFetch<T>` from `client/lib/api.ts`. Reuse `client/lib/phone.ts` and `client/lib/contactPhone.ts`.
- Only `NEXT_PUBLIC_*` reaches the browser. `REVALIDATE_SECRET` stays server-side.
- Don't use `dangerouslySetInnerHTML` for CMS content; nothing uses it today.
- Confirmations say what happened in plain words ("Request sent"), with no IDs or technical errors.

## Accessibility
One `h1` per page, labelled inputs (`htmlFor`), real `button` and `a` elements, form errors announced near the field.
