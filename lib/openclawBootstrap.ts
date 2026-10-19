/**
 * Rewrite the container-local owner-bootstrap URL the backend mints to the
 * agent's public origin.
 *
 * The backend mints `https://127.0.0.1:18789/#bootstrapToken=...&
 * bootstrapProfile=owner&gatewayUrl=wss%3A%2F%2F127.0.0.1%3A18789`.
 *
 * The `gatewayUrl` param must be dropped, not rewritten. The Control UI
 * derives the gateway URL from the page origin and only starts a pending
 * bootstrap connect when the param differs from it; when they match (which
 * is always the case here) it silently discards the pending connect and the
 * browser parks on the "gateway expects its token" screen. Without the
 * param, the UI connects to the page origin and consumes the one-time token,
 * landing an unpaired browser in the chat surface as the gateway owner.
 *
 * Verified in a real browser against a fresh profile.
 */
export function rewriteBootstrapUrl(bootstrapUrl: string, root: string): string {
    const hashAt = bootstrapUrl.indexOf('#');
    const fragment = hashAt === -1 ? '' : bootstrapUrl.slice(hashAt + 1);
    const params = new URLSearchParams(fragment);
    params.delete('gatewayUrl');
    const rewritten = params.toString();
    return rewritten ? `${root}/#${rewritten}` : root;
}
