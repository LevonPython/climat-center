import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Content } from '../contentSchemas/types';
import { useSchemaLabel, useSchemas } from '../contentSchemas/useSchemas';
import { isObjectRecord } from '../contentSchemas/utils';
import { moveItem } from '../lib/order';
import { localized } from '../lib/pages';
import { errorText, send } from '../lib/request';
import { BlockEditor } from './BlockEditor';
import { ReorderButtons } from './ReorderButtons';
import { ui } from './ui';

export type Section = {
  id: string;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  content_json: Content;
};

type SectionsEditorProps = {
  pageId: string;
  sections: Section[];
};

export function SectionsEditor({ pageId, sections }: SectionsEditorProps) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const label = useSchemaLabel();
  const schemasQ = useSchemas();
  const blockTypes = schemasQ.data?.block_types || [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [newType, setNewType] = useState('');
  const openDirty = useRef(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['page', pageId] });

  const addM = useMutation({
    mutationFn: async (block_type: string) =>
      (await send<{ section: Section }>('POST', `/api/admin/pages/${pageId}/sections`, { block_type })).section,
    onSuccess: async (section) => {
      setNewType('');
      await refresh();
      setOpenId(section.id);
    }
  });

  const orderM = useMutation({
    mutationFn: (ids: string[]) => send('PUT', `/api/admin/pages/${pageId}/sections/order`, { ids }),
    onSuccess: refresh
  });

  const visibilityM = useMutation({
    mutationFn: (section: Section) => send('PUT', `/api/admin/sections/${section.id}`, { is_visible: !section.is_visible }),
    onSuccess: refresh
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => send('DELETE', `/api/admin/sections/${id}`),
    onSuccess: refresh
  });

  function confirmClosingOpenSection(): boolean {
    if (openDirty.current && !window.confirm(t('sections.confirmClose'))) return false;
    openDirty.current = false;
    return true;
  }

  function toggle(id: string) {
    if (confirmClosingOpenSection()) setOpenId((current) => (current === id ? null : id));
  }

  function add() {
    if (confirmClosingOpenSection()) addM.mutate(newType);
  }

  function remove(section: Section, name: string) {
    if (!window.confirm(t('sections.confirmDelete', { name }))) return;
    deleteM.mutate(section.id, {
      onSuccess: () => {
        if (openId === section.id) {
          openDirty.current = false;
          setOpenId(null);
        }
      }
    });
  }

  async function save(id: string, content_json: Content) {
    const { section } = await send<{ section: Section }>('PUT', `/api/admin/sections/${id}`, { content_json });
    await refresh();
    return section.content_json;
  }

  const selectedType = blockTypes.find((blockType) => blockType.type === newType);
  const failure = addM.error || orderM.error || visibilityM.error || deleteM.error;

  return (
    <div className={`${ui.card} grid gap-3`}>
      <div className="font-extrabold">{t('sections.title')}</div>
      {failure ? <div role="alert" className={ui.error}>{errorText(t, failure, 'sections.saveError')}</div> : null}
      {schemasQ.isError ? <div role="alert" className={ui.error}>{errorText(t, schemasQ.error, 'common.loadError')}</div> : null}

      {sections.map((section, index) => {
        const blockType = blockTypes.find((candidate) => candidate.type === section.block_type);
        const typeName = blockType ? label(blockType.label) : section.block_type;
        const name = (isObjectRecord(section.content_json) && localized(section.content_json, 'heading', i18n.language)) || typeName;
        const isOpen = openId === section.id;

        return (
          <div key={section.id} className="rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="break-words font-semibold">{name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={ui.badge}>{typeName}</span>
                  {section.is_visible ? null : <span className={ui.badgeWarning}>{t('sections.hidden')}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ReorderButtons
                  index={index}
                  total={sections.length}
                  name={name}
                  disabled={orderM.isPending}
                  onMove={(delta) => orderM.mutate(moveItem(sections, index, delta).map((item) => item.id))}
                />
                <button type="button" className={ui.secondary} aria-expanded={isOpen} aria-label={`${isOpen ? t('common.close') : t('common.edit')}: ${name}`} onClick={() => toggle(section.id)}>
                  {isOpen ? t('common.close') : t('common.edit')}
                </button>
                <button
                  type="button"
                  className={section.is_visible ? ui.secondary : ui.positive}
                  aria-label={`${section.is_visible ? t('common.hide') : t('common.show')}: ${name}`}
                  disabled={visibilityM.isPending}
                  onClick={() => visibilityM.mutate(section)}
                >
                  {section.is_visible ? t('common.hide') : t('common.show')}
                </button>
                <button type="button" className={ui.danger} aria-label={`${t('common.delete')}: ${name}`} disabled={deleteM.isPending} onClick={() => remove(section, name)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>
            {isOpen ? (
              <div className="border-t border-slate-200 p-3">
                {blockType ? (
                  <>
                    <p className={`${ui.help} mb-3`}>{label(blockType.description)}</p>
                    <BlockEditor
                      key={section.id}
                      fields={blockType.fields}
                      content={isObjectRecord(section.content_json) ? section.content_json : {}}
                      versionsPath={`/api/admin/sections/${section.id}/versions`}
                      onSave={(content) => save(section.id, content)}
                      onDirtyChange={(dirty) => {
                        openDirty.current = dirty;
                      }}
                    />
                  </>
                ) : (
                  <div className="text-sm text-slate-600">{t('content.noSchema')}</div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
      {!sections.length ? <div className="text-sm text-slate-600">{t('sections.empty')}</div> : null}

      <div className="grid gap-2 rounded-2xl border border-dashed border-slate-300 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-1 basis-56 gap-1">
            <span className={ui.label}>{t('sections.addLabel')}</span>
            <select className={ui.input} value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="">{t('blocks.chooseOption')}</option>
              {blockTypes.map((blockType) => (
                <option key={blockType.type} value={blockType.type}>
                  {label(blockType.label)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={ui.primary} disabled={!newType || addM.isPending} onClick={add}>
            {t('sections.add')}
          </button>
        </div>
        {selectedType ? <div className={ui.help}>{label(selectedType.description)}</div> : null}
      </div>
    </div>
  );
}
