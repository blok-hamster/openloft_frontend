'use client';

import { useState, useRef, useEffect } from 'react';
import { sendMessageToAgent, IAgent } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Send, X } from 'lucide-react';
import styles from './Dashboard.module.css';

interface AgentChatPanelProps {
    agent: IAgent;
    onClose: () => void;
}

interface ChatMessage {
    role: 'user' | 'agent';
    content: string;
}

export default function AgentChatPanel({ agent, onClose }: AgentChatPanelProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseDomain = isLocal ? '127.0.0.1.nip.io' : 'agents.openloft.xyz';
    const protocol = isLocal ? 'http' : 'https';

    const isHermes = agent.agentType === 'hermes';
    const webUiUrl = isHermes
        ? `${protocol}://${agent.agentId}.${baseDomain}/login`
        : `${protocol}://${agent.agentId}.${baseDomain}/?token=${agent.gatewayToken}`;

    return (
        <div className={styles.chatPanel} style={{ padding: 0, overflow: 'hidden' }}>
            <div className={styles.chatHeader} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
                <span>{agent.name || agent.agentId}</span>
                <button className={styles.sidebarLink} onClick={onClose} style={{ padding: 0, background: 'none' }}>
                    <X size={16} color="var(--text-secondary)" />
                </button>
            </div>

            {isHermes && (
                <div style={{ padding: '0.5rem 1rem', background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Login: <strong>admin</strong> / <code style={{ fontSize: '0.7rem', userSelect: 'all' }}>{agent.gatewayToken}</code>
                </div>
            )}

            <iframe
                ref={iframeRef}
                src={webUiUrl}
                style={{
                    width: '100%',
                    height: isHermes ? 'calc(100% - 82px)' : 'calc(100% - 50px)',
                    border: 'none',
                    background: 'var(--bg-color)'
                }}
                title={`Chat with ${agent.agentId}`}
            />
        </div>
    );
}
