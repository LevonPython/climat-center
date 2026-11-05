import { useTranslation } from 'next-i18next';
import { sanitizePhoneInput, isValidArmenianPhone } from '../../lib/phone';

const LINE_INPUT_CLASS = 'min-h-11 w-full border-0 border-b border-ink bg-transparent px-2.5 py-2 text-[15px] text-ink outline-none focus:border-brand';
export const INPUT_CLASS = 'min-h-11 w-full rounded-full border border-brand bg-white px-4 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand';

type RequestFieldsProps = {
  idPrefix: string;
  name: string;
  phone: string;
  website: string;
  phoneTouched: boolean;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onWebsite: (value: string) => void;
  onPhoneBlur: () => void;
  submitted?: boolean;
  variant?: 'pill' | 'line';
};

export function RequestFields(props: RequestFieldsProps) {
  const { t } = useTranslation('common');
  const wrapperClass = props.variant === 'line' ? 'min-w-0' : 'min-w-0 flex-1';
  const inputClass = props.variant === 'line' ? LINE_INPUT_CLASS : INPUT_CLASS;
  const showNameError = Boolean(props.submitted) && props.name.trim().length < 2;
  const showPhoneError = !isValidArmenianPhone(props.phone) && (Boolean(props.submitted) || (props.phoneTouched && props.phone.length > 0));

  return (
    <>
      <div className={wrapperClass}>
        <label htmlFor={`${props.idPrefix}-name`} className="sr-only">
          {t('form.name')}
        </label>
        <input
          id={`${props.idPrefix}-name`}
          required
          value={props.name}
          placeholder={t('form.namePlaceholder')}
          aria-invalid={showNameError}
          className={inputClass}
          onChange={(event) => props.onName(event.target.value)}
        />
        {showNameError ? <p role="alert" className="mt-1 text-sm text-red-700">{t('form.nameRequired')}</p> : null}
      </div>
      <div className={wrapperClass}>
        <label htmlFor={`${props.idPrefix}-phone`} className="sr-only">
          {t('form.phone')}
        </label>
        <input
          id={`${props.idPrefix}-phone`}
          type="tel"
          required
          value={props.phone}
          placeholder={t('form.phonePlaceholder')}
          aria-invalid={showPhoneError}
          className={inputClass}
          onChange={(event) => props.onPhone(sanitizePhoneInput(event.target.value))}
          onBlur={props.onPhoneBlur}
        />
        {showPhoneError ? <p role="alert" className="mt-1 text-sm text-red-700">{t('form.phoneInvalid')}</p> : null}
      </div>
      {/* Hidden from people. Bots fill it in, and the server then discards the request. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        value={props.website}
        onChange={(event) => props.onWebsite(event.target.value)}
      />
    </>
  );
}
