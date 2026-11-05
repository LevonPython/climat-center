import { screen, within } from '@testing-library/react';
import { PageView } from '../components/PageView';
import type { PublicPage } from '../lib/site';
import { renderWithSite } from '../test/helpers';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'hy', asPath: '/usluga/remont', push: jest.fn() }) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));
jest.mock('next/head', () => ({ __esModule: true, default: () => null }));
jest.mock('../lib/api', () => ({ apiFetch: jest.fn(), apiBaseUrl: () => 'https://api.example' }));

const page = (type: string, slug = `sample-${type}`): PublicPage => ({
  slug,
  type,
  title: 'Վերնագիր',
  meta_title: null,
  meta_description: null,
  breadcrumbs: [],
  sections: []
});

const scrollIntoView = jest.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

beforeEach(() => {
  scrollIntoView.mockClear();
  window.history.replaceState({}, '', '/');
});

const crumbs = () => screen.queryByRole('navigation', { name: 'layout.breadcrumbs' });
const heroButton = () => screen.queryByRole('link', { name: 'ՎԵՐԱՆՈՐՈԳՈՒՄ' });
const brandCarousel = () => screen.queryByRole('img', { name: 'LG' });

describe('page frame by type', () => {
  test('home has the hero and the brands, and no breadcrumbs', () => {
    renderWithSite(<PageView page={page('home', 'home')} />);
    expect(heroButton()).toBeInTheDocument();
    expect(brandCarousel()).toBeInTheDocument();
    expect(crumbs()).not.toBeInTheDocument();
  });

  test.each(['service', 'fault'])('a %s page has the hero but not the brands', (type) => {
    renderWithSite(<PageView page={page(type)} />);
    expect(heroButton()).toBeInTheDocument();
    expect(brandCarousel()).not.toBeInTheDocument();
  });

  test.each(['article', 'listing', 'static', 'gallery'])('a %s page has neither', (type) => {
    renderWithSite(<PageView page={page(type)} />);
    expect(heroButton()).not.toBeInTheDocument();
    expect(brandCarousel()).not.toBeInTheDocument();
  });

  test('breadcrumbs sit above both columns, not inside the main one', () => {
    renderWithSite(<PageView page={page('article')} />);
    expect(within(screen.getByRole('main')).queryByRole('navigation', { name: 'layout.breadcrumbs' })).not.toBeInTheDocument();
    expect(crumbs()).toBeInTheDocument();
  });
});

describe('opening a page', () => {
  test.each(['service', 'fault'])('a %s page scrolls past the hero to its breadcrumbs', (type) => {
    renderWithSite(<PageView page={page(type)} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(crumbs());
  });

  test.each(['home', 'article', 'listing'])('a %s page stays at the top', (type) => {
    renderWithSite(<PageView page={page(type)} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  test('a link to a place on the page keeps its own position', () => {
    window.history.replaceState({}, '', '/usluga/remont#prices');
    renderWithSite(<PageView page={page('service')} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  test('moving to another service scrolls again', () => {
    const { rerender } = renderWithSite(<PageView page={page('service', 'one')} />);
    rerender(<PageView page={page('service', 'two')} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
