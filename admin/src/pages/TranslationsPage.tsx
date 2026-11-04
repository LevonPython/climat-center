import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ui } from '../components/ui';
import { LANGS, type Lang } from '../contentSchemas/types';
import { PUBLIC_TEXTS, type PublicText } from '../lib/publicTexts';
import { errorText, request, send } from '../lib/request';
import { useUnsavedGuard } from '../lib/unsaved';

type Override = {
  key: string;
  value_hy: string | null;
  value_ru: string | null;
  value_en: string | null;
};

const LANGUAGE_NAMES: Record<Lang, string> = { hy: 'Հայերեն', ru: 'Русский', en: 'English' };

type Draft = Pick<Override, 'value_hy' | 'value_ru' | 'value_en'>;

const valueKey = (lang: Lang) => `value_${lang}` as const;

const toDraft = (override?: Override): Draft => ({
  value_hy: override?.value_hy ?? null,
  value_ru: override?.value_ru ?? null,
  value_en: override?.value_en ?? null
});

const sameTexts = (draft: Draft, override?: Override) => LANGS.every((lang) => draft[valueKey(lang)] === (override?.[valueKey(lang)] ?? null));

type TextRowProps = {
  text: PublicText;
  override?: Override;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onSaved: () => Promise<unknown>;
};

function TextRow({ text, override, draft, onDraft, onSaved }: TextRowProps) {
  const { t } = useTranslation();
  const isDirty = !sameTexts(draft, override);

  const saveM = useMutation({
    mutationFn: () => send('PUT', `/api/admin/translations/${text.key}`, draft),
    onSuccess: onSaved
  });
  const resetM = useMutation({
    mutationFn: () => send('DELETE', `/api/admin/translations/${text.key}`),
    onSuccess: onSaved
  });
  const failure = saveM.error || resetM.error;

  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-xs text-slate-600">{text.key}</span>
        {override ? <span className={ui.badgeWarning}>{t('translations.changed')}</span> : null}
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {LANGS.map((lang) => (
          <label key={lang} className="grid gap-1">
            <span className={ui.label}>{LANGUAGE_NAMES[lang]}</span>
            <textarea
              lang={lang}
              rows={2}
              className={ui.input}
              placeholder={text.defaults[lang]}
              aria-label={`${text.key} ${LANGUAGE_NAMES[lang]}`}
              value={draft[valueKey(lang)] || ''}
              onChange={(e) => onDraft({ ...draft, [valueKey(lang)]: e.target.value.trim() ? e.target.value : null })}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ui.primary} aria-label={`${t('common.save')}: ${text.key}`} disabled={!isDirty || saveM.isPending} onClick={() => saveM.mutate()}>
          {saveM.isPending ? t('common.saving') : t('common.save')}
        </button>
        {override ? (
          <button
            type="button"
            className={ui.secondary}
            aria-label={`${t('translations.reset')}: ${text.key}`}
            disabled={resetM.isPending}
            onClick={() => {
              if (window.confirm(t('translations.confirmReset'))) resetM.mutate();
            }}
          >
            {t('translations.reset')}
          </button>
        ) : null}
      </div>
      {failure ? <div role="alert" className={ui.error}>{errorText(t, failure, 'translations.saveError')}</div> : null}
    </div>
  );
}

export function TranslationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const overridesQ = useQuery({
    queryKey: ['translations'],
    queryFn: async () => (await request<{ translations: Override[] }>('/api/admin/translations')).translations
  });

  const overrides = useMemo(() => new Map((overridesQ.data || []).map((row) => [row.key, row])), [overridesQ.data]);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = PUBLIC_TEXTS.filter((text) => {
      const override = overrides.get(text.key);
      if (onlyChanged && !override) return false;
      if (!needle) return true;
      const haystack = [text.key, ...LANGS.map((lang) => text.defaults[lang]), ...LANGS.map((lang) => override?.[valueKey(lang)] || '')];
      return haystack.some((value) => value.toLowerCase().includes(needle));
    });
    const byGroup = new Map<string, PublicText[]>();
    for (const text of matches) {
      const name = text.key.split('.')[0];
      byGroup.set(name, [...(byGroup.get(name) || []), text]);
    }
    return [...byGroup.entries()];
  }, [search, onlyChanged, overrides]);

  useUnsavedGuard(Object.entries(drafts).some(([key, draft]) => !sameTexts(draft, overrides.get(key))));

  async function finishSaving(key: string) {
    await qc.invalidateQueries({ queryKey: ['translations'] });
    setDrafts(({ [key]: _done, ...rest }) => rest);
  }

  const expanded = Boolean(search.trim()) || onlyChanged;

  if (overridesQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (!overridesQ.data) return <div role="alert" className={ui.error}>{errorText(t, overridesQ.error, 'common.loadError')}</div>;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">{t('translations.help')}</p>
      {overridesQ.isError ? <div role="alert" className={ui.error}>{errorText(t, overridesQ.error, 'common.loadError')}</div> : null}
      <div className="flex flex-wrap items-center gap-3">
        <label className="grid min-w-0 flex-1 gap-1">
          <span className={ui.label}>{t('translations.search')}</span>
          <input className={ui.input} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
          {t('translations.onlyChanged')}
        </label>
      </div>

      {groups.map(([name, texts]) => (
        <details key={name} open={expanded} className={ui.card}>
          <summary className="min-h-11 cursor-pointer py-2 font-bold">
            {name} ({texts.length})
          </summary>
          <div className="mt-2 grid gap-2">
            {texts.map((text) => (
              <TextRow
                key={text.key}
                text={text}
                override={overrides.get(text.key)}
                draft={drafts[text.key] ?? toDraft(overrides.get(text.key))}
                onDraft={(draft) => setDrafts((current) => ({ ...current, [text.key]: draft }))}
                onSaved={() => finishSaving(text.key)}
              />
            ))}
          </div>
        </details>
      ))}
      {!groups.length ? <div className={`${ui.card} text-center text-sm text-slate-600`}>{t('translations.empty')}</div> : null}
    </div>
  );
}
