'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { fetchAgents, stopAgent, startAgent, pauseAgent, resumeAgent, restartAgent, deleteAgent, getAuditLogs, IAgent, IAuditLog } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AgentList from '@/components/dashboard/AgentList';
import AgentCreationWizard from '@/components/dashboard/AgentCreationWizard';
import ConfirmDestructiveAction from '@/components/dashboard/ConfirmDestructiveAction';
import HumanApprovalQueue from '@/components/dashboard/HumanApprovalQueue';
import ConfigEditor from '@/components/dashboard/ConfigEditor';
import LogsPanel from '@/components/dashboard/LogsPanel';
import CustomKeyModal from '@/components/dashboard/CustomKeyModal';
import HttpDetailsModal from '@/components/dashboard/HttpDetailsModal';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { createSocket } from '@/lib/socket';
import styles from '@/components/dashboard/Dashboard.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [agents, setAgents] = useState<IAgent[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showWizard, setShowWizard] = useState(false);
  const [stopTarget, setStopTarget] = useState<IAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IAgent | null>(null);
  const [stopping, setStopping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [configAgent, setConfigAgent] = useState<IAgent | null>(null);
  const [logsAgent, setLogsAgent] = useState<IAgent | null>(null);
  const [customKeyAgent, setCustomKeyAgent] = useState<IAgent | null>(null);
  const [httpDetailsAgent, setHttpDetailsAgent] = useState<IAgent | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  // The socket effect runs once and must not close over `agents`, or the
  // socket would be torn down and rebuilt on every status update. A ref gives
  // the connect handler the current list without a dependency on it.
  const agentsRef = useRef<IAgent[]>([]);
  agentsRef.current = agents;

  const loadData = useCallback(async () => {
    if (!user?.tenantId) return;
    try {
      const [agentData] = await Promise.all([
        fetchAgents(user.tenantId),
      ]);
      setAgents(agentData);

      // Load pending approvals for all agents
      const logPromises = agentData.map((a: IAgent) =>
        getAuditLogs(a.agentId, undefined, 'pending_human_approval').catch(() => [])
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

  // Create socket once
  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      // Subscribe on (re)connect, not just in the list effect below: that
      // effect early-returns while !socket.connected, and connect is async, so
      // the very first pass almost always ran against a socket that was not
      // ready yet and every agent silently missed its room.
      agentsRef.current.forEach(agent => {
        socket.emit('subscribe', agent.agentId);
      });
    });

    socket.on('connect_error', (err: Error) => {
      console.warn('[Socket] Connection rejected:', err.message);
    });

    socket.on('agent:status', ({ agentId, status }) => {
      console.log(`[Socket] Agent ${agentId} status update: ${status}`);
      setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, status } : a));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Only run once

  // Subscribe to agents whenever the list changes, or on reconnect
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    agents.forEach(agent => {
      socket.emit('subscribe', agent.agentId);
    });
  }, [agents.length]);

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

  // Lifecycle handlers
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  /* Past tenses spelled out: templating `${action}ed` shipped "pauseed" and
     "restarteded" next to real buttons. */
  const actionDone: Record<string, string> = {
    start: 'started',
    pause: 'paused',
    resume: 'resumed',
    restart: 'restarted',
  };

  /* One lifecycle transition at a time: the buttons stay enabled across the
     await, and a double-tap on Start or Restart queued two conflicting
     requests that made the agent flap. */
  const handleLifecycleAction = async (action: 'start' | 'pause' | 'resume' | 'restart', agent: IAgent) => {
    if (pendingAction) return;
    setPendingAction(`${agent.agentId}:${action}`);
    const actions = { start: startAgent, pause: pauseAgent, resume: resumeAgent, restart: restartAgent };
    try {
      await actions[action](agent.agentId);
      toast(`Agent ${actionDone[action]} successfully`, 'success');
      loadData();
    } catch {
      toast(`Failed to ${action} agent`, 'error');
    } finally {
      setPendingAction(null);
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
        <div className={styles.skeletonGrid}>
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : (
        <AgentList
          agents={agents}
          onSettings={(a) => setConfigAgent(a)}
          onStop={(a) => setStopTarget(a)}
          onStart={(a) => handleLifecycleAction('start', a)}
          onPause={(a) => handleLifecycleAction('pause', a)}
          onResume={(a) => handleLifecycleAction('resume', a)}
          onRestart={(a) => handleLifecycleAction('restart', a)}
          onDelete={(a) => setDeleteTarget(a)}
          onLogs={(a) => setLogsAgent(a)}
          onCustomKey={(a) => setCustomKeyAgent(a)}
          onHttpDetails={(a) => setHttpDetailsAgent(a)}
          pendingAction={pendingAction}
        />
      )}

      {/* Modals */}
      <AgentCreationWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={loadData}
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

      <HttpDetailsModal
        agent={httpDetailsAgent}
        open={!!httpDetailsAgent}
        onClose={() => setHttpDetailsAgent(null)}
      />
    </>
  );
}
