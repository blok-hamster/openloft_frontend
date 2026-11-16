/**
 * Verifies `lib/socketApi.ts` builds OpenCode proxied-UI URLs against the
 * configured agent wildcard domain rather than blindly rewriting `api.*` when
 * the API and agent domains live on different TLDs (e.g. api.openloft.tech +
 * agents.openloft.xyz).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: () => ({
      defaults: { baseURL: '', headers: {} },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: mockPost,
    }),
  },
}));

const SAVED_ENV = { ...process.env };

async function loadSocketApi() {
  vi.resetModules();
  return import('@/lib/socketApi');
}

describe('lib/socketApi requestAgentUiProxySession', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: { ticket: 'tok/1+2', expiresIn: 60 } });
  });

  afterEach(() => {
    process.env = { ...SAVED_ENV };
  });

  it('uses NEXT_PUBLIC_AGENT_DOMAIN when API and agent subdomains use different root domains', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.openloft.tech/api';
    process.env.NEXT_PUBLIC_AGENT_DOMAIN = 'agents.openloft.xyz';

    const { requestAgentUiProxySession } = await loadSocketApi();
    const res = await requestAgentUiProxySession('deadbeef1234');

    expect(mockPost).toHaveBeenCalledWith('/agents/deadbeef1234/opencode-proxy/token');
    expect(res).toEqual({
      url: 'https://agent-ui-deadbeef1234.agents.openloft.xyz/?ticket=tok%2F1%2B2',
      expiresIn: 60,
    });
  });

  it('falls back to replacing leading api. with agents. when NEXT_PUBLIC_AGENT_DOMAIN is unset', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.openloft.xyz/api';
    delete process.env.NEXT_PUBLIC_AGENT_DOMAIN;

    const { requestAgentUiProxySession } = await loadSocketApi();
    const res = await requestAgentUiProxySession('deadbeef1234');

    expect(res.url).toBe(
      'https://agent-ui-deadbeef1234.agents.openloft.xyz/?ticket=tok%2F1%2B2'
    );
  });

  it('routes local development to agent-ui-<agentId>.localhost with the backend port', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';
    process.env.NEXT_PUBLIC_AGENT_DOMAIN = 'agents.openloft.xyz';

    const { requestAgentUiProxySession } = await loadSocketApi();
    const res = await requestAgentUiProxySession('deadbeef1234');

    expect(res.url).toBe(
      'http://agent-ui-deadbeef1234.localhost:3001/?ticket=tok%2F1%2B2'
    );
  });
});

