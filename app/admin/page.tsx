'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getFleetHealth, getTenants, restartFleet, syncPolicy, uploadSkill, IFleetHealthResponse, ITenant } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import styles from '@/components/admin/Admin.module.css';

export default function AdminPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);

    const [health, setHealth] = useState<IFleetHealthResponse | null>(null);
    const [tenants, setTenants] = useState<ITenant[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [healthData, tenantData] = await Promise.all([
                getFleetHealth(),
                getTenants(),
            ]);
            setHealth(healthData);
            setTenants(tenantData);
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
        </div>
    );
}
