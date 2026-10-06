'use client';

import { useState, useEffect } from 'react';
import { IAgent } from '@/lib/api';
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
    const isHermes = agent.agentType === 'hermes';

    const webUiUrl = isHermes
        ? `${httpProtocol}://${agent.agentId}.${baseDomain}/login`
        : `${httpProtocol}://${agent.agentId}.${baseDomain}/?token=${agent.gatewayToken}`;

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

            {isHermes && (
                <p className={styles.chatLoginHint}>
                    Login: <strong>admin</strong> /{' '}
                    <code>{agent.gatewayToken}</code>
                </p>
            )}

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

            <p className={styles.chatNote}>
                <AlertTriangle size={12} aria-hidden />
                The agent gateway receives this session token — do not share the URL.
            </p>
        </section>
    );
}
