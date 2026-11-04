import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Content, FieldDef } from '../contentSchemas/types';
import { isObjectRecord, validateDraft } from '../contentSchemas/utils';
import { errorText, request } from '../lib/request';
import { ui } from './ui';

type Version = {
  id: string;
  updated_by_username: string | null;
  content_json: Content;
  created_at: string;
};

type VersionHistoryProps = {
  path: string;
  fields: FieldDef[];
  busy: boolean;
  onLoad: (content: Content) => void;
  onRestore: (content: Content) => void;
  onClose: () => void;
};

const MAX_SHOWN = 20;

export function VersionHistory({ path, fields, busy, onLoad, onRestore, onClose }: VersionHistoryProps) {
  const { t, i18n } = useTranslation();
  const versionsQ = useQuery({
    queryKey: ['versions', path],
    queryFn: async () => (await request<{ versions: Version[] }>(path)).versions
  });
  const versions = versionsQ.data || [];

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900">{t('content.historyTitle')}</div>
        <button type="button" className={ui.secondary} onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
      {versionsQ.isLoading ? <div className="mt-3 text-sm text-slate-600">{t('common.loading')}</div> : null}
      {versionsQ.isError ? <div className={`mt-3 ${ui.error}`}>{errorText(t, versionsQ.error, 'common.loadError')}</div> : null}
      {versionsQ.isSuccess && !versions.length ? <div className="mt-3 text-sm text-slate-600">{t('content.noVersions')}</div> : null}
      <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
        {versions.slice(0, MAX_SHOWN).map((version) => {
          const content = isObjectRecord(version.content_json) ? version.content_json : {};
          const outdated = validateDraft(fields, content).length > 0;
          return (
            <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <div className="text-xs font-bold text-slate-900">{new Date(version.created_at).toLocaleString(i18n.language)}</div>
                <div className="text-xs text-slate-600">
                  {version.updated_by_username || t('content.unknownUser')}
                  {outdated ? <span className="ml-2 font-bold text-red-700">{t('content.schemaMismatch')}</span> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={ui.secondary} onClick={() => onLoad(content)}>
                  {t('content.load')}
                </button>
                <button type="button" className={ui.primary} disabled={outdated || busy} onClick={() => onRestore(content)}>
                  {t('content.restore')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
