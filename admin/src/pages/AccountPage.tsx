import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setToken } from '../auth';
import { LabeledField } from '../components/LabeledField';
import { ui } from '../components/ui';
import { errorText, send } from '../lib/request';
import { useUnsavedGuard } from '../lib/unsaved';

const MIN_LENGTH = 8;

export function AccountPage() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saved, setSaved] = useState(false);

  const mismatch = repeat.length > 0 && next !== repeat;
  useUnsavedGuard(Boolean(current || next || repeat));

  const saveM = useMutation({
    mutationFn: () => send<{ token: string }>('PUT', '/api/auth/password', { current_password: current, new_password: next }),
    onSuccess: ({ token }) => {
      setToken(token);
      setCurrent('');
      setNext('');
      setRepeat('');
      setSaved(true);
    }
  });

  const edit = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    setSaved(false);
    saveM.reset();
  };

  const canSave = !saveM.isPending && current.length > 0 && next.length >= MIN_LENGTH && next === repeat;

  return (
    <form
      className={`${ui.card} grid max-w-md gap-4`}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) saveM.mutate();
      }}
    >
      <LabeledField label={t('account.current')}>
        <input type="password" autoComplete="current-password" className={ui.input} value={current} onChange={edit(setCurrent)} />
      </LabeledField>
      <LabeledField label={t('account.new')} help={t('users.passwordHint')}>
        <input type="password" autoComplete="new-password" className={ui.input} value={next} onChange={edit(setNext)} />
      </LabeledField>
      <LabeledField label={t('account.repeat')} error={mismatch ? t('account.mismatch') : null}>
        <input
          type="password"
          autoComplete="new-password"
          aria-invalid={mismatch}
          className={mismatch ? ui.inputInvalid : ui.input}
          value={repeat}
          onChange={edit(setRepeat)}
        />
      </LabeledField>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={ui.primary} disabled={!canSave}>
          {saveM.isPending ? t('common.saving') : t('common.save')}
        </button>
        <div role="status">
          {saved ? <span className={ui.success}>{t('account.saved')}</span> : null}
          {saveM.isError ? (
            <span className={ui.error}>{errorText(t, saveM.error, 'account.saveError', { 403: 'account.wrongPassword' })}</span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
