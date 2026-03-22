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
    // OpenClaw's native WebUI handles WebSocket connections, markdown rendering, tool call views, and thinking steps.
    // By embedding it in an iframe, we get the full cohesive chat experience without reverse-engineering the JSON-RPC protocol.
    const webUiUrl = typeof window !== 'undefined'
        ? `http://${agent.agentId}.127.0.0.1.nip.io/?token=${agent.gatewayToken}`
        : '';

    return (
        <div className={styles.chatPanel} style={{ padding: 0, overflow: 'hidden' }}>
            <div className={styles.chatHeader} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
                <span>{agent.name || agent.agentId}</span>
                <button className={styles.sidebarLink} onClick={onClose} style={{ padding: 0, background: 'none' }}>
                    <X size={16} color="var(--text-secondary)" />
                </button>
            </div>

            <iframe
                src={webUiUrl}
                style={{
                    width: '100%',
                    height: 'calc(100% - 50px)', // Subtract header height
                    border: 'none',
                    background: 'var(--bg-color)'
                }}
                title={`Chat with ${agent.agentId}`}
            />
        </div>
    );
}
