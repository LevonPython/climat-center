import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { LabeledField } from '../components/LabeledField';
import { LangTabs } from '../components/LangTabs';
import { ui } from '../components/ui';
import { LANGS, emptyLocalized, textDirection, type Lang, type Localized } from '../contentSchemas/types';
import { HOME_SLUG, PAGE_TYPES, SLUG_PATTERN, buildPageTree, localized, usePages, type Page, type PageRow, type PageStatus, type PageType } from '../lib/pages';
import { errorText, send } from '../lib/request';
import { useConfirmLeave, useUnsavedGuard } from '../lib/unsaved';

const SLUG_ERRORS = { 400: 'pages.addressInvalid', 409: 'pages.addressTaken' };

type NewPage = {
  slug: string;
  type: PageType;
  parent_id: string;
} & Localized<'title', string>;

const EMPTY_PAGE: NewPage = { slug: '', type: 'article', parent_id: '', ...emptyLocalized('title', '') };

function NewPageForm({ pages, onCancel }: { pages: Page[]; onCancel: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<NewPage>(EMPTY_PAGE);
  const [lang, setLang] = useState<Lang>('hy');
  const [problem, setProblem] = useState<string | null>(null);
  const confirmLeave = useConfirmLeave();
  useUnsavedGuard(JSON.stringify(draft) !== JSON.stringify(EMPTY_PAGE));

  const createM = useMutation({
    mutationFn: async () =>
      (
        await send<{ page: Page }>('POST', '/api/admin/pages', {
          slug: draft.slug.trim(),
          type: draft.type,
          parent_id: draft.parent_id || null,
          ...Object.fromEntries(LANGS.map((code) => [`title_${code}`, draft[`title_${code}`].trim() || null]))
        })
      ).page,
    onSuccess: async (page) => {
      await qc.invalidateQueries({ queryKey: ['pages'] });
      navigate(`/pages/${page.id}`);
    }
  });

  function submit() {
    if (!SLUG_PATTERN.test(draft.slug.trim())) {
      setProblem(t('pages.addressInvalid'));
      return;
    }
    if (!LANGS.some((code) => draft[`title_${code}`].trim())) {
      setProblem(t('pages.titleRequired'));
      return;
    }
    setProblem(null);
    createM.mutate();
  }

  const titleKey = `title_${lang}` as const;

  return (
    <div className={`${ui.card} grid gap-3`}>
      <div className="font-extrabold">{t('pages.newTitle')}</div>
      <div className="grid items-start gap-3 md:grid-cols-3">
        <LabeledField label={t('pages.address')} help={t('pages.addressHelp')}>
          <input className={ui.input} value={draft.slug} placeholder="usluga/remont" onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
        </LabeledField>
        <label className="grid gap-1">
          <span className={ui.label}>{t('pages.type')}</span>
          <select className={ui.input} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PageType })}>
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`pages.types.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={ui.label}>{t('pages.parent')}</span>
          <select className={ui.input} value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}>
            <option value="">{t('pages.noParent')}</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {localized(page, 'title', i18n.language) || page.slug}
              </option>
            ))}
          </select>
        </label>
      </div>
      <LangTabs value={lang} onChange={setLang} />
      <label className="grid gap-1">
        <span className={ui.label}>{t('pages.titleField')}</span>
        <input lang={lang} dir={textDirection(lang)} className={ui.input} value={draft[titleKey]} onChange={(e) => setDraft({ ...draft, [titleKey]: e.target.value })} />
      </label>
      {problem ? <div role="alert" className={ui.error}>{problem}</div> : null}
      {createM.isError ? <div role="alert" className={ui.error}>{errorText(t, createM.error, 'pages.createError', SLUG_ERRORS)}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ui.primary} disabled={createM.isPending} onClick={submit}>
          {createM.isPending ? t('common.saving') : t('pages.create')}
        </button>
        <button
          type="button"
          className={ui.secondary}
          onClick={() => {
            if (confirmLeave()) onCancel();
          }}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

const needsReview = (page: Page) => LANGS.filter((lang) => page[`needs_review_${lang}`]);

export function PagesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pagesQ = usePages();
  const [type, setType] = useState<'all' | PageType>('all');
  const [status, setStatus] = useState<'all' | PageStatus>('all');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const pages = useMemo(() => pagesQ.data || [], [pagesQ.data]);

  const rows = useMemo<PageRow[]>(
    () =>
      buildPageTree(pages).filter(
        (page) =>
          (type === 'all' || page.type === type) &&
          (status === 'all' || page.status === status) &&
          (!reviewOnly || needsReview(page).length > 0)
      ),
    [pages, type, status, reviewOnly]
  );

  const statusM = useMutation({
    mutationFn: (page: Page) =>
      send('PUT', `/api/admin/pages/${page.id}`, { status: page.status === 'published' ? 'hidden' : 'published' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] })
  });

  const deleteM = useMutation({
    mutationFn: (page: Page) => send('DELETE', `/api/admin/pages/${page.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] })
  });

  function remove(page: Page) {
    const name = localized(page, 'title', i18n.language) || page.slug;
    if (window.confirm(t('pages.confirmDelete', { name }))) deleteM.mutate(page);
  }

  if (pagesQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (!pagesQ.data) return <div role="alert" className={ui.error}>{errorText(t, pagesQ.error, 'common.loadError')}</div>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className={ui.label}>{t('pages.type')}</span>
            <select className={ui.input} value={type} onChange={(e) => setType(e.target.value as 'all' | PageType)}>
              <option value="all">{t('pages.all')}</option>
              {PAGE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`pages.types.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>{t('pages.status')}</span>
            <select className={ui.input} value={status} onChange={(e) => setStatus(e.target.value as 'all' | PageStatus)}>
              <option value="all">{t('pages.all')}</option>
              <option value="published">{t('pages.statuses.published')}</option>
              <option value="hidden">{t('pages.statuses.hidden')}</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
            {t('pages.onlyNeedsReview')}
          </label>
        </div>
        {creating ? null : (
          <button type="button" className={ui.primary} onClick={() => setCreating(true)}>
            {t('pages.new')}
          </button>
        )}
      </div>

      {creating ? <NewPageForm pages={pages} onCancel={() => setCreating(false)} /> : null}
      {pagesQ.isError ? <div role="alert" className={ui.error}>{errorText(t, pagesQ.error, 'common.loadError')}</div> : null}
      {statusM.isError ? <div role="alert" className={ui.error}>{errorText(t, statusM.error, 'pages.saveError')}</div> : null}
      {deleteM.isError ? <div role="alert" className={ui.error}>{errorText(t, deleteM.error, 'pages.deleteError')}</div> : null}

      <div className="grid gap-2">
        {rows.map((page) => {
          const flagged = needsReview(page);
          const title = localized(page, 'title', i18n.language) || page.slug;
          return (
            <div key={page.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3" style={{ marginInlineStart: page.depth * 20 }}>
              <div className="min-w-0">
                <Link to={`/pages/${page.id}`} className="break-words font-bold text-slate-900 underline underline-offset-2 hover:no-underline">
                  {title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="break-all text-xs text-slate-600">/{page.slug === HOME_SLUG ? '' : page.slug}</span>
                  <span className={ui.badge}>{t(`pages.types.${page.type}`)}</span>
                  <span className={page.status === 'published' ? ui.badge : ui.badgeWarning}>{t(`pages.statuses.${page.status}`)}</span>
                  {flagged.length ? (
                    <span className={ui.badgeWarning}>
                      {t('pages.needsReviewBadge')}: {flagged.map((lang) => lang.toUpperCase()).join(', ')}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {page.slug === HOME_SLUG && page.status === 'published' ? null : (
                  <button
                    type="button"
                    className={page.status === 'published' ? ui.secondary : ui.positive}
                    aria-label={`${page.status === 'published' ? t('common.hide') : t('pages.publish')}: ${title}`}
                    disabled={statusM.isPending}
                    onClick={() => statusM.mutate(page)}
                  >
                    {page.status === 'published' ? t('common.hide') : t('pages.publish')}
                  </button>
                )}
                {page.slug === HOME_SLUG ? null : (
                  <button type="button" className={ui.danger} aria-label={`${t('common.delete')}: ${title}`} disabled={deleteM.isPending} onClick={() => remove(page)}>
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!rows.length ? <div className={`${ui.card} text-center text-sm text-slate-600`}>{pages.length ? t('pages.emptyFiltered') : t('pages.empty')}</div> : null}
      </div>
    </div>
  );
}
