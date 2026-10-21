'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { fetchLobbies, createLobby, deleteLobby, ILobby, fetchAgents, IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDestructiveAction from '@/components/dashboard/ConfirmDestructiveAction';
import styles from '@/components/dashboard/Dashboard.module.css';
import lb from './LobbyList.module.css';
import Link from 'next/link';
import { Plus, Trash2, Users } from 'lucide-react';
import { FEATURES } from '@/lib/features';

export default function LobbyListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lobbies, setLobbies] = useState<ILobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [availableAgents, setAvailableAgents] = useState<IAgent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  /* Deleting a lobby destroys its room and its drive — behind a flag but a
     real action, and it used to fire on the first click with no talk. */
  const [deleteTarget, setDeleteTarget] = useState<ILobby | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Gated: while the lobby flag is dark the page renders the placeholder
    // below and must not talk to the backend.
    if (!FEATURES.lobby || !user?.tenantId) return;
    loadLobbies();
    loadAgents();
  }, [user?.tenantId]);

  const loadLobbies = async () => {
    try {
      const data = await fetchLobbies(user!.tenantId);
      setLobbies(data);
    } catch {
      toast('Failed to load lobbies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await fetchAgents(user!.tenantId);
      setAvailableAgents(data);
    } catch {
      toast('Failed to load agents', 'error');
    }
  };

  const handleCreateLobby = async () => {
    if (!newName.trim() || selectedAgents.length === 0) return;
    try {
      await createLobby(user!.tenantId, newName, selectedAgents);
      toast('Lobby created', 'success');
      setShowCreate(false);
      setNewName('');
      setSelectedAgents([]);
      loadLobbies();
    } catch {
      toast('Failed to create lobby', 'error');
    }
  };

  const handleDeleteLobby = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLobby(deleteTarget.lobbyId);
      toast('Lobby deleted', 'success');
      setDeleteTarget(null);
      loadLobbies();
    } catch {
      toast('Failed to delete lobby', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  /* The lobby ships behind its own flag until the multi-agent flow is fully
     figured out: the sidebar has no Lobby link while dark, and this return
     makes a bookmark, stale tab or typed URL land on the placeholder rather
     than on live lobby UI. */
  if (!FEATURES.lobby) {
    return (
      <div className={lb.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><Users size={48} /></div>
          <div className={styles.emptyTitle}>The Lobby is not open yet</div>
          <p className={styles.emptyDescription}>
            Multi-agent collaboration sessions are still being figured out. This
            section opens once it is fully working — nothing else in the dashboard
            is affected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={lb.page}>
      <div className={styles.dashboardHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>A2A Lobby</h1>
          <p className={styles.headerSubtitle}>Multi-agent collaboration sessions</p>
        </div>
        <div className={lb.headerActions}>
          <Button 
            variant="primary" 
            icon={<Plus size={16} />}
            onClick={() => setShowCreate(true)}
            disabled={process.env.NEXT_PUBLIC_NODE_ENV === 'prod'}
            title={process.env.NEXT_PUBLIC_NODE_ENV === 'prod' ? "Coming soon" : ""}
          >
            Create Lobby
          </Button>
          {process.env.NEXT_PUBLIC_NODE_ENV === 'prod' && (
            <span className={lb.comingSoonNote}>
              COMING SOON: UNDER CONSTRUCTION
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p>Loading lobbies...</p>
      ) : lobbies.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><Users size={48} /></div>
          <div className={styles.emptyTitle}>No collaboration sessions</div>
          <p className={styles.emptyDescription}>Create a lobby to let multiple agents work together.</p>
        </div>
      ) : (
        <div className={styles.agentGrid}>
          {lobbies.map((lobby) => (
            <div key={lobby._id} className={styles.agentCard}>
              <div className={styles.agentCardHeader}>
                <span className={styles.agentName}>{lobby.name}</span>
                <span className={styles.agentMetaItem}>{lobby.lobbyId}</span>
              </div>
              <div className={styles.agentMeta}>
                <span>{Array.isArray(lobby.agentIds) ? lobby.agentIds.length : 0} Agents</span>
              </div>
              <div className={styles.agentActions}>
                <Link href={`/dashboard/lobby/${lobby.lobbyId}`} className="btn-ghost">
                  Enter Lobby
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  className={styles.dangerButton}
                  onClick={() => setDeleteTarget(lobby)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDestructiveAction
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteLobby}
        title="Delete Lobby"
        confirmText={deleteTarget?.lobbyId || 'confirm'}
        loading={deleting}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Collaboration Lobby">
        <div className={styles.wizardSteps}>
          <Input 
            label="Lobby Name" 
            placeholder="e.g. Project Architecture Sync" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className={lb.pickerSection}>
            <p className={`${styles.headerSubtitle} ${lb.pickerTitle}`}>Select Agents to Invite</p>
            <div className={lb.pickerList}>
              {availableAgents.length === 0 ? (
                <div className={lb.pickerEmpty}>No agents available to invite.</div>
              ) : availableAgents.map(agent => (
                <label key={agent._id} className={lb.pickerRow}>
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent.agentId)}
                    onChange={() => toggleAgent(agent.agentId)}
                  />
                  <span className={lb.pickerName}>{agent.name || agent.agentId}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.wizardActionsEnd}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateLobby} disabled={!newName.trim() || selectedAgents.length === 0}>
              Create Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
