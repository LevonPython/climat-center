import { fireEvent, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { UnsavedProvider } from '../src/lib/unsaved';
import { GalleriesPage } from '../src/pages/GalleriesPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));

const apiFetchMock = apiFetch as unknown as jest.Mock;
const BRANDS = '/api/admin/galleries?collection=brands';

const item = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  collection: 'brands',
  media_id: `m-${id}`,
  url: `https://blob/${id}.png`,
  title_ru: `Бренд ${id}`,
  title_en: null,
  title_hy: null,
  link_url: null,
  is_visible: true,
  ...overrides
});

describe('GalleriesPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('switches between the three collections', async () => {
    routeApi(apiFetchMock, {
      [`GET ${BRANDS}`]: { ok: true, items: [item('a')] },
      'GET /api/admin/galleries?collection=certificates': { ok: true, items: [] }
    });
    renderScreen(<GalleriesPage />);
    await screen.findByRole('img', { name: 'Бренд a' });

    fireEvent.click(screen.getByRole('button', { name: 'Сертификаты' }));

    expect(await screen.findByText('В этой галерее пока ничего нет.')).toBeInTheDocument();
  });

  test('switching collections with an unsaved caption asks first', async () => {
    confirmSpy.mockReturnValue(false);
    routeApi(apiFetchMock, { [`GET ${BRANDS}`]: { ok: true, items: [item('a')] } });
    renderScreen(
      <UnsavedProvider>
        <GalleriesPage />
      </UnsavedProvider>
    );
    await screen.findByRole('img', { name: 'Бренд a' });

    fireEvent.change(screen.getByLabelText('Подпись'), { target: { value: 'LG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сертификаты' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Подпись')).toHaveValue('LG');
  });

  test('adds pictures picked from the library to the open collection', async () => {
    routeApi(apiFetchMock, {
      [`GET ${BRANDS}`]: { ok: true, items: [] },
      'GET /api/admin/media?limit=48&offset=0&kind=image': {
        ok: true,
        limit: 48,
        offset: 0,
        assets: [{ id: 'm1', url: 'https://blob/1.png', filename: 'lg.png', kind: 'image' }]
      },
      'POST /api/admin/galleries': { ok: true, item: item('new') }
    });
    renderScreen(<GalleriesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить изображения' }));
    fireEvent.click(await screen.findByRole('button', { name: 'lg.png' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'POST', '/api/admin/galleries')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'POST', '/api/admin/galleries')[0])).toEqual({ collection: 'brands', media_id: 'm1' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('saves a caption and link per item', async () => {
    routeApi(apiFetchMock, {
      [`GET ${BRANDS}`]: { ok: true, items: [item('a')] },
      'PUT /api/admin/galleries/a': { ok: true, item: item('a') }
    });
    renderScreen(<GalleriesPage />);
    await screen.findByRole('img', { name: 'Бренд a' });

    fireEvent.change(screen.getByLabelText('Подпись'), { target: { value: 'LG' } });
    fireEvent.change(screen.getByLabelText('Ссылка (необязательно)'), { target: { value: 'https://lg.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить: Бренд a' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/galleries/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/galleries/a')[0])).toEqual({
      title_hy: 'LG',
      title_ru: 'Бренд a',
      title_en: null,
      link_url: 'https://lg.com'
    });
  });

  test('a script link is refused before reaching the server', async () => {
    routeApi(apiFetchMock, { [`GET ${BRANDS}`]: { ok: true, items: [item('a')] } });
    renderScreen(<GalleriesPage />);
    await screen.findByRole('img', { name: 'Бренд a' });

    fireEvent.change(screen.getByLabelText('Ссылка (необязательно)'), { target: { value: 'javascript:alert(1)' } });

    expect(screen.getByRole('button', { name: 'Сохранить: Бренд a' })).toBeDisabled();
  });

  test('reorders, hides and removes', async () => {
    routeApi(apiFetchMock, {
      [`GET ${BRANDS}`]: { ok: true, items: [item('a'), item('b')] },
      'PUT /api/admin/galleries/order': { ok: true },
      'PUT /api/admin/galleries/a': { ok: true, item: item('a') },
      'DELETE /api/admin/galleries/b': { ok: true }
    });
    renderScreen(<GalleriesPage />);
    await screen.findByRole('img', { name: 'Бренд a' });

    fireEvent.click(screen.getByRole('button', { name: 'Переместить ниже: Бренд a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/galleries/order')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/galleries/order')[0])).toEqual({ ids: ['b', 'a'] });

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть: Бренд a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/galleries/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/galleries/a')[0])).toEqual({ is_visible: false });

    fireEvent.click(screen.getByRole('button', { name: 'Убрать из галереи: Бренд b' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'DELETE', '/api/admin/galleries/b')).toHaveLength(1));
    expect(confirmSpy).toHaveBeenCalled();
  });
});
