'use client';

import { useEffect, useState } from 'react';
import { IAgent, saveCustomKey, switchAgentKeyType } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';

interface CustomKeyModalProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google Gemini' },
    { value: 'groq', label: 'Groq' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'xai', label: 'xAI' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'azure-openai', label: 'Azure OpenAI' },
];

export default function CustomKeyModal({ agent, open, onClose }: CustomKeyModalProps) {
    const { toast } = useToast();
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<{ valid: boolean; error?: string } | null>(null);
    const [keyType, setKeyType] = useState<'platform' | 'custom'>('platform');
    /* A validated key, for THIS agent, THIS session. Switching to custom
       without it was possible before — the deploy then charged a custom
       key that had never validated. */
    const [validated, setValidated] = useState(false);
    const [switching, setSwitching] = useState(false);

    /* State followed the modal, not the agent: opening it on a platform-key
       agent after a custom-key agent kept the previous agent's keyType, so
       the pill buttons showed and did the wrong thing. Re-sync every open. */
    useEffect(() => {
        if (open && agent) {
            setKeyType(agent.llmKeyType === 'custom' ? 'custom' : 'platform');
            setProvider('openai');
            setApiKey('');
            setResult(null);
            setValidated(false);
        }
    }, [open, agent]);

    const handleValidate = async () => {
        if (!agent || !apiKey.trim()) return;
        setValidating(true);
        setResult(null);

        try {
            const data = await saveCustomKey(agent.agentId, provider, apiKey);
            setResult(data);
            if (data.valid) {
                toast('API key validated & saved — switching to custom key...', 'success');
                // Automatically switch to custom key if valid
                setValidated(true);
                await handleSwitchKeyType('custom');
                setTimeout(() => { onClose(); setApiKey(''); setResult(null); }, 1500);
            }
        } catch {
            setResult({ valid: false, error: 'Network error' });
        } finally {
            setValidating(false);
        }
    };

    const handleSwitchKeyType = async (type: 'platform' | 'custom') => {
        if (!agent) return;
        // Without a validated key there is nothing to bill on; the pill used
        // to flip and the agent ran on an unbacked key.
        if (type === 'custom' && !validated && agent.llmKeyType !== 'custom') {
            toast('Validate and save a custom key first', 'error');
            setResult({ valid: false, error: 'Validate and save a key before switching' });
            return;
        }
        setSwitching(true);
        try {
            await switchAgentKeyType(agent.agentId, type);
            setKeyType(type);
            toast(`Switched to ${type === 'platform' ? 'Platform Credits' : 'Custom Key'}`, 'success');
        } catch (err) {
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast(message || `Failed to switch to ${type} key`, 'error');
            setResult({ valid: false, error: message || 'Switch failed' });
        } finally {
            setSwitching(false);
        }
    };

    return (
        <Modal open={open} onClose={() => { onClose(); setApiKey(''); setResult(null); }} title="Agent Billing & Keys">
            <div className={styles.wizardSteps}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <Button 
                        variant={keyType === 'platform' ? 'primary' : 'secondary'} 
                        fullWidth 
                        onClick={() => handleSwitchKeyType('platform')}
                        disabled={switching || keyType === 'platform'}
                    >
                        Use Platform Credits
                    </Button>
                    <Button 
                        variant={keyType === 'custom' ? 'primary' : 'secondary'} 
                        fullWidth 
                        onClick={() => handleSwitchKeyType('custom')}
                        disabled={switching || keyType === 'custom'}
                    >
                        Use Custom Key
                    </Button>
                </div>

                {keyType === 'custom' && (
                    <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-color)' }}>Configure Custom Key</h4>
                        <Select
                            label="Provider"
                            value={provider}
                            onChange={(e) => { setProvider(e.target.value); setResult(null); }}
                            options={providers}
                        />
                        <Input
                            label="API Key"
                            type="password"
                            placeholder="sk-..."
                            value={apiKey}
                            onChange={(e) => { setApiKey(e.target.value); setResult(null); }}
                        />
                        {result && (
                            <div style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 700,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.06em',
                                background: result.valid ? 'rgba(46, 160, 67, 0.08)' : 'rgba(229, 77, 46, 0.08)',
                                color: result.valid ? '#2ea043' : 'var(--accent-coral, #e54d2e)',
                                marginBottom: '16px'
                            }}>
                                {result.valid ? '✓ Key validated & saved' : `✗ ${result.error}`}
                            </div>
                        )}
                        <div className={styles.wizardActionsEnd}>
                            <Button variant="primary" onClick={handleValidate} loading={validating} disabled={!apiKey.trim() || switching}>
                                Validate & Save Key
                            </Button>
                        </div>
                    </div>
                )}
                
                {keyType === 'platform' && (
                    <div style={{ padding: '16px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--mid-grey)' }}>
                        This agent will consume credits from your platform balance for API calls. If your credits are exhausted, the agent will gracefully pause.
                    </div>
                )}
            </div>
        </Modal>
    );
}
