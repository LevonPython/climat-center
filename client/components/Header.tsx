import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SocialLinks } from './SocialLinks';
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '../lib/contactPhone';

export function Header() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-tight text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 2.5c5.2 0 9.5 4.3 9.5 9.5S17.2 21.5 12 21.5 2.5 17.2 2.5 12 6.8 2.5 12 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M7.5 13.5c1.2 1.6 2.9 2.6 4.5 2.6s3.3-1 4.5-2.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M8.5 10.2h0M15.5 10.2h0"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>{t('brand')}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-slate-700">
            <Link href="/services" className="hover:text-slate-900">
              {t('nav.services')}
            </Link>
            <Link href="/booking" className="hover:text-slate-900">
              {t('nav.booking')}
            </Link>
            <Link href="/quiz" className="hover:text-slate-900">
              {t('nav.quiz')}
            </Link>
            <Link href="/about" className="hover:text-slate-900">
              {t('nav.about')}
            </Link>
            <Link href="/contacts" className="hover:text-slate-900">
              {t('nav.contacts')}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? '✕' : t('nav.menu')}
          </button>
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="hidden sm:inline text-sm font-semibold text-slate-900">
            {CONTACT_PHONE_DISPLAY}
          </a>
          <div className="hidden md:flex">
            <SocialLinks />
          </div>
          <LanguageSwitcher />
        </div>
      </div>
      {open ? (
        <div id="mobile-nav" className="md:hidden border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-3 grid gap-2 text-sm text-slate-700">
            <Link href="/services" className="hover:text-slate-900" onClick={() => setOpen(false)}>
              {t('nav.services')}
            </Link>
            <Link href="/booking" className="hover:text-slate-900" onClick={() => setOpen(false)}>
              {t('nav.booking')}
            </Link>
            <Link href="/quiz" className="hover:text-slate-900" onClick={() => setOpen(false)}>
              {t('nav.quiz')}
            </Link>
            <Link href="/about" className="hover:text-slate-900" onClick={() => setOpen(false)}>
              {t('nav.about')}
            </Link>
            <Link href="/contacts" className="hover:text-slate-900" onClick={() => setOpen(false)}>
              {t('nav.contacts')}
            </Link>
            <a href={`tel:${CONTACT_PHONE_TEL}`} className="pt-2 font-semibold text-slate-900">
              {CONTACT_PHONE_DISPLAY}
            </a>
            <div className="pt-1">
              <SocialLinks />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

