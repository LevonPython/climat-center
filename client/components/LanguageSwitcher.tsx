import { useRouter } from 'next/router';

const LOCALES = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
  { id: 'am', label: 'AM' }
] as const;

export function LanguageSwitcher() {
  const router = useRouter();
  const current = (router.locale || 'ru') as (typeof LOCALES)[number]['id'];

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => router.push(router.asPath, router.asPath, { locale: l.id })}
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

