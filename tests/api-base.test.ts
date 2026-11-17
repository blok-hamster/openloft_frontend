/**
 * Verifies host-matched runtime API and agent-domain routing in `lib/apiBase.ts`
 * and its consumers (`lib/api.ts`, `lib/socket.ts`, `lib/publicApiBase.ts`,
 * `lib/socketApi.ts`).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const handlers = {
  request: null as ((cfg: { baseURL?: string; headers: Record<string, string> }) => unknown) | null,
};

const mockPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: (config?: { baseURL?: string }) => ({
      defaults: { baseURL: config?.baseURL ?? '' },
      interceptors: {
        request: {
          use: (fn: typeof handlers.request) => {
            handlers.request = fn;
          },
        },
        response: { use: vi.fn() },
      },
      post: mockPost,
    }),
  },
}));

const SAVED_ENV = { ...process.env };
const SAVED_LOCATION = window.location;

function setHost(hostname: string, origin = `https://${hostname}`) {
  delete (window as { location?: unknown }).location;
  (window as { location?: unknown }).location = {
    hostname,
    origin,
    href: `${origin}/dashboard`,
    pathname: '/dashboard',
  };
}

describe('lib/apiBase host-matched routing', () => {
  beforeEach(() => {
    handlers.request = null;
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: { ticket: 't-123', expiresIn: 60 } });
    process.env = { ...SAVED_ENV };
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_AGENT_DOMAIN;
  });

  afterEach(() => {
    process.env = { ...SAVED_ENV };
    delete (window as { location?: unknown }).location;
    (window as { location?: unknown }).location = SAVED_LOCATION;
  });

  it('routes openloft.tech and www.openloft.tech to api.openloft.tech even if NEXT_PUBLIC_API_URL says .xyz', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.openloft.xyz/api';

    for (const host of ['openloft.tech', 'www.openloft.tech']) {
      setHost(host);
      vi.resetModules();
      const { resolveApiBaseUrl, getApiOrigin } = await import('@/lib/apiBase');
      const { socketOrigin } = await import('@/lib/socket');
      const { publicApiBase } = await import('@/lib/publicApiBase');

      expect(resolveApiBaseUrl()).toBe('https://api.openloft.tech/api');
      expect(getApiOrigin()).toBe('https://api.openloft.tech');
      expect(socketOrigin()).toBe('https://api.openloft.tech');
      expect(publicApiBase()).toBe('https://api.openloft.tech/api');
    }
  });

  it('routes openloft.xyz and www.openloft.xyz to api.openloft.xyz even if NEXT_PUBLIC_API_URL says .tech', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.openloft.tech/api';

    for (const host of ['openloft.xyz', 'www.openloft.xyz']) {
      setHost(host);
      vi.resetModules();
      const { resolveApiBaseUrl, getApiOrigin } = await import('@/lib/apiBase');
      const { socketOrigin } = await import('@/lib/socket');
      const { publicApiBase } = await import('@/lib/publicApiBase');

      expect(resolveApiBaseUrl()).toBe('https://api.openloft.xyz/api');
      expect(getApiOrigin()).toBe('https://api.openloft.xyz');
      expect(socketOrigin()).toBe('https://api.openloft.xyz');
      expect(publicApiBase()).toBe('https://api.openloft.xyz/api');
    }
  });

  it('keeps axios request baseURL matched to browser hostname even after non-matching module load', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.openloft.xyz/api';
    setHost('localhost', 'http://localhost:3000');
    vi.resetModules();
    const { API_BASE_URL } = await import('@/lib/api');
    expect(API_BASE_URL).toBe('https://api.openloft.xyz/api');

    setHost('openloft.tech');
    const cfg = handlers.request!({ baseURL: API_BASE_URL, headers: {} }) as {
      baseURL?: string;
    };
    expect(cfg.baseURL).toBe('https://api.openloft.tech/api');
  });

  it('keeps OpenCode proxied UI on agents.openloft.xyz from both .tech and .xyz frontends without NEXT_PUBLIC_AGENT_DOMAIN', async () => {
    for (const host of ['openloft.tech', 'openloft.xyz']) {
      setHost(host);
      vi.resetModules();
      const { requestAgentUiProxySession } = await import('@/lib/socketApi');
      const res = await requestAgentUiProxySession('deadbeef1234');
      expect(res.url).toBe('https://agent-ui-deadbeef1234.agents.openloft.xyz/?ticket=t-123');
    }
  });

  it('falls back to NEXT_PUBLIC_API_URL on localhost and /api on unknown deployed hosts', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';
    setHost('localhost', 'http://localhost:3000');
    vi.resetModules();
    const modLocal = await import('@/lib/apiBase');
    expect(modLocal.resolveApiBaseUrl()).toBe('http://localhost:3001/api');

    delete process.env.NEXT_PUBLIC_API_URL;
    setHost('preview.example.com', 'https://preview.example.com');
    vi.resetModules();
    const modPreview = await import('@/lib/apiBase');
    expect(modPreview.resolveApiBaseUrl({ sameOriginFallback: true })).toBe(
      'https://preview.example.com/api',
    );
  });
});

