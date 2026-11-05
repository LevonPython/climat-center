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
`admin/src/components/BlockEditor.tsx` is the one schema-driven editor, with language tabs, version history and an advanced JSON mode. Site settings and page sections both use it. Change the schema on the server rather than special-casing a block in the admin.

## Shared pieces
- `request` and `send` in `admin/src/lib/request.ts` throw on a failed response. New screens use them instead of checking `resp.ok`, and show errors with `errorText`, which gives plain messages for session, permission, size and connection problems.
- `FieldEditor` renders a field by its `kind`, `RichTextEditor` is TipTap limited to what the server's sanitizer keeps, and `MediaPicker` chooses from the file library.
- The one class rich text may carry is `two-columns` on a list. The sanitizer allows it and `RichTextEditor` keeps it, so editing the text of an imported list doesn't change its look.
- Reordering uses `ReorderButtons` and `moveItem`, which work by keyboard and need no extra dependency.
- Every form with its own draft calls `useUnsavedGuard`. `LeaveGuard` then asks before any move to another screen, including the browser's Back button. Switching views inside a screen asks through `useConfirmLeave`.
- A failed background refresh keeps the data, so show the full-screen error only when `data` is missing, or an expired session wipes unsaved work.
- Put help text in `LabeledField`, not inside a `<label>`, or it becomes part of the field's spoken name.
