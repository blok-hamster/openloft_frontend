'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getFleetHealth, getTenants, restartFleet, syncPolicy, uploadSkill, getCoupons, createCoupon, deactivateCoupon, IFleetHealthResponse, ITenant, ICoupon } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import styles from '@/components/admin/Admin.module.css';

export default function AdminPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);

    const [health, setHealth] = useState<IFleetHealthResponse | null>(null);
    const [tenants, setTenants] = useState<ITenant[]>([]);
    const [coupons, setCoupons] = useState<ICoupon[]>([]);
    const [loading, setLoading] = useState(true);

    // Coupon Creation Form State
    const [creatingCoupon, setCreatingCoupon] = useState(false);
    const [couponForm, setCouponForm] = useState({
        tier: 'pro',
        discountType: 'percent',
        discountValue: 50,
        durationMonths: '',
        maxRedemptions: '',
        expiresAt: '',
        recipients: '',
        customCode: ''
    });

    const loadData = useCallback(async () => {
        try {
            const [healthData, tenantData, couponData] = await Promise.all([
                getFleetHealth(),
                getTenants(),
                getCoupons()
            ]);
            setHealth(healthData);
            setTenants(tenantData);
            setCoupons(couponData);
        } catch {
            toast('Failed to load admin data', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRestart = async () => {
        try {
            await restartFleet();
            toast('Fleet restart initiated', 'success');
            loadData();
        } catch {
            toast('Failed to restart fleet', 'error');
        }
    };

    const handleSync = async () => {
        try {
            await syncPolicy();
            toast('Policy sync complete', 'success');
        } catch {
            toast('Failed to sync policies', 'error');
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadSkill(file);
            toast('Skill uploaded', 'success');
        } catch {
            toast('Failed to upload skill', 'error');
        }
    };

    const handleCreateCoupon = async () => {
        setCreatingCoupon(true);
        try {
            await createCoupon({
                tier: couponForm.tier,
                discountType: couponForm.discountType,
                discountValue: Number(couponForm.discountValue) || 0,
                durationMonths: couponForm.durationMonths ? Number(couponForm.durationMonths) : null,
                maxRedemptions: couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : null,
                expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null,
                recipients: couponForm.recipients.split(',').map(e => e.trim()).filter(Boolean),
                customCode: couponForm.customCode.trim()
            });
            toast('Coupon created successfully', 'success');
            setCouponForm({
                tier: 'pro', discountType: 'percent', discountValue: 50, durationMonths: '',
                maxRedemptions: '', expiresAt: '', recipients: '', customCode: ''
            });
            loadData();
        } catch {
            toast('Failed to create coupon', 'error');
        } finally {
            setCreatingCoupon(false);
        }
    };

    const handleDeactivateCoupon = async (id: string) => {
        try {
            await deactivateCoupon(id);
            toast('Coupon deactivated', 'success');
            loadData();
        } catch {
            toast('Failed to deactivate coupon', 'error');
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className={styles.adminPage}>
                <div className={styles.adminTitle}>Access Denied</div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Admin privileges required.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.adminPage}>
            <div className={styles.adminHeader}>
                <div>
                    <h1 className={styles.adminTitle}>Fleet Control</h1>
                    <div className={styles.adminBrand}>LOFT Admin</div>
                </div>
                <div className={styles.adminActions}>
                    <Button variant="secondary" size="sm" onClick={handleSync}>Sync Policy</Button>
                    <Button variant="danger" size="sm" onClick={handleRestart}>Restart Fleet</Button>
                </div>
            </div>

            {/* Fleet Health Heatmap */}
            <div className={styles.heatmapSection}>
                <div className={styles.sectionTitle}>Fleet Health</div>
                {loading ? (
                    <div className={styles.heatmapGrid}>
                        <SkeletonLoader variant="card" count={4} />
                    </div>
                ) : health ? (
                    <div className={styles.heatmapGrid}>
                        <div className={styles.heatmapCard}>
                            <div className={styles.heatmapValue}>{health.totalAgents}</div>
                            <div className={styles.heatmapLabel}>Total</div>
                        </div>
                        <div className={styles.heatmapCard} style={{ borderColor: 'var(--accent-green)' }}>
                            <div className={styles.heatmapValue} style={{ color: 'var(--accent-green)' }}>
                                {health.statusCounts.running}
                            </div>
                            <div className={styles.heatmapLabel}>Running</div>
                        </div>
                        <div className={styles.heatmapCard}>
                            <div className={styles.heatmapValue}>{health.statusCounts.stopped}</div>
                            <div className={styles.heatmapLabel}>Stopped</div>
                        </div>
                        <div className={styles.heatmapCard} style={{ borderColor: 'var(--accent-coral)' }}>
                            <div className={styles.heatmapValue} style={{ color: 'var(--accent-coral)' }}>
                                {health.statusCounts.failed}
                            </div>
                            <div className={styles.heatmapLabel}>Failed</div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Tenant Management */}
            <div className={styles.heatmapSection}>
                <div className={styles.sectionTitle}>Tenants ({tenants.length})</div>
                <table className={styles.tenantTable}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Tier</th>
                            <th>Tokens Used</th>
                            <th>Compute (min)</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map((t) => (
                            <tr key={t._id}>
                                <td>{t.name}</td>
                                <td>{t.subscriptionTier}</td>
                                <td>{t.billing.tokenUsage.toLocaleString()}</td>
                                <td>{t.billing.computeMinutes}</td>
                                <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Registry Upload */}
            <div className={styles.heatmapSection}>
                <div className={styles.sectionTitle}>Skill Registry</div>
                <div className={styles.uploadZone} onClick={() => fileRef.current?.click()}>
                    <div className={styles.uploadLabel}>Click to upload skill manifest (.zip / .json)</div>
                    <input
                        ref={fileRef}
                        type="file"
                        className={styles.uploadInput}
                        accept=".zip,.json"
                        onChange={handleUpload}
                    />
                </div>
            </div>

            {/* Coupons Management */}
            <div className={styles.heatmapSection}>
                <div className={styles.sectionTitle}>Coupons ({coupons.length})</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
                    <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <table className={styles.tenantTable} style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Tier</th>
                                    <th>Discount</th>
                                    <th>Used</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map((c) => (
                                    <tr key={c._id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{c.code}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{c.tier}</td>
                                        <td>{c.discountType === 'percent' ? `${c.discountValue}%` : `$${c.discountValue}`}</td>
                                        <td>{c.currentRedemptions} {c.maxRedemptions ? `/ ${c.maxRedemptions}` : ''}</td>
                                        <td>
                                            <span style={{ 
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                backgroundColor: c.isActive ? 'rgba(46, 160, 67, 0.15)' : 'rgba(229, 77, 46, 0.15)',
                                                color: c.isActive ? '#3fb950' : '#ff7b72'
                                            }}>
                                                {c.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {c.isActive && (
                                                <Button variant="danger" size="sm" onClick={() => handleDeactivateCoupon(c._id)}>
                                                    Deactivate
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {coupons.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--mid-grey)' }}>No coupons created yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px' }}>Create Coupon</h3>
                        
                        <Select
                            label="Target Tier"
                            value={couponForm.tier}
                            onChange={(e) => setCouponForm({ ...couponForm, tier: e.target.value })}
                            options={[{ value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }]}
                        />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Select
                                label="Type"
                                value={couponForm.discountType}
                                onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                                options={[{ value: 'percent', label: '%' }, { value: 'amount', label: '$' }]}
                            />
                            <Input
                                label="Value"
                                type="number"
                                value={couponForm.discountValue}
                                onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value as any })}
                            />
                        </div>

                        <Input
                            label="Custom Code (Optional)"
                            placeholder="e.g. SUMMER50"
                            value={couponForm.customCode}
                            onChange={(e) => setCouponForm({ ...couponForm, customCode: e.target.value })}
                        />

                        <Input
                            label="Max Redemptions (Optional)"
                            type="number"
                            placeholder="e.g. 100"
                            value={couponForm.maxRedemptions}
                            onChange={(e) => setCouponForm({ ...couponForm, maxRedemptions: e.target.value })}
                        />

                        <Input
                            label="Recipients (Comma separated)"
                            placeholder="user1@ext.com, user2@ext.com"
                            value={couponForm.recipients}
                            onChange={(e) => setCouponForm({ ...couponForm, recipients: e.target.value })}
                        />

                        <Button variant="primary" fullWidth loading={creatingCoupon} onClick={handleCreateCoupon} style={{ marginTop: '8px' }}>
                            Create & Send Coupon
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
