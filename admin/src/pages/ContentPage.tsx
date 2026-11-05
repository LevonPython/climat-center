import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockEditor } from '../components/BlockEditor';
import { ui } from '../components/ui';
import type { Content, SiteBlockDef } from '../contentSchemas/types';
import { useSchemaLabel, useSchemas } from '../contentSchemas/useSchemas';
import { isObjectRecord } from '../contentSchemas/utils';
import { errorText, request, send } from '../lib/request';

type ContentBlock = {
  id: string;
  page_name: string;
  section_name: string;
  content_json: Content;
};

type Entry = {
  key: string;
  page_name: string;
  section_name: string;
  def: SiteBlockDef | null;
  row: ContentBlock | null;
};

const entryKey = (block: { page_name: string; section_name: string }) => `${block.page_name}/${block.section_name}`;

// The site settings screen: blocks used across the whole site.
export function ContentPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const label = useSchemaLabel();
  const schemasQ = useSchemas();
  const [selectedKey, setSelectedKey] = useState('');
  const [dirty, setDirty] = useState(false);

  const blocksQ = useQuery({
    queryKey: ['content_blocks'],
    queryFn: async () => (await request<{ content_blocks: ContentBlock[] }>('/api/content/blocks')).content_blocks
  });

  // A block with a schema is editable before it has a saved row, as the new settings blocks are.
  const entries = useMemo<Entry[]>(() => {
    const defs = schemasQ.data?.site_blocks || [];
    const rows = blocksQ.data || [];
    const known = new Set(defs.map(entryKey));
    const fromDefs = defs.map((def) => ({
      key: entryKey(def),
      page_name: def.page_name,
      section_name: def.section_name,
      def,
      row: rows.find((row) => entryKey(row) === entryKey(def)) || null
    }));
    const withoutDef = rows
      .filter((row) => !known.has(entryKey(row)))
      .map((row) => ({ key: entryKey(row), page_name: row.page_name, section_name: row.section_name, def: null, row }));
    return [...fromDefs, ...withoutDef].filter((entry) => entry.page_name === 'global');
  }, [schemasQ.data, blocksQ.data]);

  const selected = entries.find((entry) => entry.key === selectedKey) || entries[0] || null;

  function pick(key: string) {
    if (key === selected?.key) return;
    if (dirty && !window.confirm(t('content.confirmSwitchBlock'))) return;
    setDirty(false);
    setSelectedKey(key);
  }

  async function save(entry: Entry, content_json: Content) {
    const target = entry.row ? { id: entry.row.id } : { page_name: entry.page_name, section_name: entry.section_name };
    const { content_block } = await send<{ content_block: ContentBlock }>('PUT', '/api/content', { ...target, content_json });
    await qc.invalidateQueries({ queryKey: ['content_blocks'] });
    return content_block.content_json;
  }

  if (schemasQ.isLoading || blocksQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (!schemasQ.data || !blocksQ.data) {
    return <div role="alert" className={ui.error}>{errorText(t, schemasQ.error || blocksQ.error, 'common.loadError')}</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {blocksQ.isError ? <div role="alert" className={`${ui.error} lg:col-span-2`}>{errorText(t, blocksQ.error, 'common.loadError')}</div> : null}
      <div className={ui.card}>
        <div className="text-sm font-extrabold">{t('content.blocks')}</div>
        <div className="mt-3 grid gap-1">
          {entries.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={selected?.key === entry.key}
              onClick={() => pick(entry.key)}
              className={[
                'min-h-11 rounded-xl px-3 py-2 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
                selected?.key === entry.key ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-50'
              ].join(' ')}
            >
              {entry.def ? label(entry.def.title) : entry.key}
            </button>
          ))}
          {!entries.length ? <div className="text-sm text-slate-600">{t('content.noBlocks')}</div> : null}
        </div>
      </div>

      <div className={ui.card}>
        {selected ? (
          <>
            <div className="text-lg font-extrabold">{selected.def ? label(selected.def.title) : selected.key}</div>
            {selected.def?.description ? <div className="mt-1 text-sm text-slate-600">{label(selected.def.description)}</div> : null}
            <div className="mt-4">
              {selected.def ? (
                <BlockEditor
                  key={selected.key}
                  fields={selected.def.fields}
                  groups={selected.def.groups}
                  content={isObjectRecord(selected.row?.content_json) ? selected.row.content_json : {}}
                  versionsPath={selected.row ? `/api/content/blocks/${selected.row.id}/versions` : null}
                  onSave={(content) => save(selected, content)}
                  onDirtyChange={setDirty}
                />
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('content.noSchema')}</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600">{t('content.selectBlock')}</div>
        )}
      </div>
    </div>
  );
}
