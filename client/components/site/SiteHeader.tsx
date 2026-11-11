import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState } from 'react';
import { assetUrl } from '../../lib/assets';
import { telHref } from '../../lib/contactPhone';
import { useRequestPopup, useSite } from './SiteContext';

type Panel = 'menu' | 'services' | 'contacts' | null;

const CTA = 'inline-block min-h-11 rounded-full bg-brand px-5 py-3 text-xs font-medium lowercase text-white hover:opacity-90';

function Burger() {
  return (
    <span aria-hidden="true" className="mr-2 inline-block w-7 align-middle">
      <span className="my-[5px] block h-0.5 bg-brand" />
      <span className="my-[5px] block h-0.5 bg-brand" />
      <span className="my-[5px] block h-0.5 bg-brand" />
    </span>
  );
}

export function SiteHeader() {
  const { t } = useTranslation('common');
  const { nav, services, settings } = useSite();
  const openRequest = useRequestPopup();
  const [panel, setPanel] = useState<Panel>(null);
  const { branding = {}, contacts = {}, header = {} } = settings;
  const siteName = branding.site_name || t('brand');
  const phoneHref = contacts.phone ? telHref(contacts.phone) : null;
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const closePanel = () => setPanel(null);
  const [firstWord, ...otherWords] = siteName.split(' ');

  const contactBlock = (
    <>
      {header.free_visit_text ? <div className="text-xs font-light">{header.free_visit_text}</div> : null}
      {contacts.phone && phoneHref ? (
        <a href={phoneHref} className="block text-2xl font-light text-brand no-underline">
          {contacts.phone}
        </a>
      ) : null}
      {contacts.email ? <div className="text-lg">{contacts.email}</div> : null}
    </>
  );

  return (
    <header className="relative z-20 bg-white shadow-[1px_2px_4px_rgba(0,0,0,.4)]">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-x-5 px-5 py-2.5 max-desk:justify-center">
        <Link href="/" aria-label={siteName} className="flex items-center gap-3 text-[#323232] no-underline">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(branding.logo_url)} alt="" className="block h-[92px] w-auto max-desk:h-auto max-desk:w-[70px]" />
          ) : null}
          <span>
            <span className="block whitespace-nowrap text-[30px] font-light uppercase max-desk:text-[22px]">
              {firstWord} <span className="font-medium text-brand">{otherWords.join(' ')}</span>
            </span>
            {branding.tagline ? <span className="block max-w-[320px] text-[17px] font-light leading-none max-desk:max-w-[190px] max-desk:text-[13px]">{branding.tagline}</span> : null}
          </span>
        </Link>

        <div className="hidden items-start gap-5 desk:flex">
          <div className="hidden max-w-[230px] font-light leading-none wide:block">
            {header.hours_text ? <div className="bg-[url('/theme/head_icons.png')] bg-[0_-40px] bg-no-repeat py-1 pl-[51px] text-[15px]">{header.hours_text}</div> : null}
            {header.arrival_text ? <div className="ml-5 mt-2 text-lg">{header.arrival_text}</div> : null}
          </div>
          <div className="relative pl-[47px]">
            <span aria-hidden="true" className="absolute left-0 top-0 h-10 w-[39px] bg-[url('/theme/head_icons.png')] bg-no-repeat" />
            {contactBlock}
          </div>
          <div className="text-right">
            <nav aria-label={t('layout.mainMenu')} className="mb-2 flex flex-wrap justify-end gap-x-4 text-xs uppercase">
              {(nav.header || []).filter((item) => item.label).map((item) => (
                <Link key={item.id} href={item.href} className="leading-6 text-ink no-underline hover:text-brand">
                  {item.label}
                </Link>
              ))}
            </nav>
            <button type="button" className={CTA} onClick={openRequest}>
              {header.cta_label || t('request.title')}
            </button>
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-6 border-t border-brand pt-2 desk:hidden">
          <button type="button" aria-expanded={panel === 'menu'} className="min-h-11 uppercase text-[#222]" onClick={() => toggle('menu')}>
            <Burger />
            {t('layout.menu')}
          </button>
          <button type="button" aria-expanded={panel === 'services'} className="min-h-11 uppercase text-[#222]" onClick={() => toggle('services')}>
            <Burger />
            {t('layout.servicesShort')}
          </button>
          <button type="button" aria-expanded={panel === 'contacts'} aria-label={t('layout.contactDetails')} className="h-11 w-11 bg-[url('/theme/head_icons.png')] bg-no-repeat" onClick={() => toggle('contacts')} />
        </div>
      </div>

      {panel === 'menu' ? (
        <nav aria-label={t('layout.mainMenu')} className="absolute left-0 right-0 top-full z-30 border-t-2 border-brand bg-white shadow desk:hidden">
          <ul>
            {(nav.mobile || nav.header || []).filter((item) => item.label).map((item) => (
              <li key={item.id} className="border-t border-panel first:border-0">
                <Link href={item.href} className="block px-5 py-3 uppercase text-ink no-underline" onClick={closePanel}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {panel === 'services' ? (
        <nav aria-label={t('layout.servicesShort')} className="absolute left-0 right-0 top-full z-30 max-h-[70vh] overflow-auto border-t-2 border-brand bg-white shadow desk:hidden">
          <ul>
            {[...(services.service || []), ...(services.fault || [])]
              .filter((service) => service.show_in_menu && service.href && (service.menu_title || service.title))
              .map((service) => (
                <li key={service.id} className="border-t border-panel first:border-0">
                  <Link href={service.href as string} className="block px-5 py-3 text-ink no-underline" onClick={closePanel}>
                    {service.menu_title || service.title}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      ) : null}

      {panel === 'contacts' ? (
        <div className="absolute left-0 right-0 top-full z-30 border-t-2 border-brand bg-white p-5 text-center shadow desk:hidden">
          {header.hours_text ? <p className="mb-2 font-light">{header.hours_text}</p> : null}
          {header.arrival_text ? <p className="mb-3 font-light">{header.arrival_text}</p> : null}
          {contactBlock}
          <button
            type="button"
            className={`${CTA} mt-4`}
            onClick={() => {
              closePanel();
              openRequest();
            }}
          >
            {header.cta_label || t('request.title')}
          </button>
        </div>
      ) : null}
    </header>
  );
}
