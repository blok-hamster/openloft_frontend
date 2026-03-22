'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { fetchAgents, stopAgent, startAgent, pauseAgent, resumeAgent, restartAgent, deleteAgent, getAuditLogs, IAgent, IAuditLog } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AgentList from '@/components/dashboard/AgentList';
import AgentCreationWizard from '@/components/dashboard/AgentCreationWizard';
import AgentChatPanel from '@/components/dashboard/AgentChatPanel';
import MemoryEditor from '@/components/dashboard/MemoryEditor';
import AgentDrive from '@/components/dashboard/AgentDrive';
import ConfirmDestructiveAction from '@/components/dashboard/ConfirmDestructiveAction';
import HumanApprovalQueue from '@/components/dashboard/HumanApprovalQueue';
import ConfigEditor from '@/components/dashboard/ConfigEditor';
import LogsPanel from '@/components/dashboard/LogsPanel';
import CustomKeyModal from '@/components/dashboard/CustomKeyModal';
import SocialConnections from '@/components/dashboard/SocialConnections';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { io } from 'socket.io-client';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [agents, setAgents] = useState<IAgent[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showWizard, setShowWizard] = useState(false);
  const [chatAgent, setChatAgent] = useState<IAgent | null>(null);
  const [memoryAgent, setMemoryAgent] = useState<IAgent | null>(null);
  const [driveAgent, setDriveAgent] = useState<IAgent | null>(null);
  const [stopTarget, setStopTarget] = useState<IAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IAgent | null>(null);
  const [stopping, setStopping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [configAgent, setConfigAgent] = useState<IAgent | null>(null);
  const [logsAgent, setLogsAgent] = useState<IAgent | null>(null);
  const [customKeyAgent, setCustomKeyAgent] = useState<IAgent | null>(null);
  const [channelsAgent, setChannelsAgent] = useState<IAgent | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.tenantId) return;
    try {
      const [agentData] = await Promise.all([
        fetchAgents(user.tenantId),
      ]);
      setAgents(agentData);

      // Load pending approvals for all agents
      const logPromises = agentData.map((a: IAgent) =>
        getAuditLogs(a.agentId, undefined, 'pending').catch(() => [])
      );
      const allLogs = (await Promise.all(logPromises)).flat();
      setAuditLogs(allLogs);
    } catch {
      toast('Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll while any agent is provisioning or starting
  useEffect(() => {
    const hasActiveTransition = agents.some(a => ['provisioning', 'starting'].includes(a.status));
    if (hasActiveTransition) {
      pollRef.current = setInterval(() => loadData(), 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [agents, loadData]);

  // Real-time status updates via Socket.io
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      // Subscribe to all current agents
      agents.forEach(agent => {
        socket.emit('subscribe', agent.agentId);
      });
    });

    socket.on('agent:status', ({ agentId, status }) => {
      console.log(`[Socket] Agent ${agentId} status update: ${status}`);
      setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, status } : a));
    });

    return () => {
      socket.disconnect();
    };
  }, [agents.length]); // Re-subscribe if list size changes (new agent added)

  // Lifecycle handlers
  const handleStop = async () => {
    if (!stopTarget) return;
    setStopping(true);
    try {
      await stopAgent(stopTarget.agentId);
      toast('Agent stopped', 'success');
      setStopTarget(null);
      loadData();
    } catch {
      toast('Failed to stop agent', 'error');
    } finally {
      setStopping(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAgent(deleteTarget.agentId);
      toast('Agent deleted', 'success');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast('Failed to delete agent', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleLifecycleAction = async (action: 'start' | 'pause' | 'resume' | 'restart', agent: IAgent) => {
    const actions = { start: startAgent, pause: pauseAgent, resume: resumeAgent, restart: restartAgent };
    try {
      await actions[action](agent.agentId);
      toast(`Agent ${action}ed successfully`, 'success');
      loadData();
    } catch {
      toast(`Failed to ${action} agent`, 'error');
    }
  };

  return (
    <>
      <DashboardHeader
        agentCount={agents.length}
        onDeploy={() => setShowWizard(true)}
      />

      <HumanApprovalQueue logs={auditLogs} onUpdate={loadData} />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : (
        <AgentList
          agents={agents}
          onChat={(a) => setChatAgent(a)}
          onMemory={(a) => setMemoryAgent(a)}
          onDrive={(a) => setDriveAgent(a)}
          onSettings={(a) => setConfigAgent(a)}
          onStop={(a) => setStopTarget(a)}
          onStart={(a) => handleLifecycleAction('start', a)}
          onPause={(a) => handleLifecycleAction('pause', a)}
          onResume={(a) => handleLifecycleAction('resume', a)}
          onRestart={(a) => handleLifecycleAction('restart', a)}
          onDelete={(a) => setDeleteTarget(a)}
          onLogs={(a) => setLogsAgent(a)}
          onCustomKey={(a) => setCustomKeyAgent(a)}
          onChannels={(a) => setChannelsAgent(a)}
        />
      )}

      {/* Chat Panel */}
      {chatAgent && (
        <div style={{ marginTop: '2rem' }}>
          <AgentChatPanel agent={chatAgent} onClose={() => setChatAgent(null)} />
        </div>
      )}

      {/* Modals */}
      <AgentCreationWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={loadData}
      />

      <MemoryEditor
        agent={memoryAgent}
        open={!!memoryAgent}
        onClose={() => setMemoryAgent(null)}
      />

      <AgentDrive
        agent={driveAgent}
        open={!!driveAgent}
        onClose={() => setDriveAgent(null)}
      />

      <ConfirmDestructiveAction
        open={!!stopTarget}
        onClose={() => setStopTarget(null)}
        onConfirm={handleStop}
        title="Stop Agent"
        confirmText={stopTarget?.agentId || 'confirm'}
        loading={stopping}
      />

      <ConfirmDestructiveAction
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Agent"
        confirmText={deleteTarget?.agentId || 'confirm'}
        loading={deleting}
      />

      <ConfigEditor
        agent={configAgent}
        open={!!configAgent}
        onClose={() => setConfigAgent(null)}
      />

      <LogsPanel
        agent={logsAgent}
        open={!!logsAgent}
        onClose={() => setLogsAgent(null)}
      />

      <CustomKeyModal
        agent={customKeyAgent}
        open={!!customKeyAgent}
        onClose={() => setCustomKeyAgent(null)}
      />

      <SocialConnections
        agent={channelsAgent}
        open={!!channelsAgent}
        onClose={() => setChannelsAgent(null)}
      />
    </>
  );
}
