'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    FolderOpen, HardDrive, Settings, ScrollText, Key, Link, ExternalLink,
    Terminal, Square, Pause, RotateCcw, Play, Trash2, MoreHorizontal,
    MessageSquare,
} from 'lucide-react';
import { IAgent, approveAgentDevice } from '@/lib/api';
import StatusIndicator from '@/components/ui/StatusIndicator';
import Sparkline from '@/components/ui/Sparkline';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import styles from './Dashboard.module.css';

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
    agent: IAgent;
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

export default function AgentCard({
    agent, onChat, onMemory, onDrive, onSettings, onStop,
    onStart, onPause, onResume, onRestart, onDelete,
    onLogs, onCustomKey, onChannels, onHttpDetails,
}: AgentCardProps) {
    const [isPairing, setIsPairing] = useState(false);
    const [isPaired, setIsPaired] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const isMobile = useIsMobile();

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

    // Hermes marks as paired immediately; no WebSocket probe needed.
    useEffect(() => {
        if (agent.agentType === 'hermes' && isRunning) {
            setIsPaired(true);
        }
    }, [agent.agentType, isRunning]);

    const openWebUi = () => {
        const { baseDomain, httpProtocol } = agentOrigin();
        const url = agent.agentType === 'hermes'
            ? `${httpProtocol}://${agent.agentId}.${baseDomain}/login`
            : `${httpProtocol}://${agent.agentId}.${baseDomain}?token=${agent.gatewayToken}`;

        /* noopener: without it the opened page gets a handle on this one. */
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const pairDevice = () => {
        setIsPairing(true);
        const { baseDomain, wsProtocol } = agentOrigin();
        const wsUrl = `${wsProtocol}://${agent.agentId}.${baseDomain}?token=${agent.gatewayToken}`;

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
                { key: 'stop', label: 'Stop', icon: <Square size={12} />, onClick: () => onStop(agent) },
            );
            if (onPause) items.push({ key: 'pause', label: 'Pause', icon: <Pause size={12} />, onClick: () => onPause(agent) });
            if (onRestart) items.push({ key: 'restart', label: 'Restart', icon: <RotateCcw size={12} />, onClick: () => onRestart(agent) });
        }

        if (isStopped && onStart) {
            items.push({ key: 'start', label: 'Start', icon: <Play size={12} />, onClick: () => onStart(agent) });
        }
        if (isPaused && onResume) {
            items.push({ key: 'resume', label: 'Resume', icon: <Play size={12} />, onClick: () => onResume(agent) });
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
                    {agent.agentType === 'hermes' ? 'Hermes' : 'OpenClaw'}
                </span>
                <span className={styles.agentMetaItem}>LLM: {agent.llmProvider}</span>
                <span className={styles.agentMetaItem}>
                    <Sparkline data={mockData} />
                </span>
                <span className={styles.agentSkillCount}>
                    {agent.activeSkills?.length ?? 0} Skills
                </span>
            </div>

            {/* Core actions — always visible */}
            <div className={styles.agentActions}>
                {/* This button was commented out, which left `onChat` a
                    required-but-uncalled prop and rendered AgentChatPanel +
                    UsageMetrics unreachable. */}
                <Button type="button" variant="ghost" size="sm" icon={<MessageSquare size={12} />} onClick={() => onChat(agent)} disabled={disabled}>
                    Chat
                </Button>
                <Button type="button" variant="ghost" size="sm" icon={<FolderOpen size={12} />} onClick={() => onMemory(agent)} disabled={disabled}>
                    Workspace
                </Button>
                <Button type="button" variant="ghost" size="sm" icon={<HardDrive size={12} />} onClick={() => onDrive(agent)} disabled={disabled}>
                    Drive
                </Button>
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
                {onChannels && (
                    <Button type="button" variant="ghost" size="sm" icon={<Link size={12} />} onClick={() => onChannels(agent)} disabled={disabled}>
                        Channels
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
