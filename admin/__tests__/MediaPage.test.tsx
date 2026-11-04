import { fireEvent, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { UnsavedProvider } from '../src/lib/unsaved';
import { MediaPage } from '../src/pages/MediaPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));

const apiFetchMock = apiFetch as unknown as jest.Mock;
const LIST = '/api/admin/media?limit=48&offset=0';

const asset = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  url: `https://blob/${id}.png`,
  filename: `${id}.png`,
  mime_type: 'image/png',
  size_bytes: 2048,
  kind: 'image',
  alt_ru: null,
  alt_en: null,
  alt_hy: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides
});

const listOf = (...assets: unknown[]) => ({ ok: true, assets, limit: 48, offset: 0 });

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('MediaPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('uploads each chosen file', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(),
      'POST /api/admin/media': { ok: true, asset: asset('new') }
    });
    const { container } = renderScreen(<MediaPage />);
    await screen.findByText('Файлов пока нет.');

    fireEvent.change(fileInput(container), {
      target: { files: [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.png', { type: 'image/png' })] }
    });

    await waitFor(() => expect(callsTo(apiFetchMock, 'POST', '/api/admin/media')).toHaveLength(2));
    expect(callsTo(apiFetchMock, 'POST', '/api/admin/media')[0].body).toBeInstanceOf(FormData);
  });

  test('a file over the limit gets a plain message', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(),
      'POST /api/admin/media': { ok: false, error: { message: 'Bad response (413)', status: 413 } }
    });
    const { container } = renderScreen(<MediaPage />);
    await screen.findByText('Файлов пока нет.');

    fireEvent.change(fileInput(container), { target: { files: [new File(['a'], 'big.png', { type: 'image/png' })] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Файл слишком большой');
  });

  test('explains when file storage is switched off', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(),
      'POST /api/admin/media': { ok: false, error: { message: 'Storage is off', status: 503 } }
    });
    const { container } = renderScreen(<MediaPage />);
    await screen.findByText('Файлов пока нет.');

    fireEvent.change(fileInput(container), { target: { files: [new File(['a'], 'a.png', { type: 'image/png' })] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Хранилище файлов ещё не подключено');
  });

  test('saves the picture description per language', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(asset('a', { alt_hy: 'Հայ' })),
      'PUT /api/admin/media/a': { ok: true, asset: asset('a') }
    });
    renderScreen(<MediaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'a.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.change(screen.getByLabelText('Описание изображения'), { target: { value: 'A unit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/media/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/media/a')[0])).toEqual({ alt_hy: 'Հայ', alt_ru: null, alt_en: 'A unit' });
  });

  test('replaces a file through its own route', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(asset('a')),
      'PUT /api/admin/media/a/file': { ok: true, asset: asset('a') }
    });
    const { container } = renderScreen(<MediaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'a.png' }));
    const inputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[inputs.length - 1], { target: { files: [new File(['n'], 'n.png', { type: 'image/png' })] } });

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/media/a/file')).toHaveLength(1));
  });

  test('an image can only be replaced by an image', async () => {
    routeApi(apiFetchMock, { [`GET ${LIST}`]: listOf(asset('a')) });
    const { container } = renderScreen(<MediaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'a.png' }));

    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs[inputs.length - 1].getAttribute('accept')).not.toContain('pdf');
  });

  test('choosing another file with an unsaved description asks first', async () => {
    confirmSpy.mockReturnValue(false);
    routeApi(apiFetchMock, { [`GET ${LIST}`]: listOf(asset('a'), asset('b')) });
    renderScreen(
      <UnsavedProvider>
        <MediaPage />
      </UnsavedProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'a.png' }));
    fireEvent.change(screen.getByLabelText('Описание изображения'), { target: { value: 'Черновик' } });
    fireEvent.click(screen.getByRole('button', { name: 'b.png' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Описание изображения')).toHaveValue('Черновик');
  });

  test('a file still in use cannot be deleted, and the message says why', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(asset('a')),
      'DELETE /api/admin/media/a': { ok: false, error: { message: 'in use', status: 409 } }
    });
    renderScreen(<MediaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'a.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(confirmSpy.mock.calls[0][0]).toContain('a.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('ещё используется на сайте');
  });

  test('the filter asks the server for that kind', async () => {
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: listOf(),
      'GET /api/admin/media?limit=48&offset=0&kind=document': listOf(
        asset('doc', { filename: 'doc.pdf', kind: 'document', mime_type: 'application/pdf' })
      )
    });
    renderScreen(<MediaPage />);
    await screen.findByText('Файлов пока нет.');

    fireEvent.click(screen.getByRole('button', { name: 'Документы' }));

    expect(await screen.findByRole('button', { name: 'doc.pdf' })).toBeInTheDocument();
  });

  test('offers more when a full page came back', async () => {
    const full = Array.from({ length: 48 }, (_, index) => asset(`f${index}`));
    routeApi(apiFetchMock, {
      [`GET ${LIST}`]: { ok: true, assets: full, limit: 48, offset: 0 },
      'GET /api/admin/media?limit=48&offset=48': { ok: true, assets: [asset('last')], limit: 48, offset: 48 }
    });
    renderScreen(<MediaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Показать ещё' }));

    expect(await screen.findByRole('button', { name: 'last.png' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
  });
});
