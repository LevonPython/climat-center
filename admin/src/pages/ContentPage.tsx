import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { apiFetch } from '../api';

type ContentBlock = {
  id: string;
  page_name: string;
  section_name: string;
  content_json: Record<string, unknown>;
  updated_at: string;
};

export function ContentPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>('');
  const [jsonText, setJsonText] = useState<string>('{}');
  const [error, setError] = useState<string | null>(null);

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

  function pickBlock(id: string) {
    setSelectedId(id);
    setError(null);
    const block = blocks.find((b) => b.id === id);
    setJsonText(JSON.stringify(block?.content_json || {}, null, 2));
  }

  function save() {
    setError(null);
    if (!selected) return;
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('JSON должен быть объектом');
        return;
      }
      saveM.mutate({ id: selected.id, content_json: parsed });
    } catch {
      setError('Некорректный JSON');
    }
  }

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
          <button
            type="button"
            onClick={save}
            disabled={!selected || saveM.isPending}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saveM.isPending ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
        {selected ? (
          <div className="mt-2 text-xs text-slate-600">
            {selected.page_name} / {selected.section_name}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-600">Выберите блок слева</div>
        )}

        <textarea
          className="mt-4 min-h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          disabled={!selected}
        />

        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        {saveM.isError ? <div className="mt-3 text-sm text-red-600">{String(saveM.error)}</div> : null}
      </div>
    </div>
  );
}

