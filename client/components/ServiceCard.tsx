import Link from 'next/link';
import { useTranslation } from 'next-i18next';

export type Service = {
  id: string;
  type: string;
  title_en?: string | null;
  title_ru?: string | null;
  title_am?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  description_am?: string | null;
  price?: number | null;
  image_url?: string | null;
};

function pickLang(svc: Service, lang: string) {
  const title =
    (lang === 'ru' ? svc.title_ru : lang === 'am' ? svc.title_am : svc.title_en) ||
    svc.title_ru ||
    svc.title_en ||
    svc.title_am ||
    '—';
  const description =
    (lang === 'ru' ? svc.description_ru : lang === 'am' ? svc.description_am : svc.description_en) ||
    svc.description_ru ||
    svc.description_en ||
    svc.description_am ||
    '';
  return { title, description };
}

export function ServiceCard(props: { service: Service; lang: string }) {
  const { t } = useTranslation('common');
  const { title, description } = pickLang(props.service, props.lang);
  const typeKey = (props.service.type || '').trim().toLowerCase();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t(`serviceTypes.${typeKey}`, { defaultValue: props.service.type })}
      </div>
      <div className="mt-2 text-lg font-bold text-slate-900">{title}</div>
      {description ? <div className="mt-2 text-sm text-slate-700">{description}</div> : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href={{ pathname: '/booking', query: { serviceId: props.service.id } }}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {t('services.card.signUp')}
        </Link>
        {typeof props.service.price === 'number' ? (
          <div className="text-sm font-semibold text-slate-900">
            {t('services.card.fromPrice', { price: props.service.price })}
          </div>
        ) : (
          <div className="text-xs text-slate-500">{t('services.card.priceOnRequest')}</div>
        )}
      </div>
    </div>
  );
}

