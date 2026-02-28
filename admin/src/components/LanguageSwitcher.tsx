import { useTranslation } from 'react-i18next';
import type { Locale } from '../i18n';

const LOCALES: { id: Locale; label: string }[] = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
  { id: 'am', label: 'AM' }
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'ru') as Locale;

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => i18n.changeLanguage(l.id)}
          className={[
            'px-2 py-1 text-xs font-semibold rounded-full',
            current === l.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          ].join(' ')}
          aria-pressed={current === l.id}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
