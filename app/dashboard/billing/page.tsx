'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getBilling, updateSubscription } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from '@/components/dashboard/Dashboard.module.css';
import { CreditCard, Zap, Shield, Crown, TrendingDown, Clock, AlertCircle } from 'lucide-react';

export default function BillingPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [billing, setBilling] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [isManageLoading, setIsManageLoading] = useState(false);

    const [couponCode, setCouponCode] = useState('');

    const isDev = process.env.NEXT_PUBLIC_NODE_ENV === 'dev';

    useEffect(() => {
        if (!user?.tenantId) return;
        async function loadBilling() {
            try {
                const data = await getBilling(user!.tenantId);
                setBilling(data);
            } catch (err) {
                toast('Failed to load billing information', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadBilling();
    }, [user?.tenantId, toast]);

    const handleUpgrade = async (tier: string) => {
        if (!user?.tenantId) return;
        setUpdating(tier);
        try {
            const importApi = await import('@/lib/api');
            const { url } = await importApi.createCheckoutSession(user.tenantId, {
                type: 'subscription',
                tier: tier as any,
                couponCode: couponCode.trim() || undefined
            });
            window.location.href = url;
        } catch (err) {
            toast('Failed to initiate checkout', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const handleTopUp = async () => {
        if (!user?.tenantId) return;
        try {
            const importApi = await import('@/lib/api');
            const { url } = await importApi.createCheckoutSession(user.tenantId, {
                type: 'topup',
                amount: 10 // Default top-up amount
            });
            window.location.href = url;
        } catch (err) {
            toast('Failed to initiate top-up', 'error');
        }
    };

    const handleManageBilling = async () => {
        if (!user?.tenantId) return;
        setIsManageLoading(true);
        try {
            const importApi = await import('@/lib/api');
            const { url } = await importApi.createPortalSession(user.tenantId);
            window.location.href = url;
        } catch (err) {
            toast('Failed to open billing portal', 'error');
        } finally {
            setIsManageLoading(false);
        }
    };

    if (loading) return <div>Loading billing profile...</div>;

    const plans = [
        {
            id: 'hobby',
            name: 'Hobby',
            price: '$20',
            period: '/mo',
            description: 'For experimentation and small projects.',
            features: ['1 Agent', 'Platform Credits ($20/mo)', 'Public Community Skills', 'Standard Support'],
            icon: <Zap size={24} />,
            color: 'var(--mid-grey)'
        },
        {
            id: 'pro',
            name: 'Professional',
            price: '$50',
            period: '/mo',
            description: 'Powerful AI for growing teams.',
            features: ['5 Agents', 'Platform Credits ($50/mo)', 'Bring Your Own Key (BYOK)', 'S3 Persistent Memory', 'Priority Support'],
            icon: <Shield size={24} />,
            color: 'var(--accent-blue)',
            popular: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: '$500',
            period: '/mo',
            description: 'Scalable infrastructure for large swarms.',
            features: ['Unlimited Agents', 'Platform Credits ($500/mo)', 'Dedicated Cluster', 'Advanced Security', 'Dedicated Account Manager'],
            icon: <Crown size={24} />,
            color: '#a855f7'
        }
    ];

    return (
        <div className={styles.billingContainer}>
            <header className={styles.dashboardHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Billing & Plan</h1>
                    <p className={styles.headerSubtitle}>Manage your credits, subscription, and usage limits</p>
                </div>
            </header>

            {billing?.pauseReason && (
                <div style={{ backgroundColor: 'var(--accent-orange)', color: '#1A1A1A', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertCircle size={20} />
                    {billing.pauseReason === 'subscription_expired' && "Your subscription has expired. Please renew to resume all agent services."}
                    {billing.pauseReason === 'payment_failed' && "Your last payment failed. Please update your payment method. Grace period ends soon."}
                    {billing.pauseReason === 'payment_failed_grace_expired' && "Your payment failed and grace period has expired. Services paused."}
                    {billing.pauseReason === 'credit_exhausted' && "You have exhausted your platform credits. Please top up or switch your agents to custom keys to resume."}
                </div>
            )}

            <div className={styles.billingSummaryGrid}>
                <Card>
                    <div className={styles.balanceHeader}>
                        <div className={styles.balanceIcon}>
                            <CreditCard size={20} />
                        </div>
                        <span className={styles.balanceLabel}>Account Balance</span>
                        {billing?.subscriptionStatus && (
                            <span style={{ marginLeft: 'auto', textTransform: 'uppercase', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', backgroundColor: billing.subscriptionStatus === 'active' ? 'var(--accent-blue)' : '#444' }}>
                                {billing.subscriptionStatus}
                            </span>
                        )}
                    </div>
                    <div className={styles.balanceValue}>${billing?.creditBalance?.toFixed(2)}</div>
                    {billing?.creditCap > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--mid-grey)', marginTop: '4px' }}>
                            Monthly Cap: ${billing.creditCap.toFixed(2)}
                        </div>
                    )}
                    {billing?.billingPeriodEnd && (
                        <div style={{ fontSize: '12px', color: 'var(--mid-grey)', marginTop: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                            Period ends: {new Date(billing.billingPeriodEnd).toLocaleDateString()}
                        </div>
                    )}
                    <div className={styles.balanceActions} style={{ marginTop: '16px' }}>
                        <Button 
                            variant="primary" 
                            fullWidth 
                            disabled={!isDev && !billing?.stripeCustomerId}
                            onClick={handleTopUp}
                            title={!isDev && !billing?.stripeCustomerId ? "Contact support for manual top-up" : ""}
                        >
                            Top Up Credits
                        </Button>
                        {billing?.stripeCustomerId && (
                            <Button 
                                variant="secondary" 
                                fullWidth 
                                loading={isManageLoading}
                                onClick={handleManageBilling}
                                style={{ marginTop: '0.5rem' }}
                            >
                                Manage Billing Portal
                            </Button>
                        )}
                        {!isDev && !billing?.stripeCustomerId && (
                            <p className={styles.devHint}>
                                <AlertCircle size={12} /> Top-up is disabled in production
                            </p>
                        )}
                    </div>
                </Card>

                <Card>
                    <div className={styles.burnHeader}>
                        <div className={styles.burnIcon}>
                            <TrendingDown size={20} />
                        </div>
                        <span className={styles.balanceLabel}>Usage Forecast</span>
                    </div>
                    <div className={styles.burnRate}>
                        Approx. <strong>${billing?.burnRate?.toFixed(2)}</strong> / day
                    </div>
                    <div className={styles.timeRemaining}>
                        <Clock size={16} />
                        <span>Estimated <strong>{billing?.estimatedDaysRemaining !== null ? `${billing.estimatedDaysRemaining} days` : 'Unlimited'}</strong> remaining</span>
                    </div>
                </Card>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '48px', marginBottom: '24px' }}>
                <h2 className={styles.sectionHeader} style={{ margin: 0 }}>Available Plans</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--mid-grey)' }}>Have a Coupon Code?</label>
                    <input 
                        type="text" 
                        value={couponCode} 
                        onChange={e => setCouponCode(e.target.value)} 
                        placeholder="e.g. LOFT-XXXXX" 
                        style={{ padding: '8px 12px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-color)', fontFamily: 'monospace' }} 
                    />
                </div>
            </div>

            <div className={styles.planGrid}>
                {plans.map((plan) => (
                    <Card key={plan.id} className={billing?.subscriptionTier === plan.id ? styles.activePlanCard : ''}>
                        {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                        <div className={styles.planHeader}>
                            <div className={styles.planIcon} style={{ color: plan.color }}>{plan.icon}</div>
                            <div>
                                <h3 className={styles.planName}>{plan.name}</h3>
                                <div className={styles.planPrice}>
                                    <span className={styles.priceAmount}>{plan.price}</span>
                                    {plan.period && <span className={styles.pricePeriod}>{plan.period}</span>}
                                </div>
                            </div>
                        </div>
                        <p className={styles.planDesc}>{plan.description}</p>
                        <ul className={styles.featureList}>
                            {plan.features.map((f, i) => (
                                <li key={i} className={styles.featureItem}>
                                    <div className={styles.checkIcon}>✓</div>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Button
                            variant={billing?.subscriptionTier === plan.id ? 'secondary' : 'primary'}
                            fullWidth
                            disabled={billing?.subscriptionTier === plan.id || updating !== null}
                            onClick={() => handleUpgrade(plan.id)}
                            className={billing?.subscriptionTier === plan.id ? styles.currentPlanBtn : ''}
                        >
                            {updating === plan.id ? 'Updating...' : billing?.subscriptionTier === plan.id ? 'Current Plan' : 'Select Plan'}
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}
