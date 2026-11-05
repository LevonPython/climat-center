import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isValidArmenianPhone } from '../../lib/phone';
import { WORK_TYPES, useRequest, type WorkType } from '../../lib/useRequest';
import { RequestFields } from './RequestFields';

export function RequestPopup({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common');
  const { status, send } = useRequest();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [work, setWork] = useState<WorkType[]>([]);
  const [workMissing, setWorkMissing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector('input')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  function toggle(type: WorkType) {
    setWorkMissing(false);
    setWork((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!work.length) {
      setWorkMissing(true);
      return;
    }
    if (!isValidArmenianPhone(phone)) return;
    await send({ name, phone, workTypes: work, website });
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-auto bg-[rgba(20,20,20,.4)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="request-title" className="relative w-full max-w-xs bg-white p-5 text-center shadow-[2px_2px_10px_rgba(0,0,0,.7)]">
        <button type="button" aria-label={t('sections.close')} className="absolute right-1 top-1 grid h-11 w-11 place-items-center text-2xl text-body hover:text-brand" onClick={onClose}>
          ×
        </button>
        <h2 id="request-title" className="mb-2 text-[17px] font-medium uppercase">
          {t('request.title')}
        </h2>
        {status === 'sent' ? (
          <p role="status" className="py-6 font-medium text-body">
            {t('request.sent')}
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="relative grid gap-3 text-left">
            <p className="text-center text-sm">{t('request.note')}</p>
            <RequestFields
              idPrefix="popup"
              name={name}
              phone={phone}
              website={website}
              phoneTouched={phoneTouched}
              submitted={submitted}
              onName={setName}
              onPhone={setPhone}
              onWebsite={setWebsite}
              onPhoneBlur={() => setPhoneTouched(true)}
            />
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t('request.question')}</legend>
              {WORK_TYPES.map((type) => (
                <label key={type} className="flex min-h-8 items-center gap-2 text-sm">
                  <input type="checkbox" checked={work.includes(type)} onChange={() => toggle(type)} />
                  {t(`request.work.${type}`)}
                </label>
              ))}
              {workMissing ? <p className="mt-1 text-sm text-red-700">{t('request.workRequired')}</p> : null}
            </fieldset>
            {status === 'failed' ? <p role="alert" className="text-sm text-red-700">{t('request.failed')}</p> : null}
            <button type="submit" disabled={status === 'sending'} className="min-h-11 rounded-full bg-brand px-5 py-2 font-medium uppercase text-white hover:opacity-90 disabled:opacity-60">
              {status === 'sending' ? t('form.sending') : t('request.submit')}
            </button>
            <p className="text-center text-xs text-body">{t('request.consent')}</p>
          </form>
        )}
      </div>
    </div>
  );
}
