'use client';

import { useState, useEffect } from 'react';
import { getUsage } from '@/lib/api';
import Card from '@/components/ui/Card';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { BarChart3, TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import styles from './Dashboard.module.css';

interface UsageMetricsProps {
    agentId: string;
}

interface UsageSummary {
    totalInputTokens?: number;
    totalOutputTokens?: number;
    totalCost?: number;
    totalRequests?: number;
}

/** Normalise whatever the endpoint returns. Previously the component read
 *  `data.summary.totalInputTokens` unguarded, so an API that returned
 *  `{}` or omitted `summary` threw during render and took the whole
 *  dashboard section down with it. */
function summarise(data: unknown): UsageSummary {
    const summary = (data as { summary?: Partial<UsageSummary> } | null)?.summary;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    return {
        totalInputTokens: num(summary?.totalInputTokens),
        totalOutputTokens: num(summary?.totalOutputTokens),
        totalCost: num(summary?.totalCost),
        totalRequests: num(summary?.totalRequests),
    };
}

export default function UsageMetrics({ agentId }: UsageMetricsProps) {
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);

        getUsage(agentId)
            .then((result) => {
                if (cancelled) return;
                setSummary(summarise(result));
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Failed to load usage metrics', err);
                setFailed(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        /* Guards against a slow response for a previous agent overwriting
           the current one. */
        return () => {
            cancelled = true;
        };
    }, [agentId]);

    if (loading) return <SkeletonLoader variant="card" count={1} />;

    /* Previously returned null with only a console.error — a silent hole. */
    if (failed || !summary) {
        return (
            <div className={styles.metricsError} role="alert">
                <AlertTriangle size={16} aria-hidden />
                Usage metrics unavailable for this agent.
            </div>
        );
    }

    const totalTokens = summary.totalInputTokens! + summary.totalOutputTokens!;
    const avgTokens = summary.totalRequests! > 0
        ? Math.round(totalTokens / summary.totalRequests!)
        : 0;

    const tiles = [
        {
            key: 'tokens',
            icon: BarChart3,
            tint: 'rgba(39, 121, 255, 0.1)',
            color: 'var(--accent-blue)',
            value: totalTokens.toLocaleString(),
            label: 'Total Tokens',
        },
        {
            key: 'cost',
            icon: DollarSign,
            tint: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            value: `$${summary.totalCost!.toFixed(4)}`,
            label: 'Estimated Cost',
        },
        {
            key: 'requests',
            icon: Activity,
            tint: 'rgba(244, 122, 74, 0.1)',
            color: 'var(--accent-coral)',
            value: summary.totalRequests!.toLocaleString(),
            label: 'Total Requests',
        },
        {
            key: 'avg',
            icon: TrendingUp,
            tint: 'rgba(168, 85, 247, 0.1)',
            color: '#a855f7',
            value: avgTokens.toLocaleString(),
            label: 'Avg. Tokens/Req',
        },
    ];

    return (
        <div className={styles.metricsGrid}>
            {tiles.map((t) => {
                const Icon = t.icon;
                return (
                    <Card key={t.key}>
                        <div className={styles.metricTile}>
                            <div className={styles.metricIcon} style={{ background: t.tint, color: t.color }}>
                                <Icon size={20} aria-hidden />
                            </div>
                            <div className={styles.metricContent}>
                                <div className={styles.metricValue}>{t.value}</div>
                                <div className={styles.metricLabel}>{t.label}</div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
