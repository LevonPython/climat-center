---
paths:
  - "admin/**/*.{ts,tsx}"
---

# Admin panel

Vite 6, React 18, TypeScript, `react-router-dom` v6, `@tanstack/react-query` v5. Pages live in `admin/src/pages/`.

## Auth and API
- JWT in `localStorage` (`cc_admin_token`), helpers in `admin/src/auth.ts`.
- `<Private>` in `admin/src/App.tsx` only redirects for UX. The server is what enforces access, so never rely on hiding a control.
- `apiFetch<T>` from `admin/src/api.ts` attaches the token and leaves `Content-Type` unset for `FormData`.
- `VITE_*` values ship to the browser, so no secrets.

## Data pattern

```tsx
const qc = useQueryClient();
const saveM = useMutation({
  mutationFn: async (input: Input) => {
    const resp = await apiFetch<{ foo: Foo }>('/api/foo', { method: 'POST', body: JSON.stringify(input) });
    if (!resp.ok) throw new Error(resp.error?.message || t('foo.saveError'));
    return resp.foo;
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ['foo'] })
});
```

- `apiFetch` resolves on API errors, so throw on `!resp.ok` or `onError` never fires.
- Disable submit buttons with `saveM.isPending`.

## Editors are non-technical
- Destructive or discard actions ask first with `window.confirm(t('...'))`.
- Show plain messages from `t()`, never raw errors or IDs.
- All text goes through `useTranslation`, in the admin's own catalogue (`admin/public/locales/`).
- Format dates with the active locale. Existing `ru-RU` calls are legacy; don't copy them.

## Content editing
`admin/src/pages/ContentPage.tsx` is schema-driven with language tabs, version history and an advanced JSON mode. Change the registry rather than special-casing a block in the page.
