import { resolveApiBaseUrl } from './apiBase';

/**
 * The API base URL users paste into their own clients.
 *
 * On `openloft.tech` / `openloft.xyz`, matches the browser domain; otherwise
 * `NEXT_PUBLIC_API_URL` wins, or a non-local browser falls back to `/api` on
 * the current origin. Local development keeps the conventional port.
 */
export function publicApiBase(): string {
  return resolveApiBaseUrl({ sameOriginFallback: true });
}
