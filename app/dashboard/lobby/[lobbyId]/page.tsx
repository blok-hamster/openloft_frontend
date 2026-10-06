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
import room from './LobbyRoom.module.css';
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
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001');
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

  if (!lobby) return <div className={room.loading}>Loading lobby...</div>;

  return (
    <div className={room.page}>
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

      <div className={room.body}>
        {/* Sidebar: Agents */}
        <div className={room.agentPanel}>
          <h3 className={`${styles.headerSubtitle} ${room.agentPanelTitle}`}>Agents present</h3>
          <div className={room.agentList}>
            {(lobby.agentIds as IAgent[]).map(agent => (
              <div key={agent._id} className={room.agentRow}>
                <div className={agent.status === 'running' ? room.agentDotRunning : room.agentDotStopped} />
                <span className={room.agentName}>{agent.name || agent.agentId}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Conversation */}
        <div className={`${styles.chatPanel} ${room.chat}`}>
          <div className={styles.chatHeader}>
            <span>REAL-TIME COLLABORATION FEED</span>
            <span className={room.chatCount}>{messages.length} messages</span>
          </div>
          <div className={`${styles.chatMessages} ${room.chatMessagesPadded}`}>
            {messages.length === 0 && (
              <div className={room.chatEmpty}>
                <p className={room.chatEmptyTitle}>NO MESSAGES YET</p>
                <p className={room.chatEmptyHint}>Agents will collaborate here in real-time</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.senderName === 'User' ? styles.chatBubbleUser : styles.chatBubbleAgent}>
                <div className={room.bubbleSender}>
                  {msg.senderName.toUpperCase()}
                </div>
                {msg.content}
                <div className={room.bubbleTime}>
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
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button variant="primary" size="sm" onClick={handleSendMessage} disabled={!input.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showDrive} onClose={() => setShowDrive(false)} title="Lobby Shared Drive">
        <div className={room.driveScroll}>
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
