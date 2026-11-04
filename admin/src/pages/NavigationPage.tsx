import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LabeledField } from '../components/LabeledField';
import { LangTabs } from '../components/LangTabs';
import { ReorderButtons } from '../components/ReorderButtons';
import { ui } from '../components/ui';
import { LANGS, type Lang } from '../contentSchemas/types';
import { moveItem } from '../lib/order';
import { HOME_SLUG, localized, usePages, type Page } from '../lib/pages';
import { errorText, request, send } from '../lib/request';
import { useConfirmLeave, useUnsavedGuard } from '../lib/unsaved';

const LOCATIONS = ['topbar', 'header', 'footer', 'mobile', 'cities'] as const;
type Location = (typeof LOCATIONS)[number];
const SAFE_LINK = /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i;

type NavItem = {
  id: string;
  location: Location;
  page_id: string | null;
  url: string | null;
  label_hy: string | null;
  label_ru: string | null;
  label_en: string | null;
  sort_order: number;
  is_visible: boolean;
};

type ItemDraft = Pick<NavItem, 'page_id' | 'url' | 'label_hy' | 'label_ru' | 'label_en'>;
const EMPTY_DRAFT: ItemDraft = { page_id: null, url: null, label_hy: null, label_ru: null, label_en: null };

type ItemFormProps = {
  initial: ItemDraft;
  pages: Page[];
  saving: boolean;
  onSave: (draft: ItemDraft) => void;
  onCancel: () => void;
};

function ItemForm({ initial, pages, saving, onSave, onCancel }: ItemFormProps) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [lang, setLang] = useState<Lang>('hy');
  const [useLink, setUseLink] = useState(Boolean(initial.url));
  const [problem, setProblem] = useState<string | null>(null);
  const labelKey = `label_${lang}` as const;
  useUnsavedGuard(JSON.stringify(draft) !== JSON.stringify(initial));

  function submit() {
    if (!LANGS.some((code) => draft[`label_${code}`]?.trim())) {
      setProblem(t('navigation.labelRequired'));
      return;
    }
    if (useLink ? !draft.url : !draft.page_id) {
      setProblem(t('navigation.targetRequired'));
      return;
    }
    if (useLink && !SAFE_LINK.test(draft.url || '')) {
      setProblem(t('common.linkInvalid'));
      return;
    }
    setProblem(null);
    onSave(useLink ? { ...draft, page_id: null } : { ...draft, url: null });
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <LangTabs value={lang} onChange={setLang} />
      <label className="grid gap-1">
        <span className={ui.label}>{t('navigation.label')}</span>
        <input
          lang={lang}
          className={ui.input}
          value={draft[labelKey] || ''}
          onChange={(e) => setDraft({ ...draft, [labelKey]: e.target.value.trim() ? e.target.value : null })}
        />
      </label>
      <fieldset className="grid gap-2">
        <legend className={ui.label}>{t('navigation.target')}</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="radio" name="nav-target" checked={!useLink} onChange={() => setUseLink(false)} />
            {t('navigation.targetPage')}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="radio" name="nav-target" checked={useLink} onChange={() => setUseLink(true)} />
            {t('navigation.targetLink')}
          </label>
        </div>
        {useLink ? (
          <LabeledField label={t('navigation.link')} help={t('navigation.linkHelp')}>
            <input className={ui.input} placeholder="/booking" value={draft.url || ''} onChange={(e) => setDraft({ ...draft, url: e.target.value.trim() || null })} />
          </LabeledField>
        ) : (
          <label className="grid gap-1">
            <span className={ui.label}>{t('navigation.targetPage')}</span>
            <select className={ui.input} value={draft.page_id || ''} onChange={(e) => setDraft({ ...draft, page_id: e.target.value || null })}>
              <option value="">{t('blocks.chooseOption')}</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {localized(page, 'title', i18n.language) || page.slug}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>
      {problem ? <div role="alert" className={ui.error}>{problem}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ui.primary} disabled={saving} onClick={submit}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className={ui.secondary} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export function NavigationPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pagesQ = usePages();
  const pages = pagesQ.data || [];
  const [location, setLocation] = useState<Location>('header');
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const confirmLeave = useConfirmLeave();
  const refresh = () => qc.invalidateQueries({ queryKey: ['navigation'] });

  const itemsQ = useQuery({
    queryKey: ['navigation', location],
    queryFn: async () => (await request<{ items: NavItem[] }>(`/api/admin/navigation?location=${location}`)).items
  });
  const items = itemsQ.data || [];

  const saveM = useMutation({
    mutationFn: (draft: ItemDraft) =>
      editingId && editingId !== 'new'
        ? send('PUT', `/api/admin/navigation/${editingId}`, draft)
        : send('POST', '/api/admin/navigation', { ...draft, location, sort_order: items.length }),
    onSuccess: async () => {
      setEditingId(null);
      await refresh();
    }
  });
  const orderM = useMutation({
    mutationFn: (ids: string[]) => send('PUT', '/api/admin/navigation/order', { ids }),
    onSuccess: refresh
  });
  const visibilityM = useMutation({
    mutationFn: (item: NavItem) => send('PUT', `/api/admin/navigation/${item.id}`, { is_visible: !item.is_visible }),
    onSuccess: refresh
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => send('DELETE', `/api/admin/navigation/${id}`),
    onSuccess: refresh
  });
  const failure = saveM.error || orderM.error || visibilityM.error || deleteM.error;

  function targetOf(item: NavItem): string {
    if (item.url) return item.url;
    const page = pages.find((candidate) => candidate.id === item.page_id);
    if (!page) return '';
    return page.slug === HOME_SLUG ? '/' : `/${page.slug}`;
  }

  function chooseLocation(next: Location) {
    if (next === location || !confirmLeave()) return;
    setEditingId(null);
    setLocation(next);
  }

  function openForm(next: string | 'new' | null) {
    if (confirmLeave()) setEditingId(next);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t('navigation.location')} className="flex flex-wrap gap-2">
          {LOCATIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={location === value}
              className={[ui.tab, location === value ? ui.tabActive : ui.tabIdle].join(' ')}
              onClick={() => chooseLocation(value)}
            >
              {t(`navigation.locations.${value}`)}
            </button>
          ))}
        </div>
        <button type="button" className={ui.primary} disabled={editingId === 'new'} onClick={() => openForm('new')}>
          {t('navigation.add')}
        </button>
      </div>

      {failure ? <div role="alert" className={ui.error}>{errorText(t, failure, 'navigation.saveError')}</div> : null}
      {itemsQ.isError ? <div role="alert" className={ui.error}>{errorText(t, itemsQ.error, 'common.loadError')}</div> : null}
      {itemsQ.isLoading ? <div className="text-sm text-slate-600">{t('common.loading')}</div> : null}

      {editingId === 'new' ? (
        <ItemForm key="new" initial={EMPTY_DRAFT} pages={pages} saving={saveM.isPending} onSave={(draft) => saveM.mutate(draft)} onCancel={() => openForm(null)} />
      ) : null}

      <div className="grid gap-2">
        {items.map((item, index) => {
          const name = localized(item, 'label', i18n.language) || targetOf(item);
          return (
            <div key={item.id} className={`${ui.card} grid gap-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="break-words font-semibold">{name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="break-all text-xs text-slate-600">{targetOf(item)}</span>
                    {item.is_visible ? null : <span className={ui.badgeWarning}>{t('sections.hidden')}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ReorderButtons
                    index={index}
                    total={items.length}
                    name={name}
                    disabled={orderM.isPending}
                    onMove={(delta) => orderM.mutate(moveItem(items, index, delta).map((other) => other.id))}
                  />
                  <button type="button" className={ui.secondary} aria-label={`${t('common.edit')}: ${name}`} onClick={() => openForm(editingId === item.id ? null : item.id)}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className={item.is_visible ? ui.secondary : ui.positive}
                    aria-label={`${item.is_visible ? t('common.hide') : t('common.show')}: ${name}`}
                    disabled={visibilityM.isPending}
                    onClick={() => visibilityM.mutate(item)}
                  >
                    {item.is_visible ? t('common.hide') : t('common.show')}
                  </button>
                  <button
                    type="button"
                    className={ui.danger}
                    aria-label={`${t('common.delete')}: ${name}`}
                    disabled={deleteM.isPending}
                    onClick={() => {
                      if (window.confirm(t('navigation.confirmDelete', { name }))) deleteM.mutate(item.id);
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
              {editingId === item.id ? (
                <ItemForm
                  key={item.id}
                  initial={{ page_id: item.page_id, url: item.url, label_hy: item.label_hy, label_ru: item.label_ru, label_en: item.label_en }}
                  pages={pages}
                  saving={saveM.isPending}
                  onSave={(draft) => saveM.mutate(draft)}
                  onCancel={() => openForm(null)}
                />
              ) : null}
            </div>
          );
        })}
        {itemsQ.isSuccess && !items.length && editingId !== 'new' ? <div className={`${ui.card} text-center text-sm text-slate-600`}>{t('navigation.empty')}</div> : null}
      </div>
    </div>
  );
}
