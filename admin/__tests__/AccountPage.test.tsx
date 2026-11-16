import { fireEvent, screen } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { clearToken, getToken, setToken } from '../src/auth';
import { AccountPage } from '../src/pages/AccountPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as unknown as jest.Mock;

function fill(current: string, next: string, repeat: string) {
  fireEvent.change(screen.getByLabelText('Текущий пароль'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('Новый пароль'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Повторите новый пароль'), { target: { value: repeat } });
}

describe('AccountPage', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    setToken('old-token');
  });

  afterEach(() => clearToken());

  test('cannot save while the new passwords differ', () => {
    renderScreen(<AccountPage />);
    fill('old-password', 'new-password-1', 'new-password-2');

    expect(screen.getByText('Новые пароли не совпадают.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });

  test('saves the new password and keeps this session signed in', async () => {
    routeApi(apiFetchMock, { 'PUT /api/auth/password': { ok: true, token: 'new-token' } });
    renderScreen(<AccountPage />);
    fill('old-password', 'new-password', 'new-password');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Пароль изменён.')).toBeInTheDocument();
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/auth/password')[0])).toEqual({
      current_password: 'old-password',
      new_password: 'new-password'
    });
    expect(getToken()).toBe('new-token');
    expect(screen.getByLabelText('Текущий пароль')).toHaveValue('');
  });

  test('says so when the current password is wrong', async () => {
    routeApi(apiFetchMock, {
      'PUT /api/auth/password': { ok: false, error: { message: 'Current password is incorrect', status: 403 } }
    });
    renderScreen(<AccountPage />);
    fill('wrong-password', 'new-password', 'new-password');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Текущий пароль указан неверно.')).toBeInTheDocument();
    expect(getToken()).toBe('old-token');
  });
});
