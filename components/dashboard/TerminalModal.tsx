'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Terminal as TerminalIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '@/lib/AuthContext';
import { IAgent } from '@/lib/api';
import styles from './Dashboard.module.css';

interface TerminalModalProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

interface TerminalEntry {
    command: string;
    response: string;
    timestamp: string;
}

export default function TerminalModal({ agent, open, onClose }: TerminalModalProps) {
    const { user } = useAuth();
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<TerminalEntry[]>([]);
    const [executing, setExecuting] = useState(false);
    const socketRef = useRef<any>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open || !agent) return;

        const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Terminal] Connected');
            socket.emit('subscribe', agent.agentId);
            socket.emit('terminal:history', { agentId: agent.agentId });
        });

        socket.on('terminal:history', ({ history: savedHistory }: { history: TerminalEntry[] }) => {
            setHistory(savedHistory);
        });

        socket.on('terminal:output', ({ output, timestamp }: { output: string, timestamp: string }) => {
            setExecuting(false);
            setHistory(prev => [...prev, { command: '', response: output, timestamp }]);
        });

        return () => {
            socket.disconnect();
        };
    }, [open, agent]);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    if (!open || !agent) return null;

    const handleExecute = (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim() || executing) return;

        setExecuting(true);
        // Add optimistic local entry for the command itself
        setHistory(prev => [...prev, { command, response: '', timestamp: new Date().toISOString() }]);
        
        socketRef.current?.emit('terminal:command', {
            agentId: agent.agentId,
            tenantId: user?.tenantId,
            command: command.trim()
        });
        
        setCommand('');
    };

    return (
        <div className={styles.terminalOverlay} onClick={onClose}>
            <div className={styles.terminalModal} onClick={e => e.stopPropagation()}>
                <div className={styles.terminalHeader}>
                    <div className={styles.terminalHeaderLeft}>
                        <TerminalIcon size={14} />
                        <span className={styles.terminalHeaderTitle}>Terminal: {agent.agentId}</span>
                        <span style={{ opacity: 0.4 }}>—</span>
                        <span style={{ fontSize: '10px' }}>{agent.status}</span>
                    </div>
                    <button className={styles.terminalHeaderClose} onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className={styles.terminalBody}>
                    <div className={styles.terminalOutput} ref={outputRef}>
                        <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                            Welcome to OpenLoft Swarm Terminal v1.0.0
                            <br />
                            Connected to agent instance: {agent.agentId}
                            <br />
                            ---
                        </div>

                        {history.map((entry, idx) => (
                            <div key={idx} className={styles.terminalHistoryItem}>
                                {entry.command && (
                                    <div className={styles.terminalHistoryCommand}>
                                        <span className={styles.terminalPrompt}>&gt;</span>
                                        <span>{entry.command}</span>
                                    </div>
                                )}
                                {entry.response && (
                                    <div className={styles.terminalHistoryResponse}>
                                        {entry.response}
                                    </div>
                                )}
                            </div>
                        ))}

                        {executing && (
                            <div className={styles.terminalLoading}></div>
                        )}
                    </div>

                    <form className={styles.terminalInputLine} onSubmit={handleExecute}>
                        <span className={styles.terminalPrompt}>&gt;</span>
                        <input
                            type="text"
                            className={styles.terminalInput}
                            value={command}
                            onChange={e => setCommand(e.target.value)}
                            placeholder="Type a command..."
                            autoFocus
                            disabled={executing}
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}
