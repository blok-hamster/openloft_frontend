'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { updateSecrets, updateAccount, getTenant, ITenant } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import styles from '@/components/dashboard/Dashboard.module.css';

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [tenant, setTenant] = useState<ITenant | null>(null);

    // Secret Manager
    const [secrets, setSecrets] = useState({ OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' });
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
            setSecrets({ OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' });
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '560px' }}>
                {/* Secret Manager */}
                <Card>
                    <div className={styles.headerTitle} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
                        Secret Manager
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="primary" size="sm" loading={savingSecrets} onClick={handleSaveSecrets}>
                                Save to Vault
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Webhook Config */}
                {tenant && (
                    <Card>
                        <div className={styles.headerTitle} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
                            Workspace Info
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    <div className={styles.headerTitle} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
                        Account
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
