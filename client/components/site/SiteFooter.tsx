import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { telHref } from '../../lib/contactPhone';
import { useSite } from './SiteContext';

export function SiteFooter() {
  const { t } = useTranslation('common');
  const { nav, settings } = useSite();
  const { contacts = {}, footer = {}, social = {} } = settings;
  const links = [
    { href: social.facebook_url, label: 'Facebook' },
    { href: social.instagram_url, label: 'Instagram' }
  ].filter((link) => link.href);

  return (
    <footer className="relative overflow-hidden bg-brand text-[13px] text-white">
      <div className="mx-auto flex max-w-site flex-wrap justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1 basis-72">
          <div>{footer.copyright || t('layout.copyright', { year: new Date().getFullYear() })}</div>
          {(nav.footer || []).filter((item) => item.label).map((item) => (
            <div key={item.id}>
              <Link href={item.href} className="text-white underline">
                {item.label}
              </Link>
            </div>
          ))}
          {footer.disclaimer ? <p className="whitespace-pre-line">{footer.disclaimer}</p> : null}
        </div>
        <div className="sm:text-right">
          {contacts.phone ? (
            <div>
              <a href={telHref(contacts.phone)} className="text-white no-underline">
                {contacts.phone}
              </a>
            </div>
          ) : null}
          {contacts.email ? <div>{contacts.email}</div> : null}
          {links.map((link) => (
            <div key={link.label}>
              <a href={link.href as string} className="text-white underline">
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
