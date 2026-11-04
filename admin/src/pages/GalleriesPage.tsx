import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '../api';
import { LabeledField } from '../components/LabeledField';
import { LangTabs } from '../components/LangTabs';
import { MediaPicker } from '../components/MediaPicker';
import { ReorderButtons } from '../components/ReorderButtons';
import { ui } from '../components/ui';
import type { Lang } from '../contentSchemas/types';
import { moveItem } from '../lib/order';
import { localized } from '../lib/pages';
import { errorText, request, send } from '../lib/request';
import { useConfirmLeave, useUnsavedGuard } from '../lib/unsaved';

const COLLECTIONS = ['brands', 'certificates', 'works'] as const;
type Collection = (typeof COLLECTIONS)[number];
const SAFE_LINK = /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i;

type GalleryItem = {
  id: string;
  collection: Collection;
  media_id: string;
  url: string;
  title_hy: string | null;
  title_ru: string | null;
  title_en: string | null;
  link_url: string | null;
  is_visible: boolean;
};

type ItemRowProps = {
  item: GalleryItem;
  index: number;
  total: number;
  lang: Lang;
  moving: boolean;
  onMove: (delta: number) => void;
  onChanged: () => Promise<unknown>;
};

function ItemRow({ item, index, total, lang, moving, onMove, onChanged }: ItemRowProps) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState({ title_hy: item.title_hy, title_ru: item.title_ru, title_en: item.title_en, link_url: item.link_url });
  const [justSaved, setJustSaved] = useState(false);
  const titleKey = `title_${lang}` as const;
  const isDirty = (['title_hy', 'title_ru', 'title_en', 'link_url'] as const).some((key) => draft[key] !== item[key]);
  const linkValid = !draft.link_url || SAFE_LINK.test(draft.link_url);
  const name = localized(item, 'title', i18n.language) || t('galleries.itemNumber', { number: index + 1 });
  useUnsavedGuard(isDirty);

  const saveM = useMutation({
    mutationFn: () => send('PUT', `/api/admin/galleries/${item.id}`, draft),
    onSuccess: async () => {
      setJustSaved(true);
      await onChanged();
    }
  });
  const visibilityM = useMutation({
    mutationFn: () => send('PUT', `/api/admin/galleries/${item.id}`, { is_visible: !item.is_visible }),
    onSuccess: onChanged
  });
  const removeM = useMutation({
    mutationFn: () => send('DELETE', `/api/admin/galleries/${item.id}`),
    onSuccess: onChanged
  });
  const failure = saveM.error || visibilityM.error || removeM.error;

  return (
    <div className={`${ui.card} grid gap-3 md:grid-cols-[120px_1fr]`}>
      <img src={assetUrl(item.url)} alt={name} loading="lazy" className="h-24 w-full rounded-lg bg-slate-50 object-contain" />
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className={ui.label}>{t('galleries.titleField')}</span>
            <input
              lang={lang}
              className={ui.input}
              value={draft[titleKey] || ''}
              onChange={(e) => {
                setJustSaved(false);
                setDraft({ ...draft, [titleKey]: e.target.value.trim() ? e.target.value : null });
              }}
            />
          </label>
          <LabeledField label={t('galleries.link')} error={linkValid ? null : t('common.linkInvalid')}>
            <input
              className={linkValid ? ui.input : ui.inputInvalid}
              aria-invalid={!linkValid}
              value={draft.link_url || ''}
              onChange={(e) => {
                setJustSaved(false);
                setDraft({ ...draft, link_url: e.target.value.trim() ? e.target.value.trim() : null });
              }}
            />
          </LabeledField>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={ui.primary} aria-label={`${t('common.save')}: ${name}`} disabled={!isDirty || !linkValid || saveM.isPending} onClick={() => saveM.mutate()}>
            {saveM.isPending ? t('common.saving') : t('common.save')}
          </button>
          <ReorderButtons index={index} total={total} name={name} disabled={moving} onMove={onMove} />
          <button
            type="button"
            className={item.is_visible ? ui.secondary : ui.positive}
            aria-label={`${item.is_visible ? t('common.hide') : t('common.show')}: ${name}`}
            disabled={visibilityM.isPending}
            onClick={() => visibilityM.mutate()}
          >
            {item.is_visible ? t('common.hide') : t('common.show')}
          </button>
          <button
            type="button"
            className={ui.danger}
            aria-label={`${t('galleries.remove')}: ${name}`}
            disabled={removeM.isPending}
            onClick={() => {
              if (window.confirm(t('galleries.confirmRemove'))) removeM.mutate();
            }}
          >
            {t('galleries.remove')}
          </button>
          {item.is_visible ? null : <span className={ui.badgeWarning}>{t('sections.hidden')}</span>}
          {justSaved && !isDirty ? <span role="status" className={ui.success}>{t('common.saved')}</span> : null}
        </div>
        {failure ? <div role="alert" className={ui.error}>{errorText(t, failure, 'galleries.saveError')}</div> : null}
      </div>
    </div>
  );
}

export function GalleriesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [collection, setCollection] = useState<Collection>('brands');
  const [lang, setLang] = useState<Lang>('hy');
  const [picking, setPicking] = useState(false);
  const confirmLeave = useConfirmLeave();
  const queryKey = ['galleries', collection];
  const refresh = () => qc.invalidateQueries({ queryKey: ['galleries'] });

  const itemsQ = useQuery({
    queryKey,
    queryFn: async () => (await request<{ items: GalleryItem[] }>(`/api/admin/galleries?collection=${collection}`)).items
  });
  const items = itemsQ.data || [];

  const addM = useMutation({
    mutationFn: (media_id: string) => send('POST', '/api/admin/galleries', { collection, media_id }),
    onSuccess: refresh
  });
  const orderM = useMutation({
    mutationFn: (ids: string[]) => send('PUT', '/api/admin/galleries/order', { ids }),
    onSuccess: refresh
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t('galleries.collection')} className="flex flex-wrap gap-2">
          {COLLECTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={collection === value}
              className={[ui.tab, collection === value ? ui.tabActive : ui.tabIdle].join(' ')}
              onClick={() => {
                if (value !== collection && confirmLeave()) setCollection(value);
              }}
            >
              {t(`galleries.collections.${value}`)}
            </button>
          ))}
        </div>
        <button type="button" className={ui.primary} onClick={() => setPicking(true)}>
          {t('galleries.add')}
        </button>
      </div>
      <LangTabs value={lang} onChange={setLang} />

      {addM.isError ? <div role="alert" className={ui.error}>{errorText(t, addM.error, 'galleries.addError')}</div> : null}
      {orderM.isError ? <div role="alert" className={ui.error}>{errorText(t, orderM.error, 'galleries.saveError')}</div> : null}
      {itemsQ.isError ? <div role="alert" className={ui.error}>{errorText(t, itemsQ.error, 'common.loadError')}</div> : null}
      {itemsQ.isLoading ? <div className="text-sm text-slate-600">{t('common.loading')}</div> : null}

      <div className="grid gap-2">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            lang={lang}
            moving={orderM.isPending}
            onMove={(delta) => orderM.mutate(moveItem(items, index, delta).map((other) => other.id))}
            onChanged={refresh}
          />
        ))}
        {itemsQ.isSuccess && !items.length ? <div className={`${ui.card} text-center text-sm text-slate-600`}>{t('galleries.empty')}</div> : null}
      </div>

      {picking ? <MediaPicker keepOpen onPick={(asset) => addM.mutate(asset.id)} onClose={() => setPicking(false)} /> : null}
    </div>
  );
}
