const { triggerRevalidate } = require('../src/config/revalidateClient');

describe('triggerRevalidate', () => {
  const oldEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...oldEnv };
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  test('no-ops when env is missing', async () => {
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.REVALIDATE_SECRET;

    await triggerRevalidate('content');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('calls public site revalidate endpoint with secret and event', async () => {
    process.env.PUBLIC_SITE_URL = 'https://example.com';
    process.env.REVALIDATE_SECRET = 'secret123';

    await triggerRevalidate('content');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://example.com/api/revalidate?secret=secret123');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ event: 'content' }));
  });

  test('ignores unknown event', async () => {
    process.env.PUBLIC_SITE_URL = 'https://example.com';
    process.env.REVALIDATE_SECRET = 'secret123';

    await triggerRevalidate('nope');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('handles invalid PUBLIC_SITE_URL', async () => {
    process.env.PUBLIC_SITE_URL = 'not-a-url';
    process.env.REVALIDATE_SECRET = 'secret123';

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await triggerRevalidate('content');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[revalidate] invalid PUBLIC_SITE_URL');

    warn.mockRestore();
  });
});

