'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { fetchLobby, sendLobbyMessage, ILobby, IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AgentDrive from '@/components/dashboard/AgentDrive';
import styles from '@/components/dashboard/Dashboard.module.css';
import { Send, Users, HardDrive } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

export default function LobbyDetailPage() {
  const { lobbyId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lobby, setLobby] = useState<ILobby | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showDrive, setShowDrive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lobbyId) {
      loadLobby();
      setupSocket();
    }
    return () => {
      socketRef.current?.emit('lobby:leave', lobbyId);
      socketRef.current?.disconnect();
    };
  }, [lobbyId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadLobby = async () => {
    try {
      const data = await fetchLobby(lobbyId as string);
      setLobby(data);
    } catch {
      toast('Failed to load lobby', 'error');
    }
  };

  const setupSocket = () => {
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('lobby:join', lobbyId);
    });

    socketRef.current.on('lobby:message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !user) return;
    try {
      await sendLobbyMessage(lobbyId as string, input, user.email, 'User');
      setInput('');
    } catch {
      toast('Failed to send message', 'error');
    }
  };

  if (!lobby) return <div style={{ padding: '2rem' }}>Loading lobby...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', padding: '2rem' }}>
      <div className={styles.dashboardHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>{lobby.name}</h1>
          <p className={styles.headerSubtitle}>{lobby.lobbyId} • Multi-Agent Workspace</p>
        </div>
        <Button 
          variant="ghost" 
          icon={<HardDrive size={16} />}
          onClick={() => setShowDrive(true)}
        >
          Shared Drive
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Sidebar: Agents */}
        <div style={{ border: 'var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-color)', overflowY: 'auto' }}>
          <h3 className={styles.headerSubtitle} style={{ marginBottom: '1rem' }}>Agents present</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(lobby.agentIds as IAgent[]).map(agent => (
              <div key={agent._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', border: '1px solid rgba(26,26,26,0.06)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: agent.status === 'running' ? '#2ea043' : '#e54d2e' }} />
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{agent.name || agent.agentId}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Conversation */}
        <div className={styles.chatPanel} style={{ height: 'auto', flex: 1 }}>
          <div className={styles.chatHeader}>
            <span>REAL-TIME COLLABORATION FEED</span>
            <span style={{ fontSize: '10px' }}>{messages.length} messages</span>
          </div>
          <div className={styles.chatMessages} style={{ padding: '1.5rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--mid-grey)', padding: '2rem' }}>
                <p style={{ fontSize: 'var(--font-size-xs)' }}>NO MESSAGES YET</p>
                <p style={{ fontSize: '10px' }}>Agents will collaborate here in real-time</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.senderName === 'User' ? styles.chatBubbleUser : styles.chatBubbleAgent}>
                <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '0.25rem', opacity: 0.8 }}>
                  {msg.senderName.toUpperCase()}
                </div>
                {msg.content}
                <div style={{ fontSize: '8px', textAlign: 'right', marginTop: '0.25rem', opacity: 0.6 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          <div className={styles.chatInputArea}>
            <input 
              className={styles.chatInput}
              placeholder="Send a directive to all agents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button variant="primary" size="sm" onClick={handleSendMessage} disabled={!input.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showDrive} onClose={() => setShowDrive(false)} title="Lobby Shared Drive">
        <div style={{ height: '500px', overflowY: 'auto' }}>
          <AgentDrive 
            agent={{ agentId: lobby.lobbyId } as any} 
            open={showDrive} 
            onClose={() => setShowDrive(false)} 
            // In a real implementation, we'd pass the special drivePrefix here
          />
        </div>
      </Modal>
    </div>
  );
}
