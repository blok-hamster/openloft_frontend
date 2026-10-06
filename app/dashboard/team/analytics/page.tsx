'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import styles from './TeamAnalytics.module.css';

interface Metrics {
  leadsCapured: number;
  emailsSent: number;
  contentPublished: number;
  qaPassRate: number;
  pipelineExecutions: number;
}

export default function TeamAnalyticsPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>({
    leadsCapured: 0,
    emailsSent: 0,
    contentPublished: 0,
    qaPassRate: 0,
    pipelineExecutions: 0,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        headers: { Authorization: `Bearer ${(user as any)?.token}` },
      });
      const deployments = await res.json();
      if (deployments.length > 0) {
        // Metrics would come from a dedicated endpoint in production
        setMetrics({
          leadsCapured: 0,
          emailsSent: 0,
          contentPublished: 0,
          qaPassRate: 0,
          pipelineExecutions: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Team Analytics</h1>

      <div className={styles.metricGrid}>
        <MetricCard label="Leads Captured" value={metrics.leadsCapured} />
        <MetricCard label="Emails Sent" value={metrics.emailsSent} />
        <MetricCard label="Content Published" value={metrics.contentPublished} />
        <MetricCard label="QA Pass Rate" value={`${metrics.qaPassRate}%`} />
        <MetricCard label="Pipeline Executions" value={metrics.pipelineExecutions} />
      </div>

      <div className={styles.notice}>
        <p>Detailed analytics will populate once your team has been active for 24+ hours.</p>
        <p className={styles.noticeDetail}>The Analytics Agent generates automated weekly reports delivered to your configured channels.</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  );
}
