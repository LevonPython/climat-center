import { fireEvent, screen, within } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { clearToken, setToken } from '../src/auth';
import { UsersPage } from '../src/pages/UsersPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as unknown as jest.Mock;

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const EDITOR_ID = '22222222-2222-4222-8222-222222222222';

function tokenFor(sub: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub, username: 'boss', role: 'admin' })}.signature`;
}

const rowOf = (username: string) => screen.getByRole('cell', { name: username }).closest('tr') as HTMLElement;

describe('UsersPage', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    setToken(tokenFor(ADMIN_ID));
    routeApi(apiFetchMock, {
      'GET /api/auth/users': {
        ok: true,
        users: [
          { id: ADMIN_ID, username: 'boss', role: 'admin', created_at: '2026-01-01T00:00:00Z' },
          { id: EDITOR_ID, username: 'anna', role: 'editor', created_at: '2026-01-02T00:00:00Z' }
        ]
      },
      [`PUT /api/auth/users/${EDITOR_ID}/password`]: { ok: true }
    });
  });

  afterEach(() => clearToken());

  test("an admin sets another user's password", async () => {
    renderScreen(<UsersPage />);
    await screen.findByRole('cell', { name: 'anna' });

    fireEvent.click(within(rowOf('anna')).getByRole('button', { name: 'Задать пароль' }));
    fireEvent.change(screen.getByLabelText('Новый пароль для anna'), { target: { value: 'given-by-admin' } });
    fireEvent.click(within(rowOf('anna')).getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Пароль задан.')).toBeInTheDocument();
    expect(within(rowOf('anna')).getByRole('button', { name: 'Задать пароль' })).toHaveFocus();
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', `/api/auth/users/${EDITOR_ID}/password`)[0])).toEqual({ password: 'given-by-admin' });
  });

  test('a password shorter than 8 characters cannot be saved', async () => {
    renderScreen(<UsersPage />);
    await screen.findByRole('cell', { name: 'anna' });

    fireEvent.click(within(rowOf('anna')).getByRole('button', { name: 'Задать пароль' }));
    fireEvent.change(screen.getByLabelText('Новый пароль для anna'), { target: { value: 'short' } });

    expect(within(rowOf('anna')).getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });

  test('your own row has no Set password button', async () => {
    renderScreen(<UsersPage />);
    await screen.findByRole('cell', { name: 'boss' });

    expect(within(rowOf('boss')).queryByRole('button', { name: 'Задать пароль' })).not.toBeInTheDocument();
  });
});
