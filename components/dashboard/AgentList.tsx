'use client';

import styles from './Dashboard.module.css';
import { IAgent } from '@/lib/api';
import AgentCard from './AgentCard';
import Button from '@/components/ui/Button';
import { Bot } from 'lucide-react';

interface AgentListProps {
    agents: IAgent[];
    /** Shown in the empty state — without it, "no agents" is a dead end. */
    onDeploy?: () => void;
    onSettings: (agent: IAgent) => void;
    onStop: (agent: IAgent) => void;
    onStart?: (agent: IAgent) => void;
    onPause?: (agent: IAgent) => void;
    onResume?: (agent: IAgent) => void;
    onRestart?: (agent: IAgent) => void;
    onDelete?: (agent: IAgent) => void;
    onLogs?: (agent: IAgent) => void;
    onCustomKey?: (agent: IAgent) => void;
    onHttpDetails?: (agent: IAgent) => void;
    /** "agentId:action" while a lifecycle request is in flight — the page
        blocks concurrent transitions and the list shows which button owns
        the wait, instead of a second tap queueing a conflicting one. */
    pendingAction?: string | null;
}

export default function AgentList({ agents, onDeploy, onSettings, onStop, onStart, onPause, onResume, onRestart, onDelete, onLogs, onCustomKey, onHttpDetails, pendingAction = null }: AgentListProps) {
    if (agents.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon} aria-hidden="true"><Bot size={40} /></div>
                <div className={styles.emptyTitle}>No agents deployed</div>
                <div className={styles.emptyDescription}>
                    Deploy your first AI agent to get started with OpenLoft.
                </div>
                {onDeploy && (
                    <Button type="button" variant="primary" onClick={onDeploy}>
                        Deploy your first agent
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={styles.agentGrid}>
            {agents.map((agent) => (
                <AgentCard
                    key={agent._id}
                    agent={agent}
                    onSettings={onSettings}
                    onStop={onStop}
                    onStart={onStart}
                    onPause={onPause}
                    onResume={onResume}
                    onRestart={onRestart}
                    onDelete={onDelete}
                    onLogs={onLogs}
                    onCustomKey={onCustomKey}
                    onHttpDetails={onHttpDetails}
                    pendingAction={pendingAction}
                />
            ))}
        </div>
    );
}
