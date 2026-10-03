/**
 * M0.1 — `lib/api.ts` interceptor behaviour.
 *
 * This is the most load-bearing module in the frontend: every feature call goes
 * through this axios instance, and two of its behaviours are load bearing for
 * correctness rather than convenience.
 *
 *   1. The request interceptor attaches the JWT from `localStorage.loft_token`.
 *      If it stops firing, every request goes out unauthenticated and the app
 *      fails in a way that looks like a backend problem.
 *   2. The response interceptor clears the session and hard-redirects on 401.
 *      If it regresses, an expired session renders as a permanently broken
 *      dashboard; if it over-fires, a brief 502 logs the user out.
 *
 * `api` is module-private (lib/api.ts:5 — it is not exported), so the
 * interceptors are reached by mocking `axios.create()` and capturing the
 * handlers the module registers. That keeps the test on the real code path
 * rather than on a re-implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const TOKEN_KEY = 'loft_token';
const USER_KEY = 'loft_user';

type Interceptor = (arg: never) => unknown;

/** Handlers lib/api.ts registers on the axios instance. */
const handlers = {
  request: null as Interceptor | null,
  responseOk: null as Interceptor | null,
  responseErr: null as Interceptor | null,
};

const fakeInstance = {
  defaults: { baseURL: '', headers: {} as Record<string, string> },
  interceptors: {
    request: {
      use: (ok: Interceptor) => {
        handlers.request = ok;
      },
    },
    response: {
      use: (ok: Interceptor, err: Interceptor) => {
        handlers.responseOk = ok;
        handlers.responseErr = err;
      },
    },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    // Record the config the module passes in; the real axios stores it on
    // defaults, and the base-URL assertion depends on that.
    create: (config?: { baseURL?: string; headers?: Record<string, string> }) => {
      if (config?.baseURL) fakeInstance.defaults.baseURL = config.baseURL;
      if (config?.headers) Object.assign(fakeInstance.defaults.headers, config.headers);
      return fakeInstance;
    },
  },
}));

async function loadApi() {
  handlers.request = null;
  handlers.responseOk = null;
  handlers.responseErr = null;
  vi.resetModules();
  return import('@/lib/api');
}

function stubLocation(href: string, pathname: string) {
  delete (window as { location?: unknown }).location;
  (window as { location?: unknown }).location = { href, pathname };
}

describe('lib/api interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    stubLocation('', '/dashboard');
  });

  it('registers all three interceptor handlers', async () => {
    await loadApi();
    expect(handlers.request).toBeTypeOf('function');
    expect(handlers.responseErr).toBeTypeOf('function');
  });

  it('configures the base URL from the environment', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';
    await loadApi();
    expect(fakeInstance.defaults.baseURL).toBe('http://localhost:3001/api');
  });

  it('attaches the bearer token from localStorage', async () => {
    localStorage.setItem(TOKEN_KEY, 'test-jwt-123');
    await loadApi();

    const config = { headers: {} as Record<string, string> };
    const out = handlers.request!(config as never) as typeof config;

    expect(out.headers.Authorization).toBe('Bearer test-jwt-123');
  });

  it('omits the header when there is no token', async () => {
    await loadApi();

    const config = { headers: {} as Record<string, string> };
    const out = handlers.request!(config as never) as typeof config;

    expect(out.headers.Authorization).toBeUndefined();
  });

  it('clears the session and redirects to login on 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-jwt');
    localStorage.setItem(USER_KEY, '{"email":"a@b.co"}');
    await loadApi();

    const err = {
      response: { status: 401, data: { error: 'Unauthorized' } },
      config: { headers: {} },
    };

    await expect(handlers.responseErr!(err as never)).rejects.toBeDefined();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect((window as unknown as { location: { href: string } }).location.href).toBe(
      '/auth/login',
    );
  });

  it('does not redirect when already on the login page', async () => {
    // Otherwise the 401 handler redirects to /auth/login, that request 401s,
    // and the user gets a reload loop.
    localStorage.setItem(TOKEN_KEY, 'expired-jwt');
    stubLocation('/auth/login', '/auth/login');
    await loadApi();

    const err = { response: { status: 401, data: {} }, config: { headers: {} } };
    await expect(handlers.responseErr!(err as never)).rejects.toBeDefined();

    expect((window as unknown as { location: { href: string } }).location.href).toBe(
      '/auth/login',
    );
  });

  it('passes a non-401 error through without touching the session', async () => {
    // A 502 from the memory service must NOT clear the session. Losing a login
    // because an upstream was briefly unavailable is its own bug.
    localStorage.setItem(TOKEN_KEY, 'good-jwt');
    await loadApi();

    const err = {
      response: { status: 502, data: { error: 'Memory unavailable' } },
      config: { headers: {} },
    };

    await expect(handlers.responseErr!(err as never)).rejects.toBe(err);

    expect(localStorage.getItem(TOKEN_KEY)).toBe('good-jwt');
  });

  it('passes successful responses through unchanged', async () => {
    await loadApi();
    const response = { data: { ok: true }, status: 200 };
    expect(handlers.responseOk!(response as never)).toBe(response);
  });
});