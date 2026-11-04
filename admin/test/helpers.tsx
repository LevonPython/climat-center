import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

type Route = unknown | ((init?: RequestInit) => unknown);

// Answers by "METHOD path", so a screen can load things in any order. An unexpected call fails the test.
export function routeApi(mock: jest.Mock, routes: Record<string, Route>) {
  mock.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = `${init?.method || 'GET'} ${path}`;
    if (!(key in routes)) throw new Error(`Unexpected API call: ${key}`);
    const route = routes[key];
    return typeof route === 'function' ? (route as (init?: RequestInit) => unknown)(init) : route;
  });
}

export function callsTo(mock: jest.Mock, method: string, path: string): RequestInit[] {
  return mock.mock.calls.filter(([p, init]) => p === path && (init?.method || 'GET') === method).map(([, init]) => init);
}

export function bodyOf(init: RequestInit): any {
  return JSON.parse(String(init.body));
}

export function renderScreen(ui: ReactElement, route = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
