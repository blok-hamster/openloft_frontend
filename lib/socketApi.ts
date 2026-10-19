/**
 * Terminal token mint.
 *
 * Moved out of `lib/api.ts` so the terminal and the API client can be
 * imported independently — `requestTerminalToken` was already declared there
 * (`lib/api.ts:681`) with zero call sites, against a route that did not exist.
 * The route now lives at `POST /api/agents/:agentId/terminal/token`.
 */

import { api, API_BASE_URL } from './api';

export const requestTerminalToken = async (
  agentId: string
): Promise<{ token: string; expiresIn: number }> => {
  const { data } = await api.post(`/agents/${agentId}/terminal/token`);
  return { token: data.token, expiresIn: data.expiresIn };
};

/**
 * Mint a proxied-UI session for a basic-auth harness (OpenCode today).
 *
 * The returned URL opens the UI on its own hostname surface —
 * `agent-ui-<agentId>.localhost:<backendPort>` (browsers resolve `*.localhost`
 * to loopback; RFC 6761). The proxy injects the derived basic credentials
 * server-side, so the browser never sees a prompt and the iframe never needs
 * an impossible `Authorization` header. Why a host and not a path: the SPA
 * builds absolute URLs from `location.origin` (`/assets/…`, `/api/…`), and
 * `<base>` does not apply to path-absolute URLs — on a shared origin those
 * escape into the dashboard's own tree. On this origin the agent's namespace
 * IS the origin, by construction.
 *
 * The backend also keeps a `/agent-ui/:agentId/` path surface for clients
 * that cannot use vhost hostnames; this builder prefers the hostname mode.
 */
export const requestAgentUiProxySession = async (
  agentId: string
): Promise<{ url: string; expiresIn: number }> => {
  const { data } = await api.post(`/agents/${agentId}/opencode-proxy/token`);
  const backend = new URL(API_BASE_URL.replace(/\/api\/?$/, ''));
  const vhostOrigin = `${backend.protocol}//agent-ui-${agentId}.localhost${
    backend.port ? `:${backend.port}` : ''
  }`;
  return {
    url: `${vhostOrigin}/?ticket=${encodeURIComponent(data.ticket)}`,
    expiresIn: data.expiresIn,
  };
};
