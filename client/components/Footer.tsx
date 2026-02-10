import { useTranslation } from 'next-i18next';

export function Footer() {
  const { t } = useTranslation('common');
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-extrabold text-slate-900">{t('brand')}</div>
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

