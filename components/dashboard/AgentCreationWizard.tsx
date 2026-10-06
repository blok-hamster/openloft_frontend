'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { deployAgent, getAvailableProviders } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import AgentTypeSelector from './AgentTypeSelector';
import styles from './Dashboard.module.css';
import wiz from './AgentCreationWizard.module.css';

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
    const [agentType, setAgentType] = useState<'openclaw' | 'hermes'>('openclaw');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [llmProvider, setLlmProvider] = useState('');
    const [model, setModel] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);
    
    // Billing States
    const [usePlatformCredits, setUsePlatformCredits] = useState(true);
    const [useSavedKey, setUseSavedKey] = useState(true);
    const [customSecret, setCustomSecret] = useState('');
    const [saveToSecretManager, setSaveToSecretManager] = useState(true);
    const [availableTenantSecrets, setAvailableTenantSecrets] = useState<string[]>([]);

    // Fetch available providers and tenant secrets
    useEffect(() => {
        if (open && user?.tenantId) {
            Promise.all([
                getAvailableProviders(),
                import('@/lib/api').then(m => m.getTenantSecretsInfo(user.tenantId))
            ]).then(([providers, secrets]) => {
                setAvailableProviders(providers);
                setAvailableTenantSecrets(secrets);
            }).catch(() => {});
        }
    }, [open, user?.tenantId]);

    // Filter providers based on billing strategy
    const llmProviderOptions = useMemo(() => {
        return Object.entries(providerModels)
            .filter(([value]) => {
                if (usePlatformCredits) {
                    // Only show providers that have system-level API keys configured
                    return availableProviders.includes(value);
                }
                // BYOK shows every provider in our catalog
                return true;
            })
            .map(([value, { label }]) => ({
                value,
                label,
                disabled: false,
            }));
    }, [availableProviders, usePlatformCredits]);

    const currentModels = useMemo(() => providerModels[llmProvider]?.models ?? [], [llmProvider]);

    const handleProviderChange = (value: string) => {
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
                description,
                agentType,
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
        setAgentType('openclaw');
        setName('');
        setDescription('');
        setLlmProvider('');
        setModel('');
        setUsePlatformCredits(true);
        setCustomSecret('');
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title="Deploy New Agent">
            <div className={styles.wizardProgress}>
                <div className={styles.progressLine} style={{ width: `${(step / 5) * 100}%` }} />
                {[0, 1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className={`${styles.progressStep} ${step >= s ? styles.progressStepActive : ''}`} />
                ))}
            </div>

            {step === 0 && (
                <div className={styles.wizardSteps}>
                    <div className={`${styles.headerTitle} ${wiz.stepHeading}`}>
                        Choose Agent Runtime
                    </div>
                    <AgentTypeSelector value={agentType} onChange={setAgentType} />
                    <div className={styles.wizardActionsEnd}>
                        <Button variant="primary" onClick={() => setStep(1)}>
                            Next: Name Your Agent
                        </Button>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className={styles.wizardSteps}>
                    <Input
                        label="Agent Name"
                        placeholder="Nexus-01"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        label="Description"
                        placeholder="Autonomous community moderator and content curator."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                        <Button variant="primary" onClick={() => setStep(2)} disabled={!name.trim()}>
                            Next: Billing Strategy
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className={styles.wizardSteps}>
                    <div className={`${styles.headerTitle} ${wiz.stepHeading}`}>
                        Choose Billing Strategy
                    </div>
                    <div className={wiz.planGrid}>
                        <Card
                            onClick={() => setUsePlatformCredits(true)}
                            className={usePlatformCredits ? `${styles.activePlanCard} ${wiz.planCard}` : wiz.planCard}
                        >
                            <h4 className={wiz.planTitle}>Platform Credits</h4>
                            <p className={wiz.planBlurb}>Use OpenLoft managed keys. Pay per token from your balance.</p>
                        </Card>
                        <Card
                            onClick={() => setUsePlatformCredits(false)}
                            className={!usePlatformCredits ? `${styles.activePlanCard} ${wiz.planCard}` : wiz.planCard}
                        >
                            <h4 className={wiz.planTitle}>Bring Your Own Key</h4>
                            <p className={wiz.planBlurb}>Use your own API keys. Only pay for the orchestration layer.</p>
                        </Card>
                    </div>
                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button variant="primary" onClick={() => setStep(3)}>Next: Select Provider</Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className={styles.wizardSteps}>
                    <Select
                        label="LLM Provider"
                        value={llmProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        options={llmProviderOptions}
                    />
                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                        <Button variant="primary" onClick={() => setStep(4)} disabled={!llmProvider}>Next: Configuration</Button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className={styles.wizardSteps}>
                    <Select
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        options={currentModels}
                    />

                    {!usePlatformCredits && (
                        <div className={wiz.keyPanel}>
                            <div className={wiz.keyToggle}>
                                <Button
                                    variant={useSavedKey ? "secondary" : "ghost"}
                                    onClick={() => setUseSavedKey(true)}
                                    size="sm"
                                    disabled={!hasSavedKeyForProvider}
                                >
                                    Use Saved Key {hasSavedKeyForProvider ? '✅' : '(None)'}
                                </Button>
                                <Button
                                    variant={!useSavedKey ? "secondary" : "ghost"}
                                    onClick={() => setUseSavedKey(false)}
                                    size="sm"
                                >
                                    New Key
                                </Button>
                            </div>

                            {!useSavedKey ? (
                                <Input
                                    label={`${providerModels[llmProvider]?.label} API Key`}
                                    type="password"
                                    placeholder="sk-..."
                                    value={customSecret}
                                    onChange={(e) => setCustomSecret(e.target.value)}
                                />
                            ) : hasSavedKeyForProvider && (
                                <div className={`${styles.agentMetaItem} ${wiz.keyHint}`}>
                                    Using saved {providerModels[llmProvider]?.label} key from Vault.
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                        <Button variant="primary" onClick={() => setStep(5)} disabled={!model || (!usePlatformCredits && !useSavedKey && !customSecret)}>
                            Next: Review
                        </Button>
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className={styles.wizardSteps}>
                    <div className={wiz.reviewCenter}>
                        <div className={`${styles.headerTitle} ${wiz.stepHeading}`}>
                            Final Review
                        </div>
                        <Card className={wiz.reviewCard}>
                            <div className={styles.agentName}>{name}</div>
                            <div className={`${styles.agentMetaItem} ${wiz.reviewDesc}`}>{description}</div>

                            <div className={wiz.reviewList}>
                                <div><strong>Runtime:</strong> {agentType === 'hermes' ? 'Hermes Agent' : 'OpenClaw Agent'}</div>
                                <div><strong>Provider:</strong> {providerModels[llmProvider]?.label}</div>
                                <div><strong>Model:</strong> {currentModels.find(m => m.value === model)?.label}</div>
                                <div className={usePlatformCredits ? wiz.reviewBadgePlatform : wiz.reviewBadgeByok}>
                                    {usePlatformCredits ? 'Platform Account Billing' : 'Bring Your Own Key'}
                                </div>
                            </div>
                        </Card>
                    </div>
                    <div className={styles.wizardActions}>
                        <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>
                        <Button variant="primary" loading={loading} onClick={handleDeploy}>
                            Deploy Agent
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
