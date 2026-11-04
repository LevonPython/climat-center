import { screen } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { BookingsPage } from '../src/pages/BookingsPage';
import { renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as unknown as jest.Mock;

const booking = (overrides: Record<string, unknown>) => ({
  id: 'b1',
  user_name: 'Արամ',
  phone: '+37491000000',
  status: 'new',
  address: null,
  problem_description: null,
  work_types: [],
  source_page: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides
});

describe('BookingsPage', () => {
  beforeEach(() => apiFetchMock.mockReset());

  test('shows the requested work and the page a request came from', async () => {
    routeApi(apiFetchMock, {
      'GET /api/bookings?status=new': {
        ok: true,
        bookings: [booking({ work_types: ['repair', 'cleaning'], source_page: '/usluga/remont' })]
      }
    });
    renderScreen(<BookingsPage />);

    expect(await screen.findByText('Ремонт, Чистка')).toBeInTheDocument();
    expect(screen.getByText('/usluga/remont')).toBeInTheDocument();
  });

  test('older bookings without those details still show', async () => {
    routeApi(apiFetchMock, {
      'GET /api/bookings?status=new': { ok: true, bookings: [booking({ work_types: null, source_page: null })] }
    });
    renderScreen(<BookingsPage />);

    expect(await screen.findByText('Արամ')).toBeInTheDocument();
  });
});
