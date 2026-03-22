'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { fetchLobbies, createLobby, deleteLobby, ILobby, fetchAgents, IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from '@/components/dashboard/Dashboard.module.css';
import Link from 'next/link';
import { Plus, Trash2, Users } from 'lucide-react';

export default function LobbyListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lobbies, setLobbies] = useState<ILobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [availableAgents, setAvailableAgents] = useState<IAgent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  useEffect(() => {
    if (user?.tenantId) {
      loadLobbies();
      loadAgents();
    }
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

  const handleDeleteLobby = async (lobbyId: string) => {
    try {
      await deleteLobby(lobbyId);
      toast('Lobby deleted', 'success');
      loadLobbies();
    } catch {
      toast('Failed to delete lobby', 'error');
    }
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div className={styles.dashboardHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>A2A Lobby</h1>
          <p className={styles.headerSubtitle}>Multi-agent collaboration sessions</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Plus size={16} />}
          onClick={() => setShowCreate(true)}
        >
          Create Lobby
        </Button>
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
                <Link href={`/dashboard/lobby/${lobby.lobbyId}`} passHref>
                  <Button variant="ghost" size="sm">Enter Lobby</Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={<Trash2 size={12} />} 
                  className={styles.dangerButton}
                  onClick={() => handleDeleteLobby(lobby.lobbyId)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Collaboration Lobby">
        <div className={styles.wizardSteps}>
          <Input 
            label="Lobby Name" 
            placeholder="e.g. Project Architecture Sync" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div style={{ marginTop: '1rem' }}>
            <p className={styles.headerSubtitle} style={{ marginBottom: '0.5rem' }}>Select Agents to Invite</p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
              {availableAgents.map(agent => (
                <div key={agent._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedAgents.includes(agent.agentId)}
                    onChange={() => toggleAgent(agent.agentId)}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)' }}>{agent.name || agent.agentId}</span>
                </div>
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
