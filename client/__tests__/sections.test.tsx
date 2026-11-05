import { fireEvent, screen } from '@testing-library/react';
import { Sections, SECTION_COMPONENTS } from '../components/sections';
import { SITE, renderWithSite } from '../test/helpers';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options?.number ? `${key} ${options.number}` : key) })
}));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'ru', asPath: '/usluga/remont' }) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));
jest.mock('../lib/api', () => ({ apiFetch: jest.fn(), apiBaseUrl: () => 'https://api.example' }));

function renderSection(block_type: string, content: Record<string, unknown>) {
  return renderWithSite(<Sections sections={[{ id: 's1', block_type, content }]} />);
}

describe('section components', () => {
  test('every block type on the server has a component', () => {
    const { ALL_BLOCK_TYPES } = require('../../server/src/contentSchemas/blockTypes');
    const types = ALL_BLOCK_TYPES.map((block: { type: string }) => block.type).sort();
    expect(Object.keys(SECTION_COMPONENTS).sort()).toEqual(types);
  });

  test('an unknown block type is skipped rather than breaking the page', () => {
    renderSection('from_the_future', {});
    expect(document.body).toHaveTextContent('');
  });

  test.each(Object.keys(SECTION_COMPONENTS))('%s renders with nothing filled in', (blockType) => {
    expect(() => renderSection(blockType, {})).not.toThrow();
  });

  test('a heading shows its highlighted part', () => {
    renderSection('work_cards', { heading: 'Работы **включают**', items: [] });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Работы включают');
    expect(screen.getByText('включают').tagName).toBe('B');
  });

  test('intro banner is the page heading, with promos', () => {
    renderSection('intro_banner', {
      heading: 'ЦЕНТР',
      subheading: 'Обслуживание',
      intro_text: 'Вступление',
      promos: [{ label: 'Профилактика', price: null, image_url: '/uploads/a.png' }]
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ЦЕНТРОбслуживание');
    expect(screen.getByText('Вступление')).toBeInTheDocument();
    expect(screen.getByText('Профилактика')).toBeInTheDocument();
  });

  test.each(['price_cards', 'price_list'])('%s shows "price on request" when no price is entered', (blockType) => {
    renderSection(blockType, { items: [{ title: 'Чистка', price: null }, { title: 'Ремонт', price: '5000 AMD' }] });
    expect(screen.getByText('sections.priceOnRequest')).toBeInTheDocument();
    expect(screen.getByText('5000 AMD')).toBeInTheDocument();
  });

  describe('price list', () => {
    const rows = [
      { title: 'Настенный', price: '5000 AMD' },
      { title: 'Кассетный', price: null },
      { title: 'Канальный', price: null },
      { title: 'Колонный', price: null }
    ];

    test('a grouped list shows its first two rows until the rest are opened', () => {
      renderSection('price_list', { group_title: 'Чистка', group_price: 'от 2000 AMD', items: rows });

      expect(screen.getByText('Чистка')).toBeVisible();
      expect(screen.getByText('от 2000 AMD')).toBeVisible();
      expect(screen.getByText('Настенный')).toBeVisible();
      expect(screen.getByText('Кассетный')).toBeVisible();
      expect(screen.getByText('Канальный')).not.toBeVisible();

      fireEvent.click(screen.getByRole('button', { name: 'sections.showAllPrices' }));
      expect(screen.getByText('Канальный')).toBeVisible();
      expect(screen.getByText('Колонный')).toBeVisible();

      fireEvent.click(screen.getByRole('button', { name: 'sections.collapsePrices' }));
      expect(screen.getByText('Канальный')).not.toBeVisible();
    });

    test('a grouped list with nothing more to show has no button', () => {
      renderSection('price_list', { group_title: 'Чистка', items: rows.slice(0, 2) });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('a plain list of prices stays whole', () => {
      renderSection('price_list', { items: rows });
      expect(screen.getByText('Колонный')).toBeVisible();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('a group without a price does not claim one', () => {
      renderSection('price_list', { group_title: 'Чистка', items: [{ title: 'Настенный', price: '5000 AMD' }] });
      expect(screen.queryByText('sections.priceOnRequest')).not.toBeInTheDocument();
    });

    test('the heading is a title above the list, not a control', () => {
      renderSection('price_list', { heading: '**Цены** на ремонт', items: rows });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Цены на ремонт');
    });
  });

  test('steps are numbered in order', () => {
    renderSection('steps', { items: [{ title: 'Первый' }, { title: 'Второй' }] });
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('1Первый');
    expect(items[1]).toHaveTextContent('2Второй');
  });

  test('icon features can link to a page', () => {
    renderSection('icon_features', { items: [{ title: 'В квартире', link_url: '/kvartira', icon_url: '/uploads/i.svg' }, { description: 'Без ссылки' }] });
    expect(screen.getByRole('link', { name: 'В квартире' })).toHaveAttribute('href', '/kvartira');
    expect(screen.getByText('Без ссылки').closest('a')).toBeNull();
  });

  test('icon links show as a row of their own, with the whole text linked', () => {
    renderSection('icon_features', { items: [{ icon_url: '/uploads/a.svg', title: 'Ремонт в квартире', link_url: '/remont-v-kvartire' }] });
    const link = screen.getByRole('link', { name: 'Ремонт в квартире' });
    expect(link).toHaveAttribute('href', '/remont-v-kvartire');
    expect(link.closest('section')?.querySelector('img')).toHaveAttribute('src', 'https://api.example/uploads/a.svg');
  });

  test('questions open to show their answers', () => {
    renderSection('faq', { heading: 'Вопросы', items: [{ question: 'Как?', answer: '<p>Так</p>' }] });
    expect(screen.getByText('Как?').closest('summary')).toBeInTheDocument();
    expect(screen.getByText('Так')).toBeInTheDocument();
  });

  test('error codes are grouped by brand', () => {
    renderSection('error_codes', { items: [{ brand: 'LG', codes: '<ul><li>E1 ошибка</li></ul>' }] });
    expect(screen.getByText('LG').closest('summary')).toBeInTheDocument();
    expect(screen.getByText('E1 ошибка')).toBeInTheDocument();
  });

  test('a listing shows the services of its category', () => {
    renderSection('listing', { category: 'fault' });
    expect(screen.getByRole('link', { name: 'Չի սառեցնում' })).toHaveAttribute('href', '/usluga/ne-holodit');
    expect(screen.queryByRole('link', { name: 'Վերանորոգում' })).not.toBeInTheDocument();
  });

  describe('highlight', () => {
    const items = [{ text: 'Чистка' }, { text: 'Ремонт' }];

    test('points with icons show them', () => {
      const { container } = renderSection('callout', { heading: 'Заголовок', items: [{ text: 'Чистка', icon_url: '/uploads/a.svg' }], button_label: 'Вызвать' });
      expect(screen.getByText('Чистка').closest('li')?.querySelector('img')).toHaveAttribute('src', 'https://api.example/uploads/a.svg');
      expect(container.querySelector('button')).toHaveTextContent('Вызвать');
    });

    test('a picture sits beside the points', () => {
      const { container } = renderSection('callout', { heading: 'Заголовок', items, image_url: '/uploads/a.png', button_label: 'Заказать' });
      expect(screen.getByText('Ремонт')).toBeInTheDocument();
      expect(container.querySelector('img[src$="/uploads/a.png"]')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Заказать' })).toBeInTheDocument();
    });

    test('with no points, the picture goes beside the heading', () => {
      const { container } = renderSection('callout', { heading: 'Установка **под ключ**', items: [], image_url: '/uploads/a.png', button_label: 'Заявка' });
      expect(screen.getByText('под ключ').tagName).toBe('B');
      expect(container.querySelector('img[src$="/uploads/a.png"]')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Заявка' })).toBeInTheDocument();
    });

    test('with neither, it is a plain box of points', () => {
      const { container } = renderSection('callout', { heading: 'Заголовок', items, button_label: 'Заказать' });
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  test('warning signs list their names and the advice below', () => {
    const { container } = renderSection('signs', { heading: 'Признаки', items: [{ title: 'Шум' }, { title: 'Треск', icon_url: '/uploads/a.svg' }], body: '<p>Вызовите мастера</p>' });
    expect(screen.getByRole('heading', { name: 'Признаки' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Шум', 'Треск']);
    expect(container.querySelector('img[src$="/uploads/a.svg"]')).toBeInTheDocument();
    expect(screen.getByText('Вызовите мастера')).toBeInTheDocument();
  });

  describe('map', () => {
    test('shows the address from the site settings', () => {
      renderSection('map', {});
      const map = screen.getByTitle('sections.map');
      expect(map.getAttribute('src')).toBe(`https://www.google.com/maps?q=${encodeURIComponent(SITE.settings.contacts!.address as string)}&output=embed`);
      expect(map).toHaveAttribute('loading', 'lazy');
    });

    test('shows nothing without an address', () => {
      renderWithSite(<Sections sections={[{ id: 's1', block_type: 'map', content: {} }]} />, { ...SITE, settings: { ...SITE.settings, contacts: {} } });
      expect(screen.queryByTitle('sections.map')).not.toBeInTheDocument();
    });
  });

  describe('image with text', () => {
    const content = { image_url: '/uploads/a.png', body: '<p>Описание</p>' };
    const pictureComesFirst = (container: HTMLElement) => {
      const picture = container.querySelector('img') as HTMLElement;
      return Boolean(picture.compareDocumentPosition(screen.getByText('Описание')) & Node.DOCUMENT_POSITION_FOLLOWING);
    };

    test('the picture comes first by default', () => {
      const { container } = renderSection('image_text', content);
      expect(pictureComesFirst(container)).toBe(true);
    });

    test('the picture can sit on the right', () => {
      const { container } = renderSection('image_text', { ...content, image_side: 'right' });
      expect(pictureComesFirst(container)).toBe(false);
    });
  });

  test('a video only embeds from known sites', () => {
    const { unmount } = renderSection('video', { video_url: 'https://evil.example/x' });
    expect(document.querySelector('iframe')).toBeNull();
    unmount();
    renderSection('video', { video_url: 'https://www.youtube.com/embed/abc' });
    expect(document.querySelector('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/abc');
  });

  test('products switch their main picture and show price on request', () => {
    renderSection('products', {
      items: [{ title: 'Сплит', price: null, details: '<p>Детали</p>', images: [{ image_url: '/uploads/1.jpg' }, { image_url: '/uploads/2.jpg' }] }]
    });
    expect(screen.getByRole('img', { name: 'Сплит' })).toHaveAttribute('src', 'https://api.example/uploads/1.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'sections.showPicture 2' }));
    expect(screen.getByRole('img', { name: 'Сплит' })).toHaveAttribute('src', 'https://api.example/uploads/2.jpg');
    expect(screen.getByText('sections.priceOnRequest')).toBeInTheDocument();
    expect(screen.getByText('Детали')).toBeInTheDocument();
  });
});

describe('galleries and pictures', () => {
  test('a works gallery opens pictures larger and steps through them', () => {
    renderSection('gallery', { collection: 'works' });
    fireEvent.click(screen.getByRole('button', { name: 'Աշխատանք մեկ' }));
    const viewer = screen.getByRole('dialog');
    expect(viewer.querySelector('img')).toHaveAttribute('src', 'https://api.example/uploads/w1.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'sections.next' }));
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('src', 'https://api.example/uploads/w2.jpg');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('brands show as logos, without opening', () => {
    renderSection('gallery', { collection: 'brands' });
    expect(screen.getByRole('img', { name: 'LG' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('a gallery with nothing visible shows nothing', () => {
    renderSection('gallery', { collection: 'unknown', heading: 'Пусто' });
    expect(screen.queryByText('Пусто')).not.toBeInTheDocument();
  });

  test('a picture inside rich text opens larger, and a normal link stays a link', () => {
    renderSection('rich_text', {
      body: '<a href="/uploads/big.jpg"><img src="/uploads/small.jpg" alt="Фото" /></a><a href="/usluga/remont">Ремонт</a>'
    });
    fireEvent.click(screen.getByRole('img', { name: 'Фото' }));
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('src', 'https://api.example/uploads/big.jpg');
    expect(screen.getByRole('link', { name: 'Ремонт' })).toHaveAttribute('href', '/ru/usluga/remont');
  });
});
