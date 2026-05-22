import Link from 'next/link';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextI18nextConfig = require('../next-i18next.config');
import { Layout } from '../components/Layout';
import { apiFetch } from '../lib/api';

type HomeProps = {
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroCta?: string | null;
};

export default function Home(props: HomeProps) {
  const { t } = useTranslation('common');
  return (
    <Layout title={t('nav.home')}>
      <section className="rounded-3xl bg-slate-900 text-white p-8 md:p-12">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-slate-300">{t('hero.kicker')}</div>
          <h1 className="mt-3 text-3xl md:text-5xl font-extrabold leading-tight">
            {props.heroTitle || t('hero.title')}
          </h1>
          <p className="mt-4 text-slate-200 text-base md:text-lg">{props.heroSubtitle || t('hero.subtitle')}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              {props.heroCta || t('hero.cta')}
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              {t('hero.secondaryCta')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { title: t('usp.fastTitle'), desc: t('usp.fastDesc') },
          { title: t('usp.guaranteeTitle'), desc: t('usp.guaranteeDesc') },
          { title: t('usp.toolsTitle'), desc: t('usp.toolsDesc') }
        ].map((b) => (
          <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-base font-extrabold text-slate-900">{b.title}</div>
            <div className="mt-2 text-sm text-slate-700">{b.desc}</div>
          </div>
        ))}
      </section>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({ locale }) => {
  const lang = locale || 'ru';

  let heroTitle: string | undefined;
  let heroSubtitle: string | undefined;
  let heroCta: string | undefined;

  try {
    const content = await apiFetch<{ pages: any }>(`/api/content/${lang}`);
    if (content.ok) {
      const hero = content.pages?.home?.hero;
      if (hero) {
        heroTitle = hero.title;
        heroSubtitle = hero.subtitle;
        heroCta = hero.cta;
      }
    }
  } catch {
    // ignore (API may be offline during development)
  }

  return {
    props: {
      ...(await serverSideTranslations(lang, ['common'], nextI18nextConfig)),
      // Next.js cannot serialize `undefined` in page props
      heroTitle: heroTitle ?? null,
      heroSubtitle: heroSubtitle ?? null,
      heroCta: heroCta ?? null
    },
    revalidate: 60
  };
};

