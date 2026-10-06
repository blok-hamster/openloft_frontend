'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchAgentLogs, getAuditLogs, IAgent, IAuditLog } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import styles from './Dashboard.module.css';

interface LogsPanelProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

export default function LogsPanel({ agent, open, onClose }: LogsPanelProps) {
    const [tab, setTab] = useState<'agent' | 'audit'>('agent');
    const [logs, setLogs] = useState('');
    const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);
    const logScrollRef = useRef<HTMLDivElement>(null);
    /* The 5s poll replaces `logs`, and auto-scrolling on every change
       yanked the view back to the bottom even when the reader had
       scrolled up to read something. Only follow new output when they
       were already at the bottom. */
    const stickToBottom = useRef(true);

    useEffect(() => {
        if (!open || !agent) return;
        setLoading(true);
        stickToBottom.current = true;

        if (tab === 'agent') {
            fetchAgentLogs(agent.agentId)
                .then(setLogs)
                .catch(() => setLogs('Failed to fetch logs'))
                .finally(() => setLoading(false));
        } else {
            getAuditLogs(agent.agentId)
                .then(setAuditLogs)
                .catch(() => setAuditLogs([]))
                .finally(() => setLoading(false));
        }
    }, [open, agent, tab]);

    // Auto-scroll only when the reader was already at the bottom
    useEffect(() => {
        if (!stickToBottom.current) return;
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleScroll = () => {
        const el = logScrollRef.current;
        if (!el) return;
        /* Within 24px of the bottom counts as "following". */
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    };

    // Auto-refresh agent logs every 5s
    useEffect(() => {
        if (!open || !agent || tab !== 'agent') return;
        const interval = setInterval(() => {
            fetchAgentLogs(agent.agentId).then(setLogs).catch(() => {});
        }, 5000);
        return () => clearInterval(interval);
    }, [open, agent, tab]);

    return (
        <Modal open={open} onClose={onClose} title={`Logs — ${agent?.name || agent?.agentId || ''}`}>
            <div className={styles.memoryEditor}>
                <div className={styles.memoryTabs}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'agent'}
                        className={`${styles.memoryTab} ${tab === 'agent' ? styles.memoryTabActive : ''}`}
                        onClick={() => setTab('agent')}
                    >
                        Agent Logs
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'audit'}
                        className={`${styles.memoryTab} ${tab === 'audit' ? styles.memoryTabActive : ''}`}
                        onClick={() => setTab('audit')}
                    >
                        Audit Logs
                    </button>
                </div>

                {loading ? (
                    <div className={styles.logLoading}>Loading…</div>
                ) : tab === 'agent' ? (
                    <div
                        ref={logScrollRef}
                        onScroll={handleScroll}
                        className={styles.logPane}
                    >
                        {logs || 'No logs available'}
                        <div ref={logEndRef} />
                    </div>
                ) : (
                    <div className={styles.auditPane}>
                        {auditLogs.length === 0 ? (
                            <div className={styles.auditEmpty}>No audit logs</div>
                        ) : (
                            auditLogs.map((log) => (
                                <div key={log._id} className={styles.auditRow}>
                                    <div>
                                        <span className={styles.auditAction}>
                                            {log.actionType}
                                        </span>
                                        <span className={styles.auditContext}>
                                            {log.commandContext?.substring(0, 80)}
                                        </span>
                                    </div>
                                    <span className={styles.auditTime}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
