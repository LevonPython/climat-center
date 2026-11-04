import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ServicesPage } from '../src/pages/ServicesPage';
import { apiFetch } from '../src/api';

jest.mock('../src/api', () => ({
  apiFetch: jest.fn(),
  assetUrl: (url: string) => url
}));

const apiFetchMock = apiFetch as unknown as jest.Mock;

function renderWithQueryClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false }
    }
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function makeService(overrides: Partial<any>) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    type: 'service',
    title_en: null,
    title_ru: 'Услуга',
    title_hy: null,
    description_en: null,
    description_ru: null,
    description_hy: null,
    price: null,
    image_url: null,
    is_active: true,
    ...overrides
  };
}

describe('ServicesPage actions', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  test('shows “Скрыть” for active and “Показать” for inactive services', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      services: [makeService({ id: 'a', title_ru: 'Активная', is_active: true }), makeService({ id: 'b', title_ru: 'Неактивная', is_active: false })]
    });

    renderWithQueryClient(<ServicesPage />);

    expect(await screen.findByText('Активная')).toBeInTheDocument();
    expect(await screen.findByText('Неактивная')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Скрыть' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Показать' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Удалить' })).toHaveLength(2);
  });

  test('clicking “Показать” calls PUT /api/services/:id with { is_active: true }', async () => {
    apiFetchMock
      // Initial list (includes inactive)
      .mockResolvedValueOnce({
        ok: true,
        services: [makeService({ id: 'b', title_ru: 'Неактивная', is_active: false })]
      })
      // Activation mutation
      .mockResolvedValueOnce({
        ok: true,
        service: makeService({ id: 'b', title_ru: 'Неактивная', is_active: true })
      })
      // Refetch list after invalidateQueries
      .mockResolvedValueOnce({
        ok: true,
        services: [makeService({ id: 'b', title_ru: 'Неактивная', is_active: true })]
      });

    renderWithQueryClient(<ServicesPage />);

    const showBtn = await screen.findByRole('button', { name: 'Показать' });
    fireEvent.click(showBtn);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/api/services/b', expect.objectContaining({ method: 'PUT' }));
    });

    const putCall = apiFetchMock.mock.calls.find((c) => c[0] === '/api/services/b' && c[1]?.method === 'PUT');
    expect(putCall).toBeTruthy();
    expect(putCall?.[1]?.body).toBe(JSON.stringify({ is_active: true }));
  });

  test('does not allow saving when all titles are empty', async () => {
    apiFetchMock.mockResolvedValueOnce({ ok: true, services: [] });
    renderWithQueryClient(<ServicesPage />);

    const saveBtn = await screen.findByRole('button', { name: 'Сохранить' });
    fireEvent.click(saveBtn);

    expect(apiFetchMock).toHaveBeenCalledTimes(1); // only initial GET list
    expect(screen.getByText('Укажите название хотя бы на одном языке.')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toBeInTheDocument();
  });

  test('clicking “Удалить” calls DELETE /api/services/:id/permanent after confirm', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    apiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        services: [makeService({ id: 'a', title_ru: 'Активная', is_active: true })]
      })
      .mockResolvedValueOnce({
        ok: true,
        service: makeService({ id: 'a', title_ru: 'Активная', is_active: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        services: []
      });

    renderWithQueryClient(<ServicesPage />);

    const delBtn = await screen.findByRole('button', { name: 'Удалить' });
    fireEvent.click(delBtn);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/api/services/a/permanent', expect.objectContaining({ method: 'DELETE' }));
    });

    confirmSpy.mockRestore();
  });

  test('the title and description are saved for the chosen language', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ ok: true, services: [] })
      .mockResolvedValueOnce({ ok: true, service: makeService({}) })
      .mockResolvedValueOnce({ ok: true, services: [] });
    renderWithQueryClient(<ServicesPage />);

    fireEvent.change(await screen.findByLabelText('Название'), { target: { value: 'Վերանորոգում' } });
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.change(screen.getByLabelText('Описание'), { target: { value: 'Fixing units' } });
    fireEvent.change(screen.getByLabelText('Вид'), { target: { value: 'fault' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/api/services', expect.objectContaining({ method: 'POST' }));
    });
    const postCall = apiFetchMock.mock.calls.find((c) => c[0] === '/api/services' && c[1]?.method === 'POST');
    expect(JSON.parse(postCall?.[1]?.body)).toMatchObject({
      title_hy: 'Վերանորոգում',
      description_en: 'Fixing units',
      category: 'fault'
    });
  });

  test('editing keeps the site placement fields of the service', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        services: [makeService({ id: 'a', title_ru: 'Активная', menu_title_hy: 'Մենյու', show_in_menu: false, show_in_pills: true, category: 'fault' })]
      })
      .mockResolvedValueOnce({ ok: true, service: makeService({ id: 'a' }) })
      .mockResolvedValueOnce({ ok: true, services: [] });
    renderWithQueryClient(<ServicesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/api/services/a', expect.objectContaining({ method: 'PUT' }));
    });
    const putCall = apiFetchMock.mock.calls.find((c) => c[0] === '/api/services/a' && c[1]?.method === 'PUT');
    expect(JSON.parse(putCall?.[1]?.body)).toMatchObject({
      menu_title_hy: 'Մենյու',
      show_in_menu: false,
      show_in_pills: true,
      category: 'fault'
    });
  });

  test('a refused delete is explained in plain words', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    apiFetchMock
      .mockResolvedValueOnce({ ok: true, services: [makeService({ id: 'a', title_ru: 'Активная' })] })
      .mockResolvedValueOnce({ ok: false, error: { message: 'Forbidden', status: 403 } });
    renderWithQueryClient(<ServicesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('нет прав');
    confirmSpy.mockRestore();
  });

  test('moving a service sends the whole new order', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        services: [makeService({ id: 'a', title_ru: 'Первая' }), makeService({ id: 'b', title_ru: 'Вторая' })]
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, services: [] });
    renderWithQueryClient(<ServicesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Переместить ниже: Первая' }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/api/admin/services/order', expect.objectContaining({ method: 'PUT' }));
    });
    const orderCall = apiFetchMock.mock.calls.find((c) => c[0] === '/api/admin/services/order');
    expect(JSON.parse(orderCall?.[1]?.body)).toEqual({ ids: ['b', 'a'] });
  });
});

