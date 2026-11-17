/**
 * Runtime host-matched API and agent-domain resolution.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time as single static strings, so
 * one deployed bundle serving both `openloft.tech` and `openloft.xyz` routes
 * API/WebSocket calls from `window.location.hostname` to the matching API host
 * while keeping per-agent subdomains on `agents.openloft.xyz`.
 */

interface HostRoute {
  readonly domain: string;
  readonly apiBase: string;
  readonly agentDomain: string;
}

const HOST_ROUTES: readonly HostRoute[] = [
  {
    domain: 'openloft.tech',
    apiBase: 'https://api.openloft.tech/api',
    agentDomain: 'agents.openloft.xyz',
  },
  {
    domain: 'openloft.xyz',
    apiBase: 'https://api.openloft.xyz/api',
    agentDomain: 'agents.openloft.xyz',
  },
];

function matchHostRoute(hostname?: string): HostRoute | undefined {
  const host = hostname?.trim().toLowerCase();
  if (!host) return undefined;
  return HOST_ROUTES.find(
    (route) => host === route.domain || host.endsWith(`.${route.domain}`),
  );
}

/**
 * Resolve the backend `/api` base URL for the current browser origin, falling
 * back to `NEXT_PUBLIC_API_URL` (or same-origin `/api` / localhost dev).
 */
export function resolveApiBaseUrl(opts?: { sameOriginFallback?: boolean }): string {
  if (typeof window !== 'undefined') {
    const matched = matchHostRoute(window.location?.hostname);
    if (matched) return matched.apiBase;
  }

  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (configured) return configured;

  if (opts?.sameOriginFallback && typeof window !== 'undefined') {
    const hostname = window.location?.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal && window.location?.origin) {
      return `${window.location.origin}/api`;
    }
  }

  return 'http://localhost:3001/api';
}

/** Resolve the backend origin without a trailing `/api` suffix. */
export function getApiOrigin(): string {
  return resolveApiBaseUrl().replace(/\/api\/?$/, '') || 'http://localhost:3001';
}

/**
 * Resolve the wildcard agent host suffix (`agents.openloft.xyz`), honoring an
 * explicit `NEXT_PUBLIC_AGENT_DOMAIN` override first.
 */
export function resolveAgentDomain(apiHostname?: string): string {
  const explicit = process.env.NEXT_PUBLIC_AGENT_DOMAIN?.trim();
  if (explicit) return explicit;

  if (typeof window !== 'undefined') {
    const byWindow = matchHostRoute(window.location?.hostname);
    if (byWindow) return byWindow.agentDomain;
  }

  const byApi = matchHostRoute(apiHostname);
  if (byApi) return byApi.agentDomain;

  return (apiHostname || '').replace(/^api\./, 'agents.') || 'agents.openloft.xyz';
}

