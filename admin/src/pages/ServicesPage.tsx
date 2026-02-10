import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>({ type: 'service', title_ru: '' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await qc.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiFetch<{ service: Service }>(`/api/services/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to delete');
      return resp.service;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const rows = useMemo(() => servicesQ.data || [], [servicesQ.data]);

  async function uploadImage(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const resp = await apiFetch<{ url: string }>('/api/upload', { method: 'POST', body: fd });
      if (!resp.ok) {
        setError(resp.error?.message || 'Ошибка загрузки');
        return;
      }
      setDraft((d) => ({ ...d, image_url: resp.url }));
    } catch {
      setError('Ошибка загрузки');
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
  }

  if (servicesQ.isLoading) return <div className="text-sm text-slate-600">Загрузка...</div>;
  if (servicesQ.isError) return <div className="text-sm text-red-600">{String(servicesQ.error)}</div>;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="font-extrabold">{editing ? 'Редактирование услуги' : 'Новая услуга'}</div>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft({ type: 'service', title_ru: '' });
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Отмена
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Тип</span>
            <input
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="repair / install / service ..."
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Цена (от)</span>
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
            <span className="text-sm font-semibold">Название (RU)</span>
            <input
              value={draft.title_ru || ''}
              onChange={(e) => setDraft((d) => ({ ...d, title_ru: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Название (EN)</span>
            <input
              value={draft.title_en || ''}
              onChange={(e) => setDraft((d) => ({ ...d, title_en: e.target.value || null }))}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Название (AM)</span>
            <input
              value={draft.title_am || ''}
              onChange={(e) => setDraft((d) => ({ ...d, title_am: e.target.value || null }))}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 md:col-span-1">
            <span className="text-sm font-semibold">Картинка</span>
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
            <span className="text-sm font-semibold">Описание (RU)</span>
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
            Активна
          </label>

          <button
            type="button"
            onClick={() => saveM.mutate({ id: editing?.id, data: draft })}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saveM.isPending || uploading}
          >
            {saveM.isPending ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>

        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        {saveM.isError ? <div className="mt-3 text-sm text-red-600">{String(saveM.error)}</div> : null}
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Название</th>
              <th className="text-left font-semibold px-4 py-3">Тип</th>
              <th className="text-left font-semibold px-4 py-3">Активна</th>
              <th className="text-left font-semibold px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="px-4 py-3">{s.title_ru || s.title_en || s.title_am || '—'}</td>
                <td className="px-4 py-3">{s.type}</td>
                <td className="px-4 py-3">{s.is_active ? 'Да' : 'Нет'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteM.mutate(s.id)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={deleteM.isPending}
                  >
                    Скрыть
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-600">
                  Нет услуг
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

