'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { updateSecrets, updateAccount, getTenant, ITenant } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import styles from '@/components/dashboard/Dashboard.module.css';
import set from './Settings.module.css';

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [tenant, setTenant] = useState<ITenant | null>(null);

    // Secret Manager
    const [secrets, setSecrets] = useState({ 
        OPENAI_API_KEY: '', 
        ANTHROPIC_API_KEY: '',
        GEMINI_API_KEY: '',
        GROQ_API_KEY: '',
        DEEPSEEK_API_KEY: '',
        XAI_API_KEY: '',
        MISTRAL_API_KEY: '',
        AZURE_OPENAI_API_KEY: '',
        AZURE_OPENAI_ENDPOINT: '',
        AZURE_OPENAI_API_INSTANCE_NAME: '',
        AZURE_OPENAI_API_DEPLOYMENT_NAME: '',
        AZURE_OPENAI_API_VERSION: ''
    });
    const [savingSecrets, setSavingSecrets] = useState(false);

    // Account
    const [companyName, setCompanyName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [savingAccount, setSavingAccount] = useState(false);

    const loadTenant = useCallback(async () => {
        if (!user?.tenantId) return;
        try {
            const data = await getTenant(user.tenantId);
            setTenant(data);
            setCompanyName(data.name);
        } catch {
            // Tenant may not exist yet
        }
    }, [user?.tenantId]);

    useEffect(() => {
        loadTenant();
    }, [loadTenant]);

    const handleSaveSecrets = async () => {
        if (!user?.tenantId) return;
        setSavingSecrets(true);
        try {
            const filtered: Record<string, string> = {};
            Object.entries(secrets).forEach(([k, v]) => {
                if (v.trim()) filtered[k] = v;
            });
            if (Object.keys(filtered).length === 0) {
                toast('No keys to save', 'info');
                return;
            }
            await updateSecrets(user.tenantId, filtered);
            toast('Secrets saved to vault', 'success');
            setSecrets({ 
                OPENAI_API_KEY: '', 
                ANTHROPIC_API_KEY: '',
                GEMINI_API_KEY: '',
                GROQ_API_KEY: '',
                DEEPSEEK_API_KEY: '',
                XAI_API_KEY: '',
                MISTRAL_API_KEY: '',
                AZURE_OPENAI_API_KEY: '',
                AZURE_OPENAI_ENDPOINT: '',
                AZURE_OPENAI_API_INSTANCE_NAME: '',
                AZURE_OPENAI_API_DEPLOYMENT_NAME: '',
                AZURE_OPENAI_API_VERSION: ''
            });
        } catch {
            toast('Failed to save secrets', 'error');
        } finally {
            setSavingSecrets(false);
        }
    };

    const handleSaveAccount = async () => {
        setSavingAccount(true);
        try {
            const payload: { companyName?: string; password?: string } = {};
            if (companyName.trim()) payload.companyName = companyName;
            if (newPassword.trim()) payload.password = newPassword;
            await updateAccount(payload);
            toast('Account updated', 'success');
            setNewPassword('');
        } catch {
            toast('Failed to update account', 'error');
        } finally {
            setSavingAccount(false);
        }
    };

    // Collapsible states
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    
    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => 
            prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
        );
    };

    return (
        <>
            <div className={styles.dashboardHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Settings</h1>
                    <span className={styles.headerSubtitle}>
                        {tenant ? `${tenant.name} • ${tenant.subscriptionTier} tier` : 'Manage your workspace'}
                    </span>
                </div>
            </div>

            <div className={set.stack}>
                {/* Secret Manager */}
                <Card>
                    <div className={`${styles.headerTitle} ${set.sectionHeading}`}>
                        Secret Manager
                    </div>
                    
                    <div className={set.secretStack}>
                        {/* Main Providers */}
                        <div className={set.fieldStack}>
                            <Input
                                label="OpenAI API Key"
                                type="password"
                                placeholder="sk-..."
                                value={secrets.OPENAI_API_KEY}
                                onChange={(e) => setSecrets((s) => ({ ...s, OPENAI_API_KEY: e.target.value }))}
                            />
                            <Input
                                label="Anthropic API Key"
                                type="password"
                                placeholder="sk-ant-..."
                                value={secrets.ANTHROPIC_API_KEY}
                                onChange={(e) => setSecrets((s) => ({ ...s, ANTHROPIC_API_KEY: e.target.value }))}
                            />
                        </div>

                        {/* Other Providers Group */}
                        <div className={set.group}>
                            <button
                                type="button"
                                onClick={() => toggleGroup('others')}
                                className={set.groupToggle}
                                aria-expanded={expandedGroups.includes('others')}
                            >
                                OTHER PROVIDERS (Gemini, Groq, DeepSeek, xAI, Mistral)
                                <span>{expandedGroups.includes('others') ? '−' : '+'}</span>
                            </button>
                            
                            {expandedGroups.includes('others') && (
                                <div className={set.groupPanel}>
                                    <Input
                                        label="Google Gemini API Key"
                                        type="password"
                                        placeholder="AIza..."
                                        value={secrets.GEMINI_API_KEY}
                                        onChange={(e) => setSecrets((s) => ({ ...s, GEMINI_API_KEY: e.target.value }))}
                                    />
                                    <Input
                                        label="Groq API Key"
                                        type="password"
                                        placeholder="gsk_..."
                                        value={secrets.GROQ_API_KEY}
                                        onChange={(e) => setSecrets((s) => ({ ...s, GROQ_API_KEY: e.target.value }))}
                                    />
                                    <Input
                                        label="DeepSeek API Key"
                                        type="password"
                                        placeholder="sk-..."
                                        value={secrets.DEEPSEEK_API_KEY}
                                        onChange={(e) => setSecrets((s) => ({ ...s, DEEPSEEK_API_KEY: e.target.value }))}
                                    />
                                    <Input
                                        label="xAI API Key"
                                        type="password"
                                        placeholder="xai-..."
                                        value={secrets.XAI_API_KEY}
                                        onChange={(e) => setSecrets((s) => ({ ...s, XAI_API_KEY: e.target.value }))}
                                    />
                                    <Input
                                        label="Mistral API Key"
                                        type="password"
                                        placeholder="..."
                                        value={secrets.MISTRAL_API_KEY}
                                        onChange={(e) => setSecrets((s) => ({ ...s, MISTRAL_API_KEY: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Azure Providers Group */}
                        <div className={set.group}>
                            <button
                                type="button"
                                onClick={() => toggleGroup('azure')}
                                className={set.groupToggle}
                                aria-expanded={expandedGroups.includes('azure')}
                            >
                                AZURE OPENAI (Enterprise)
                                <span>{expandedGroups.includes('azure') ? '−' : '+'}</span>
                            </button>
                            
                            {expandedGroups.includes('azure') && (
                                <div className={set.groupPanel}>
                                    <Input
                                        label="Azure API Key"
                                        type="password"
                                        value={secrets.AZURE_OPENAI_API_KEY}
                                        onChange={(e) => setSecrets((s) => ({ ...s, AZURE_OPENAI_API_KEY: e.target.value }))}
                                    />
                                    <Input
                                        label="Endpoint URL"
                                        placeholder="https://resource.openai.azure.com"
                                        value={secrets.AZURE_OPENAI_ENDPOINT}
                                        onChange={(e) => setSecrets((s) => ({ ...s, AZURE_OPENAI_ENDPOINT: e.target.value }))}
                                    />
                                    <Input
                                        label="Instance Name"
                                        value={secrets.AZURE_OPENAI_API_INSTANCE_NAME}
                                        onChange={(e) => setSecrets((s) => ({ ...s, AZURE_OPENAI_API_INSTANCE_NAME: e.target.value }))}
                                    />
                                    <Input
                                        label="Deployment Name"
                                        value={secrets.AZURE_OPENAI_API_DEPLOYMENT_NAME}
                                        onChange={(e) => setSecrets((s) => ({ ...s, AZURE_OPENAI_API_DEPLOYMENT_NAME: e.target.value }))}
                                    />
                                    <Input
                                        label="API Version"
                                        placeholder="2024-02-15-preview"
                                        value={secrets.AZURE_OPENAI_API_VERSION}
                                        onChange={(e) => setSecrets((s) => ({ ...s, AZURE_OPENAI_API_VERSION: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className={set.actionsEnd}>
                            <Button variant="primary" size="sm" loading={savingSecrets} onClick={handleSaveSecrets}>
                                Save to Vault
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Workspace Info */}
                {tenant && (
                    <Card>
                        <div className={`${styles.headerTitle} ${set.sectionHeadingSm}`}>
                            Workspace Info
                        </div>
                        <div className={set.infoList}>
                            <div className={styles.agentMetaItem}>Tenant ID: {tenant.tenantId}</div>
                            <div className={styles.agentMetaItem}>Vault: {tenant.vaultNamespace}</div>
                            <div className={styles.agentMetaItem}>
                                Tier: {tenant.subscriptionTier}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Account Settings */}
                <Card>
                    <div className={`${styles.headerTitle} ${set.sectionHeadingSm}`}>
                        Account
                    </div>
                    <div className={set.fieldStack}>
                        <Input
                            label="Company Name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <div className={set.actionsEnd}>
                            <Button variant="primary" size="sm" loading={savingAccount} onClick={handleSaveAccount}>
                                Update Account
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}
