'use client';
import { useState } from 'react';

import styles from './Dashboard.module.css';
import { IAgent, approveAgentDevice } from '@/lib/api';
import StatusIndicator from '@/components/ui/StatusIndicator';
import Sparkline from '@/components/ui/Sparkline';
import Button from '@/components/ui/Button';
import { MessageSquare, FolderOpen, HardDrive, Settings, Square, ExternalLink, Play, Pause, RotateCcw, Trash2, ScrollText, Key, Link, Terminal } from 'lucide-react';
import { useEffect, useCallback, useRef } from 'react';

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

export default function AgentCard({ agent, onChat, onMemory, onDrive, onSettings, onStop, onStart, onPause, onResume, onRestart, onDelete, onLogs, onCustomKey, onChannels, onHttpDetails }: AgentCardProps) {
    const [isPairing, setIsPairing] = useState(false);
    const [isPaired, setIsPaired] = useState(false);
    
    const pairingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const mockData = Array.from({ length: 12 }, () => Math.random() * 100);
    const isProvisioning = agent.status === 'provisioning';
    const isStarting = agent.status === 'starting';
    const isRunning = agent.status === 'running';
    const isStopped = agent.status === 'stopped';
    const isPaused = (agent.status as string) === 'paused';
    const disabled = isProvisioning || isStarting;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isRunning && !isPaired) {
            const checkAndPair = async () => {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const baseDomain = isLocal ? '127.0.0.1.nip.io' : 'agents.openloft.xyz';
                const protocol = isLocal ? 'ws' : 'wss';
                const wsUrl = `${protocol}://${agent.agentId}.${baseDomain}?token=${agent.gatewayToken}`;

                // Try to connect to see if already paired
                const ws = new WebSocket(wsUrl);
                ws.onopen = () => {
                    ws.close();
                    setIsPaired(true);
                };
                ws.onclose = async (e) => {
                    // If not paired, request approval
                    if (e.code === 1008 || e.code === 1005) {
                        try {
                            await approveAgentDevice(agent.agentId);
                        } catch (err) {
                            // Silent fail on background approval
                        }
                    }
                };
            };

            checkAndPair();
            interval = setInterval(checkAndPair, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, isPaired, agent.agentId, agent.gatewayToken]);

    return (
        <div className={`${styles.agentCard} ${isProvisioning ? styles.agentCardProvisioning : ''} ${isStarting ? styles.agentCardStarting : ''}`}>
            <div className={styles.agentCardHeader}>
                <span className={styles.agentName}>
                    {agent.name ? `${agent.name} (${agent.agentId})` : agent.agentId}
                </span>
                <StatusIndicator status={agent.status} />
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
                <span className={styles.agentMetaItem}>
                    LLM: {agent.llmProvider}
                </span>
                <span className={styles.agentMetaItem}>
                    <Sparkline data={mockData} />
                </span>
                <span className={styles.agentSkillCount}>
                    {agent.activeSkills.length} Skills
                </span>
            </div>

            {/* Core actions — always visible but disabled during provisioning */}
            <div className={styles.agentActions}>
                {/* <Button variant="ghost" size="sm" icon={<MessageSquare size={12} />} onClick={() => onChat(agent)} disabled={disabled}>
                    Chat
                </Button> */}
                <Button variant="ghost" size="sm" icon={<FolderOpen size={12} />} onClick={() => onMemory(agent)} disabled={disabled}>
                    Workspace
                </Button>
                <Button variant="ghost" size="sm" icon={<HardDrive size={12} />} onClick={() => onDrive(agent)} disabled={disabled}>
                    Drive
                </Button>
                <Button variant="ghost" size="sm" icon={<Settings size={12} />} onClick={() => onSettings(agent)} disabled={disabled}>
                    Config
                </Button>
                {onLogs && (
                    <Button variant="ghost" size="sm" icon={<ScrollText size={12} />} onClick={() => onLogs(agent)} disabled={disabled}>
                        Logs
                    </Button>
                )}
                {onCustomKey && (
                    <Button variant="ghost" size="sm" icon={<Key size={12} />} onClick={() => onCustomKey(agent)} disabled={disabled}>
                        Keys
                    </Button>
                )}
                {onChannels && (
                    <Button variant="ghost" size="sm" icon={<Link size={12} />} onClick={() => onChannels(agent)} disabled={disabled}>
                        Channels
                    </Button>
                )}
            </div>

            {/* Lifecycle actions — contextual based on status */}
            <div className={styles.agentActions}>
                {isRunning && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<ExternalLink size={12} />}
                            disabled={!isPaired}
                            onClick={async () => {
                                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                const baseDomain = isLocal ? '127.0.0.1.nip.io' : 'agents.openloft.xyz';
                                const protocol = isLocal ? 'http' : 'https';
                                const webUiUrl = `${protocol}://${agent.agentId}.${baseDomain}?token=${agent.gatewayToken}`;

                                window.open(webUiUrl, '_blank');
                            }}
                        >
                            {isPaired ? 'WebUI' : 'Propagating...'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<Terminal size={12} />}
                            onClick={() => onHttpDetails?.(agent)}
                            disabled={disabled}
                        >
                            HTTP API
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<Link size={12} />}
                            disabled={isPaired || isPairing}
                            className={isPaired ? styles.pairedButton : ''}
                            onClick={async () => {
                                setIsPairing(true);
                                
                                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                const baseDomain = isLocal ? '127.0.0.1.nip.io' : 'agents.openloft.xyz';
                                const protocol = isLocal ? 'ws' : 'wss';
                                const wsUrl = `${protocol}://${agent.agentId}.${baseDomain}?token=${agent.gatewayToken}`;

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
                                        } catch (err) { setIsPairing(false); }
                                    } else { setIsPairing(false); }
                                };
                                ws.onerror = () => setIsPairing(false);
                            }}
                        >
                            {isPaired ? 'Paired' : isPairing ? 'Pairing...' : 'Pair Device'}
                        </Button>
                        <Button variant="ghost" size="sm" icon={<Square size={12} />} onClick={() => onStop(agent)}>
                            Stop
                        </Button>
                        {onPause && (
                            <Button variant="ghost" size="sm" icon={<Pause size={12} />} onClick={() => onPause(agent)}>
                                Pause
                            </Button>
                        )}
                        {onRestart && (
                            <Button variant="ghost" size="sm" icon={<RotateCcw size={12} />} onClick={() => onRestart(agent)}>
                                Restart
                            </Button>
                        )}
                    </>
                )}

                {isStopped && onStart && (
                    <Button variant="ghost" size="sm" icon={<Play size={12} />} onClick={() => onStart(agent)}>
                        Start
                    </Button>
                )}

                {isPaused && onResume && (
                    <Button variant="ghost" size="sm" icon={<Play size={12} />} onClick={() => onResume(agent)}>
                        Resume
                    </Button>
                )}

                {!isProvisioning && onDelete && (
                    <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => onDelete(agent)} className={styles.dangerButton}>
                        Delete
                    </Button>
                )}
            </div>
        </div>
    );
}
