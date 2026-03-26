'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Terminal as TerminalIcon } from 'lucide-react';
import { IAgent } from '@/lib/api';
import { isCommandBlocked } from '@/lib/terminalBlacklist';
import { io, Socket } from 'socket.io-client';
import styles from './Dashboard.module.css';

interface TerminalModalProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export default function TerminalModal({ agent, open, onClose }: TerminalModalProps) {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<string[]>([]);
    const [connState, setConnState] = useState<ConnectionState>('idle');
    const socketRef = useRef<Socket | null>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    // Trim output buffer to prevent memory bloat
    const appendOutput = useCallback((text: string) => {
        setOutput(prev => {
            const next = [...prev, text];
            return next.length > 500 ? next.slice(-500) : next;
        });
    }, []);

    // Connect on open
    useEffect(() => {
        if (!open || !agent) return;

        setConnState('connecting');
        setOutput([
            `Welcome to OpenLoft Terminal v2.0.0`,
            `Agent: ${agent.agentId}`,
            `---`,
            `Connecting via secure relay...`
        ]);

        const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            appendOutput('Socket connected. Opening terminal session...');
            socket.emit('terminal:open', { agentId: agent.agentId });
        });

        socket.on('terminal:connected', ({ agentId }) => {
            if (agentId === agent.agentId) {
                setConnState('connected');
                appendOutput('Shell ready!\n');
                inputRef.current?.focus();
            }
        });

        socket.on('terminal:output', ({ agentId, output: text }) => {
            if (agentId === agent.agentId) {
                appendOutput(text);
            }
        });

        socket.on('terminal:closed', ({ agentId }) => {
            if (agentId === agent.agentId) {
                setConnState('idle');
                appendOutput('\nSession ended.');
            }
        });

        socket.on('connect_error', (err) => {
            setConnState('error');
            appendOutput(`\nSocket.IO connection error: ${err.message}`);
        });

        return () => {
            socket.emit('terminal:close', { agentId: agent.agentId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [open, agent, appendOutput]);

    if (!open || !agent) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || connState !== 'connected') return;

        // Frontend command blacklist
        if (isCommandBlocked(input)) {
            appendOutput(`> ${input}`);
            appendOutput(`\x1b[31mBlocked: '${input.split(/\s+/)[0]}' is restricted for security.\x1b[0m`);
            setInput('');
            return;
        }

        // Send the command + newline through Socket.IO
        socketRef.current?.emit('terminal:input', { agentId: agent.agentId, data: input + '\n' });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow Ctrl+C to send SIGINT
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            socketRef.current?.emit('terminal:input', { agentId: agent.agentId, data: '\x03' });
        }
    };

    const statusLabel = {
        idle: 'Disconnected',
        connecting: 'Connecting...',
        connected: 'Live',
        error: 'Error',
    }[connState];

    return (
        <div className={styles.terminalOverlay} onClick={onClose}>
            <div className={styles.terminalModal} onClick={e => e.stopPropagation()}>
                <div className={styles.terminalHeader}>
                    <div className={styles.terminalHeaderLeft}>
                        <TerminalIcon size={14} />
                        <span className={styles.terminalHeaderTitle}>Terminal: {agent.agentId}</span>
                        <span style={{ opacity: 0.4 }}>—</span>
                        <span style={{
                            fontSize: '10px',
                            color: connState === 'connected' ? '#2EA82E' : connState === 'error' ? '#F47A4A' : 'inherit'
                        }}>
                            {statusLabel}
                        </span>
                    </div>
                    <button className={styles.terminalHeaderClose} onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className={styles.terminalBody}>
                    <div className={styles.terminalOutput} ref={outputRef}>
                        {output.map((line, idx) => (
                            <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {line}
                            </div>
                        ))}
                    </div>

                    <form className={styles.terminalInputLine} onSubmit={handleSubmit}>
                        <span className={styles.terminalPrompt}>&gt;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.terminalInput}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={connState === 'connected' ? 'Type a command...' : 'Waiting for connection...'}
                            autoFocus
                            disabled={connState !== 'connected'}
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}
