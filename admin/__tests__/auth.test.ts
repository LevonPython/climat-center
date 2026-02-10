import { setToken, getToken, clearToken } from '../src/auth';

describe('auth token helpers', () => {
  test('set/get/clear token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

