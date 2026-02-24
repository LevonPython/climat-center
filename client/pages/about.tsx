import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { Layout } from '../components/Layout';
import { apiFetch } from '../lib/api';

type AboutContent = {
  title?: string | null;
  subtitle?: string | null;
  section1Title?: string | null;
  section1Body?: string | null;
  section2Title?: string | null;
  section2Body?: string | null;
  section3Title?: string | null;
  section3Body?: string | null;
  factsTitle?: string | null;
  fact1Title?: string | null;
  fact1Desc?: string | null;
  fact2Title?: string | null;
  fact2Desc?: string | null;
  fact3Title?: string | null;
  fact3Desc?: string | null;
  ctaTitle?: string | null;
  ctaSubtitle?: string | null;
  call?: string | null;
  contacts?: string | null;
};

type AboutProps = {
  page: AboutContent | null;
};

export default function AboutPage(props: AboutProps) {
  const { t } = useTranslation('common');
  const page = props.page;

  return (
    <Layout title={t('nav.about')}>
      <div className="max-w-6xl">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{page?.title || t('about.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{page?.subtitle || t('about.subtitle')}</p>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="prose prose-slate max-w-none">
                <h2 className="m-0 text-xl font-extrabold text-slate-900">{page?.section1Title || t('about.section1Title')}</h2>
                <p className="mt-3 text-sm text-slate-700">{page?.section1Body || t('about.section1Body')}</p>

                <h2 className="mt-6 text-xl font-extrabold text-slate-900">{page?.section2Title || t('about.section2Title')}</h2>
                <p className="mt-3 text-sm text-slate-700">{page?.section2Body || t('about.section2Body')}</p>

                <h2 className="mt-6 text-xl font-extrabold text-slate-900">{page?.section3Title || t('about.section3Title')}</h2>
                <p className="mt-3 text-sm text-slate-700">{page?.section3Body || t('about.section3Body')}</p>
              </div>
            </div>
          </div>

          <aside className="grid gap-4 content-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-extrabold text-slate-900">{page?.factsTitle || t('about.factsTitle')}</div>
              <div className="mt-4 grid gap-3">
                {[
                  { title: page?.fact1Title || t('about.fact1Title'), desc: page?.fact1Desc || t('about.fact1Desc') },
                  { title: page?.fact2Title || t('about.fact2Title'), desc: page?.fact2Desc || t('about.fact2Desc') },
                  { title: page?.fact3Title || t('about.fact3Title'), desc: page?.fact3Desc || t('about.fact3Desc') }
                ].map((f) => (
                  <div key={f.title} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-sm font-bold text-slate-900">{f.title}</div>
                    <div className="mt-1 text-xs text-slate-700">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-extrabold text-slate-900">{page?.ctaTitle || t('about.ctaTitle')}</div>
              <p className="mt-2 text-sm text-slate-700">{page?.ctaSubtitle || t('about.ctaSubtitle')}</p>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href="tel:+74951828384"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  {page?.call || t('about.call')}
                </a>
                <Link
                  href="/contacts"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                >
                  {page?.contacts || t('about.contacts')}
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<AboutProps> = async ({ locale }) => {
  const lang = locale || 'ru';
  let page: AboutContent | null = null;

  try {
    const content = await apiFetch<{ pages: any }>(`/api/content/${lang}`);
    if (content.ok) {
      page = (content.pages?.about?.page || null) as AboutContent | null;
    }
  } catch {
    // ignore (API may be offline)
  }

  return {
    props: {
      ...(await serverSideTranslations(lang, ['common'])),
      page
    },
    revalidate: 60
  };
};

