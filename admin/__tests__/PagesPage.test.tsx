import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { apiFetch } from '../src/api';
import { PagesPage } from '../src/pages/PagesPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));

const apiFetchMock = apiFetch as unknown as jest.Mock;

function page(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: id,
    type: 'article',
    parent_id: null,
    status: 'published',
    sort_order: 0,
    title_ru: `Страница ${id}`,
    title_en: null,
    title_hy: null,
    needs_review_ru: false,
    needs_review_en: false,
    needs_review_hy: false,
    ...overrides
  };
}

function renderPages(pages: unknown[], extra: Record<string, unknown> = {}) {
  routeApi(apiFetchMock, { 'GET /api/admin/pages': { ok: true, pages }, ...extra });
  return renderScreen(
    <Routes>
      <Route path="/" element={<PagesPage />} />
      <Route path="/pages/:id" element={<div>Открыт редактор</div>} />
    </Routes>
  );
}

describe('PagesPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('lists subpages right after their parent', async () => {
    renderPages([page('b'), page('child', { parent_id: 'a' }), page('a')]);
    await screen.findByRole('link', { name: 'Страница a' });

    const order = screen.getAllByRole('link').map((link) => link.textContent);
    expect(order).toEqual(['Страница b', 'Страница a', 'Страница child']);
  });

  test('filters by type, status and needs review', async () => {
    renderPages([
      page('a', { type: 'service' }),
      page('b', { status: 'hidden' }),
      page('c', { needs_review_hy: true })
    ]);
    await screen.findByRole('link', { name: 'Страница a' });

    fireEvent.change(screen.getByLabelText('Тип страницы'), { target: { value: 'service' } });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Страница a']);

    fireEvent.change(screen.getByLabelText('Тип страницы'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Статус'), { target: { value: 'hidden' } });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Страница b']);

    fireEvent.change(screen.getByLabelText('Статус'), { target: { value: 'all' } });
    fireEvent.click(screen.getByLabelText('Только требующие проверки'));
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Страница c']);
    expect(screen.getByText(/Нужна проверка: HY/)).toBeInTheDocument();
  });

  test('says so when filters hide everything', async () => {
    renderPages([page('a')]);
    await screen.findByRole('link', { name: 'Страница a' });

    fireEvent.click(screen.getByLabelText('Только требующие проверки'));

    expect(screen.getByText('Нет страниц, подходящих под эти фильтры.')).toBeInTheDocument();
  });

  test('refuses a bad address before calling the server', async () => {
    renderPages([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Новая страница' }));

    fireEvent.change(screen.getByLabelText('Адрес'), { target: { value: 'Плохой адрес' } });
    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Заголовок' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать страницу' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Этот адрес нельзя использовать');
    expect(callsTo(apiFetchMock, 'POST', '/api/admin/pages')).toHaveLength(0);
  });

  test('needs a title in at least one language', async () => {
    renderPages([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Новая страница' }));

    fireEvent.change(screen.getByLabelText('Адрес'), { target: { value: 'novaya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать страницу' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Укажите заголовок');
  });

  test('creates a page and opens its editor', async () => {
    renderPages([page('parent')], {
      'POST /api/admin/pages': { ok: true, page: page('new-id') }
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Новая страница' }));

    fireEvent.change(screen.getByLabelText('Адрес'), { target: { value: 'usluga/remont' } });
    fireEvent.change(screen.getAllByLabelText('Тип страницы')[1], { target: { value: 'service' } });
    fireEvent.change(screen.getByLabelText('Родительская страница'), { target: { value: 'parent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Русский' }));
    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Ремонт' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать страницу' }));

    expect(await screen.findByText('Открыт редактор')).toBeInTheDocument();
    const [call] = callsTo(apiFetchMock, 'POST', '/api/admin/pages');
    expect(bodyOf(call)).toEqual({
      slug: 'usluga/remont',
      type: 'service',
      parent_id: 'parent',
      title_hy: null,
      title_ru: 'Ремонт',
      title_en: null
    });
  });

  test('a taken address gets a plain message', async () => {
    renderPages([], {
      'POST /api/admin/pages': { ok: false, error: { message: 'Already exists', status: 409 } }
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Новая страница' }));

    fireEvent.change(screen.getByLabelText('Адрес'), { target: { value: 'taken' } });
    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать страницу' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Этот адрес уже занят');
  });

  test('hides a published page and publishes a hidden one', async () => {
    renderPages([page('a'), page('b', { status: 'hidden' })], {
      'PUT /api/admin/pages/a': { ok: true, page: page('a') },
      'PUT /api/admin/pages/b': { ok: true, page: page('b') }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Скрыть: Страница a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/a')[0])).toEqual({ status: 'hidden' });

    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать: Страница b' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/b')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/b')[0])).toEqual({ status: 'published' });
  });

  test('deleting asks first, naming the page', async () => {
    confirmSpy.mockReturnValue(false);
    renderPages([page('a')]);

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить: Страница a' }));

    expect(confirmSpy.mock.calls[0][0]).toContain('Страница a');
    expect(callsTo(apiFetchMock, 'DELETE', '/api/admin/pages/a')).toHaveLength(0);
  });

  test('an editor who may not delete sees why', async () => {
    renderPages([page('a')], {
      'DELETE /api/admin/pages/a': { ok: false, error: { message: 'Forbidden', status: 403 } }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить: Страница a' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('нет прав');
  });

  test('the home page offers no delete and cannot be hidden', async () => {
    renderPages([page('h', { slug: 'home', title_ru: 'Главная' })]);
    const link = await screen.findByRole('link', { name: 'Главная' });

    const row = link.closest('div.flex') as HTMLElement;
    expect(within(row).queryByRole('button', { name: /Удалить/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Скрыть/ })).not.toBeInTheDocument();
  });

  test('a home page that starts hidden can still be published', async () => {
    renderPages([page('h', { slug: 'home', title_ru: 'Главная', status: 'hidden' })]);

    expect(await screen.findByRole('button', { name: 'Опубликовать: Главная' })).toBeInTheDocument();
  });
});
