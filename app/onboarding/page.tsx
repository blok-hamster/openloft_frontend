'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createTenant, updateSecrets, updateSubscription, IUserContext } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './Onboarding.module.css';
import FeatureGate from '@/components/FeatureGate';

type Tier = 'hobby' | 'pro' | 'enterprise';

const tiers: { id: Tier; name: string; description: string; badge: string; features: string[] }[] = [
    { 
        id: 'hobby', 
        name: 'Hobby', 
        description: 'For experimentation and small projects.', 
        badge: '$0/mo',
        features: ['1 Agent', 'Platform Credits Only', 'Public Community Skills', 'Standard Support']
    },
    { 
        id: 'pro', 
        name: 'Professional', 
        description: 'Powerful AI for growing teams.', 
        badge: '$49/mo',
        features: ['5 Agents', 'Bring Your Own Key (BYOK)', 'S3 Persistent Memory', 'Priority Support']
    },
    { 
        id: 'enterprise', 
        name: 'Enterprise', 
        description: 'Scalable infrastructure for large agent fleets.', 
        badge: 'Custom',
        features: ['Unlimited Agents', 'Dedicated Cluster', 'Advanced Security', 'Dedicated Account Manager']
    },
];

function OnboardingPageContent() {
    const router = useRouter();
    const { user, updateUser, persistAuth } = useAuth();
    const { toast } = useToast();

    const [step, setStep] = useState(0);
    const [orgName, setOrgName] = useState('');
    const [selectedTier, setSelectedTier] = useState<Tier>('hobby');
    const [tenantId, setTenantId] = useState('');
    const [secrets, setSecrets] = useState({ OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' });
    const [loading, setLoading] = useState(false);

    const handleCreateTenant = async () => {
        if (!orgName.trim()) return;
        setLoading(true);
        try {
            const tenant = await createTenant({ name: orgName });
            setTenantId(tenant.tenantId);
            // Adopt the re-issued token, not just the tenantId. Patching the
            // user object alone left the original JWT in place, and that JWT
            // has no tenantId — so every subsequent call to a tenant-scoped
            // route (subscription, secrets, agents) failed with "Your account
            // is not attached to a tenant".
            if (tenant.token) {
                persistAuth(tenant.token, { ...user, tenantId: tenant.tenantId } as IUserContext);
            } else {
                updateUser({ tenantId: tenant.tenantId });
            }
            toast('Organization created', 'success');
            setStep(1);
        } catch {
            toast('Failed to create organization', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTierSelect = async () => {
        try {
            await updateSubscription(tenantId, selectedTier);
            setStep(2);
        } catch {
            toast('Failed to save plan selection', 'error');
        }
    };

    const handleSecretsSubmit = async () => {
        setLoading(true);
        try {
            const filteredSecrets: Record<string, string> = {};
            Object.entries(secrets).forEach(([k, v]) => {
                if (v.trim()) filteredSecrets[k] = v;
            });

            if (Object.keys(filteredSecrets).length > 0) {
                await updateSecrets(tenantId, filteredSecrets);
            }

            toast('Setup complete! Welcome to OpenLoft.', 'success');
            router.push('/dashboard');
        } catch {
            toast('Failed to save secrets', 'error');
        } finally {
            setLoading(false);
        }
    };

    const stepDotClass = (i: number) => {
        if (i < step) return `${styles.stepDot} ${styles.stepDotComplete}`;
        if (i === step) return `${styles.stepDot} ${styles.stepDotActive}`;
        return styles.stepDot;
    };

    return (
        <div className={styles.onboardingPage}>
            <div className={styles.onboardingCard}>
                <div className={styles.onboardingBrand}>OpenLoft</div>
                <div className={styles.onboardingSubtitle}>
                    {user?.email ? `Welcome, ${user.email}` : 'Set up your workspace'}
                </div>

                {/* Step Indicator */}
                <div className={styles.stepIndicator}>
                    <div className={stepDotClass(0)} />
                    <div className={styles.stepLine} />
                    <div className={stepDotClass(1)} />
                    <div className={styles.stepLine} />
                    <div className={stepDotClass(2)} />
                </div>

                {/* Step 0: Organization Name */}
                {step === 0 && (
                    <div className={styles.stepForm}>
                        <div className={styles.stepTitle}>Name your organization</div>
                        <Input
                            label="Organization Name"
                            placeholder="Acme Corp"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                        />
                        <div className={styles.stepActionsEnd}>
                            <Button
                                variant="primary"
                                loading={loading}
                                disabled={!orgName.trim()}
                                onClick={handleCreateTenant}
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 1: Tier Selection */}
                {step === 1 && (
                    <div className={styles.stepForm}>
                        <div className={styles.stepTitle}>Select your plan</div>
                        <div className={styles.tierGrid} role="radiogroup" aria-label="Plan">
                            {tiers.map((tier) => (
                                /* A plan card is a single-select control, not a
                                   click-only div — role="radio" gives it the
                                   keyboard and the announced state for free. */
                                <button
                                    key={tier.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selectedTier === tier.id}
                                    className={`${styles.tierCard} ${selectedTier === tier.id ? styles.tierCardSelected : ''}`}
                                    onClick={() => setSelectedTier(tier.id)}
                                >
                                    <div className={styles.tierInfo}>
                                        <div className={styles.tierName}>{tier.name}</div>
                                        <div className={styles.tierDescription}>{tier.description}</div>
                                        <ul className={styles.tierFeatures}>
                                            {tier.features.map((f, i) => (
                                                <li key={i}>{f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className={styles.tierBadge}>{tier.badge}</div>
                                </button>
                            ))}
                        </div>
                        <div className={styles.stepActions}>
                            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                            <Button variant="primary" onClick={handleTierSelect}>Continue</Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Secret Injection */}
                {step === 2 && (
                    <div className={styles.stepForm}>
                        <div className={styles.stepTitle}>Add your API keys</div>
                        <p className={styles.secretNote}>
                            Your keys are encrypted and stored in a dedicated vault namespace. You can skip this and add them later in settings.
                        </p>
                        <div className={styles.secretGroup}>
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
                        <div className={styles.stepActions}>
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button variant="primary" loading={loading} onClick={handleSecretsSubmit}>
                                Launch Dashboard
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <FeatureGate>
            <OnboardingPageContent />
        </FeatureGate>
    );
}
