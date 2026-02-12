import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { Layout } from '../components/Layout';

export default function AboutPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('nav.about')}>
      <div className="max-w-6xl">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('about.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{t('about.subtitle')}</p>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="prose prose-slate max-w-none">
                <h2 className="m-0 text-xl font-extrabold text-slate-900">{t('about.section1Title')}</h2>
                <p className="mt-3 text-sm text-slate-700">{t('about.section1Body')}</p>

                <h2 className="mt-6 text-xl font-extrabold text-slate-900">{t('about.section2Title')}</h2>
                <p className="mt-3 text-sm text-slate-700">{t('about.section2Body')}</p>

                <h2 className="mt-6 text-xl font-extrabold text-slate-900">{t('about.section3Title')}</h2>
                <p className="mt-3 text-sm text-slate-700">{t('about.section3Body')}</p>
              </div>
            </div>
          </div>

          <aside className="grid gap-4 content-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-extrabold text-slate-900">{t('about.factsTitle')}</div>
              <div className="mt-4 grid gap-3">
                {[
                  { title: t('about.fact1Title'), desc: t('about.fact1Desc') },
                  { title: t('about.fact2Title'), desc: t('about.fact2Desc') },
                  { title: t('about.fact3Title'), desc: t('about.fact3Desc') }
                ].map((f) => (
                  <div key={f.title} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-sm font-bold text-slate-900">{f.title}</div>
                    <div className="mt-1 text-xs text-slate-700">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-extrabold text-slate-900">{t('about.ctaTitle')}</div>
              <p className="mt-2 text-sm text-slate-700">{t('about.ctaSubtitle')}</p>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href="tel:+74951828384"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  {t('about.call')}
                </a>
                <Link
                  href="/contacts"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                >
                  {t('about.contacts')}
                </Link>
              </div>
            </div>
          </aside>
        </section>
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

