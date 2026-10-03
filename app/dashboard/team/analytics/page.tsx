'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

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
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Team Analytics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <MetricCard label="Leads Captured" value={metrics.leadsCapured} />
        <MetricCard label="Emails Sent" value={metrics.emailsSent} />
        <MetricCard label="Content Published" value={metrics.contentPublished} />
        <MetricCard label="QA Pass Rate" value={`${metrics.qaPassRate}%`} />
        <MetricCard label="Pipeline Executions" value={metrics.pipelineExecutions} />
      </div>

      <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid #e5e7eb', borderRadius: '12px', textAlign: 'center', color: '#6b7280' }}>
        <p>Detailed analytics will populate once your team has been active for 24+ hours.</p>
        <p style={{ fontSize: '0.85rem' }}>The Analytics Agent generates automated weekly reports delivered to your configured channels.</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
