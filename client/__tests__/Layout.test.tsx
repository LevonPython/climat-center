import { fireEvent, render, screen, within } from '@testing-library/react';
import { Layout } from '../components/Layout';
import { SITE, renderWithSite } from '../test/helpers';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'ru', asPath: '/usluga/remont?x=1', push: jest.fn() }) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));
jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div data-testid="head">{children}</div> }));
jest.mock('../lib/api', () => ({ apiFetch: jest.fn(), apiBaseUrl: () => 'https://api.example' }));

const renderLayout = (props = {}, site = SITE) =>
  renderWithSite(
    <Layout title="Ремонт" {...props}>
      <p>Содержимое</p>
    </Layout>,
    site
  );

describe('Layout', () => {
  test('shows the page inside the site frame', () => {
    renderLayout();
    expect(screen.getByText('Содержимое')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Ծանոթագրություն');
    expect(screen.getByRole('link', { name: 'Կլիմայի կենտրոն' })).toHaveAttribute('href', '/');
  });

  test('top bar has the menu, city and messengers', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Մեր մասին' })).toHaveAttribute('href', '/o-kompanii');
    expect(screen.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', 'https://t.me/example');
    fireEvent.click(screen.getByRole('button', { name: /Երևան/ }));
    expect(within(screen.getByRole('list', { name: 'layout.cities' })).getByRole('link', { name: 'Երևան' })).toHaveAttribute('href', '/');
  });

  test('the banner shows only services marked for it, from both groups', () => {
    renderLayout({ hero: true });
    expect(screen.getByRole('link', { name: 'ՎԵՐԱՆՈՐՈԳՈՒՄ' })).toHaveAttribute('href', '/usluga/remont');
    expect(screen.getByRole('link', { name: 'ՉԻ՞ ՍԱՌԵՑՆՈՒՄ' })).toBeInTheDocument();
  });

  test('the hero is left out unless the page asks for it', () => {
    renderLayout();
    expect(screen.queryByRole('link', { name: 'ՎԵՐԱՆՈՐՈԳՈՒՄ' })).not.toBeInTheDocument();
  });

  test('the brands appear on the front page only', () => {
    const { unmount } = renderLayout({ hero: true });
    expect(screen.queryByRole('img', { name: 'LG' })).not.toBeInTheDocument();
    unmount();
    renderLayout({ hero: true, front: true });
    expect(screen.getByRole('img', { name: 'LG' })).toBeInTheDocument();
  });

  test('the sidebar groups services and faults, and leaves out hidden ones', () => {
    renderLayout();
    expect(screen.getByRole('heading', { name: 'layout.services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'layout.faults' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Օդորակիչի վերանորոգում' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Չերևացող' })).not.toBeInTheDocument();
  });

  test('certificates appear when published, and the block goes when none are', () => {
    const { unmount } = renderLayout();
    expect(screen.getByRole('heading', { name: 'layout.certificates' })).toBeInTheDocument();
    unmount();
    renderLayout({}, { ...SITE, galleries: { ...SITE.galleries, certificates: [] } });
    expect(screen.queryByRole('heading', { name: 'layout.certificates' })).not.toBeInTheDocument();
  });

  test('the contacts strip uses the site settings, and a page can leave it out', () => {
    const { unmount } = renderLayout();
    expect(screen.getByRole('link', { name: 'hello@example.am' })).toHaveAttribute('href', 'mailto:hello@example.am');
    unmount();
    renderLayout({ hideContacts: true });
    expect(screen.queryByRole('heading', { name: 'layout.contactsTitle' })).not.toBeInTheDocument();
  });

  test('the floating button calls the number in the settings', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'layout.call' })).toHaveAttribute('href', 'tel:+37410123456');
  });

  test('the phone-size bar opens its menu, services and contact panels', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'layout.menu' }));
    expect(screen.getByRole('link', { name: 'Մեր աշխատանքները' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'layout.servicesShort' }));
    expect(screen.queryByRole('link', { name: 'Մեր աշխատանքները' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'layout.servicesShort' })).getByRole('link', { name: 'Չի՞ սառեցնում' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'layout.contactDetails' }));
    expect(screen.getByText('2 ժամում', { selector: 'p' })).toBeInTheDocument();
  });

  test('the header button opens the request window', () => {
    renderLayout();
    fireEvent.click(screen.getAllByRole('button', { name: 'Թողնել հայտ' })[0]);
    expect(screen.getByRole('dialog', { name: 'request.title' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('search details use the page, with the address minus any query', () => {
    renderLayout({ metaTitle: 'Ремонт в Ереване', description: 'Описание' });
    const head = screen.getByTestId('head');
    expect(head.querySelector('title')).toHaveTextContent('Ремонт в Ереване');
    expect(head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Описание');
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/ru\/usluga\/remont$/);
    expect(head.querySelector('link[hreflang="hy"]')?.getAttribute('href')).toMatch(/[^/]\/usluga\/remont$/);
    expect(head.querySelector('link[hreflang="x-default"]')).toBeTruthy();
  });

  test('without a search title, the title comes from the page and company name', () => {
    renderLayout();
    expect(screen.getByTestId('head').querySelector('title')).toHaveTextContent('Ремонт | Կլիմայի կենտրոն');
  });

  test('a link with no text in this language is left out, not shown blank', () => {
    const site = {
      ...SITE,
      nav: { ...SITE.nav, topbar: [{ id: 't2', label: null, href: '/empty' }] },
      services: { service: [{ ...SITE.services.service![0], title: null, menu_title: null, pill_title: null }] }
    };
    renderLayout({}, site);
    expect(document.querySelector('a[href="/empty"]')).toBeNull();
    expect(document.querySelector('a[href="/usluga/remont"]')).toBeNull();
  });

  test('still renders when the API gave no site data', () => {
    render(
      <Layout>
        <p>Содержимое</p>
      </Layout>
    );
    expect(screen.getByText('Содержимое')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'layout.call' })).not.toBeInTheDocument();
  });
});
