'use client';

import Modal from '@/components/ui/Modal';
import { IAgent } from '@/lib/api';
import styles from './Dashboard.module.css';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface HttpDetailsModalProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

export default function HttpDetailsModal({ agent, open, onClose }: HttpDetailsModalProps) {
    const [copied, setCopied] = useState<string | null>(null);

    if (!agent) return null;

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseDomain = isLocal ? '127.0.0.1.nip.io' : 'agents.openloft.xyz';
    const protocol = isLocal ? 'http' : 'https';
    
    const apiUrl = `${protocol}://${agent.agentId}.${baseDomain}/v1/chat/completions`;
    const token = agent.gatewayToken;
    const model = 'default';

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

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
                        <button onClick={() => handleCopy(apiUrl, 'url')}>
                            {copied === 'url' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className={styles.httpDetailItem}>
                    <label>Bearer Token</label>
                    <div className={styles.httpDetailValue}>
                        <code>{token}</code>
                        <button onClick={() => handleCopy(token, 'token')}>
                            {copied === 'token' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className={styles.httpDetailItem}>
                    <label>Model</label>
                    <div className={styles.httpDetailValue}>
                        <code>{model}</code>
                        <button onClick={() => handleCopy(model, 'model')}>
                            {copied === 'model' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className={styles.httpDetailItem}>
                    <label>Example Curl</label>
                    <div className={styles.httpDetailValue}>
                        <pre>
{`curl -X POST ${apiUrl} \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
                        </pre>
                        <button 
                            style={{ position: 'absolute', top: '10px', right: '10px' }}
                            onClick={() => handleCopy(`curl -X POST ${apiUrl} -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"model": "${model}","messages": [{"role": "user", "content": "Hello!"}]}'`, 'curl')}
                        >
                            {copied === 'curl' ? <Check size={14} className={styles.copySuccess} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
