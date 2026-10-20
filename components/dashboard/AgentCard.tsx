'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Settings, ScrollText, Key, Link, ExternalLink,
    Terminal, Square, Pause, RotateCcw, Play, Trash2, MoreHorizontal,
} from 'lucide-react';
import { IAgent, approveAgentDevice, getAgentCredentials, IAgentCredentials } from '@/lib/api';
import { requestAgentUiProxySession } from '@/lib/socketApi';
import { rewriteBootstrapUrl } from '@/lib/openclawBootstrap';
import { HARNESS_NAMES } from './AgentTypeSelector';
import { useToast } from '@/components/ui/Toast';
import StatusIndicator from '@/components/ui/StatusIndicator';
import Sparkline from '@/components/ui/Sparkline';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import styles from './Dashboard.module.css';


/** Human-readable reason a credentials fetch failed. The backend returns a typed
 *  envelope ({ error, code }); fall back to something generic so a raw network
 *  error or a stack trace never reaches the UI. */
function credentialErrorMessage(err: unknown): string {
    const e = err as { response?: { data?: { error?: string } }; message?: string };
    return e?.response?.data?.error || e?.message || 'Could not load agent credentials';
}

/** Shared across AgentCard, AgentChatPanel and HttpDetailsModal, which
 *  each recomputed the same three constants. */
function agentOrigin() {
    if (typeof window === 'undefined') {
        return { baseDomain: 'agents.openloft.xyz', wsProtocol: 'wss', httpProtocol: 'https' };
    }
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal
        ? { baseDomain: '127.0.0.1.nip.io', wsProtocol: 'ws', httpProtocol: 'http' }
        : { baseDomain: 'agents.openloft.xyz', wsProtocol: 'wss', httpProtocol: 'https' };
}

/** Matches the 900px breakpoint used throughout the dashboard. Returns
 *  false during SSR and on first paint so hydration matches the desktop
 *  markup, then flips once mounted. */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 900px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return isMobile;
}

interface AgentCardProps {
    /** "agentId:action" in flight — this card's own action button goes
        busy (and stops answering) while the transition runs. */
    pendingAction?: string | null;
    agent: IAgent;
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
}

/**
 * Pair this browser with an OpenClaw agent and return the token it issued.
 *
 * OpenClaw's device-pairing flow: connect to its WebSocket, get closed with
 * 1008/1005, POST /api/agents/:id/device/approve, then reconnect — the second
 * handshake returns a token with the `operator` role and the `operator.read`
 * scope that `/control-ui-config.json` requires.
 *
 * Extracted from `pairDevice` below because the Web UI needs the same token and
 * the previous code only ever produced it for the "Pair Device" button, where it
 * was used solely to flip a boolean.
 */
async function pairOpenClawDevice(agentId: string): Promise<string | null> {
    const { wsProtocol } = agentOrigin();
    return new Promise((resolve) => {
        let settled = false;
        const finish = (v: string | null) => {
            if (settled) return;
            settled = true;
            resolve(v);
        };

        const connect = () => {
            const ws = new WebSocket(`${wsProtocol}://${agentId}.${agentOrigin().baseDomain}`);
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(String(event.data));
                    if (msg?.token) {
                        ws.close();
                        finish(msg.token as string);
                    }
                } catch { /* plaintext frame; not the pairing token */ }
            };
            ws.onopen = () => {
                // Already paired from a previous run: the gateway sends the
                // token immediately. Waiting for the close below would hang.
                try { ws.send(JSON.stringify({ type: 'hello', client: 'dashboard' })); } catch { /* ignore */ }
            };
            ws.onclose = async (e) => {
                if (e.code === 1008 || e.code === 1005) {
                    try {
                        await approveAgentDevice(agentId);
                        setTimeout(connect, 1500);
                    } catch { finish(null); }
                } else {
                    finish(null);
                }
            };
            ws.onerror = () => finish(null);
        };

        connect();
    });
}

export default function AgentCard({
    agent, onSettings, onStop,
    onStart, onPause, onResume, onRestart, onDelete,
    onLogs, onCustomKey, onHttpDetails, pendingAction = null,
}: AgentCardProps) {
    const { toast } = useToast();
    const [isPairing, setIsPairing] = useState(false);
    const [isPaired, setIsPaired] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const isMobile = useIsMobile();
    /* Lifecycle double-tap guard mirror: the page owns the single-flight
       rule; the card only paints it. */
    const isPending = (action: string) =>
        pendingAction === `${agent.agentId}:${action}`;

    /* Previously Math.random() on every render, which re-drew the SVG (and
       invalidated layout) on each poll tick. Stable for the card's lifetime. */
    const mockData = useMemo(() => Array.from({ length: 12 }, () => Math.random() * 100), []);

    const status = agent.status as string;
    const isProvisioning = status === 'provisioning';
    const isStarting = status === 'starting';
    const isRunning = status === 'running';
    const isStopped = status === 'stopped';
    const isPaused = status === 'paused';
    const disabled = isProvisioning || isStarting;

     /**
      * Gate the Web UI button on whether the agent has a browser-reachable UI,
      * not on a device-pairing probe.
      *
      * The pairing probe determined "does this gateway accept my WebSocket",
      * which was a property of OpenClaw's device-auth flow and had nothing to do
      * with whether the UI is viewable. OpenClaw never auto-paired, so the card
      * sat on "Propagating..." forever with no way forward.
      *
      * The truth is simpler: every harness we provision serves HTTP on its
      * subdomain, so the button is live whenever the agent is running. Hermes
      * and OpenClaw both pass; OpenCode cannot be framed at all, but it still
      * gets a button that opens a page explaining why.
      */
     useEffect(() => {
         if (isRunning) setIsPaired(true);
     }, [isRunning]);


     /**
      * Open the agent's own Web UI.
      *
      * OpenClaw: the one-time owner-bootstrap URL the backend mints
      * (`webUi.bootstrapUrl`, ~20s warm) is the only path that lands in the
      * chat surface. The pinned OpenClaw build retired
      * `dangerouslyDisableDeviceAuth`, so an unpaired browser that opens the
      * `?token=` URL parks on an "Approve this browser" screen — and the
      * dashboard user cannot approve it (device approval needs
      * `operator.pairing`, which the gateway token alone does not carry).
      * A missing bootstrapUrl is therefore a failure: it surfaces a retry in
      * the tab, never a silent fallback to the approval dead end.
      *
      * The credential is fetched rather than read off `agent` because
      * `gatewayToken` is select:false server-side and stripped from every
      * response — reading it from the agent object would produce
      * `?token=undefined`.
      */
     const openWebUi = async () => {
         const { baseDomain, httpProtocol } = agentOrigin();
         const root = `${httpProtocol}://${agent.agentId}.${baseDomain}`;

         // Open the tab synchronously, inside the click gesture. Opening it after
         // the credentials `await` gets it blocked as a popup in some browsers.
         const tab = window.open('about:blank', '_blank');
         // The mint can take up to a minute (an OpenClaw gateway runs its CLI
         // in-container). Write the placeholder with document.write: setting
         // `body.textContent` on a fresh about:blank can silently no-op, which
         // is how "Preparing a secure session…" turned into a blank white tab.
         const placeholder = (title: string, heading: string, detail: string) => {
             try {
                 if (!tab) return;
                 tab.document.open();
                 tab.document.write(
                     `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
                     '<body style="font-family:sans-serif;padding:2rem;color:#445;line-height:1.6">' +
                     `<h3 style="margin:0 0 .5rem">${heading}</h3><p style="color:#778">${detail}</p>`,
                 );
                 tab.document.close();
             } catch { /* cross-origin or blocked; the tab still navigates below */ }
         };
         placeholder(
             'Opening agent…',
             'Preparing a secure session…',
             'If the agent was just started, the first session can take up to a minute.',
         );

         try {
             const creds = await getAgentCredentials(agent.agentId, { bootstrap: true });
             let url: string;
             if (creds.dashboard) {
                 // Hermes: basic-auth login page. The password is the gateway token.
                 url = `${root}${creds.dashboard.loginPath}`;
                 try { await navigator.clipboard.writeText(creds.dashboard.password); } catch { /* ignore */ }
                 toast(`Hermes login: ${creds.dashboard.username} — password copied to clipboard`, 'success');
             } else if (creds.webUi?.auth === 'basic') {
                 // OpenCode serves its web UI — and everything else — behind
                 // HTTP Basic, and the password is a derived token nobody can
                 // type. The pre-proxy flow landed the tab on the agent's
                 // origin, where Chrome showed a bare "HTTP ERROR 401": the
                 // basic-auth prompt asks for a credential the user does not
                 // know. The tab now lands on the backend's proxied surface
                 // instead, which injects the credentials itself.
                 try {
                     const proxied = await requestAgentUiProxySession(agent.agentId);
                     url = proxied.url;
                 } catch {
                     throw new Error(
                         'Could not mint the proxied UI session — the agent may still be starting. Try again shortly.',
                     );
                 }
             } else if (creds.webUi?.auth === 'query') {
                 if (creds.webUi.bootstrapUrl) {
                     url = rewriteBootstrapUrl(creds.webUi.bootstrapUrl, root);
                 } else if (agent.agentType === 'openclaw') {
                     // No token fallback here: see the doc comment above.
                     throw new Error('The one-time session link could not be prepared — the agent gateway did not answer in time.');
                 } else {
                     url = `${root}/?token=${encodeURIComponent(creds.webUi.token)}`;
                 }
             } else {
                 url = root;
             }
             if (tab) {
                 tab.opener = null;
                 tab.location.href = url;
             } else {
                 window.open(url, '_blank', 'noopener,noreferrer');
             }
         } catch (err) {
             // Keep the tab and explain in it. Closing the tab on failure is
             // what made a failed mint look like "nothing happened", and left
             // no clue that a just-started agent needs a minute before its
             // first session can be minted.
             const msg = credentialErrorMessage(err);
             placeholder(
                 'Could not open agent',
                 'Could not open the agent session.',
                 `${msg} If the agent was just created, wait until it finishes starting (a couple of minutes for OpenClaw) and try again.`,
             );
             toast(msg, 'error');
         }
     };

     const pairDevice = async () => {
         setIsPairing(true);
         const { baseDomain, wsProtocol } = agentOrigin();

         let wsUrl: string;
         try {
             const creds = await getAgentCredentials(agent.agentId);
             wsUrl = `${wsProtocol}://${agent.agentId}.${baseDomain}?token=${creds.api.auth === 'bearer' ? creds.api.token : creds.api.password}`;
         } catch (err) {
             toast(credentialErrorMessage(err), 'error');
             setIsPairing(false);
             return;
         }

         const ws = new WebSocket(wsUrl);
         ws.onopen = () => {
             ws.close();
             setIsPaired(true);
             setIsPairing(false);
         };
         ws.onclose = async (e) => {
             if (e.code === 1008 || e.code === 1005) {
                 try {
                     await approveAgentDevice(agent.agentId);
                     setTimeout(() => {
                         const r = new WebSocket(wsUrl);
                         r.onopen = () => { r.close(); setIsPaired(true); setIsPairing(false); };
                         r.onclose = () => setIsPairing(false);
                         r.onerror = () => setIsPairing(false);
                     }, 2000);
                 } catch {
                     setIsPairing(false);
                 }
             } else {
                 setIsPairing(false);
             }
         };
         ws.onerror = () => setIsPairing(false);
     };

    /* Contextual lifecycle actions, built once so the inline row and the
       mobile overflow sheet cannot diverge. */
    const lifecycle = useMemo(() => {
        const items: {
            key: string;
            label: string;
            icon: React.ReactNode;
            onClick?: () => void;
            disabled?: boolean;
            className?: string;
        }[] = [];

        if (isRunning) {
            items.push(
                {
                    key: 'webui',
                    label: isPaired ? 'WebUI' : 'Propagating...',
                    icon: <ExternalLink size={12} />,
                    // Embedded, not a popup. `window.open` put the agent's UI in
                    // a detached tab, which reads as "nothing happened" from the
                    // dashboard and loses the token on any subsequent
                    // navigation. The chat panel is the same UI in an iframe
                    // with its own reload control, and it is where the user
                    // already goes to talk to the agent.
                    onClick: openWebUi,
                    disabled: !isPaired,
                },
                {
                    key: 'http',
                    label: 'HTTP API',
                    icon: <Terminal size={12} />,
                    onClick: () => onHttpDetails?.(agent),
                    disabled,
                },
                {
                    key: 'pair',
                    label: isPaired ? 'Paired' : isPairing ? 'Pairing...' : 'Pair Device',
                    icon: <Link size={12} />,
                    onClick: pairDevice,
                    disabled: isPaired || isPairing,
                    className: isPaired ? styles.pairedButton : '',
                },
                { key: 'stop', label: 'Stop', icon: <Square size={12} />, onClick: () => onStop(agent), disabled: isPending('stop') },
            );
            if (onPause) items.push({ key: 'pause', label: 'Pause', icon: <Pause size={12} />, onClick: () => onPause(agent), disabled: isPending('pause') });
            if (onRestart) items.push({ key: 'restart', label: 'Restart', icon: <RotateCcw size={12} />, onClick: () => onRestart(agent), disabled: isPending('restart') });
        }

        if (isStopped && onStart) {
            items.push({ key: 'start', label: 'Start', icon: <Play size={12} />, onClick: () => onStart(agent), disabled: isPending('start') });
        }
        if (isPaused && onResume) {
            items.push({ key: 'resume', label: 'Resume', icon: <Play size={12} />, onClick: () => onResume(agent), disabled: isPending('resume') });
        }
        if (!isProvisioning && onDelete) {
            items.push({
                key: 'delete',
                label: 'Delete',
                icon: <Trash2 size={12} />,
                onClick: () => onDelete(agent),
                className: styles.dangerButton,
            });
        }

        return items;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning, isStopped, isPaused, isProvisioning, isPaired, isPairing, disabled, agent]);

    const renderLifecycleButton = (item: (typeof lifecycle)[number]) => (
        <Button
            key={item.key}
            type="button"
            variant="ghost"
            size="sm"
            icon={item.icon}
            className={item.className}
            disabled={item.disabled}
            onClick={() => {
                item.onClick?.();
                setMoreOpen(false);
            }}
        >
            {item.label}
        </Button>
    );

    return (
        <div
            className={[
                styles.agentCard,
                isProvisioning ? styles.agentCardProvisioning : '',
                isStarting ? styles.agentCardStarting : '',
            ].filter(Boolean).join(' ')}
        >
            <div className={styles.agentCardHeader}>
                <span className={styles.agentName}>
                    {agent.name ? `${agent.name} (${agent.agentId})` : agent.agentId}
                </span>
                <StatusIndicator status={status as never} />
            </div>

            {isProvisioning && (
                <div className={styles.provisioningBanner}>
                    <span className={styles.provisioningSpinner} />
                    <span>Provisioning… Please wait</span>
                </div>
            )}
            {isStarting && (
                <div className={styles.provisioningBanner}>
                    <span className={styles.provisioningSpinner} />
                    <span>Starting up… Please wait</span>
                </div>
            )}

            <div className={styles.agentMeta}>
                <span
                    className={styles.agentMetaItem}
                    style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: agent.agentType === 'hermes' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(39, 121, 255, 0.15)',
                        color: agent.agentType === 'hermes' ? '#a855f7' : 'var(--accent-blue)',
                    }}
                >
                    {HARNESS_NAMES[agent.agentType] ?? agent.agentType}
                </span>
                <span className={styles.agentMetaItem}>LLM: {agent.llmProvider}</span>
                <span className={styles.agentMetaItem}>
                    <Sparkline data={mockData} />
                </span>
                <span className={styles.agentSkillCount}>
                    {agent.activeSkills?.length ?? 0} Skills
                </span>
            </div>

            {/* Core actions — always visible. The Chat, Workspace, Drive,
                Terminal and Channels entries came off the card until those
                surfaces are reworked; their panels and modals stay in
                components/dashboard, unwired. */}
            <div className={styles.agentActions}>
                <Button type="button" variant="ghost" size="sm" icon={<Settings size={12} />} onClick={() => onSettings(agent)} disabled={disabled}>
                    Config
                </Button>
                {onLogs && (
                    <Button type="button" variant="ghost" size="sm" icon={<ScrollText size={12} />} onClick={() => onLogs(agent)} disabled={disabled}>
                        Logs
                    </Button>
                )}
                {onCustomKey && (
                    <Button type="button" variant="ghost" size="sm" icon={<Key size={12} />} onClick={() => onCustomKey(agent)} disabled={disabled}>
                        Keys
                    </Button>
                )}
            </div>

            {/* Lifecycle actions: inline on desktop, an overflow sheet on
                mobile — up to eight buttons in one row is unusable there. */}
            {lifecycle.length > 0 && !isMobile && (
                <div className={styles.agentActions}>{lifecycle.map(renderLifecycleButton)}</div>
            )}

            {lifecycle.length > 0 && isMobile && (
                <>
                    <div className={styles.agentActions}>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={<MoreHorizontal size={12} />}
                            aria-haspopup="dialog"
                            aria-expanded={moreOpen}
                            onClick={() => setMoreOpen(true)}
                        >
                            More ({lifecycle.length})
                        </Button>
                    </div>

                    <Modal
                        open={moreOpen}
                        onClose={() => setMoreOpen(false)}
                        title={`${agent.name || agent.agentId} — actions`}
                    >
                        <div className={styles.lifecycleSheet}>
                            {lifecycle.map(renderLifecycleButton)}
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
}
