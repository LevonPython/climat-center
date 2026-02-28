import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api';

type Service = {
  id: string;
  type: string;
  title_en: string | null;
  title_ru: string | null;
  title_am: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_am: string | null;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
};

type ServiceDraft = Partial<Service> & { type: string; title_ru?: string | null };

export function ServicesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>({ type: 'service', title_ru: '' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string } | null>(null);

  const servicesQ = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const resp = await apiFetch<{ services: Service[] }>('/api/services?includeInactive=true');
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to load');
      return resp.services;
    }
  });

  const saveM = useMutation({
    mutationFn: async (p: { id?: string; data: ServiceDraft }) => {
      const isEdit = Boolean(p.id);
      const resp = await apiFetch<{ service: Service }>(isEdit ? `/api/services/${p.id}` : '/api/services', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(p.data)
      });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to save');
      return resp.service;
    },
    onSuccess: async () => {
      setEditing(null);
      setDraft({ type: 'service', title_ru: '' });
      setFieldErrors(null);
      await qc.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const hideM = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiFetch<{ service: Service }>(`/api/services/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to delete');
      return resp.service;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const permanentDeleteM = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiFetch<{ service: Service }>(`/api/services/${id}/permanent`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to delete');
      return resp.service;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const activateM = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: true })
      });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to activate');
      return resp.service;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const rows = useMemo(() => servicesQ.data || [], [servicesQ.data]);

  function validateDraft(d: ServiceDraft) {
    const titleVals = [d.title_ru, d.title_en, d.title_am];
    const hasTitle = titleVals.some((v) => typeof v === 'string' && v.trim().length > 0);
    if (!hasTitle) {
      return { title: t('services.validationTitleRequired') };
    }
    return null;
  }

  async function uploadImage(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const resp = await apiFetch<{ url: string }>('/api/upload', { method: 'POST', body: fd });
      if (!resp.ok) {
        setError(resp.error?.message || t('services.uploadError'));
        return;
      }
      setDraft((d) => ({ ...d, image_url: resp.url }));
    } catch {
      setError(t('services.uploadError'));
    } finally {
      setUploading(false);
    }
  }

  function startEdit(s: Service) {
    setEditing(s);
    setDraft({
      type: s.type,
      title_ru: s.title_ru,
      title_en: s.title_en,
      title_am: s.title_am,
      description_ru: s.description_ru,
      description_en: s.description_en,
      description_am: s.description_am,
      price: s.price,
      image_url: s.image_url,
      is_active: s.is_active
    });
    setFieldErrors(null);
  }

  if (servicesQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (servicesQ.isError) return <div className="text-sm text-red-600">{String(servicesQ.error)}</div>;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="font-extrabold">{editing ? t('services.editTitle') : t('services.newTitle')}</div>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft({ type: 'service', title_ru: '' });
                setFieldErrors(null);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('services.type')}</span>
            <select
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="install">install — {t('services.typeInstall')}</option>
              <option value="repair">repair — {t('services.typeRepair')}</option>
              <option value="service">service — {t('services.typeService')}</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('services.priceFrom')}</span>
            <input
              type="number"
              value={typeof draft.price === 'number' ? draft.price : ''}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value ? Number(e.target.value) : null }))}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="2500"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('services.titleRu')}</span>
            <input
              value={draft.title_ru || ''}
              onChange={(e) => {
                setDraft((d) => ({ ...d, title_ru: e.target.value }));
                setFieldErrors((prev) => (prev?.title ? null : prev));
              }}
              className={`rounded-xl border px-3 py-2 ${fieldErrors?.title ? 'border-red-300' : 'border-slate-200'}`}
            />
            {fieldErrors?.title ? <div className="text-xs font-semibold text-red-700">{fieldErrors.title}</div> : null}
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('services.titleEn')}</span>
            <input
              value={draft.title_en || ''}
              onChange={(e) => {
                setDraft((d) => ({ ...d, title_en: e.target.value || null }));
                setFieldErrors((prev) => (prev?.title ? null : prev));
              }}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('services.titleAm')}</span>
            <input
              value={draft.title_am || ''}
              onChange={(e) => {
                setDraft((d) => ({ ...d, title_am: e.target.value || null }));
                setFieldErrors((prev) => (prev?.title ? null : prev));
              }}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 md:col-span-1">
            <span className="text-sm font-semibold">{t('services.image')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
              }}
              className="text-sm"
              disabled={uploading}
            />
            {draft.image_url ? <div className="text-xs text-slate-600 break-all">{draft.image_url}</div> : null}
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold">{t('services.descriptionRu')}</span>
            <textarea
              value={draft.description_ru || ''}
              onChange={(e) => setDraft((d) => ({ ...d, description_ru: e.target.value || null }))}
              className="min-h-24 rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draft.is_active ?? true}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            />
            {t('services.active')}
          </label>

          <button
            type="button"
            onClick={() => {
              const v = validateDraft(draft);
              if (v) {
                setFieldErrors(v);
                setError(null);
                return;
              }
              saveM.mutate({ id: editing?.id, data: draft });
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saveM.isPending || uploading}
          >
            {saveM.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>

        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        {saveM.isError ? <div className="mt-3 text-sm text-red-600">{String(saveM.error)}</div> : null}
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">{t('services.name')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('services.type')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('services.active')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="px-4 py-3">{s.title_ru || s.title_en || s.title_am || '—'}</td>
                <td className="px-4 py-3">{s.type}</td>
                <td className="px-4 py-3">{s.is_active ? t('common.yes') : t('common.no')}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    {t('services.edit')}
                  </button>
                  {s.is_active ? (
                    <button
                      type="button"
                      onClick={() => hideM.mutate(s.id)}
                      className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      disabled={hideM.isPending}
                    >
                      {t('services.hide')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activateM.mutate(s.id)}
                      className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      disabled={activateM.isPending}
                    >
                      {t('services.show')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(t('services.confirmDelete'))) return;
                      permanentDeleteM.mutate(s.id);
                    }}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={permanentDeleteM.isPending}
                  >
                    {t('services.delete')}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-600">
                  {t('services.empty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

