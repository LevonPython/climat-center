import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import handler from '../pages/api/revalidate';

function createRes() {
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = jest.fn((k: string, v: string) => {
    res.headers[k] = v;
  });
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload: any) => {
    res.payload = payload;
    return res;
  });
  res.revalidate = jest.fn(async () => undefined);
  return res as any;
}

describe('/api/revalidate', () => {
  const oldSecret = process.env.REVALIDATE_SECRET;

  beforeEach(() => {
    process.env.REVALIDATE_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.REVALIDATE_SECRET = oldSecret;
  });

  test('rejects non-POST', async () => {
    const req: any = { method: 'GET', query: {}, body: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
  });

  test('rejects invalid secret', async () => {
    const req: any = { method: 'POST', query: { secret: 'nope' }, body: { event: 'content' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.payload?.ok).toBe(false);
  });

  test('rejects invalid event', async () => {
    const req: any = { method: 'POST', query: { secret: 'test-secret' }, body: { event: 'nope' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload?.ok).toBe(false);
  });

  test('revalidates allowlisted content paths', async () => {
    const req: any = { method: 'POST', query: { secret: 'test-secret' }, body: { event: 'content' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.payload?.ok).toBe(true);

    const called = res.revalidate.mock.calls.map((c: any[]) => c[0]);
    expect(called).toEqual(
      expect.arrayContaining([
        '/',
        '/en',
        '/ru',
        '/about',
        '/en/about',
        '/ru/about',
        '/contacts',
        '/en/contacts',
        '/ru/contacts'
      ])
    );
  });
});

