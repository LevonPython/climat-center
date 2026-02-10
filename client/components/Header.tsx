import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-extrabold tracking-tight text-slate-900">
            {t('brand')}
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
            {open ? '✕' : 'Меню'}
          </button>
          <a href="tel:+74951828384" className="hidden sm:inline text-sm font-semibold text-slate-900">
            +7 (495) 182-83-84
          </a>
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
            <a href="tel:+74951828384" className="pt-2 font-semibold text-slate-900">
              +7 (495) 182-83-84
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

