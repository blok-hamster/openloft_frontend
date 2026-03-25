'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { deployAgent, getAvailableProviders } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';

interface AgentCreationWizardProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

// ── Provider → Model catalog ──────────────────────────────────────────────────

interface ModelOption { value: string; label: string; }

const providerModels: Record<string, { label: string; models: ModelOption[] }> = {
    openai: {
        label: 'OpenAI',
        models: [
            { value: 'gpt-5.4-pro', label: 'GPT-5.4 Pro' },
            { value: 'gpt-5.4-thinking', label: 'GPT-5.4 Thinking' },
            { value: 'gpt-5.4-standard', label: 'GPT-5.4 Standard' },
            { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
            { value: 'gpt-4.1', label: 'GPT-4.1' },
            { value: 'o3', label: 'o3' },
        ],
    },
    anthropic: {
        label: 'Anthropic',
        models: [
            { value: 'claude-4-6-opus-20260205', label: 'Claude Opus 4.6' },
            { value: 'claude-4-6-sonnet-20260217', label: 'Claude Sonnet 4.6' },
            { value: 'claude-4-opus-20251124', label: 'Claude Opus 4' },
            { value: 'claude-4-sonnet-20250929', label: 'Claude Sonnet 4' },
            { value: 'claude-4-haiku-20251015', label: 'Claude Haiku 4' },
        ],
    },
    'azure-openai': {
        label: 'Azure OpenAI',
        models: [
            { value: 'gpt-5.4-pro', label: 'Azure GPT-5.4 Pro' },
            { value: 'gpt-4o', label: 'Azure GPT-4o' },
        ],
    },
    google: {
        label: 'Google Gemini',
        models: [
            { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
            { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
            { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
            { value: 'gemini-3-deep-think-preview', label: 'Gemini 3 Deep Think' },
            { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        ],
    },
    groq: {
        label: 'Groq',
        models: [
            { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
            { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
            { value: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout' },
        ],
    },
    deepseek: {
        label: 'DeepSeek',
        models: [
            { value: 'deepseek-chat', label: 'DeepSeek Chat' },
            { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
        ],
    },
    xai: {
        label: 'xAI',
        models: [
            { value: 'grok-3', label: 'Grok 3' },
            { value: 'grok-4.1-fast', label: 'Grok 4.1 Fast' },
        ],
    },
    mistral: {
        label: 'Mistral',
        models: [
            { value: 'mistral-large-latest', label: 'Mistral Large' },
            { value: 'mistral-small-latest', label: 'Mistral Small' },
            { value: 'codestral-latest', label: 'Codestral' },
        ],
    },
};

export default function AgentCreationWizard({ open, onClose, onCreated }: AgentCreationWizardProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [llmProvider, setLlmProvider] = useState('');
    const [model, setModel] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);
    
    // BYOK States
    const [usePlatformCredits, setUsePlatformCredits] = useState(true);
    const [useSavedKey, setUseSavedKey] = useState(true);
    const [customSecret, setCustomSecret] = useState('');
    const [saveToSecretManager, setSaveToSecretManager] = useState(true);
    const [availableTenantSecrets, setAvailableTenantSecrets] = useState<string[]>([]);

    // Fetch available providers when modal opens
    useEffect(() => {
        if (open) {
            getAvailableProviders()
                .then((providers) => {
                    setAvailableProviders(providers);
                    // Auto-select first available provider
                    if (providers.length > 0 && !llmProvider) {
                        const first = providers[0];
                        setLlmProvider(first);
                        setModel(providerModels[first]?.models[0]?.value ?? '');
                    }
                })
                .catch(() => setAvailableProviders([]));
        }
    }, [open]);

    // Fetch tenant secrets status when moving to billing step
    useEffect(() => {
        if (step === 2 && user?.tenantId) {
            import('@/lib/api').then(({ getTenantSecretsInfo }) => {
                getTenantSecretsInfo(user.tenantId)
                    .then(setAvailableTenantSecrets)
                    .catch(() => setAvailableTenantSecrets([]));
            });
        }
    }, [step, user?.tenantId]);

    // Build provider options with disabled flags
    const llmProviderOptions = useMemo(() =>
        Object.entries(providerModels).map(([value, { label }]) => ({
            value,
            label: availableProviders.includes(value) ? label : `${label} (No API Key)`,
            disabled: !availableProviders.includes(value),
        })),
    [availableProviders]);

    const currentModels = useMemo(() => providerModels[llmProvider]?.models ?? [], [llmProvider]);

    const handleProviderChange = (value: string) => {
        // Only allow selecting available providers
        if (!availableProviders.includes(value)) return;
        setLlmProvider(value);
        const firstModel = providerModels[value]?.models[0]?.value ?? '';
        setModel(firstModel);
    };

    const hasSavedKeyForProvider = useMemo(() => {
        const providerKeyMap: Record<string, string> = {
            openai: 'OPENAI_API_KEY',
            anthropic: 'ANTHROPIC_API_KEY',
            google: 'GEMINI_API_KEY',
            groq: 'GROQ_API_KEY',
            deepseek: 'DEEPSEEK_API_KEY',
            xai: 'XAI_API_KEY',
            mistral: 'MISTRAL_API_KEY',
            'azure-openai': 'AZURE_OPENAI_API_KEY'
        };
        const keyName = providerKeyMap[llmProvider];
        return availableTenantSecrets.includes(keyName);
    }, [llmProvider, availableTenantSecrets]);

    const handleDeploy = async () => {
        if (!user?.tenantId) {
            toast('No tenant ID found', 'error');
            return;
        }
        setLoading(true);
        try {
            const providerKeyMap: Record<string, string> = {
                openai: 'OPENAI_API_KEY',
                anthropic: 'ANTHROPIC_API_KEY',
                google: 'GEMINI_API_KEY',
                groq: 'GROQ_API_KEY',
                deepseek: 'DEEPSEEK_API_KEY',
                xai: 'XAI_API_KEY',
                mistral: 'MISTRAL_API_KEY',
                'azure-openai': 'AZURE_OPENAI_API_KEY'
            };
            
            const secrets: Record<string, string> = {};
            if (!usePlatformCredits && !useSavedKey && customSecret) {
                secrets[providerKeyMap[llmProvider]] = customSecret;
            }

            await deployAgent({ 
                tenantId: user.tenantId, 
                name, 
                llmProvider, 
                model,
                usePlatformCredits,
                saveToSecretManager,
                secrets
            });
            
            toast('Agent deployed successfully', 'success');
            onCreated();
            handleClose();
        } catch {
            toast('Failed to deploy agent', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(0);
        setName('');
        setLlmProvider('');
        setModel('');
        setUsePlatformCredits(true);
        setCustomSecret('');
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title="Deploy New Agent">
            {step === 0 && (
                <div className={styles.wizardSteps}>
                    <Input
                        label="Agent Name"
                        placeholder="marketing-agent-01"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <div className={styles.wizardActionsEnd}>
                        <Button variant="primary" onClick={() => setStep(1)} disabled={!name.trim()}>
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className={styles.wizardSteps}>
                    <Select
                        label="LLM Provider"
                        value={llmProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        options={llmProviderOptions}
                    />
                    <Select
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        options={currentModels}
                    />
                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                        <Button variant="primary" onClick={() => setStep(2)} disabled={!llmProvider || !model}>Next</Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className={styles.wizardSteps}>
                    <div className={styles.headerTitle} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
                        Billing & Keys
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Button 
                                variant={usePlatformCredits ? "primary" : "secondary"} 
                                onClick={() => setUsePlatformCredits(true)}
                                style={{ flex: 1 }}
                            >
                                Platform Credits
                            </Button>
                            <Button 
                                variant={!usePlatformCredits ? "primary" : "secondary"} 
                                onClick={() => setUsePlatformCredits(false)}
                                style={{ flex: 1 }}
                            >
                                My Own Key
                            </Button>
                        </div>

                        {!usePlatformCredits && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Button 
                                        variant={useSavedKey ? "secondary" : "ghost"} 
                                        onClick={() => setUseSavedKey(true)}
                                        size="sm"
                                        disabled={!hasSavedKeyForProvider}
                                        style={{ fontSize: '11px' }}
                                    >
                                        Use Saved Key {hasSavedKeyForProvider ? '✅' : '(None found)'}
                                    </Button>
                                    <Button 
                                        variant={!useSavedKey ? "secondary" : "ghost"} 
                                        onClick={() => setUseSavedKey(false)}
                                        size="sm"
                                        style={{ fontSize: '11px' }}
                                    >
                                        Provide New Key
                                    </Button>
                                </div>

                                {!useSavedKey && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <Input
                                            label={`${providerModels[llmProvider]?.label} API Key`}
                                            type="password"
                                            placeholder="sk-..."
                                            value={customSecret}
                                            onChange={(e) => setCustomSecret(e.target.value)}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={saveToSecretManager} 
                                                onChange={(e) => setSaveToSecretManager(e.target.checked)}
                                            />
                                            Save to Secret Manager for future use
                                        </label>
                                    </div>
                                )}

                                {useSavedKey && hasSavedKeyForProvider && (
                                    <div className={styles.agentMetaItem} style={{ fontSize: '12px' }}>
                                        Using your saved {providerModels[llmProvider]?.label} key from Vault.
                                    </div>
                                )}
                            </div>
                        )}

                        {usePlatformCredits && (
                            <div className={styles.agentMetaItem} style={{ fontSize: '12px', textAlign: 'center' }}>
                                This agent will use the platform's API keys. Usage will be billed to your LOFT account.
                            </div>
                        )}
                    </div>

                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button 
                            variant="primary" 
                            onClick={() => setStep(3)} 
                            disabled={!usePlatformCredits && !useSavedKey && !customSecret}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className={styles.wizardSteps}>
                    <div style={{ textAlign: 'center' }}>
                        <div className={styles.headerTitle} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>
                            Ready to Deploy
                        </div>
                        <div className={styles.agentMetaItem} style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                            {name} • {providerModels[llmProvider]?.label} • {currentModels.find(m => m.value === model)?.label}
                        </div>
                        <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(46, 213, 115, 0.1)', color: 'var(--accent-green)', fontSize: '12px', fontWeight: 500 }}>
                            Billing: {usePlatformCredits ? 'Platform Account' : 'Bring Your Own Key'}
                        </div>
                    </div>
                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                        <Button variant="primary" loading={loading} onClick={handleDeploy}>
                            Deploy Agent
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
