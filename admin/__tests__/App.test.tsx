import { screen } from '@testing-library/react';
import App from '../src/App';
import { apiFetch } from '../src/api';
import { clearToken, setToken } from '../src/auth';
import { callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn() }));
// LeaveGuard needs a data router, whose navigation needs Request, which jsdom lacks.
jest.mock('../src/lib/unsaved', () => ({ ...jest.requireActual('../src/lib/unsaved'), LeaveGuard: () => null }));

const apiFetchMock = apiFetch as unknown as jest.Mock;

function tokenFor(role: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'u1', username: 'anna', role })}.signature`;
}

const renderApp = (path: string) => renderScreen(<App />, path);

describe('App role access', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    routeApi(apiFetchMock, {
      'GET /api/bookings?status=new': { ok: true, bookings: [] },
      'GET /api/auth/users': { ok: true, users: [] }
    });
  });

  afterEach(() => clearToken());

  test('an editor sees no Users link and is sent to bookings from the users screen', async () => {
    setToken(tokenFor('editor'));
    renderApp('/users');

    expect(await screen.findByRole('heading', { name: 'Заявки' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Пользователи' })).not.toBeInTheDocument();
    expect(callsTo(apiFetchMock, 'GET', '/api/auth/users')).toHaveLength(0);
  });

  test('an admin sees the Users link and the users screen', async () => {
    setToken(tokenFor('admin'));
    renderApp('/users');

    expect(await screen.findByRole('heading', { name: 'Пользователи' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Пользователи' })).toBeInTheDocument();
  });
});
