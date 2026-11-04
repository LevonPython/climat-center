import { fireEvent, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { UnsavedProvider } from '../src/lib/unsaved';
import { NavigationPage } from '../src/pages/NavigationPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));

const apiFetchMock = apiFetch as unknown as jest.Mock;
const HEADER = '/api/admin/navigation?location=header';

const item = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  location: 'header',
  page_id: null,
  url: `/${id}`,
  label_ru: `Пункт ${id}`,
  label_en: null,
  label_hy: null,
  sort_order: 0,
  is_visible: true,
  ...overrides
});

const pages = { ok: true, pages: [{ id: 'p1', slug: 'kontakty', title_ru: 'Контакты' }] };

function renderNavigation(items: unknown[], extra: Record<string, unknown> = {}) {
  routeApi(apiFetchMock, {
    'GET /api/admin/pages': pages,
    [`GET ${HEADER}`]: { ok: true, items },
    ...extra
  });
  return renderScreen(<NavigationPage />);
}

describe('NavigationPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('a new item needs text and a target', async () => {
    renderNavigation([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить пункт' }));

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Укажите текст');

    fireEvent.change(screen.getByLabelText('Текст пункта'), { target: { value: 'Контакты' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Выберите страницу или укажите ссылку');

    expect(callsTo(apiFetchMock, 'POST', '/api/admin/navigation')).toHaveLength(0);
  });

  test('adds an item that leads to a page, at the end of the open menu', async () => {
    renderNavigation([item('a')], { 'POST /api/admin/navigation': { ok: true, item: item('new') } });
    await screen.findByText('Пункт a');
    await screen.findByRole('button', { name: 'Изменить: Пункт a' });

    fireEvent.click(screen.getByRole('button', { name: 'Добавить пункт' }));
    fireEvent.change(screen.getByLabelText('Текст пункта'), { target: { value: 'Կոնտակտներ' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'POST', '/api/admin/navigation')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'POST', '/api/admin/navigation')[0])).toEqual({
      page_id: 'p1',
      url: null,
      label_hy: 'Կոնտակտներ',
      label_ru: null,
      label_en: null,
      location: 'header',
      sort_order: 1
    });
  });

  test('a script link is refused before reaching the server', async () => {
    renderNavigation([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить пункт' }));

    fireEvent.change(screen.getByLabelText('Текст пункта'), { target: { value: 'x' } });
    fireEvent.click(screen.getByLabelText('Ссылка'));
    fireEvent.change(screen.getByLabelText('Адрес ссылки'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Укажите ссылку');
    expect(callsTo(apiFetchMock, 'POST', '/api/admin/navigation')).toHaveLength(0);
  });

  test('switching a link item to a page clears the old link', async () => {
    renderNavigation([item('a')], { 'PUT /api/admin/navigation/a': { ok: true, item: item('a') } });

    fireEvent.click(await screen.findByRole('button', { name: 'Изменить: Пункт a' }));
    fireEvent.click(screen.getByLabelText('Страница сайта'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/navigation/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/navigation/a')[0])).toMatchObject({ page_id: 'p1', url: null });
  });

  test('the home page shows its real address', async () => {
    routeApi(apiFetchMock, {
      'GET /api/admin/pages': { ok: true, pages: [{ id: 'h', slug: 'home', title_ru: 'Главная' }] },
      [`GET ${HEADER}`]: { ok: true, items: [item('a', { url: null, page_id: 'h' })] }
    });
    renderScreen(<NavigationPage />);

    expect(await screen.findByText('/')).toBeInTheDocument();
    expect(screen.queryByText('/home')).not.toBeInTheDocument();
  });

  test('switching menus with an unsaved form asks first', async () => {
    confirmSpy.mockReturnValue(false);
    routeApi(apiFetchMock, { 'GET /api/admin/pages': pages, [`GET ${HEADER}`]: { ok: true, items: [] } });
    renderScreen(
      <UnsavedProvider>
        <NavigationPage />
      </UnsavedProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить пункт' }));
    fireEvent.change(screen.getByLabelText('Текст пункта'), { target: { value: 'Черновик' } });
    fireEvent.click(screen.getByRole('button', { name: 'Города' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Текст пункта')).toHaveValue('Черновик');
  });

  test('each menu has its own list', async () => {
    renderNavigation([item('a')], {
      'GET /api/admin/navigation?location=cities': { ok: true, items: [item('c', { location: 'cities', label_ru: 'Ереван' })] }
    });
    await screen.findByText('Пункт a');

    fireEvent.click(screen.getByRole('button', { name: 'Города' }));

    expect(await screen.findByText('Ереван')).toBeInTheDocument();
    expect(screen.queryByText('Пункт a')).not.toBeInTheDocument();
  });

  test('reorders, hides and deletes', async () => {
    renderNavigation([item('a'), item('b')], {
      'PUT /api/admin/navigation/order': { ok: true },
      'PUT /api/admin/navigation/a': { ok: true, item: item('a') },
      'DELETE /api/admin/navigation/b': { ok: true }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Переместить ниже: Пункт a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/navigation/order')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/navigation/order')[0])).toEqual({ ids: ['b', 'a'] });

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть: Пункт a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/navigation/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/navigation/a')[0])).toEqual({ is_visible: false });

    fireEvent.click(screen.getByRole('button', { name: 'Удалить: Пункт b' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'DELETE', '/api/admin/navigation/b')).toHaveLength(1));
    expect(confirmSpy.mock.calls[0][0]).toContain('Пункт b');
  });
});
