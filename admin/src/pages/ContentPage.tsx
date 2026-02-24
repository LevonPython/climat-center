import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { getBlockDef, type Lang } from '../contentSchemas/registry';
import { canonicalizeObject, isObjectRecord, makeEmptyDraft, setFieldValue, validateDraft } from '../contentSchemas/utils';

type ContentBlock = {
  id: string;
  page_name: string;
  section_name: string;
  content_json: Record<string, unknown>;
  updated_at: string;
};

type ContentBlockVersion = {
  id: string;
  content_block_id: string;
  updated_by: string | null;
  updated_by_username: string | null;
  content_json: Record<string, unknown>;
  created_at: string;
};

export function ContentPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>('');
  const [lang, setLang] = useState<Lang>('ru');
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [advancedConfirmed, setAdvancedConfirmed] = useState(false);
  const [jsonText, setJsonText] = useState<string>('{}');
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState<Record<string, unknown>>({});
  const [uiError, setUiError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const blocksQ = useQuery({
    queryKey: ['content_blocks'],
    queryFn: async () => {
      const resp = await apiFetch<{ content_blocks: ContentBlock[] }>('/api/content/blocks');
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to load');
      return resp.content_blocks;
    }
  });

  const blocks = useMemo(() => blocksQ.data || [], [blocksQ.data]);
  const selected = blocks.find((b) => b.id === selectedId) || null;
  const def = selected ? getBlockDef(selected.page_name, selected.section_name) : null;

  const versionsQ = useQuery({
    queryKey: ['content_versions', selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const resp = await apiFetch<{ versions: ContentBlockVersion[] }>(`/api/content/blocks/${selectedId}/versions`);
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to load versions');
      return resp.versions;
    }
  });

  const saveM = useMutation({
    mutationFn: async (p: { id: string; content_json: Record<string, unknown> }) => {
      const resp = await apiFetch<{ content_block: ContentBlock }>('/api/content', {
        method: 'PUT',
        body: JSON.stringify({ id: p.id, content_json: p.content_json })
      });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to save');
      return resp.content_block;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['content_blocks'] });
    }
  });

  const isDirty = useMemo(() => {
    const a = JSON.stringify(canonicalizeObject(saved));
    const b = JSON.stringify(canonicalizeObject(draft));
    return a !== b;
  }, [saved, draft]);

  const issues = useMemo(() => {
    if (!def) return [];
    return validateDraft(def, draft);
  }, [def, draft]);

  const canSave = !!selected && !!def && !saveM.isPending && issues.length === 0 && isDirty && !(mode === 'json' && !!jsonParseError);

  function pickBlock(id: string) {
    if (isDirty) {
      const ok = window.confirm('Есть несохранённые изменения. Переключиться и потерять их?');
      if (!ok) return;
    }
    setSelectedId(id);
    setUiError(null);
    const block = blocks.find((b) => b.id === id);
    const content = isObjectRecord(block?.content_json) ? canonicalizeObject(block!.content_json) : {};
    setSaved(content);
    const foundDef = block ? getBlockDef(block.page_name, block.section_name) : null;
    setDraft(foundDef ? { ...makeEmptyDraft(foundDef), ...content } : content);
    setMode('form');
    setJsonParseError(null);
    setJsonText(JSON.stringify(content, null, 2));
    setShowHistory(false);
  }

  function save() {
    setUiError(null);
    if (!selected || !def) return;
    if (mode === 'json' && jsonParseError) {
      setUiError('Некорректный JSON');
      return;
    }
    if (issues.length) {
      setUiError('Исправьте ошибки перед сохранением');
      return;
    }
    saveM.mutate(
      { id: selected.id, content_json: canonicalizeObject(draft) },
      {
        onSuccess: (updated) => {
          const nextSaved = isObjectRecord(updated?.content_json) ? canonicalizeObject(updated.content_json) : canonicalizeObject(draft);
          setSaved(nextSaved);
          setJsonText(JSON.stringify(nextSaved, null, 2));
          setJsonParseError(null);
        }
      }
    );
  }

  function resetToSaved() {
    if (!selected) return;
    if (isDirty) {
      const ok = window.confirm('Сбросить изменения и вернуть последнюю сохранённую версию?');
      if (!ok) return;
    }
    if (!def) {
      setDraft(saved);
      return;
    }
    setDraft({ ...makeEmptyDraft(def), ...saved });
    setUiError(null);
    setJsonText(JSON.stringify(saved, null, 2));
    setJsonParseError(null);
  }

  function loadVersion(v: ContentBlockVersion) {
    if (!def) return;
    if (isDirty) {
      const ok = window.confirm('Есть несохранённые изменения. Загрузить версию и потерять их?');
      if (!ok) return;
    }
    const content = isObjectRecord(v.content_json) ? canonicalizeObject(v.content_json) : {};
    setDraft({ ...makeEmptyDraft(def), ...content });
    setJsonText(JSON.stringify(content, null, 2));
    setJsonParseError(null);
    setMode('form');
    setUiError(null);
  }

  function restoreVersion(v: ContentBlockVersion) {
    if (!selected || !def) return;
    const content = isObjectRecord(v.content_json) ? canonicalizeObject(v.content_json) : {};
    const versionIssues = validateDraft(def, content);
    if (versionIssues.length) {
      setUiError('Нельзя восстановить: версия не проходит проверку схемы');
      return;
    }
    const ok = window.confirm('Восстановить эту версию? Это перезапишет текущий контент.');
    if (!ok) return;

    saveM.mutate(
      { id: selected.id, content_json: content },
      {
        onSuccess: (updated) => {
          const nextSaved = isObjectRecord(updated?.content_json) ? canonicalizeObject(updated.content_json) : content;
          setSaved(nextSaved);
          setDraft({ ...makeEmptyDraft(def), ...nextSaved });
          setJsonText(JSON.stringify(nextSaved, null, 2));
          setJsonParseError(null);
          setShowHistory(false);
        }
      }
    );
  }

  function toggleAdvancedJson() {
    if (!def || !selected) return;
    if (mode === 'json') {
      setMode('form');
      setUiError(null);
      return;
    }
    if (!advancedConfirmed) {
      const ok = window.confirm(
        'Advanced JSON режим предназначен для опытных пользователей. Неверные ключи/типы будут заблокированы схемой. Продолжить?'
      );
      if (!ok) return;
      setAdvancedConfirmed(true);
    }
    setJsonText(JSON.stringify(canonicalizeObject(draft), null, 2));
    setJsonParseError(null);
    setMode('json');
  }

  useEffect(() => {
    if (mode !== 'json') return;
    if (!selected || !def) return;
    // Keep draft in sync with valid JSON input
    try {
      const parsed = JSON.parse(jsonText);
      if (!isObjectRecord(parsed)) {
        setJsonParseError('JSON должен быть объектом');
        return;
      }
      setJsonParseError(null);
      const normalized = canonicalizeObject(parsed);
      setDraft({ ...makeEmptyDraft(def), ...normalized });
    } catch {
      setJsonParseError('Некорректный JSON');
    }
  }, [mode, jsonText, selected?.id, def?.schemaKey]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  if (blocksQ.isLoading) return <div className="text-sm text-slate-600">Загрузка...</div>;
  if (blocksQ.isError) return <div className="text-sm text-red-600">{String(blocksQ.error)}</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-extrabold">Блоки</div>
        <div className="mt-3 grid gap-1">
          {blocks.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => pickBlock(b.id)}
              className={[
                'text-left rounded-xl px-3 py-2 text-sm font-semibold',
                selectedId === b.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
              ].join(' ')}
            >
              <div className="text-xs opacity-80">{b.page_name}</div>
              <div>{b.section_name}</div>
            </button>
          ))}
          {blocks.length === 0 ? <div className="text-sm text-slate-600">Нет блоков</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-extrabold">Редактор</div>
          <div className="flex items-center gap-2">
            {isDirty ? <div className="text-xs font-bold text-amber-700">Несохранено</div> : null}
            {selected ? (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
                disabled={versionsQ.isLoading}
              >
                {versionsQ.isLoading ? 'История…' : 'История'}
              </button>
            ) : null}
            {selected && def ? (
              <button
                type="button"
                onClick={toggleAdvancedJson}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                {mode === 'json' ? 'Форма' : 'Advanced JSON'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={resetToSaved}
              disabled={!selected || saveM.isPending || !isDirty}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Сбросить
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saveM.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
        {selected ? (
          <div className="mt-2 text-xs text-slate-600">
            {selected.page_name} / {selected.section_name}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-600">Выберите блок слева</div>
        )}

        {selected ? (
          def ? (
            <div className="mt-4">
              {showHistory ? (
                <div className="mb-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-extrabold text-slate-900">История изменений</div>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                    >
                      Закрыть
                    </button>
                  </div>
                  {versionsQ.isError ? (
                    <div className="mt-3 text-sm text-red-600">{String(versionsQ.error)}</div>
                  ) : null}
                  {!versionsQ.data?.length && !versionsQ.isLoading ? (
                    <div className="mt-3 text-sm text-slate-600">Нет версий</div>
                  ) : null}
                  {versionsQ.data?.length ? (
                    <div className="mt-3 grid gap-2 max-h-[260px] overflow-auto pr-1">
                      {versionsQ.data.slice(0, 20).map((v) => {
                        const content = isObjectRecord(v.content_json) ? canonicalizeObject(v.content_json) : {};
                        const versionIssues = validateDraft(def, content);
                        const ts = (() => {
                          try {
                            return new Date(v.created_at).toLocaleString();
                          } catch {
                            return v.created_at;
                          }
                        })();
                        return (
                          <div key={v.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold text-slate-900">{ts}</div>
                                <div className="text-xs text-slate-600">
                                  {v.updated_by_username || 'Unknown user'}
                                  {versionIssues.length ? <span className="ml-2 font-bold text-red-700">Не проходит схему</span> : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => loadVersion(v)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                                >
                                  Загрузить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => restoreVersion(v)}
                                  disabled={versionIssues.length > 0 || saveM.isPending}
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                                >
                                  Восстановить
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {mode === 'json' ? (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Advanced JSON режим показывает «сырой» JSON, который будет сохранён в базе. Ключи и типы проверяются схемой; неизвестные ключи будут
                    отклонены.
                  </div>
                  <textarea
                    className="min-h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                  />
                  {jsonParseError ? <div className="text-sm text-red-600">{jsonParseError}</div> : null}
                </div>
              ) : null}

              {def.fields.some((f) => f.multilingual) ? (
                <div className="flex items-center gap-2">
                  {(['ru', 'en', 'am'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={[
                        'rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-wider border',
                        lang === l ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'
                      ].join(' ')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={['grid gap-4', mode === 'json' ? 'mt-4 opacity-60 pointer-events-none select-none' : 'mt-4'].join(' ')}>
                {def.groups.map((g) => (
                  <div key={g.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-extrabold text-slate-900">{g.label}</div>
                    <div className="mt-3 grid gap-3">
                      {g.fieldKeys.map((fk) => {
                        const field = def.fields.find((f) => f.key === fk);
                        if (!field) return null;
                        const storageKey = field.multilingual ? `${field.key}_${lang}` : field.key;
                        const v = (draft as any)[storageKey];
                        const value = typeof v === 'string' ? v : '';
                        const hasError = issues.some((i) => i.path === storageKey);

                        return (
                          <label key={storageKey} className="grid gap-1">
                            <div className="text-xs font-bold text-slate-800">{field.label}</div>
                            {field.kind === 'text' ? (
                              <textarea
                                value={value}
                                onChange={(e) => setDraft((d) => setFieldValue(def, d, field.key, lang, e.target.value))}
                                className={[
                                  'min-h-[88px] w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2',
                                  hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-200'
                                ].join(' ')}
                              />
                            ) : (
                              <input
                                value={value}
                                onChange={(e) => setDraft((d) => setFieldValue(def, d, field.key, lang, e.target.value))}
                                className={[
                                  'w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2',
                                  hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-200'
                                ].join(' ')}
                              />
                            )}
                            {field.help ? <div className="text-xs text-slate-500">{field.help}</div> : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {issues.length ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-sm font-extrabold text-red-800">Ошибки</div>
                  <ul className="mt-2 grid gap-1 text-xs text-red-800">
                    {issues.slice(0, 10).map((i) => (
                      <li key={`${i.path}:${i.message}`}>
                        <span className="font-mono">{i.path}</span> — {i.message}
                      </li>
                    ))}
                    {issues.length > 10 ? <li>…и ещё {issues.length - 10}</li> : null}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-extrabold text-amber-900">Для этого блока нет схемы</div>
              <div className="mt-2 text-sm text-amber-900/90">
                Редактирование отключено, чтобы избежать поломок. Добавьте схему для{' '}
                <span className="font-mono">
                  {selected.page_name}/{selected.section_name}
                </span>
                .
              </div>
            </div>
          )
        ) : null}

        {uiError ? <div className="mt-3 text-sm text-red-600">{uiError}</div> : null}
        {saveM.isError ? <div className="mt-3 text-sm text-red-600">{String(saveM.error)}</div> : null}
      </div>
    </div>
  );
}

