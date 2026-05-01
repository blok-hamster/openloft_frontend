'use client';

import styles from './Dashboard.module.css';
import { IAgent } from '@/lib/api';
import AgentCard from './AgentCard';

interface AgentListProps {
    agents: IAgent[];
    onChat: (agent: IAgent) => void;
    onMemory: (agent: IAgent) => void;
    onDrive: (agent: IAgent) => void;
    onSettings: (agent: IAgent) => void;
    onStop: (agent: IAgent) => void;
    onStart?: (agent: IAgent) => void;
    onPause?: (agent: IAgent) => void;
    onResume?: (agent: IAgent) => void;
    onRestart?: (agent: IAgent) => void;
    onDelete?: (agent: IAgent) => void;
    onLogs?: (agent: IAgent) => void;
    onCustomKey?: (agent: IAgent) => void;
    onChannels?: (agent: IAgent) => void;
    onHttpDetails?: (agent: IAgent) => void;
}

export default function AgentList({ agents, onChat, onMemory, onDrive, onSettings, onStop, onStart, onPause, onResume, onRestart, onDelete, onLogs, onCustomKey, onChannels, onHttpDetails }: AgentListProps) {
    if (agents.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⬡</div>
                <div className={styles.emptyTitle}>No agents deployed</div>
                <div className={styles.emptyDescription}>
                    Deploy your first AI agent to get started with LOFT orchestration.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.agentGrid}>
            {agents.map((agent) => (
                <AgentCard
                    key={agent._id}
                    agent={agent}
                    onChat={onChat}
                    onMemory={onMemory}
                    onDrive={onDrive}
                    onSettings={onSettings}
                    onStop={onStop}
                    onStart={onStart}
                    onPause={onPause}
                    onResume={onResume}
                    onRestart={onRestart}
                    onDelete={onDelete}
                    onLogs={onLogs}
                    onCustomKey={onCustomKey}
                    onChannels={onChannels}
                    onHttpDetails={onHttpDetails}
                />
            ))}
        </div>
    );
}
