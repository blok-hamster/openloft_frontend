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
  const { user } = useAuth();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        headers: { Authorization: `Bearer ${(user as any)?.token}` },
      });
      const deployments = await res.json();
      if (deployments.length > 0) {
        setDeployment(deployments[0]);
        const detailRes = await fetch(`${API_URL}/api/teams/${deployments[0].deploymentId}`, {
          headers: { Authorization: `Bearer ${(user as any)?.token}` },
        });
        const detail = await detailRes.json();
        setAgents(detail.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseTeam = async () => {
    if (!deployment) return;
    await fetch(`${API_URL}/api/teams/${deployment.deploymentId}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(user as any)?.token}` },
    });
    fetchTeamData();
  };

  const handleResumeTeam = async () => {
    if (!deployment) return;
    await fetch(`${API_URL}/api/teams/${deployment.deploymentId}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(user as any)?.token}` },
    });
    fetchTeamData();
  };

  if (loading) return <div className={styles.loading}>Loading team...</div>;
  if (!deployment) return <div className={styles.empty}>No enterprise team deployed. <Link href="/enterprise">Get started</Link></div>;

  const statusColor = (status: string) => {
    if (status === 'running') return '#10b981';
    if (status === 'stopped') return '#f59e0b';
    if (status === 'failed') return '#ef4444';
    return '#6b7280';
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
