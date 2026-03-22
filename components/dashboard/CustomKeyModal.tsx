'use client';

import { useState } from 'react';
import { IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';
import axios from 'axios';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
];

export default function CustomKeyModal({ agent, open, onClose }: CustomKeyModalProps) {
    const { toast } = useToast();
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<{ valid: boolean; error?: string } | null>(null);

    const handleValidate = async () => {
        if (!agent || !apiKey.trim()) return;
        setValidating(true);
        setResult(null);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('loft_token') : null;
            const { data } = await axios.post(`${apiBase}/agents/${agent.agentId}/custom-key`, { provider, apiKey }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setResult(data);
            if (data.valid) {
                toast('API key validated & saved — agent restarting', 'success');
                setTimeout(() => { onClose(); setApiKey(''); setResult(null); }, 1500);
            }
        } catch {
            setResult({ valid: false, error: 'Network error' });
        } finally {
            setValidating(false);
        }
    };

    return (
        <Modal open={open} onClose={() => { onClose(); setApiKey(''); setResult(null); }} title="Custom API Key">
            <div className={styles.wizardSteps}>
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
                    }}>
                        {result.valid ? '✓ Key validated & saved' : `✗ ${result.error}`}
                    </div>
                )}
                <div className={styles.wizardActionsEnd}>
                    <Button variant="primary" onClick={handleValidate} loading={validating} disabled={!apiKey.trim()}>
                        Validate & Save
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
