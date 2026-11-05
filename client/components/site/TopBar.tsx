import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState } from 'react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useSite } from './SiteContext';

export function TopBar() {
  const { t } = useTranslation('common');
  const { nav, settings } = useSite();
  const [citiesOpen, setCitiesOpen] = useState(false);
  const cities = nav.cities || [];
  const { telegram_url: telegram, whatsapp_url: whatsapp } = settings.social || {};

  return (
    <div className="bg-brand text-white">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-1 text-xs uppercase">
        <div className="relative flex flex-wrap items-center gap-x-4">
          {cities.length ? (
            <button type="button" aria-expanded={citiesOpen} className="min-h-8 uppercase" onClick={() => setCitiesOpen((open) => !open)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-1 inline h-3.5 w-3.5 fill-current align-[-2px]">
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.500a2.500 2.500 0 0 1 0 5z" />
              </svg>
              <span className="border-b border-dashed border-white">{cities[0].label}</span>
            </button>
          ) : null}
          {citiesOpen ? (
            <ul aria-label={t('layout.cities')} className="absolute left-0 top-full z-30 min-w-40 bg-white py-1 normal-case text-ink shadow-lg">
              {cities.map((city) => (
                <li key={city.id}>
                  <Link href={city.href} className="block px-4 py-2 text-ink no-underline hover:bg-panel" onClick={() => setCitiesOpen(false)}>
                    {city.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {(nav.topbar || []).filter((item) => item.label).map((item) => (
            <Link key={item.id} href={item.href} className="min-h-8 leading-8 text-white no-underline">
              <span className="border-b border-dashed border-white">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {telegram ? <a href={telegram} aria-label="Telegram" className="h-8 w-8 bg-[url('/theme/tg.png')] bg-contain bg-no-repeat" /> : null}
          {whatsapp ? <a href={whatsapp} aria-label="WhatsApp" className="h-10 w-10 bg-[url('/theme/connect.png')] bg-[50%_0] bg-no-repeat" /> : null}
        </div>
      </div>
    </div>
  );
}
