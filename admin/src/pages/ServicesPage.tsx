import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageField } from '../components/ImageField';
import { LabeledField } from '../components/LabeledField';
import { LangTabs } from '../components/LangTabs';
import { ReorderButtons } from '../components/ReorderButtons';
import { ui } from '../components/ui';
import { localizedKeys, textDirection, type Lang, type Localized } from '../contentSchemas/types';
import { moveItem } from '../lib/order';
import { localized, usePages } from '../lib/pages';
import { stableStringify } from '../contentSchemas/utils';
import { errorText, request, send } from '../lib/request';
import { useConfirmLeave, useUnsavedGuard } from '../lib/unsaved';

type Service = {
  id: string;
  type: string;
  category: 'service' | 'fault';
  page_id: string | null;
  show_in_menu: boolean;
  show_in_pills: boolean;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
} & Localized<'title', string | null> &
  Localized<'description', string | null> &
  Localized<'menu_title', string | null> &
  Localized<'pill_title', string | null>;

type ServiceDraft = Partial<Omit<Service, 'id'>> & { type: string };

const EMPTY_DRAFT: ServiceDraft = { type: 'service', category: 'service' };
const pickDraft = (s: Service) => Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, s[field]])) as ServiceDraft;
const TYPE_LABELS: Record<string, string> = {
  install: 'services.typeInstall',
  repair: 'services.typeRepair',
  service: 'services.typeService'
};
const EDITABLE_FIELDS = [
  'type', 'category', 'page_id',
  ...(['title', 'description', 'menu_title', 'pill_title'] as const).flatMap((base) => localizedKeys(base)),
  'show_in_menu', 'show_in_pills', 'price', 'image_url', 'is_active'
] as const;

export function ServicesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(EMPTY_DRAFT);
  const [lang, setLang] = useState<Lang>('hy');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string } | null>(null);
  const [placementOpen, setPlacementOpen] = useState(false);
  const pagesQ = usePages(placementOpen);
  const confirmLeave = useConfirmLeave();
  useUnsavedGuard(stableStringify(draft) !== stableStringify(editing ? pickDraft(editing) : EMPTY_DRAFT));

  const servicesQ = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await request<{ services: Service[] }>('/api/services?includeInactive=true')).services
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['services'] });

  const saveM = useMutation({
    mutationFn: async (p: { id?: string; data: ServiceDraft }) =>
      (await (p.id ? send<{ service: Service }>('PUT', `/api/services/${p.id}`, p.data) : send<{ service: Service }>('POST', '/api/services', p.data))).service,
    onSuccess: async () => {
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      setFieldErrors(null);
      await refresh();
    }
  });

  const hideM = useMutation({
    mutationFn: (id: string) => send('DELETE', `/api/services/${id}`),
    onSuccess: refresh
  });

  const permanentDeleteM = useMutation({
    mutationFn: (id: string) => send('DELETE', `/api/services/${id}/permanent`),
    onSuccess: refresh
  });

  const activateM = useMutation({
    mutationFn: (id: string) => send('PUT', `/api/services/${id}`, { is_active: true }),
    onSuccess: refresh
  });

  const orderM = useMutation({
    mutationFn: (ids: string[]) => send('PUT', '/api/admin/services/order', { ids }),
    onSuccess: refresh
  });

  const rows = useMemo(() => servicesQ.data || [], [servicesQ.data]);

  function validateDraft(d: ServiceDraft) {
    const hasTitle = localizedKeys('title').some((key) => (d[key] || '').trim().length > 0);
    if (!hasTitle) {
      return { title: t('services.validationTitleRequired') };
    }
    return null;
  }

  function startEdit(s: Service) {
    if (!confirmLeave()) return;
    setEditing(s);
    setDraft(pickDraft(s));
    setFieldErrors(null);
  }

  const setText = (field: 'title' | 'description' | 'menu_title' | 'pill_title', value: string) => {
    setDraft((d) => ({ ...d, [`${field}_${lang}`]: value.trim() ? value : null }));
    if (field === 'title') setFieldErrors(null);
  };
  const textOf = (field: 'title' | 'description' | 'menu_title' | 'pill_title') => draft[`${field}_${lang}`] || '';

  if (servicesQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (!servicesQ.data) return <div role="alert" className={ui.error}>{errorText(t, servicesQ.error, 'common.loadError')}</div>;

  const actionFailure = orderM.error || hideM.error || activateM.error || permanentDeleteM.error || (servicesQ.isError ? servicesQ.error : null);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="font-extrabold">{editing ? t('services.editTitle') : t('services.newTitle')}</div>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                if (!confirmLeave()) return;
                setEditing(null);
                setDraft(EMPTY_DRAFT);
                setFieldErrors(null);
              }}
              className={ui.secondary}
            >
              {t('common.cancel')}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid items-start gap-4 md:grid-cols-3">
          <label className="grid gap-1">
            <span className={ui.label}>{t('services.category')}</span>
            <select
              value={draft.category || 'service'}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Service['category'] }))}
              className={ui.input}
            >
              <option value="service">{t('services.categoryService')}</option>
              <option value="fault">{t('services.categoryFault')}</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>{t('services.type')}</span>
            <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} className={ui.input}>
              <option value="install">{t('services.typeInstall')}</option>
              <option value="repair">{t('services.typeRepair')}</option>
              <option value="service">{t('services.typeService')}</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>{t('services.priceFrom')}</span>
            <input
              type="number"
              value={typeof draft.price === 'number' ? draft.price : ''}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value ? Number(e.target.value) : null }))}
              className={ui.input}
            />
          </label>
        </div>

        <div className="mt-4">
          <LangTabs value={lang} onChange={setLang} />
        </div>

        <div className="mt-4 grid gap-4">
          <LabeledField label={t('services.titleField')} error={fieldErrors?.title}>
            <input lang={lang} dir={textDirection(lang)} value={textOf('title')} onChange={(e) => setText('title', e.target.value)} className={fieldErrors?.title ? ui.inputInvalid : ui.input} />
          </LabeledField>
          <label className="grid gap-1">
            <span className={ui.label}>{t('services.descriptionField')}</span>
            <textarea lang={lang} dir={textDirection(lang)} value={textOf('description')} onChange={(e) => setText('description', e.target.value)} className={`${ui.input} min-h-24`} />
          </label>
          <ImageField label={t('services.image')} value={draft.image_url || null} onChange={(url) => setDraft((d) => ({ ...d, image_url: url }))} />
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 p-3" onToggle={(e) => setPlacementOpen(e.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">{t('services.placement')}</summary>
          <div className="mt-2 grid items-start gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className={ui.label}>{t('services.menuTitle')}</span>
              <input lang={lang} dir={textDirection(lang)} value={textOf('menu_title')} onChange={(e) => setText('menu_title', e.target.value)} className={ui.input} />
            </label>
            <label className="grid gap-1">
              <span className={ui.label}>{t('services.pillTitle')}</span>
              <input lang={lang} dir={textDirection(lang)} value={textOf('pill_title')} onChange={(e) => setText('pill_title', e.target.value)} className={ui.input} />
            </label>
            <label className="grid gap-1">
              <span className={ui.label}>{t('services.linkedPage')}</span>
              <select value={draft.page_id || ''} onChange={(e) => setDraft((d) => ({ ...d, page_id: e.target.value || null }))} className={ui.input}>
                <option value="">{t('services.noLinkedPage')}</option>
                {(pagesQ.data || []).map((page) => (
                  <option key={page.id} value={page.id}>
                    {localized(page, 'title', i18n.language) || page.slug}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-1">
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.show_in_menu ?? true} onChange={(e) => setDraft((d) => ({ ...d, show_in_menu: e.target.checked }))} />
                {t('services.showInMenu')}
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.show_in_pills ?? false} onChange={(e) => setDraft((d) => ({ ...d, show_in_pills: e.target.checked }))} />
                {t('services.showInPills')}
              </label>
            </div>
          </div>
        </details>

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
                return;
              }
              saveM.mutate({ id: editing?.id, data: draft });
            }}
            className={ui.primary}
            disabled={saveM.isPending}
          >
            {saveM.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>

        {saveM.isError ? <div role="alert" className={`mt-3 ${ui.error}`}>{errorText(t, saveM.error, 'services.saveError')}</div> : null}
      </div>

      {actionFailure ? <div role="alert" className={ui.error}>{errorText(t, actionFailure, 'services.saveError')}</div> : null}

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">{t('services.name')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('services.category')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('services.type')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('services.active')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, index) => {
              const name = localized(s, 'title', i18n.language) || '—';
              return (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{name}</td>
                  <td className="px-4 py-3">{s.category === 'fault' ? t('services.categoryFault') : t('services.categoryService')}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[s.type] ? t(TYPE_LABELS[s.type]) : s.type}</td>
                  <td className="px-4 py-3">{s.is_active ? t('common.yes') : t('common.no')}</td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    <ReorderButtons
                      index={index}
                      total={rows.length}
                      name={name}
                      disabled={orderM.isPending}
                      onMove={(delta) => orderM.mutate(moveItem(rows, index, delta).map((row) => row.id))}
                    />
                    <button type="button" onClick={() => startEdit(s)} className={ui.secondary}>
                      {t('services.edit')}
                    </button>
                    {s.is_active ? (
                      <button type="button" onClick={() => hideM.mutate(s.id)} className={ui.danger} disabled={hideM.isPending}>
                        {t('services.hide')}
                      </button>
                    ) : (
                      <button type="button" onClick={() => activateM.mutate(s.id)} className={ui.positive} disabled={activateM.isPending}>
                        {t('services.show')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(t('services.confirmDelete'))) return;
                        permanentDeleteM.mutate(s.id);
                      }}
                      className={ui.danger}
                      disabled={permanentDeleteM.isPending}
                    >
                      {t('services.delete')}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-600">
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
