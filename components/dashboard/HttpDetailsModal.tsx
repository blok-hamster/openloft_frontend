'use client';

import { useEffect, useState } from 'react';
import { getAgentCredentials, IAgent, IAgentCredentials } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import styles from './Dashboard.module.css';
import { Copy, Check } from 'lucide-react';

interface HttpDetailsModalProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

export default function HttpDetailsModal({ agent, open, onClose }: HttpDetailsModalProps) {
    const [copied, setCopied] = useState<string | null>(null);

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseDomain = isLocal ? '127.0.0.1.nip.io' : 'agents.openloft.xyz';
    // No early return above: the hooks must run on every render, so the
    // null-agent case is handled here instead.
    const a = agent;
    const protocol = isLocal ? 'http' : 'https';
    const apiUrl = a ? `${protocol}://${a.agentId}.${baseDomain}/v1/chat/completions` : '';
    const model = a?.agentType === 'hermes' ? 'hermes-agent' : (a?.agentType ?? 'openclaw');
    // Fetch the credential instead of reading it off the agent: `agent
    // .gatewayToken` does not exist on a response — it is select:false and
    // stripped — so the old code rendered "Bearer undefined" and pasted that
    // into the example curl.
    const [cred, setCred] = useState<IAgentCredentials | null>(null);
    useEffect(() => {
        let alive = true;
        if (!a) { setCred(null); return; }
        getAgentCredentials(a.agentId)
            .then((c) => { if (alive) setCred(c); })
            .catch(() => { if (alive) setCred(null); });
        return () => { alive = false; };
    }, [a?.agentId]);
    /**
     * The Authorization header this harness actually expects.
     *
     * OpenClaw and Hermes take a bearer. OpenCode's `serve` protects every route
     * with HTTP Basic, so a curl shaped for bearer gets a 401 and no explanation.
     * Narrowing on the credential shape rather than the harness name keeps this
     * correct if either harness changes how it authenticates.
     */
    const authHeader = cred?.api.auth === 'basic'
        ? `Basic ${btoa(`${cred.api.username}:${cred.api.password}`)}`
        : `Bearer ${cred && cred.api.auth === 'bearer' ? cred.api.token : ''}`;

    /* Displayed and copied forms were two separate literals, so they
       would drift. Build both from one source. */
    const curl = `curl -X POST ${apiUrl} \\\n  -H "Authorization: ${authHeader}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${model}",\n    "messages": [{"role": "user", "content": "Hello!"}]\n  }'`;
    const curlFlat = curl.replace(/\\\n\s*/g, ' ');

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!a) return null;

    return (
        <Modal open={open} onClose={onClose} title="HTTP Chat Completion Details">
            <div className={styles.httpDetailsContent}>
                <p className={styles.httpDetailsDesc}>
                    Use this endpoint to interact with your agent programmatically via OpenAI-compatible API.
                </p>

                <div className={styles.httpDetailItem}>
                    <label>Endpoint URL</label>
                    <div className={styles.httpDetailValue}>
                        <code>{apiUrl}</code>
                        <button type="button" className={styles.httpCopyBtn} aria-label="Copy endpoint URL" onClick={() => handleCopy(apiUrl, 'url')}>
                            {copied === 'url' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className={styles.httpDetailItem}>
                    <label>{cred?.api.auth === 'basic' ? 'Authorization header' : 'Bearer Token'}</label>
                    <div className={styles.httpDetailValue}>
                        <code>{authHeader}</code>
                        <button type="button" className={styles.httpCopyBtn} aria-label="Copy authorization header" onClick={() => handleCopy(authHeader, 'auth')}>
                            {copied === 'auth' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className={styles.httpDetailItem}>
                    <label>Model</label>
                    <div className={styles.httpDetailValue}>
                        <code>{model}</code>
                        <button type="button" className={styles.httpCopyBtn} aria-label="Copy model" onClick={() => handleCopy(model, 'model')}>
                            {copied === 'model' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className={styles.httpDetailItem}>
                    <label>Example Curl</label>
                    <div className={styles.httpDetailValue}>
                        <pre className={styles.httpDetailPre}>{curl}</pre>
                        <button
                            type="button"
                            className={styles.httpCopyBtnFloating}
                            aria-label="Copy curl example"
                            onClick={() => handleCopy(curlFlat, 'curl')}
                        >
                            {copied === 'curl' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
