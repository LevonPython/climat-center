import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '../api';
import { LabeledField } from '../components/LabeledField';
import { LangTabs } from '../components/LangTabs';
import { ACCEPTED_DOCUMENTS, ACCEPTED_FILES, ACCEPTED_IMAGES, MediaThumb, UploadButton, uploadMedia, useMediaList, type MediaAsset, type MediaKind } from '../components/media';
import { ui } from '../components/ui';
import type { Lang } from '../contentSchemas/types';
import { errorText, request, send } from '../lib/request';
import { useConfirmLeave, useUnsavedGuard } from '../lib/unsaved';

const BYTES_PER_KB = 1024;

function AssetDetails({ asset, onDeleted }: { asset: MediaAsset; onDeleted: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [lang, setLang] = useState<Lang>('hy');
  const [alt, setAlt] = useState({ alt_hy: asset.alt_hy, alt_ru: asset.alt_ru, alt_en: asset.alt_en });
  const [justSaved, setJustSaved] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const altKey = `alt_${lang}` as const;
  const kilobytes = asset.size_bytes / BYTES_PER_KB;
  const refresh = () => qc.invalidateQueries({ queryKey: ['media'] });
  const isDirty = alt.alt_hy !== asset.alt_hy || alt.alt_ru !== asset.alt_ru || alt.alt_en !== asset.alt_en;
  useUnsavedGuard(isDirty);

  const saveM = useMutation({
    mutationFn: () => send('PUT', `/api/admin/media/${asset.id}`, alt),
    onSuccess: async () => {
      setJustSaved(true);
      await refresh();
    }
  });

  const deleteM = useMutation({
    mutationFn: () => send('DELETE', `/api/admin/media/${asset.id}`),
    onSuccess: async () => {
      onDeleted();
      await refresh();
    }
  });

  async function replace([file]: File[]) {
    setReplaceError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      await request(`/api/admin/media/${asset.id}/file`, { method: 'PUT', body });
      await refresh();
    } catch (err) {
      setReplaceError(errorText(t, err, 'media.replaceError'));
    }
  }

  return (
    <div className={`${ui.card} grid content-start gap-3`}>
      <MediaThumb asset={asset} className="h-48 w-full rounded-xl bg-slate-50" />
      <div className="break-all text-sm font-semibold">{asset.filename}</div>
      <div className={ui.help}>
        {kilobytes < BYTES_PER_KB
          ? t('media.sizeKb', { size: Math.round(kilobytes) })
          : t('media.sizeMb', { size: (kilobytes / BYTES_PER_KB).toFixed(1) })}
      </div>
      <a className="break-all text-xs font-semibold text-slate-900 underline" href={assetUrl(asset.url)} target="_blank" rel="noreferrer">
        {t('media.open')}
      </a>

      {asset.kind === 'image' ? (
        <>
          <LangTabs value={lang} onChange={setLang} />
          <LabeledField label={t('media.alt')} help={t('media.altHelp')}>
            <input
              lang={lang}
              className={ui.input}
              value={alt[altKey] || ''}
              onChange={(e) => {
                setJustSaved(false);
                setAlt({ ...alt, [altKey]: e.target.value.trim() ? e.target.value : null });
              }}
            />
          </LabeledField>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={ui.primary} disabled={!isDirty || saveM.isPending} onClick={() => saveM.mutate()}>
              {saveM.isPending ? t('common.saving') : t('common.save')}
            </button>
            {justSaved && !isDirty ? <span role="status" className={ui.success}>{t('common.saved')}</span> : null}
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <UploadButton
          label={t('media.replace')}
          busyLabel={t('media.uploading')}
          accept={asset.kind === 'image' ? ACCEPTED_IMAGES : ACCEPTED_DOCUMENTS}
          onFiles={replace}
        />
        <button
          type="button"
          className={ui.danger}
          disabled={deleteM.isPending}
          onClick={() => {
            if (window.confirm(t('media.confirmDelete', { name: asset.filename }))) deleteM.mutate();
          }}
        >
          {t('common.delete')}
        </button>
      </div>
      <p className={ui.help}>{t('media.replaceHelp')}</p>

      {saveM.isError ? <div role="alert" className={ui.error}>{errorText(t, saveM.error, 'media.saveError')}</div> : null}
      {replaceError ? <div role="alert" className={ui.error}>{replaceError}</div> : null}
      {deleteM.isError ? <div role="alert" className={ui.error}>{errorText(t, deleteM.error, 'media.deleteError', { 409: 'media.inUse' })}</div> : null}
    </div>
  );
}

export function MediaPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [kind, setKind] = useState<MediaKind | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const confirmLeave = useConfirmLeave();
  const mediaQ = useMediaList(kind);
  const assets = (mediaQ.data?.pages || []).flatMap((page) => page.assets);
  const selected = assets.find((asset) => asset.id === selectedId) || null;

  async function upload(files: File[]) {
    setUploadError(null);
    try {
      for (const file of files) {
        const asset = await uploadMedia(file);
        setSelectedId((current) => current ?? asset.id);
      }
    } catch (err) {
      setUploadError(errorText(t, err, 'media.uploadError'));
    } finally {
      await qc.invalidateQueries({ queryKey: ['media'] });
    }
  }

  const filters: { value: MediaKind | undefined; label: string }[] = [
    { value: undefined, label: t('media.filterAll') },
    { value: 'image', label: t('media.filterImages') },
    { value: 'document', label: t('media.filterDocuments') }
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t('media.filter')} className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              aria-pressed={kind === filter.value}
              className={[ui.tab, kind === filter.value ? ui.tabActive : ui.tabIdle].join(' ')}
              onClick={() => {
                if (kind !== filter.value && confirmLeave()) setKind(filter.value);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <UploadButton label={t('media.upload')} busyLabel={t('media.uploading')} accept={ACCEPTED_FILES} multiple onFiles={upload} />
      </div>
      <p className={ui.help}>{t('media.limits')}</p>

      {uploadError ? <div role="alert" className={ui.error}>{uploadError}</div> : null}
      {mediaQ.isError ? <div role="alert" className={ui.error}>{errorText(t, mediaQ.error, 'common.loadError')}</div> : null}

      <div className={`grid gap-4 ${selected ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div>
          {mediaQ.isLoading ? <div className="text-sm text-slate-600">{t('common.loading')}</div> : null}
          {mediaQ.isSuccess && !assets.length ? <div className={`${ui.card} text-center text-sm text-slate-600`}>{t('media.empty')}</div> : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                aria-pressed={selectedId === asset.id}
                aria-label={asset.filename}
                className={[
                  'grid gap-1 rounded-xl border bg-white p-2 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
                  selectedId === asset.id ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
                ].join(' ')}
                onClick={() => {
                  if (selectedId !== asset.id && confirmLeave()) setSelectedId(asset.id);
                }}
              >
                <MediaThumb asset={asset} className="h-28 w-full" />
                <span className="truncate text-xs text-slate-700">{asset.filename}</span>
              </button>
            ))}
          </div>
          {mediaQ.hasNextPage ? (
            <button type="button" className={`${ui.secondary} mt-3`} disabled={mediaQ.isFetchingNextPage} onClick={() => mediaQ.fetchNextPage()}>
              {t('common.loadMore')}
            </button>
          ) : null}
        </div>
        {selected ? <AssetDetails key={selected.id} asset={selected} onDeleted={() => setSelectedId(null)} /> : null}
      </div>
    </div>
  );
}
