'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Terminal as TerminalIcon } from 'lucide-react';
import { IAgent, requestTerminalToken } from '@/lib/api';
import { isCommandBlocked } from '@/lib/terminalBlacklist';
import styles from './Dashboard.module.css';

interface TerminalModalProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

type ConnectionState = 'idle' | 'authenticating' | 'connecting' | 'connected' | 'error';

export default function TerminalModal({ agent, open, onClose }: TerminalModalProps) {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<string[]>([]);
    const [connState, setConnState] = useState<ConnectionState>('idle');
    const wsRef = useRef<WebSocket | null>(null);
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

        let ws: WebSocket | null = null;

        const connect = async () => {
            setConnState('authenticating');
            setOutput([
                `Welcome to OpenLoft Terminal v2.0.0`,
                `Agent: ${agent.agentId}`,
                `---`,
                `Authenticating...`
            ]);

            try {
                const { token } = await requestTerminalToken(agent.agentId);
                
                setConnState('connecting');
                appendOutput('Token acquired. Connecting to container...');

                const baseDomain = 'agents.openloft.xyz';
                const wsUrl = `wss://${agent.agentId}.${baseDomain}/terminal?token=${token}`;
                
                ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    setConnState('connected');
                    appendOutput('Connected! Shell ready.\n');
                    inputRef.current?.focus();
                };

                ws.onmessage = (event) => {
                    appendOutput(event.data);
                };

                ws.onclose = (event) => {
                    setConnState('idle');
                    if (event.code !== 1000) {
                        appendOutput(`\nConnection closed (code: ${event.code})`);
                    } else {
                        appendOutput('\nSession ended.');
                    }
                };

                ws.onerror = () => {
                    setConnState('error');
                    appendOutput('\nWebSocket error. Check container status.');
                };

            } catch (err: any) {
                setConnState('error');
                appendOutput(`\nAuth failed: ${err.response?.data?.error || err.message}`);
            }
        };

        connect();

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close(1000);
            }
            wsRef.current = null;
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

        // Send the command + newline to the shell's stdin
        wsRef.current?.send(input + '\n');
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow Ctrl+C to send SIGINT
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            wsRef.current?.send('\x03');
        }
    };

    const statusLabel = {
        idle: 'Disconnected',
        authenticating: 'Authenticating...',
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
