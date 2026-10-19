'use client';

/**
 * Interactive terminal for a hosted agent.
 *
 * Talks to the backend's relay proxy over a socket of its own. The relay
 * events (`terminal:connected`, `terminal:output`, …) are emitted to the
 * specific socket that issued `terminal:open` rather than to an agent room —
 * `backend/src/services/SocketService.ts:159-290` — so a dedicated connection
 * is the correct shape here, not a second consumer of the dashboard's socket.
 *
 * The lifecycle is deliberately scoped to `open`: connect on open, tear down on
 * close. Reusing a long-lived socket would leave a PTY session alive in the
 * container after the modal closed, which the relay's single-session guard
 * would then refuse for the next open.
 *
 * The socket lives in a ref rather than state on purpose. Keying the connect
 * effect on a `socket` state value re-runs it on every render that changes that
 * state, and its cleanup disconnects — which churns one socket per render
 * instead of one per session. Nothing here needs to *render* against the socket.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { AlertCircle, Loader2, RotateCw } from 'lucide-react';
import { createSocket, type Socket } from '@/lib/socket';
import { requestTerminalToken } from '@/lib/socketApi';
import Modal from '@/components/ui/Modal';
import styles from './TerminalModal.module.css';

interface TerminalModalProps {
    agent: { agentId: string; name?: string } | null;
    open: boolean;
    onClose: () => void;
}

type Phase = 'idle' | 'connecting' | 'connected' | 'error';

export default function TerminalModal({ agent, open, onClose }: TerminalModalProps) {
    // String, not the object: the agents page replaces its agent rows on every
    // poll, so depending on `agent` identity would rebuild this session whenever
    // the list refreshed.
    const agentId = agent?.agentId;

    const termRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const [live, setLive] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);

    /**
     * Mint a token and ask the backend to dial the relay.
     *
     * Takes the socket explicitly so it can be called from a handler that
     * closed over the right connection. A fresh token every time:
     * `validateTerminalToken` deletes on read, so reusing the previous one
     * fails as "invalid" rather than as "already used".
     */
    const openRelay = useCallback(async (socket: Socket) => {
        if (!agentId) return;

        setPhase('connecting');
        setError(null);

        try {
            const { token } = await requestTerminalToken(agentId);
            socket.emit('terminal:open', { agentId, token });
        } catch (e) {
            // The 400/503 bodies from the mint endpoint name the real reason
            // ("not running", "session store unavailable"); a bare relay 401
            // would read as a permissions problem.
            const message =
                (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
                (e as Error).message ||
                'Could not open terminal.';
            setError(message);
            setPhase('error');
        }
    }, [agentId]);

    // Build xterm once the host element exists. Keyed on `open` only: tearing it
    // down on any other change would reset the scrollback mid-session.
    useEffect(() => {
        if (!open) return;
        const host = termRef.current;
        if (!host) return;

        const xterm = new XTerm({
            fontFamily: 'var(--font-family-mono)',
            fontSize: 12,
            lineHeight: 1.5,
            cursorBlink: true,
            theme: {
                background: '#0b0d0b',
                foreground: '#e8f0e8',
                cursor: '#F5A0F0',
                selectionBackground: 'rgba(245, 160, 240, 0.3)',
            },
            // Bounded so a runaway command cannot grow it without limit, but
            // deep enough to keep a build log readable.
            scrollback: 5000,
        });

        const fit = new FitAddon();
        xterm.loadAddon(fit);
        xterm.open(host);
        fit.fit();

        xtermRef.current = xterm;

        const onResize = () => fit.fit();
        window.addEventListener('resize', onResize);
        xterm.write('\x1b[38;5;245mConnecting to agent terminal...\x1b[0m\r\n');

        return () => {
            window.removeEventListener('resize', onResize);
            xterm.dispose();
            xtermRef.current = null;
        };
    }, [open, agentId]);

    // Connect, then bridge the relay into xterm.
    useEffect(() => {
        if (!open || !agentId) return;

        const socket = createSocket();
        socketRef.current = socket;
        setLive(true);

        const onConnected = () => {
            setPhase('connected');
            setError(null);
        };

        const onOutput = ({ output }: { output?: string }) => {
            xtermRef.current?.write(output ?? '');
        };

        const onClosed = ({ agentId: closedId }: { agentId?: string }) => {
            // The relay is single-session, so a close means the PTY is gone
            // whether the user asked or not. Report it as disconnected rather
            // than leaving "Connected" on a dead terminal.
            if (closedId && closedId !== agentId) return;
            setPhase('idle');
        };

        // Open as soon as the transport is up. A socket that connects before xterm
        // has mounted still works: the handlers read xterm through its ref.
        const onConnect = () => { void openRelay(socket); };

        // Keystrokes go straight through the relay to the shell's stdin.
        const onData = (data: string) => {
            socket.emit('terminal:input', { agentId, data });
        };

        socket.on('connect', onConnect);
        socket.on('terminal:connected', onConnected);
        socket.on('terminal:output', onOutput);
        socket.on('terminal:closed', onClosed);

        const disposable = xtermRef.current?.onData(onData);

        return () => {
            socket.emit('terminal:close', { agentId });
            disposable?.dispose();
            socket.off('connect', onConnect);
            socket.off('terminal:connected', onConnected);
            socket.off('terminal:output', onOutput);
            socket.off('terminal:closed', onClosed);
            socket.disconnect();
            socketRef.current = null;
            setLive(false);
            setPhase('idle');
        };
    }, [open, agentId, openRelay]);

    const handleClose = () => {
        socketRef.current?.emit('terminal:close', { agentId });
        onClose();
    };

    const handleReconnect = () => {
        const socket = socketRef.current;
        if (socket) void openRelay(socket);
    };

    const statusLabel =
        phase === 'connected' ? 'Connected' : phase === 'connecting' ? 'Connecting…' : 'Disconnected';

    return (
        // `width` and `scrollBody` are not cosmetic. The default modal is 560px
        // and scrolls its own body; a PTY at 560px wraps early, and a terminal
        // nested in a scrolling container gets two scrollbars and mis-sizes on
        // every resize. See Modal's prop docs.
        <Modal open={open} onClose={handleClose} title={`Terminal — ${agent?.name || agentId || ''}`} width={860} scrollBody>
            <div className={styles.wrap}>
                <div className={styles.toolbar}>
                    <span className={`${styles.badge} ${phase === 'connected' ? styles.badgeLive : ''}`}>
                        {statusLabel}
                    </span>
                    <button
                        type="button"
                        className={styles.reconnect}
                        onClick={handleReconnect}
                        disabled={phase === 'connecting' || !live}
                        title={live ? 'Mint a new token and reopen the relay' : 'Waiting for connection'}
                    >
                        <RotateCw size={13} />
                        Reconnect
                    </button>
                </div>

                {error && (
                    <div className={styles.error} role="alert">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}

                {phase !== 'connected' && !error && (
                    <div className={styles.hint}>
                        <Loader2 size={14} className={styles.spin} />
                        {phase === 'connecting' ? 'Opening the relay…' : 'Waiting for the agent stream…'}
                    </div>
                )}

                <div ref={termRef} className={styles.host} />
            </div>
        </Modal>
    );
}
