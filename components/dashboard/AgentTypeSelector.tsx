'use client';

import Card from '@/components/ui/Card';
import styles from './Dashboard.module.css';

interface AgentTypeSelectorProps {
    value: 'openclaw' | 'hermes';
    onChange: (type: 'openclaw' | 'hermes') => void;
}

export default function AgentTypeSelector({ value, onChange }: AgentTypeSelectorProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card
                className={value === 'openclaw' ? styles.activePlanCard : ''}
                onClick={() => onChange('openclaw')}
                style={{ cursor: 'pointer', padding: '1.25rem' }}
            >
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 700 }}>OpenClaw Agent</h4>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.75rem' }}>
                    Full-featured AI orchestrator with skills, plugins, and A2A communication.
                </p>
                <ul style={{ fontSize: '0.6875rem', opacity: 0.6, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>+ Plugin ecosystem (Discord, Telegram, Slack)</li>
                    <li>+ Agent-to-Agent protocol (A2A)</li>
                    <li>+ Custom skill files & MCP servers</li>
                    <li>+ Fine-grained config control</li>
                </ul>
            </Card>
            <Card
                className={value === 'hermes' ? styles.activePlanCard : ''}
                onClick={() => onChange('hermes')}
                style={{ cursor: 'pointer', padding: '1.25rem' }}
            >
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 700 }}>Hermes Agent</h4>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.75rem' }}>
                    Self-improving agent with autonomous skill creation and persistent memory.
                </p>
                <ul style={{ fontSize: '0.6875rem', opacity: 0.6, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>+ Auto-creates & improves skills</li>
                    <li>+ Persistent cross-session memory</li>
                    <li>+ Browser automation (Playwright)</li>
                    <li>+ 300+ model support via Nous Portal</li>
                </ul>
            </Card>
        </div>
    );
}
