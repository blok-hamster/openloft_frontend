'use client';

import { useState, useEffect } from 'react';
import { IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';
import axios from 'axios';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SocialConnectionsProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

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

    useEffect(() => {
        if (open && agent) {
            const token = typeof window !== 'undefined' ? localStorage.getItem('loft_token') : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            axios.get(`${apiBase}/agents/${agent.agentId}/channels`, { headers })
                .then(({ data }: { data: { channels: Record<string, { enabled?: boolean }> } }) => {
                    const ch = data.channels || {};
                    setActiveChannels({
                        discord: !!ch.discord?.enabled,
                        telegram: !!ch.telegram?.enabled,
                        slack: !!ch.slack?.enabled,
                        whatsapp: !!ch.whatsapp?.enabled,
                    });
                })
                .catch(() => {});
        }
    }, [open, agent]);

    const handlePair = async (channel: string) => {
        if (!agent || !pairingCodes[channel]) return;
        setPairing(prev => ({ ...prev, [channel]: true }));
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('loft_token') : null;
            const response = await axios.post(`${apiBase}/agents/${agent.agentId}/channels/approve`, {
                channel,
                code: pairingCodes[channel]
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            toast(response.data.message || 'Successfully paired!', 'success');
            setPairingCodes(prev => ({ ...prev, [channel]: '' }));
            // Optionally re-fetch active channels or just assume it's good
        } catch (err: any) {
            toast(err.response?.data?.error || 'Failed to pair channel', 'error');
        } finally {
            setPairing(prev => ({ ...prev, [channel]: false }));
        }
    };

    const handleSave = async () => {
        if (!agent) return;
        setSaving(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('loft_token') : null;
            await axios.post(`${apiBase}/agents/${agent.agentId}/channels`, { channels }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
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
            icon: '🎮',
            active: activeChannels.discord,
            fields: (
                <>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                        Step 1: Configure & Save
                    </div>
                    <Input
                        label="Bot Token"
                        type="password"
                        placeholder="Your Discord bot token"
                        value={channels.discord.token}
                        onChange={(e) => setChannels(c => ({ ...c, discord: { token: e.target.value } }))}
                    />
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                            Step 2: Pair (Talk to bot first)
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
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
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '0.4rem', fontStyle: 'italic' }}>
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
            icon: '✈️',
            active: activeChannels.telegram,
            fields: (
                <>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                        Step 1: Configure & Save
                    </div>
                    <Input
                        label="Bot Token (from BotFather)"
                        type="password"
                        placeholder="123456:ABC-DEF..."
                        value={channels.telegram.token}
                        onChange={(e) => setChannels(c => ({ ...c, telegram: { token: e.target.value } }))}
                    />
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                            Step 2: Pair (Talk to bot first)
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
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
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '0.4rem', fontStyle: 'italic' }}>
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
            icon: '💬',
            active: activeChannels.slack,
            fields: (
                <>
                    <Input
                        label="App Token (xapp-...)"
                        type="password"
                        placeholder="xapp-1-..."
                        value={channels.slack.appToken}
                        onChange={(e) => setChannels(c => ({ ...c, slack: { ...c.slack, appToken: e.target.value } }))}
                    />
                    <Input
                        label="Bot Token (xoxb-...)"
                        type="password"
                        placeholder="xoxb-..."
                        value={channels.slack.botToken}
                        onChange={(e) => setChannels(c => ({ ...c, slack: { ...c.slack, botToken: e.target.value } }))}
                    />
                </>
            ),
        },
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            icon: '📱',
            active: activeChannels.whatsapp,
            fields: (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    WhatsApp uses QR-based pairing. Enable here and scan the QR code from the agent&apos;s container logs.
                    <div style={{ marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={channels.whatsapp.enabled}
                                onChange={(e) => setChannels(c => ({ ...c, whatsapp: { enabled: e.target.checked } }))}
                            />
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                    <div key={key} style={{
                        border: 'var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 'var(--font-size-sm)' }}>
                                {icon} {label}
                            </span>
                            {active && (
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    color: '#2ea043',
                                    background: 'rgba(46, 160, 67, 0.08)',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: 'var(--radius-pill)',
                                }}>
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
