import { render, screen } from '@testing-library/react';
import { useTranslation } from 'next-i18next';
import { PageTranslations } from '../components/site/PageTranslations';

const pageConfig = (language: string, faults: string) => ({
  initialI18nStore: { [language]: { common: { layout: { faults }, greeting: 'Hello {{name}}' } } },
  initialLocale: language,
  ns: ['common'],
  userConfig: null
});

function Label() {
  const { t } = useTranslation('common');
  return <p>{t('layout.faults')}</p>;
}

function Greeting() {
  const { t } = useTranslation('common');
  return <p>{t('greeting', { name: '<b>' })}</p>;
}

describe('page translations', () => {
  test('shows the text held by the page', () => {
    render(<PageTranslations config={pageConfig('en', 'Edited in the admin')}><Label /></PageTranslations>);
    expect(screen.getByText('Edited in the admin')).toBeInTheDocument();
  });

  test('changing language uses the new store', () => {
    const { rerender } = render(<PageTranslations config={pageConfig('en', 'Faults')}><Label /></PageTranslations>);
    rerender(<PageTranslations config={pageConfig('hy', 'Անսարքություններ')}><Label /></PageTranslations>);
    expect(screen.getByText('Անսարքություններ')).toBeInTheDocument();
  });

  test('values are filled in without being escaped twice, as React already escapes them', () => {
    render(<PageTranslations config={pageConfig('en', 'x')}><Greeting /></PageTranslations>);
    expect(screen.getByText('Hello <b>')).toBeInTheDocument();
  });

  test('a page without translations still renders', () => {
    render(<PageTranslations><p>Plain</p></PageTranslations>);
    expect(screen.getByText('Plain')).toBeInTheDocument();
  });
});
