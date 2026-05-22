import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextI18nextConfig = require('../next-i18next.config');
import { Layout } from '../components/Layout';
import { SocialLinks, SocialPlatform, SocialLink } from '../components/SocialLinks';
import { apiFetch } from '../lib/api';

type ContactsPageContent = {
  title?: string | null;
  subtitle?: string | null;
  socialTitle?: string | null;
  socialSubtitle?: string | null;
};

type GlobalContacts = {
  phone?: string | null;
  email?: string | null;
  hours?: string | null;
  address?: string | null;
};

type GlobalSocial = Partial<Record<`${SocialPlatform}_url`, string | null>>;

type ContactsProps = {
  page: ContactsPageContent | null;
  globalContacts: GlobalContacts | null;
  globalSocial: GlobalSocial | null;
};

function pickSocialLinks(globalSocial: GlobalSocial | null): SocialLink[] | undefined {
  if (!globalSocial) return undefined;

  const out: SocialLink[] = [];
  const push = (id: SocialPlatform) => {
    const href = globalSocial[`${id}_url`];
    if (typeof href === 'string' && href.trim()) out.push({ id, href });
  };

  push('whatsapp');
  push('telegram');
  push('facebook');
  push('instagram');

  return out.length ? out : undefined;
}

export default function ContactsPage(props: ContactsProps) {
  const { t } = useTranslation('common');
  const page = props.page;
  const globalContacts = props.globalContacts;
  const socialLinks = pickSocialLinks(props.globalSocial);

  // Keep map embed off for now (easy to turn on later).
  const SHOW_MAP = false;

  return (
    <Layout title={t('nav.contacts')}>
      <div className="max-w-4xl">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{page?.title || t('contacts.title')}</h1>
          <p className="mt-2 text-sm text-slate-700">{page?.subtitle || t('contacts.subtitle')}</p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.phone')}</div>
            <a
              href="tel:+74951828384"
              className="mt-3 inline-flex text-sm font-semibold text-slate-900 hover:underline"
            >
              {globalContacts?.phone || '+7 (495) 182-83-84'}
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.email')}</div>
            <a
              href="mailto:mail@climatecentr.ru"
              className="mt-3 inline-flex text-sm font-semibold text-slate-900 hover:underline"
            >
              {globalContacts?.email || 'mail@climatecentr.ru'}
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.hours')}</div>
            <div className="mt-3 text-sm text-slate-700">{globalContacts?.hours || t('contacts.hoursValue')}</div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{t('contacts.address')}</div>
            <div className="mt-3 text-sm text-slate-700">{globalContacts?.address || t('footer.addressValue')}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-extrabold text-slate-900">{page?.socialTitle || t('contacts.social')}</div>
            <p className="mt-2 text-sm text-slate-700">{page?.socialSubtitle || t('contacts.socialSubtitle')}</p>
            <div className="mt-4">
              <SocialLinks variant="labeled" links={socialLinks} />
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

export const getStaticProps: GetStaticProps<ContactsProps> = async ({ locale }) => {
  const lang = locale || 'ru';
  let page: ContactsPageContent | null = null;
  let globalContacts: GlobalContacts | null = null;
  let globalSocial: GlobalSocial | null = null;

  try {
    const content = await apiFetch<{ pages: any }>(`/api/content/${lang}`);
    if (content.ok) {
      page = (content.pages?.contacts?.page || null) as ContactsPageContent | null;
      globalContacts = (content.pages?.global?.contacts || null) as GlobalContacts | null;
      globalSocial = (content.pages?.global?.social || null) as GlobalSocial | null;
    }
  } catch {
    // ignore (API may be offline)
  }

  return {
    props: {
      ...(await serverSideTranslations(lang, ['common'], nextI18nextConfig)),
      page,
      globalContacts,
      globalSocial
    },
    revalidate: 60
  };
};

