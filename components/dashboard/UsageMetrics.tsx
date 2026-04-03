'use client';

import { useState, useEffect, useMemo } from 'react';
import { getUsage } from '@/lib/api';
import Card from '@/components/ui/Card';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { BarChart3, TrendingUp, DollarSign, Activity } from 'lucide-react';
import styles from './Dashboard.module.css';

interface UsageMetricsProps {
    agentId: string;
}

export default function UsageMetrics({ agentId }: UsageMetricsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadUsage() {
            try {
                const result = await getUsage(agentId);
                setData(result);
            } catch (err) {
                console.error('Failed to load usage metrics', err);
            } finally {
                setLoading(false);
            }
        }
        loadUsage();
    }, [agentId]);

    if (loading) return <SkeletonLoader variant="card" count={1} />;
    if (!data) return null;

    const summary = data.summary;

    return (
        <div className={styles.metricsGrid}>
            <Card>
                <div className={styles.metricTile}>
                    <div className={styles.metricIcon} style={{ background: 'rgba(39, 121, 255, 0.1)', color: 'var(--accent-blue)' }}>
                        <BarChart3 size={20} />
                    </div>
                    <div className={styles.metricContent}>
                        <div className={styles.metricValue}>{(summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()}</div>
                        <div className={styles.metricLabel}>Total Tokens</div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className={styles.metricTile}>
                    <div className={styles.metricIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        <DollarSign size={20} />
                    </div>
                    <div className={styles.metricContent}>
                        <div className={styles.metricValue}>${summary.totalCost.toFixed(4)}</div>
                        <div className={styles.metricLabel}>Estimated Cost</div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className={styles.metricTile}>
                    <div className={styles.metricIcon} style={{ background: 'rgba(244, 122, 74, 0.1)', color: 'var(--accent-orange)' }}>
                        <Activity size={20} />
                    </div>
                    <div className={styles.metricContent}>
                        <div className={styles.metricValue}>{summary.totalRequests}</div>
                        <div className={styles.metricLabel}>Total Requests</div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className={styles.metricTile}>
                    <div className={styles.metricIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div className={styles.metricContent}>
                        <div className={styles.metricValue}>
                            {summary.totalRequests > 0 
                                ? ((summary.totalInputTokens + summary.totalOutputTokens) / summary.totalRequests).toFixed(0) 
                                : 0}
                        </div>
                        <div className={styles.metricLabel}>Avg. Tokens/Req</div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
