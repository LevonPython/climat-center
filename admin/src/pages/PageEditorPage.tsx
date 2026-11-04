import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { LabeledField } from '../components/LabeledField';
import { LangTabs } from '../components/LangTabs';
import { SectionsEditor, type Section } from '../components/SectionsEditor';
import { ui } from '../components/ui';
import { LANGS, type Lang } from '../contentSchemas/types';
import { stableStringify } from '../contentSchemas/utils';
import { HOME_SLUG, PAGE_TYPES, SLUG_PATTERN, descendantIds, localized, usePages, type Page, type PageStatus, type PageType } from '../lib/pages';
import { errorText, request, send } from '../lib/request';
import { useUnsavedGuard } from '../lib/unsaved';

type PageWithSections = Page & { sections: Section[] };

const WRITABLE_FIELDS = [
  'slug', 'type', 'parent_id', 'status', 'sort_order',
  'title_hy', 'title_ru', 'title_en',
  'meta_title_hy', 'meta_title_ru', 'meta_title_en',
  'meta_description_hy', 'meta_description_ru', 'meta_description_en',
  'needs_review_hy', 'needs_review_ru', 'needs_review_en'
] as const;

type PageDraft = Pick<Page, (typeof WRITABLE_FIELDS)[number]>;

const pickDraft = (page: Page): PageDraft =>
  Object.fromEntries(WRITABLE_FIELDS.map((field) => [field, page[field]])) as PageDraft;

const SAVE_ERRORS = { 400: 'pages.addressInvalid', 409: 'pages.addressTaken' };

function PageForm({ page }: { page: Page }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pagesQ = usePages();
  const [saved, setSaved] = useState<PageDraft>(() => pickDraft(page));
  const [draft, setDraft] = useState<PageDraft>(saved);
  const [lang, setLang] = useState<Lang>('hy');
  const [justSaved, setJustSaved] = useState(false);
  const isHome = page.slug === HOME_SLUG;
  const slugValid = SLUG_PATTERN.test(draft.slug);
  const isDirty = stableStringify(saved) !== stableStringify(draft);
  useUnsavedGuard(isDirty);

  const parents = useMemo(() => {
    const all = pagesQ.data || [];
    const excluded = descendantIds(all, page.id);
    return all.filter((candidate) => candidate.id !== page.id && !excluded.has(candidate.id));
  }, [pagesQ.data, page.id]);

  const saveM = useMutation({
    mutationFn: async (values: PageDraft) => (await send<{ page: Page }>('PUT', `/api/admin/pages/${page.id}`, values)).page,
    onSuccess: async (updated) => {
      const next = pickDraft(updated);
      setSaved(next);
      setDraft(next);
      setJustSaved(true);
      await Promise.all([qc.invalidateQueries({ queryKey: ['pages'] }), qc.invalidateQueries({ queryKey: ['page', page.id] })]);
    }
  });

  function edit(patch: Partial<PageDraft>) {
    setJustSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  }

  const setText = (field: 'title' | 'meta_title' | 'meta_description', value: string) =>
    edit({ [`${field}_${lang}`]: value.trim() ? value : null });
  const textOf = (field: 'title' | 'meta_title' | 'meta_description') => draft[`${field}_${lang}`] || '';

  return (
    <div className={`${ui.card} grid gap-4`}>
      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-5">
        <LabeledField
          className="lg:col-span-2"
          label={t('pages.address')}
          help={t('pages.addressHelp')}
          error={slugValid ? null : t('pages.addressInvalid')}
        >
          <input
            className={slugValid ? ui.input : ui.inputInvalid}
            aria-invalid={!slugValid}
            value={draft.slug}
            disabled={isHome}
            onChange={(e) => edit({ slug: e.target.value })}
          />
        </LabeledField>
        <label className="grid gap-1">
          <span className={ui.label}>{t('pages.type')}</span>
          <select className={ui.input} value={draft.type} onChange={(e) => edit({ type: e.target.value as PageType })}>
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`pages.types.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={ui.label}>{t('pages.status')}</span>
          <select
            className={ui.input}
            value={draft.status}
            disabled={isHome && saved.status === 'published'}
            onChange={(e) => edit({ status: e.target.value as PageStatus })}
          >
            <option value="published">{t('pages.statuses.published')}</option>
            <option value="hidden">{t('pages.statuses.hidden')}</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className={ui.label}>{t('pages.order')}</span>
          <input
            type="number"
            min={0}
            className={ui.input}
            value={draft.sort_order}
            onChange={(e) => edit({ sort_order: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="grid gap-1 lg:col-span-2">
          <span className={ui.label}>{t('pages.parent')}</span>
          <select className={ui.input} value={draft.parent_id || ''} onChange={(e) => edit({ parent_id: e.target.value || null })}>
            <option value="">{t('pages.noParent')}</option>
            {parents.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {localized(candidate, 'title', i18n.language) || candidate.slug}
              </option>
            ))}
          </select>
        </label>
      </div>

      <LangTabs value={lang} onChange={setLang} />
      <label className="grid gap-1">
        <span className={ui.label}>{t('pages.titleField')}</span>
        <input lang={lang} className={ui.input} value={textOf('title')} onChange={(e) => setText('title', e.target.value)} />
      </label>
      <LabeledField label={t('pages.metaTitle')} help={t('pages.metaTitleHelp')}>
        <input lang={lang} className={ui.input} value={textOf('meta_title')} onChange={(e) => setText('meta_title', e.target.value)} />
      </LabeledField>
      <LabeledField label={t('pages.metaDescription')} help={t('pages.metaDescriptionHelp')}>
        <textarea lang={lang} className={`${ui.input} min-h-24`} value={textOf('meta_description')} onChange={(e) => setText('meta_description', e.target.value)} />
      </LabeledField>

      <fieldset className="grid gap-1">
        <legend className={ui.label}>{t('pages.needsReview')}</legend>
        <div className="flex flex-wrap gap-4">
          {LANGS.map((code) => (
            <label key={code} className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft[`needs_review_${code}`]}
                onChange={(e) => edit({ [`needs_review_${code}`]: e.target.checked })}
              />
              {code.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      {saveM.isError ? <div role="alert" className={ui.error}>{errorText(t, saveM.error, 'pages.saveError', SAVE_ERRORS)}</div> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={ui.primary} disabled={!isDirty || !slugValid || saveM.isPending} onClick={() => saveM.mutate(draft)}>
          {saveM.isPending ? t('common.saving') : t('common.save')}
        </button>
        {isDirty ? <span className="text-xs font-bold text-amber-800">{t('content.unsaved')}</span> : null}
        {justSaved && !isDirty ? <span role="status" className={ui.success}>{t('common.saved')}</span> : null}
      </div>
    </div>
  );
}

export function PageEditorPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const pageQ = useQuery({
    queryKey: ['page', id],
    queryFn: async () => (await request<{ page: PageWithSections }>(`/api/admin/pages/${id}`)).page
  });

  if (pageQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (!pageQ.data) {
    return <div role="alert" className={ui.error}>{errorText(t, pageQ.error, 'pages.notFound', { 400: 'pages.notFound', 404: 'pages.notFound' })}</div>;
  }

  return (
    <div className="grid gap-4">
      <div>
        <Link to="/pages" className={`${ui.secondary} inline-flex items-center`}>
          ← {t('pages.back')}
        </Link>
      </div>
      {pageQ.isError ? <div role="alert" className={ui.error}>{errorText(t, pageQ.error, 'common.loadError')}</div> : null}
      <PageForm key={pageQ.data.id} page={pageQ.data} />
      <SectionsEditor pageId={pageQ.data.id} sections={pageQ.data.sections} />
    </div>
  );
}
