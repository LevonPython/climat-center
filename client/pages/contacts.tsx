import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Layout } from '../components/Layout';
import { SocialLinks } from '../components/SocialLinks';

export default function ContactsPage() {
  const { t } = useTranslation('common');

  // Keep map embed off for now (easy to turn on later).
  const SHOW_MAP = false;

  return (
    <Layout title={t('nav.contacts')}>
      <div className="max-w-4xl">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('contacts.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{t('contacts.subtitle')}</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.phone')}</div>
            <a
              href="tel:+74951828384"
              className="mt-3 inline-flex text-sm font-semibold text-slate-900 hover:underline"
            >
              +7 (495) 182-83-84
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.email')}</div>
            <a
              href="mailto:mail@climatecentr.ru"
              className="mt-3 inline-flex text-sm font-semibold text-slate-900 hover:underline"
            >
              mail@climatecentr.ru
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.hours')}</div>
            <div className="mt-3 text-sm text-slate-700">{t('contacts.hoursValue')}</div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.address')}</div>
            <div className="mt-3 text-sm text-slate-700">{t('footer.addressValue')}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.social')}</div>
            <p className="mt-2 text-sm text-slate-700">{t('contacts.socialSubtitle')}</p>
            <div className="mt-4">
              <SocialLinks variant="labeled" />
            </div>
          </div>
        </section>

        {SHOW_MAP ? (
          <section className="mt-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-extrabold text-slate-900">{t('contacts.map')}</div>
              <div className="mt-3 text-sm text-slate-700">{t('contacts.mapSubtitle')}</div>
              <div className="mt-4 h-64 rounded-xl bg-slate-100" />
            </div>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const lang = locale || 'ru';
  return {
    props: {
      ...(await serverSideTranslations(lang, ['common']))
    }
  };
};

