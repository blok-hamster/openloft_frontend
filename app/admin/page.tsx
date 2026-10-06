'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getFleetHealth, getTenants, restartFleet, syncPolicy, uploadSkill, getCoupons, createCoupon, deactivateCoupon, scaleOutCluster, scaleInCluster, adminGetAllAgents, adminStopAgent, adminRestartAgent, adminDeleteAgent, IFleetHealthResponse, ITenant, ICoupon, IAgent } from '@/lib/api';
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
    const [agents, setAgents] = useState<IAgent[]>([]);
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
            const [healthData, tenantData, agentData, couponData] = await Promise.all([
                getFleetHealth(),
                getTenants(),
                adminGetAllAgents(),
                getCoupons()
            ]);
            setHealth(healthData);
            setTenants(tenantData);
            setAgents(agentData);
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

    const handleScaleOut = async () => {
        try {
            toast('Scale out requested (Watch Discord for updates)', 'success');
            const res = await scaleOutCluster();
            toast(res.message, 'success');
        } catch (error: any) {
             toast(error?.response?.data?.error || 'Failed to scale out', 'error');
        }
    };

    const handleScaleIn = async () => {
        try {
            toast('Scale in requested', 'success');
            const res = await scaleInCluster();
            toast(res.message, 'success');
        } catch (error: any) {
             toast(error?.response?.data?.error || 'Failed to scale in', 'error');
        }
    };

    const handleAgentStop = async (agentId: string) => {
        try {
            await adminStopAgent(agentId);
            toast('Agent stopped', 'success');
            loadData();
        } catch { toast('Failed to stop agent', 'error'); }
    };

    const handleAgentRestart = async (agentId: string) => {
        try {
            await adminRestartAgent(agentId);
            toast('Agent restarted', 'success');
            loadData();
        } catch { toast('Failed to restart agent', 'error'); }
    };

    const handleAgentDelete = async (agentId: string) => {
        if (!confirm(`Delete agent ${agentId}? This cannot be undone.`)) return;
        try {
            await adminDeleteAgent(agentId);
            toast('Agent deleted', 'success');
            loadData();
        } catch { toast('Failed to delete agent', 'error'); }
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

    if (user?.role !== 'platform_admin' && user?.role !== 'admin') {
        return (
            <div className={styles.adminPage}>
                <div className={styles.adminTitle}>Access Denied</div>
                <p className={styles.accessDeniedNote}>
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
                    <Button variant="secondary" size="sm" onClick={handleScaleOut}>Test Scale Out</Button>
                    <Button variant="secondary" size="sm" onClick={handleScaleIn}>Test Scale In</Button>
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
                        <div className={`${styles.heatmapCard} ${styles.heatmapCardGreen}`}>
                            <div className={`${styles.heatmapValue} ${styles.heatmapValueGreen}`}>
                                {health.statusCounts.running}
                            </div>
                            <div className={styles.heatmapLabel}>Running</div>
                        </div>
                        <div className={styles.heatmapCard}>
                            <div className={styles.heatmapValue}>{health.statusCounts.stopped}</div>
                            <div className={styles.heatmapLabel}>Stopped</div>
                        </div>
                        <div className={`${styles.heatmapCard} ${styles.heatmapCardCoral}`}>
                            <div className={`${styles.heatmapValue} ${styles.heatmapValueCoral}`}>
                                {health.statusCounts.failed}
                            </div>
                            <div className={styles.heatmapLabel}>Failed</div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Agent Management */}
            <div className={styles.heatmapSection}>
                <div className={styles.sectionTitle}>All Agents ({agents.length})</div>
                <div className={styles.tableScroll}>
                    <table className={styles.tenantTable}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Agent ID</th>
                                <th>Tenant</th>
                                <th>Type</th>
                                <th>Provider</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map((a) => (
                                <tr key={a.agentId}>
                                    <td>{a.name || '—'}</td>
                                    <td className={styles.cellMono}>{a.agentId}</td>
                                    <td className={styles.cellMono}>{a.tenantId}</td>
                                    <td>
                                        <span className={a.agentType === 'hermes' ? styles.typePillHermes : styles.typePillOpenClaw}>
                                            {a.agentType === 'hermes' ? 'Hermes' : 'OpenClaw'}
                                        </span>
                                    </td>
                                    <td>{a.llmProvider}</td>
                                    <td>
                                        <span className={a.status === 'running'
                                            ? styles.statusPillRunning
                                            : a.status === 'failed'
                                                ? styles.statusPillFailed
                                                : styles.statusPillOther}>
                                            {a.status}
                                        </span>
                                    </td>
                                    <td className={styles.actionCell}>
                                        {a.status === 'running' && (
                                            <>
                                                <Button variant="ghost" size="sm" onClick={() => handleAgentRestart(a.agentId)}>Restart</Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleAgentStop(a.agentId)}>Stop</Button>
                                            </>
                                        )}
                                        <Button variant="danger" size="sm" onClick={() => handleAgentDelete(a.agentId)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            {agents.length === 0 && (
                                <tr><td colSpan={7} className={styles.emptyCell}>No agents deployed</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Same data, card layout — see .cardStack */}
                <div className={styles.cardStack}>
                    {agents.length === 0 ? (
                        <div className={styles.tableCardEmpty}>No agents deployed</div>
                    ) : agents.map((a) => (
                        <div key={a.agentId} className={styles.tableCard}>
                            <div className={styles.tableCardHead}>
                                <span className={styles.tableCardTitle}>{a.name || a.agentId}</span>
                                <span className={a.status === 'running'
                                    ? styles.statusPillRunning
                                    : a.status === 'failed'
                                        ? styles.statusPillFailed
                                        : styles.statusPillOther}>
                                    {a.status}
                                </span>
                            </div>
                            <div className={styles.tableCardFields}>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Agent ID</span>
                                    <span className={`${styles.cellMono} ${styles.tableCardValue}`}>{a.agentId}</span>
                                </div>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Tenant</span>
                                    <span className={`${styles.cellMono} ${styles.tableCardValue}`}>{a.tenantId}</span>
                                </div>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Type</span>
                                    <span className={styles.tableCardValue}>
                                        <span className={a.agentType === 'hermes' ? styles.typePillHermes : styles.typePillOpenClaw}>
                                            {a.agentType === 'hermes' ? 'Hermes' : 'OpenClaw'}
                                        </span>
                                    </span>
                                </div>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Provider</span>
                                    <span className={styles.tableCardValue}>{a.llmProvider}</span>
                                </div>
                            </div>
                            <div className={styles.tableCardActions}>
                                {a.status === 'running' && (
                                    <>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleAgentRestart(a.agentId)}>Restart</Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleAgentStop(a.agentId)}>Stop</Button>
                                    </>
                                )}
                                <Button type="button" variant="danger" size="sm" onClick={() => handleAgentDelete(a.agentId)}>Delete</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tenant Management */}
            <div className={styles.heatmapSection}>
                <div className={styles.sectionTitle}>Tenants ({tenants.length})</div>
                <div className={styles.tableScroll}>
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

                <div className={styles.cardStack}>
                    {tenants.length === 0 ? (
                        <div className={styles.tableCardEmpty}>No tenants</div>
                    ) : tenants.map((t) => (
                        <div key={t._id} className={styles.tableCard}>
                            <div className={styles.tableCardHead}>
                                <span className={styles.tableCardTitle}>{t.name}</span>
                                <span className={`${styles.cellCaps} ${styles.statusPillOther}`}>{t.subscriptionTier}</span>
                            </div>
                            <div className={styles.tableCardFields}>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Tokens used</span>
                                    <span className={styles.tableCardValue}>{t.billing.tokenUsage.toLocaleString()}</span>
                                </div>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Compute (min)</span>
                                    <span className={styles.tableCardValue}>{t.billing.computeMinutes}</span>
                                </div>
                                <div className={styles.tableCardField}>
                                    <span className={styles.tableCardLabel}>Created</span>
                                    <span className={styles.tableCardValue}>{new Date(t.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
                
                <div className={styles.couponLayout}>
                    <div className={styles.couponPanel}>
                        <table className={styles.tenantTable}>
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
                                        <td className={styles.cellMonoBold}>{c.code}</td>
                                        <td className={styles.cellCaps}>{c.tier}</td>
                                        <td>{c.discountType === 'percent' ? `${c.discountValue}%` : `$${c.discountValue}`}</td>
                                        <td>{c.currentRedemptions} {c.maxRedemptions ? `/ ${c.maxRedemptions}` : ''}</td>
                                        <td>
                                            <span className={c.isActive ? styles.couponPillActive : styles.couponPillInactive}>
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
                                        <td colSpan={6} className={styles.emptyCell}>No coupons created yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className={styles.cardStack}>
                            {coupons.length === 0 ? (
                                <div className={styles.tableCardEmpty}>No coupons created yet</div>
                            ) : coupons.map((c) => (
                                <div key={c._id} className={styles.tableCard}>
                                    <div className={styles.tableCardHead}>
                                        <span className={`${styles.cellMonoBold} ${styles.tableCardTitle}`}>{c.code}</span>
                                        <span className={c.isActive ? styles.couponPillActive : styles.couponPillInactive}>
                                            {c.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className={styles.tableCardFields}>
                                        <div className={styles.tableCardField}>
                                            <span className={styles.tableCardLabel}>Tier</span>
                                            <span className={`${styles.cellCaps} ${styles.tableCardValue}`}>{c.tier}</span>
                                        </div>
                                        <div className={styles.tableCardField}>
                                            <span className={styles.tableCardLabel}>Discount</span>
                                            <span className={styles.tableCardValue}>
                                                {c.discountType === 'percent' ? `${c.discountValue}%` : `$${c.discountValue}`}
                                            </span>
                                        </div>
                                        <div className={styles.tableCardField}>
                                            <span className={styles.tableCardLabel}>Used</span>
                                            <span className={styles.tableCardValue}>
                                                {c.currentRedemptions} {c.maxRedemptions ? `/ ${c.maxRedemptions}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    {c.isActive && (
                                        <div className={styles.tableCardActions}>
                                            <Button type="button" variant="danger" size="sm" onClick={() => handleDeactivateCoupon(c._id)}>
                                                Deactivate
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.couponFormPanel}>
                        <h3 className={styles.couponFormTitle}>Create Coupon</h3>

                        <Select
                            label="Target Tier"
                            value={couponForm.tier}
                            onChange={(e) => setCouponForm({ ...couponForm, tier: e.target.value })}
                            options={[{ value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }]}
                        />

                        <div className={styles.formRow}>
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

                        <Button variant="primary" fullWidth loading={creatingCoupon} onClick={handleCreateCoupon} className={styles.formSubmitSpacer}>
                            Create &amp; Send Coupon
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
