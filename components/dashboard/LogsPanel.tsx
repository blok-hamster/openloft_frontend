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

    useEffect(() => {
        if (!open || !agent) return;
        setLoading(true);

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

    // Auto-scroll when logs change
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

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
                        className={`${styles.memoryTab} ${tab === 'agent' ? styles.memoryTabActive : ''}`}
                        onClick={() => setTab('agent')}
                    >
                        Agent Logs
                    </button>
                    <button
                        className={`${styles.memoryTab} ${tab === 'audit' ? styles.memoryTabActive : ''}`}
                        onClick={() => setTab('audit')}
                    >
                        Audit Logs
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Loading…
                    </div>
                ) : tab === 'agent' ? (
                    <div style={{
                        background: 'rgba(26, 26, 26, 0.04)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        lineHeight: '1.6',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: 'var(--text-primary)',
                    }}>
                        {logs || 'No logs available'}
                        <div ref={logEndRef} />
                    </div>
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {auditLogs.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                                No audit logs
                            </div>
                        ) : (
                            auditLogs.map((log) => (
                                <div key={log._id} style={{
                                    padding: '0.6rem 0.75rem',
                                    borderBottom: '1px solid rgba(26, 26, 26, 0.06)',
                                    fontSize: 'var(--font-size-xs)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            {log.actionType}
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                            {log.commandContext?.substring(0, 80)}
                                        </span>
                                    </div>
                                    <span style={{ color: 'var(--mid-grey)', fontSize: '10px', flexShrink: 0 }}>
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
