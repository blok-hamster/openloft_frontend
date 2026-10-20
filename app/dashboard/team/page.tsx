'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import PipelineFlow from '@/components/enterprise/PipelineFlow';
import styles from './Team.module.css';

interface AgentStatus {
  agentId: string;
  name: string;
  teamRole: string;
  status: string;
}

interface Deployment {
  deploymentId: string;
  status: string;
  onboardingStatus: string;
  agentIds: string[];
}

export default function TeamDashboardPage() {
  const { token } = useAuth();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  /* Failures render as errors, not as the empty state: "No enterprise team
     deployed" told a broken backend to go create a new deployment. */
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /* `(user as any)?.token` was always undefined — the token lives beside
     the user in the auth context, not on the user object; every team
     request went out as `Bearer undefined`. */
  const authHeaders = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/teams`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`team lookup failed (${res.status})`);
      const deployments = await res.json();
      if (deployments.length > 0) {
        setDeployment(deployments[0]);
        const detailRes = await fetch(`${API_URL}/api/teams/${deployments[0].deploymentId}`, {
          headers: authHeaders(),
        });
        if (!detailRes.ok) throw new Error(`team detail failed (${detailRes.status})`);
        const detail = await detailRes.json();
        setAgents(detail.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      setError('Failed to load your team. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseTeam = async () => {
    if (!deployment) return;
    try {
      const res = await fetch(`${API_URL}/api/teams/${deployment.deploymentId}/pause`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`pause failed (${res.status})`);
    } catch (error) {
      console.error('Failed to pause team:', error);
      setError('Failed to pause the team.');
    }
    fetchTeamData();
  };

  const handleResumeTeam = async () => {
    if (!deployment) return;
    try {
      const res = await fetch(`${API_URL}/api/teams/${deployment.deploymentId}/resume`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`resume failed (${res.status})`);
    } catch (error) {
      console.error('Failed to resume team:', error);
      setError('Failed to resume the team.');
    }
    fetchTeamData();
  };

  if (loading) return <div className={styles.loading}>Loading team...</div>;
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.empty} role="alert">
          {error}
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className={styles.btnPrimary} onClick={fetchTeamData}>Retry</button>
          </div>
        </div>
      </div>
    );
  }
  if (!deployment) return <div className={styles.empty}>No enterprise team deployed. <Link href="/enterprise">Get started</Link></div>;

  /* Kit palette, not the ad-hoc hexes these used before: the team page
     spoke a different colour language than StatusIndicator, and "paused"
     was amber here but coral in the agents console. */
  const statusColor = (status: string) => {
    if (status === 'running') return 'var(--accent-green)';
    if (status === 'paused') return 'var(--accent-amber)';
    if (status === 'failed') return 'var(--accent-coral)';
    return 'var(--mid-grey)';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Sales Team</h1>
          <span className={styles.status} style={{ color: statusColor(deployment.status) }}>
            {deployment.status}
          </span>
        </div>
        <div className={styles.actions}>
          {deployment.status === 'active' && (
            <button type="button" onClick={handlePauseTeam} className={styles.btnSecondary}>Pause Team</button>
          )}
          {deployment.status === 'paused' && (
            <button type="button" onClick={handleResumeTeam} className={styles.btnPrimary}>Resume Team</button>
          )}
        </div>
      </div>

      <div className={styles.agentGrid}>
        {agents.map((agent) => (
          <div key={agent.agentId} className={styles.agentCard}>
            <div className={styles.agentStatus} style={{ background: statusColor(agent.status) }} />
            <div>
              <div className={styles.agentRole}>{agent.teamRole?.replace('_', ' ')}</div>
              <div className={styles.agentName}>{agent.name}</div>
              <div className={styles.agentStatusText}>{agent.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pipelineSection}>
        <h2 className={styles.sectionTitle}>Pipeline Flow</h2>
        <PipelineFlow agents={agents} />
      </div>
    </div>
  );
}
