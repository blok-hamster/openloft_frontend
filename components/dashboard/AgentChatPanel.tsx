'use client';

import { useEffect, useState } from 'react';
import { IAgent, getAgentCredentials, IAgentCredentials } from '@/lib/api';
import { requestAgentUiProxySession } from '@/lib/socketApi';
import { rewriteBootstrapUrl } from '@/lib/openclawBootstrap';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import styles from './Dashboard.module.css';

interface AgentChatPanelProps {
    agent: IAgent;
    onClose: () => void;
}

/** Matches agentOrigin() in AgentCard and HttpDetailsModal. */
function agentOrigin() {
    if (typeof window === 'undefined') return { baseDomain: 'agents.openloft.xyz', httpProtocol: 'https' };
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal
        ? { baseDomain: '127.0.0.1.nip.io', httpProtocol: 'http' }
        : { baseDomain: 'agents.openloft.xyz', httpProtocol: 'https' };
}

export default function AgentChatPanel({ agent, onClose }: AgentChatPanelProps) {
    const { baseDomain, httpProtocol } = agentOrigin();

    // The whole credential, not a flattened token: how to authenticate is what
    // decides whether this harness's UI can be framed at all, and that shape is
    // only visible on the object.
    const [creds, setCreds] = useState<IAgentCredentials | null>(null);
    // Distinct from `creds === null`: a failed fetch used to be indistinguishable
    // from a slow one, so a dead gateway left "Preparing…" on screen forever
    // with no way to retry short of closing the panel.
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    // For basic-auth harnesses (OpenCode): the backend-proxied UI session.
    // The frame never points at the agent's own origin for these — the proxy
    // injects the derived basic credentials server-side, and its root page
    // sets the session cookie the SPA's own requests ride.
    const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setCreds(null);
        setError(null);
        /* bootstrap: true asks the backend to mint a one-time owner-bootstrap
           URL for OpenClaw (adds ~20-50s; the panel shows "Preparing…" until
           the frame loads). This URL is the only path that avoids OpenClaw's
           "Approve this browser" screen: the pinned build retired
           `dangerouslyDisableDeviceAuth`, and device approval needs
           `operator.pairing`, which the gateway token alone does not carry. */
        getAgentCredentials(agent.agentId, { bootstrap: true })
            .then((c) => { if (alive) setCreds(c); })
            .catch(() => {
                if (alive) {
                    setError(
                        'The request timed out or failed. If the agent was just created, its gateway can take a couple of minutes to come up.',
                    );
                }
            });
        return () => { alive = false; };
    }, [agent.agentId, attempt]);

    const agentToken = creds?.api.auth === 'bearer' ? creds.api.token : (creds?.api.password ?? null);
    const hermesPassword = creds?.dashboard?.password ?? null;
    // Basic-auth webUIs (OpenCode) get the same "here is the login" treatment
    // Hermes gets: the password is a derived token the user cannot see
    // anywhere else in this view.
    const basicLogin = creds?.webUi?.auth === 'basic' ? creds.webUi : null;

    // Basic-auth harnesses: mint the proxied session once the credentials
    // prove the agent is reachable, then frame the PROXY, not the agent.
    // Failure surfaces in the same error block as a failed credentials mint —
    // a dead proxy and a dead gateway are the same wall from here.
    useEffect(() => {
        if (!basicLogin) { setProxiedUrl(null); return; }
        let alive = true;
        setProxiedUrl(null);
        requestAgentUiProxySession(agent.agentId)
            .then((s) => { if (alive) setProxiedUrl(s.url); })
            .catch(() => {
                if (alive) {
                    setError('The proxied UI session could not be minted. If the agent was just created, wait a minute and try again.');
                }
            });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agent.agentId, attempt, Boolean(basicLogin)]);

    /**
     * Whether we can frame this agent's own UI.
     *
     * OpenClaw authenticates with a query token, so an iframe works. Hermes
     * serves a login page, so it works too — its credentials are displayed above
     * the frame. OpenCode's `serve` does ship a web UI, but protects every route
     * (including it) with HTTP Basic, and an iframe cannot send an
     * `Authorization` header — framing the URL would park the native auth
     * dialog inside the frame with no credentials to type.
     *
     * The discriminator is the *credential shape* from the API, not the harness
     * name. A harness that gains a query-token mode later becomes framable with
     * no change here.
     */
    const frameable = creds?.webUi?.auth === 'query' || Boolean(creds?.dashboard) || Boolean(basicLogin && proxiedUrl);

    /* The OpenClaw build retired the flag that used to let a token URL skip
       device pairing, so a query-auth OpenClaw session without a bootstrap
       URL would park the frame on "Approve this browser" — a dead end for
       the dashboard user. Treat the missing link as an error with a retry
       rather than framing it. */
    const bootstrapMissing = Boolean(
        creds && agent.agentType === 'openclaw' && creds.webUi?.auth === 'query' && !creds.webUi.bootstrapUrl,
    );

    const webUiUrl = creds?.dashboard
        ? `${httpProtocol}://${agent.agentId}.${baseDomain}${creds.dashboard.loginPath}`
        : basicLogin && proxiedUrl
            ? proxiedUrl
            : creds?.webUi?.auth === 'query' && creds.webUi.bootstrapUrl
                ? rewriteBootstrapUrl(creds.webUi.bootstrapUrl, `${httpProtocol}://${agent.agentId}.${baseDomain}`)
                : `${httpProtocol}://${agent.agentId}.${baseDomain}/?token=${encodeURIComponent(
                    creds?.webUi?.auth === 'query' ? creds.webUi.token : (agentToken ?? ''),
                )}`;

    /* A dead gateway used to leave a blank frame with no diagnostic at all. */
    const [reloadKey, setReloadKey] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setReloadKey(0);
    }, [agent.agentId]);

    return (
        <section className={styles.chatPanel} aria-label={`Chat with ${agent.name || agent.agentId}`}>
            <header className={styles.chatHeader}>
                <span className={styles.chatHeaderTitle}>{agent.name || agent.agentId}</span>
                <div className={styles.chatHeaderActions}>
                    <button
                        type="button"
                        className={styles.chatHeaderBtn}
                        onClick={() => setReloadKey((k) => k + 1)}
                        aria-label="Reload chat"
                        title="Reload chat"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        type="button"
                        className={styles.chatHeaderBtn}
                        onClick={onClose}
                        aria-label="Close chat"
                        title="Close chat"
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            {Boolean(creds?.dashboard) && (
                    <p className={styles.chatLoginHint}>
                    Login: <strong>admin</strong> /{' '}
                    <code>{hermesPassword ?? 'loading…'}</code>
                </p>
            )}
            {basicLogin && (
                <p className={styles.chatLoginHint}>
                    {proxiedUrl
                        ? 'Proxied secure session — the login is injected by the dashboard; nothing to type.'
                        : `Direct login fallback: ${basicLogin.username} / ${basicLogin.password}`}
                </p>
            )}

            {/* Ready once the shielder account exists AND the proxied UI
                session (basic-auth harnesses) has been minted: without it the
                iframe would show the agent's native 401 for the whole mint
                window. */}
            {(creds === null || (basicLogin && !proxiedUrl)) && error === null && (
                <div className={styles.chatUnframable} role="status">
                    <p className={styles.chatUnframableTitle}>Preparing the agent session…</p>
                    <p className={styles.chatUnframableBody}>
                        The first open after an agent starts can take up to a minute.
                    </p>
                </div>
            )}
            {(creds === null || basicLogin) && error !== null && (
                <div className={styles.chatUnframable}>
                    <p className={styles.chatUnframableTitle}>Could not prepare the agent session</p>
                    <p className={styles.chatUnframableBody}>{error}</p>
                    <button
                        type="button"
                        className={styles.chatRetryBtn}
                        onClick={() => setAttempt((a) => a + 1)}
                    >
                        Try again
                    </button>
                </div>
            )}
            {creds !== null && error === null && (bootstrapMissing ? (
                <div className={styles.chatUnframable}>
                    <p className={styles.chatUnframableTitle}>Could not prepare the agent session</p>
                    <p className={styles.chatUnframableBody}>
                        The one-time session link could not be minted — the agent gateway did not answer
                        in time. If the agent was just created, wait a minute for it to finish starting,
                        then try again.
                    </p>
                    <button
                        type="button"
                        className={styles.chatRetryBtn}
                        onClick={() => setAttempt((a) => a + 1)}
                    >
                        Try again
                    </button>
                </div>
            ) : frameable ? (
                <>
                    {!loaded && (
                        <p className={styles.chatLoading} role="status">Connecting to agent…</p>
                    )}
                <iframe
                    /* key forces a remount so Reload works without a full
                       page refresh. */
                    key={reloadKey}
                    className={styles.chatFrame}
                    src={webUiUrl}
                    title={`Chat with ${agent.agentId}`}
                    onLoad={() => setLoaded(true)}
                    /* The framed WebUI is a JS app, so it needs scripts and
                       same-origin to function. It is still denied top-level
                       navigation, form submission, pointer lock, and
                       downloads — none of which the WebUI needs. */
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                />
                </>
            ) : (
                <div className={styles.chatUnframable}>
                    <p className={styles.chatUnframableTitle}>
                        {basicLogin ? "This agent's web UI can't be embedded." : 'This agent has no web UI to embed.'}
                    </p>
                    <p className={styles.chatUnframableBody}>
                        {basicLogin
                            ? `${agent.name || agent.agentId}'s UI is protected by basic authentication, which a browser frame cannot send credentials on. Open it with the WebUI button on its card — the login is copied to your clipboard — or use the Terminal button for an interactive session.`
                            : `${agent.name || agent.agentId} speaks an HTTP API protected by basic authentication, which a browser frame cannot send credentials on. Use the Terminal button on its card for an interactive session, or HTTP API for the request shape.`}
                    </p>
                </div>
            ))}

            <p className={styles.chatNote}>
                <AlertTriangle size={12} aria-hidden />
                The agent gateway receives this session token — do not share the URL.
            </p>
        </section>
    );
}
