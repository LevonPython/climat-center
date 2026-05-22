import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextI18nextConfig = require('../../next-i18next.config');
import { Layout } from '../../components/Layout';
import { ServiceCard, Service } from '../../components/ServiceCard';
import { apiFetch } from '../../lib/api';

type ServicesProps = {
  services: Service[];
};

export default function ServicesPage(props: ServicesProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const lang = router.locale || 'ru';

  return (
    <Layout title={t('nav.services')}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('services.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{t('services.subtitle')}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.services.map((s) => (
          <ServiceCard key={s.id} service={s} lang={lang} />
        ))}
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<ServicesProps> = async ({ locale }) => {
  const lang = locale || 'ru';
  let services: Service[] = [];

  try {
    const resp = await apiFetch<{ services: Service[] }>('/api/services');
    if (resp.ok) services = resp.services;
  } catch {
    // ignore
  }

  return {
    props: {
      ...(await serverSideTranslations(lang, ['common'], nextI18nextConfig)),
      services
    },
    revalidate: 60
  };
};

