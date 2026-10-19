/**
 * Socket.IO client factory.
 *
 * The backend runs `io.use()` on every handshake
 * (`backend/src/services/SocketService.ts:66-100`) and rejects any socket that
 * does not present a JWT — from `handshake.auth.token`, `handshake.query.token`
 * or `Authorization: Bearer`. Two pages in this app called `io(socketUrl)` with
 * no credentials, so every one of those sockets was refused at the handshake
 * and `connect` never fired. Neither page knew, because it only logged on
 * connect.
 *
 * The token is the same JWT the axios instance in `lib/api.ts` already sends.
 * Read it from the same storage key rather than threading it through props.
 */

import { io, type Socket } from 'socket.io-client';

export type { Socket };
export const TOKEN_STORAGE_KEY = 'loft_token';

/**
 * API origin, without the trailing `/api`.
 *
 * `NEXT_PUBLIC_API_URL` is documented to end in `/api` — the axios instance
 * hardcodes that expectation, and the two call sites each stripped the suffix
 * with their own regex. Strip it once here.
 */
export function socketOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '') || 'http://localhost:3001';
}

export const readAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Connect with the JWT attached.
 *
 * `transports: ['websocket']` skips the long-polling upgrade; the previous
 * behaviour was the default, which is fine for a dashboard but adds a round
 * trip to every terminal keystroke path.
 */
export function createSocket(): Socket {
  const token = readAuthToken();
  return io(socketOrigin(), {
    auth: token ? { token } : undefined,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}
