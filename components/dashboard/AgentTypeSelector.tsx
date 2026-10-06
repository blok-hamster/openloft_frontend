'use client';

import Card from '@/components/ui/Card';
import styles from './Dashboard.module.css';
import selector from './AgentTypeSelector.module.css';

interface AgentTypeSelectorProps {
    value: 'openclaw' | 'hermes';
    onChange: (type: 'openclaw' | 'hermes') => void;
}

export default function AgentTypeSelector({ value, onChange }: AgentTypeSelectorProps) {
    return (
        <div className={selector.grid}>
            <Card
                className={`${value === 'openclaw' ? styles.activePlanCard : ''} ${selector.optionCard}`}
                onClick={() => onChange('openclaw')}
            >
                <h4 className={selector.optionTitle}>OpenClaw Agent</h4>
                <p className={selector.optionBlurb}>
                    Full-featured AI orchestrator with skills, plugins, and A2A communication.
                </p>
                <ul className={selector.optionList}>
                    <li>+ Plugin ecosystem (Discord, Telegram, Slack)</li>
                    <li>+ Agent-to-Agent protocol (A2A)</li>
                    <li>+ Custom skill files & MCP servers</li>
                    <li>+ Fine-grained config control</li>
                </ul>
            </Card>
            <Card
                className={`${value === 'hermes' ? styles.activePlanCard : ''} ${selector.optionCard}`}
                onClick={() => onChange('hermes')}
            >
                <h4 className={selector.optionTitle}>Hermes Agent</h4>
                <p className={selector.optionBlurb}>
                    Self-improving agent with autonomous skill creation and persistent memory.
                </p>
                <ul className={selector.optionList}>
                    <li>+ Auto-creates & improves skills</li>
                    <li>+ Persistent cross-session memory</li>
                    <li>+ Browser automation (Playwright)</li>
                    <li>+ 300+ model support via Nous Portal</li>
                </ul>
            </Card>
        </div>
    );
}
