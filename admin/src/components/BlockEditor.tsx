import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaLabel } from '../contentSchemas/useSchemas';
import type { BlockGroup, Content, FieldDef, Lang } from '../contentSchemas/types';
import { isObjectRecord, normalizeContent, stableStringify, validateDraft, type IssueCode } from '../contentSchemas/utils';
import { errorText } from '../lib/request';
import { useUnsavedGuard } from '../lib/unsaved';
import { FieldEditor } from './FieldEditor';
import { LangTabs } from './LangTabs';
import { ui } from './ui';
import { VersionHistory } from './VersionHistory';

type BlockEditorProps = {
  fields: FieldDef[];
  groups?: BlockGroup[];
  content: Content;
  versionsPath?: string | null;
  onSave: (content: Content) => Promise<Content | void>;
  onDirtyChange?: (dirty: boolean) => void;
};

const ISSUE_MESSAGES: Record<IssueCode, string> = {
  unknownKey: 'content.issues.unknownKey',
  notText: 'content.issues.notText',
  notList: 'content.issues.notList',
  invalidOption: 'content.issues.invalidOption',
  invalidUrl: 'content.issues.invalidUrl',
  invalidEmail: 'content.issues.invalidEmail',
  invalidPhone: 'content.issues.invalidPhone'
};
const MAX_ISSUES_SHOWN = 10;

export function BlockEditor({ fields, groups, content, versionsPath, onSave, onDirtyChange }: BlockEditorProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const label = useSchemaLabel();
  const [saved, setSaved] = useState<Content>(() => normalizeContent(fields, content));
  const [draft, setDraft] = useState<Content>(saved);
  const [lang, setLang] = useState<Lang>('hy');
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonConfirmed, setJsonConfirmed] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const isDirty = useMemo(() => stableStringify(saved) !== stableStringify(draft), [saved, draft]);
  const issues = useMemo(() => validateDraft(fields, draft), [fields, draft]);
  const invalid = useMemo(() => new Set(issues.map((issue) => issue.path)), [issues]);
  const hasLanguages = useMemo(() => fields.some((field) => field.multilingual || field.kind === 'list'), [fields]);

  useUnsavedGuard(isDirty);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const saveM = useMutation({
    mutationFn: onSave,
    onSuccess: async (result, submitted) => {
      const next = normalizeContent(fields, result || submitted);
      setSaved(next);
      setDraft(next);
      setJsonText(stableStringify(next, 2));
      setJsonError(null);
      setJustSaved(true);
      if (versionsPath) await qc.invalidateQueries({ queryKey: ['versions', versionsPath] });
    }
  });

  function edit(next: Content) {
    setJustSaved(false);
    setDraft(next);
  }

  function editJson(text: string) {
    setJsonText(text);
    setJustSaved(false);
    try {
      const parsed = JSON.parse(text);
      if (!isObjectRecord(parsed)) {
        setJsonError(t('content.jsonMustBeObject'));
        return;
      }
      setJsonError(null);
      setDraft(normalizeContent(fields, parsed));
    } catch {
      setJsonError(t('content.invalidJson'));
    }
  }

  function toggleJson() {
    if (jsonMode) {
      setJsonMode(false);
      return;
    }
    if (!jsonConfirmed && !window.confirm(t('content.confirmAdvancedJson'))) return;
    setJsonConfirmed(true);
    setJsonText(stableStringify(draft, 2));
    setJsonError(null);
    setJsonMode(true);
  }

  function reset() {
    if (!window.confirm(t('content.confirmReset'))) return;
    edit(saved);
    setJsonText(stableStringify(saved, 2));
    setJsonError(null);
  }

  function loadVersion(version: Content) {
    if (isDirty && !window.confirm(t('content.confirmLoadVersion'))) return;
    edit(normalizeContent(fields, version));
    setJsonMode(false);
  }

  function restoreVersion(version: Content) {
    if (!window.confirm(t('content.confirmRestore'))) return;
    saveM.mutate(normalizeContent(fields, version));
    setHistoryOpen(false);
  }

  function renderField(field: FieldDef) {
    return <FieldEditor key={field.key} field={field} values={draft} lang={lang} invalid={invalid} onChange={edit} />;
  }

  const canSave = isDirty && !issues.length && !(jsonMode && jsonError) && !saveM.isPending;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasLanguages && !jsonMode ? <LangTabs value={lang} onChange={setLang} /> : <span />}
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? <span className="text-xs font-bold text-amber-800">{t('content.unsaved')}</span> : null}
          {justSaved && !isDirty ? <span role="status" className={ui.success}>{t('common.saved')}</span> : null}
          {versionsPath ? (
            <button type="button" className={ui.secondary} onClick={() => setHistoryOpen((open) => !open)}>
              {t('content.history')}
            </button>
          ) : null}
          <button type="button" className={ui.secondary} onClick={toggleJson}>
            {jsonMode ? t('content.form') : t('content.advancedJson')}
          </button>
          <button type="button" className={ui.secondary} disabled={!isDirty || saveM.isPending} onClick={reset}>
            {t('content.reset')}
          </button>
          <button type="button" className={ui.primary} disabled={!canSave} onClick={() => saveM.mutate(draft)}>
            {saveM.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {saveM.isError ? <div role="alert" className={ui.error}>{errorText(t, saveM.error, 'blocks.saveError')}</div> : null}

      {historyOpen && versionsPath ? (
        <VersionHistory
          path={versionsPath}
          fields={fields}
          busy={saveM.isPending}
          onLoad={loadVersion}
          onRestore={restoreVersion}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      {jsonMode ? (
        <div className="grid gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('content.advancedJsonWarning')}</div>
          <textarea
            aria-label={t('content.advancedJson')}
            className="min-h-96 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
            value={jsonText}
            onChange={(event) => editJson(event.target.value)}
          />
          {jsonError ? <div role="alert" className={ui.error}>{jsonError}</div> : null}
        </div>
      ) : groups?.length ? (
        groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-extrabold text-slate-900">{label(group.label)}</div>
            <div className="mt-3 grid gap-3">
              {group.fieldKeys.flatMap((fieldKey) => fields.filter((field) => field.key === fieldKey)).map(renderField)}
            </div>
          </div>
        ))
      ) : (
        <div className="grid gap-3">{fields.map(renderField)}</div>
      )}

      {issues.length ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-extrabold text-red-800">{t('content.errors')}</div>
          <ul className="mt-2 grid gap-1 text-xs text-red-800">
            {issues.slice(0, MAX_ISSUES_SHOWN).map((issue) => (
              <li key={`${issue.path}:${issue.code}`}>
                <span className="font-mono">{issue.path}</span>: {t(ISSUE_MESSAGES[issue.code])}
              </li>
            ))}
            {issues.length > MAX_ISSUES_SHOWN ? <li>{t('content.moreIssues', { count: issues.length - MAX_ISSUES_SHOWN })}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
