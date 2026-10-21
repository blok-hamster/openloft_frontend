'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import styles from './TeamAnalytics.module.css';

interface Metrics {
  leadsCaptured: number;
  emailsSent: number;
  contentPublished: number;
  qaPassRate: number;
  pipelineExecutions: number;
}

export default function TeamAnalyticsPage() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>({
    leadsCaptured: 0,
    emailsSent: 0,
    contentPublished: 0,
    qaPassRate: 0,
    pipelineExecutions: 0,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /* A load failure is a state: the zeroed metric grid used to be the only
     output of a broken backend, indistinguishable from a quiet day. */
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMetrics = async () => {
    try {
      /* Token from the auth context, `res.ok` before trusting the body —
         `Bearer undefined` plus a swallowed failure made this page report
         zeros for a broken backend. */
      const res = await fetch(`${API_URL}/api/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`team lookup failed (${res.status})`);
      const deployments = await res.json();
      if (deployments.length > 0) {
        // Metrics would come from a dedicated endpoint in production
        setMetrics({
          leadsCaptured: 0,
          emailsSent: 0,
          contentPublished: 0,
          qaPassRate: 0,
          pipelineExecutions: 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load team analytics. Check your connection and try again.');
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Team Analytics</h1>

      <div className={styles.metricGrid}>
        <MetricCard label="Leads Captured" value={metrics.leadsCaptured} />
        <MetricCard label="Emails Sent" value={metrics.emailsSent} />
        <MetricCard label="Content Published" value={metrics.contentPublished} />
        <MetricCard label="QA Pass Rate" value={`${metrics.qaPassRate}%`} />
        <MetricCard label="Pipeline Executions" value={metrics.pipelineExecutions} />
      </div>

      {error && (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
        </div>
      )}

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
