import { useRouter } from 'next/router';
import { LOCALES } from '../lib/seo';

export function LanguageSwitcher() {
  const router = useRouter();
  const current = router.locale || 'hy';

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => router.push(router.asPath, router.asPath, { locale })}
          className={[
            'px-2 py-1 text-xs font-semibold rounded-full',
            current === locale ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          ].join(' ')}
          aria-pressed={current === locale}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
