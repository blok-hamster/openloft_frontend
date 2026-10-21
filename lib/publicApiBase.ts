/**
 * The API base URL users paste into their own clients.
 *
 * `NEXT_PUBLIC_API_URL` wins when set. Without it, a deployed build must not
 * print `localhost` into a copy-paste snippet — that config would fail on the
 * user's machine — so a non-local browser assumes the documented deployment
 * shape (the API is reverse-proxied under `/api` on the same origin). Local
 * development keeps the conventional port.
 */
export function publicApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) return `${origin}/api`;
  }

  return 'http://localhost:3001/api';
}
