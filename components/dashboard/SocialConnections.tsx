'use client';

import { useState, useEffect } from 'react';
import {
    IAgent,
    getAgentChannels,
    approveAgentChannel,
    saveAgentChannels,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';
import soc from './SocialConnections.module.css';
import { MessageCircle, MessagesSquare, Send, Slack as SlackIcon } from 'lucide-react';

interface SocialConnectionsProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

/* Icons replace the emoji set: the emoji never carried meaning beyond the
   name next to it and read as decoration rather than UI. */
interface ChannelState {
    discord: { token: string };
    telegram: { token: string };
    slack: { appToken: string; botToken: string };
    whatsapp: { enabled: boolean };
}

const emptyChannels: ChannelState = {
    discord: { token: '' },
    telegram: { token: '' },
    slack: { appToken: '', botToken: '' },
    whatsapp: { enabled: false },
};

export default function SocialConnections({ agent, open, onClose }: SocialConnectionsProps) {
    const { toast } = useToast();
    const [channels, setChannels] = useState<ChannelState>(emptyChannels);
    const [saving, setSaving] = useState(false);
    const [pairingCodes, setPairingCodes] = useState<Record<string, string>>({});
    const [pairing, setPairing] = useState<Record<string, boolean>>({});
    const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>({});
    /* What the user touched this session. The GET only reports which
       channels are enabled — never the stored tokens (they are secrets) —
       so a Save that posts the whole shape would have written empty
       strings over every configured channel. Only changed channels go
       out; the server keeps what it has for the rest. */
    const [dirty, setDirty] = useState<Set<string>>(new Set());

    const markDirty = (key: string) =>
        setDirty((prev) => {
            if (prev.has(key)) return prev;
            const next = new Set(prev);
            next.add(key);
            return next;
        });

    useEffect(() => {
        if (open && agent) {
            // A re-open must not keep the last agent's typed secrets around.
            setChannels(emptyChannels);
            setDirty(new Set());
            setPairingCodes({});
            getAgentChannels(agent.agentId)
                .then(({ channels }) => {
                    setActiveChannels({
                        discord: !!channels.discord?.enabled,
                        telegram: !!channels.telegram?.enabled,
                        slack: !!channels.slack?.enabled,
                        whatsapp: !!channels.whatsapp?.enabled,
                    });
                })
                .catch(() => {});
        }
    }, [open, agent]);

    const handlePair = async (channel: string) => {
        if (!agent || !pairingCodes[channel]) return;
        setPairing(prev => ({ ...prev, [channel]: true }));
        try {
            const data = await approveAgentChannel(agent.agentId, channel, pairingCodes[channel]);
            toast(data.message || 'Successfully paired!', 'success');
            setPairingCodes(prev => ({ ...prev, [channel]: '' }));
            // Optionally re-fetch active channels or just assume it's good
        } catch (err) {
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast(message || 'Failed to pair channel', 'error');
        } finally {
            setPairing(prev => ({ ...prev, [channel]: false }));
        }
    };

    const handleSave = async () => {
        if (!agent) return;
        if (dirty.size === 0) {
            toast('Change a channel configuration first', 'info');
            return;
        }
        setSaving(true);
        try {
            /* Only the touched channels leave the client. An untouched
               channel keeps its in-memory empty fields here — that empty is
               "I did not type anything", not "delete my token". */
            const payload = Object.fromEntries(
                [...dirty].map((key) => [key, channels[key as keyof ChannelState]]),
            );
            await saveAgentChannels(agent.agentId, payload);
            toast('Channels saved — agent restarting', 'success');
            onClose();
        } catch {
            toast('Failed to save channels', 'error');
        } finally {
            setSaving(false);
        }
    };

    const channelCards = [
        {
            key: 'discord',
            label: 'Discord',
            icon: <MessagesSquare size={16} aria-hidden />,
            active: activeChannels.discord,
            fields: (
                <>
                    <div className={soc.stepLabel}>
                        Step 1: Configure & Save
                    </div>
                    <Input
                        label="Bot Token"
                        type="password"
                        placeholder="Your Discord bot token"
                        value={channels.discord.token}
                        onChange={(e) => { setChannels(c => ({ ...c, discord: { token: e.target.value } })); markDirty('discord'); }}
                    />
                    
                    <div className={soc.stepDivider}>
                        <div className={soc.stepLabel}>
                            Step 2: Pair (Talk to bot first)
                        </div>
                        <div className={soc.pairRow}>
                            <div className={soc.pairInput}>
                                <Input
                                    label="Pairing Code"
                                    placeholder="Enter code from bot"
                                    value={pairingCodes.discord || ''}
                                    onChange={(e) => setPairingCodes(prev => ({ ...prev, discord: e.target.value }))}
                                />
                            </div>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => handlePair('discord')}
                                loading={pairing.discord}
                                disabled={!pairingCodes.discord || !activeChannels.discord}
                            >
                                Pair
                            </Button>
                        </div>
                        {!activeChannels.discord && (
                            <div className={soc.pairHint}>
                                Save configuration first to enable pairing
                            </div>
                        )}
                    </div>
                </>
            ),
        },
        {
            key: 'telegram',
            label: 'Telegram',
            icon: <Send size={16} aria-hidden />,
            active: activeChannels.telegram,
            fields: (
                <>
                    <div className={soc.stepLabel}>
                        Step 1: Configure & Save
                    </div>
                    <Input
                        label="Bot Token (from BotFather)"
                        type="password"
                        placeholder="123456:ABC-DEF..."
                        value={channels.telegram.token}
                        onChange={(e) => { setChannels(c => ({ ...c, telegram: { token: e.target.value } })); markDirty('telegram'); }}
                    />
                    
                    <div className={soc.stepDivider}>
                        <div className={soc.stepLabel}>
                            Step 2: Pair (Talk to bot first)
                        </div>
                        <div className={soc.pairRow}>
                            <div className={soc.pairInput}>
                                <Input
                                    label="Pairing Code"
                                    placeholder="/start NX7..."
                                    value={pairingCodes.telegram || ''}
                                    onChange={(e) => setPairingCodes(prev => ({ ...prev, telegram: e.target.value }))}
                                />
                            </div>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => handlePair('telegram')}
                                loading={pairing.telegram}
                                disabled={!pairingCodes.telegram || !activeChannels.telegram}
                            >
                                Pair
                            </Button>
                        </div>
                        {!activeChannels.telegram && (
                            <div className={soc.pairHint}>
                                Save configuration first to enable pairing
                            </div>
                        )}
                    </div>
                </>
            ),
        },
        {
            key: 'slack',
            label: 'Slack',
            icon: <SlackIcon size={16} aria-hidden />,
            active: activeChannels.slack,
            fields: (
                <>
                    <Input
                        label="App Token (xapp-...)"
                        type="password"
                        placeholder="xapp-1-..."
                        value={channels.slack.appToken}
                        onChange={(e) => { setChannels(c => ({ ...c, slack: { ...c.slack, appToken: e.target.value } })); markDirty('slack'); }}
                    />
                    <Input
                        label="Bot Token (xoxb-...)"
                        type="password"
                        placeholder="xoxb-..."
                        value={channels.slack.botToken}
                        onChange={(e) => { setChannels(c => ({ ...c, slack: { ...c.slack, botToken: e.target.value } })); markDirty('slack'); }}
                    />
                </>
            ),
        },
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            icon: <MessageCircle size={16} aria-hidden />,
            active: activeChannels.whatsapp,
            fields: (
                <div className={soc.whatsappNote}>
                    WhatsApp uses QR-based pairing. Enable here and scan the QR code from the agent&apos;s container logs.
                    <div className={soc.checkboxRow}>
                        <label className={soc.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={channels.whatsapp.enabled}
                                onChange={(e) => { setChannels(c => ({ ...c, whatsapp: { enabled: e.target.checked } })); markDirty('whatsapp'); }}
                            />
                            <span className={soc.checkboxText}>
                                Enable WhatsApp
                            </span>
                        </label>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <Modal open={open} onClose={onClose} title="Social Connections">
            <div className={styles.wizardSteps}>
                {channelCards.map(({ key, label, icon, active, fields }) => (
                    <div key={key} className={soc.channelCard}>
                        <div className={soc.channelHead}>
                            <span className={soc.channelName}>
                                {icon} {label}
                            </span>
                            {active && (
                                <span className={soc.connectedPill}>
                                    Connected
                                </span>
                            )}
                        </div>
                        {fields}
                    </div>
                ))}

                <div className={styles.wizardActionsEnd}>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} loading={saving}>
                        Save & Restart
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
