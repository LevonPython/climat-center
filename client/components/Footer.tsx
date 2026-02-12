import { useTranslation } from 'next-i18next';

export function Footer() {
  const { t } = useTranslation('common');
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3">
        <div>
          <div className="inline-flex items-center gap-2 font-extrabold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 2.5c5.2 0 9.5 4.3 9.5 9.5S17.2 21.5 12 21.5 2.5 17.2 2.5 12 6.8 2.5 12 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M7.5 13.5c1.2 1.6 2.9 2.6 4.5 2.6s3.3-1 4.5-2.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M8.5 10.2h0M15.5 10.2h0"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>{t('brand')}</span>
          </div>
          <div className="mt-2 text-sm text-slate-700">{t('footer.tagline')}</div>
        </div>
        <div className="text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{t('footer.contacts')}</div>
          <div className="mt-2">8 (495) 182-83-84</div>
          <div>mail@climatecentr.ru</div>
        </div>
        <div className="text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{t('footer.address')}</div>
          <div className="mt-2">{t('footer.addressValue')}</div>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-600">
          © {new Date().getFullYear()} {t('brand')}
        </div>
      </div>
    </footer>
  );
}

