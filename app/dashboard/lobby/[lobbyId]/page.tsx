'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { fetchLobby, sendLobbyMessage, ILobby, IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import AgentDrive from '@/components/dashboard/AgentDrive';
import styles from '@/components/dashboard/Dashboard.module.css';
import room from './LobbyRoom.module.css';
import { Send, Users, HardDrive } from 'lucide-react';
import { createSocket } from '@/lib/socket';
import { FEATURES } from '@/lib/features';

interface LobbyMessage {
  senderName: string;
  content: string;
  timestamp: string;
}

export default function LobbyDetailPage() {
  const { lobbyId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lobby, setLobby] = useState<ILobby | null>(null);
  /* The room's own view of a feed entry — the socket payload is trusted
     for these three fields only, and rendering code should not spread
     wider than that. */
  /* The room's own view of a feed entry — the socket payload is trusted
     for these three fields only, and rendering code should not spread
     wider than that. */
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [input, setInput] = useState('');
  const [showDrive, setShowDrive] = useState(false);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Declared before the effect that calls them — the effect previously
     referenced both above their declarations, which the compiler tolerates
     only because they are read at invocation time, not render time. */
  const loadLobby = async () => {
    try {
      const data = await fetchLobby(lobbyId as string);
      setLobby(data);
    } catch {
      toast('Failed to load lobby', 'error');
    }
  };

  const setupSocket = () => {
    // createSocket() carries the JWT; the backend rejects an anonymous
    // handshake, so the raw io() this replaces never connected at all.
    socketRef.current = createSocket();

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('lobby:join', lobbyId);
    });

    socketRef.current.on('connect_error', (err: Error) => {
      console.warn('[Socket] Connection rejected:', err.message);
    });

    socketRef.current.on('lobby:message', (msg: LobbyMessage) => {
      setMessages(prev => [...prev, msg]);
    });
  };

  useEffect(() => {
    // Gated: while the lobby flag is dark this page renders the placeholder
    // and must not join the socket room or fetch the lobby.
    if (!FEATURES.lobby || !lobbyId) return;
    loadLobby();
    setupSocket();
    return () => {
      socketRef.current?.emit('lobby:leave', lobbyId);
      socketRef.current?.disconnect();
    };
    // The room effect runs per lobbyId only: the loaders are re-created
    // every render and belong to no dependency that should rejoin the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !user) return;
    try {
      await sendLobbyMessage(lobbyId as string, input, user.email, 'User');
      setInput('');
    } catch {
      toast('Failed to send message', 'error');
    }
  };

  /* Same section gate as the lobby list: a direct URL to a room must not
     expose live lobby UI while the flag is dark. */
  if (!FEATURES.lobby) {
    return (
      <div className={room.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><Users size={48} /></div>
          <div className={styles.emptyTitle}>The Lobby is not open yet</div>
          <p className={styles.emptyDescription}>
            Multi-agent collaboration sessions are still being figured out. This
            section opens once it is fully working.
          </p>
        </div>
      </div>
    );
  }

  if (!lobby) return <div className={room.loading}>Loading lobby...</div>;

  /* Who to show in the sidebar: embedded agent records when the document
     carries them, ids otherwise. No `as IAgent[]` over a string[]. */
  const presentAgents = Array.isArray(lobby.agentIds)
    ? lobby.agentIds.filter((a): a is IAgent => typeof a === 'object' && a !== null)
    : [];
  const presentAgentStrings = Array.isArray(lobby.agentIds)
    ? lobby.agentIds.filter((a): a is string => typeof a === 'string')
    : [];

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
            {presentAgents.length === 0 && !presentAgentStrings.length && (
              <div className={room.agentName}>No agents have joined yet.</div>
            )}
            {presentAgents.map(agent => (
              <div key={agent.agentId} className={room.agentRow}>
                <div className={agent.status === 'running' ? room.agentDotRunning : room.agentDotStopped} />
                <span className={room.agentName}>{agent.name || agent.agentId}</span>
              </div>
            ))}
            {/* The schema is a union: `agentIds` arrives as either ids or embedded
               agent records depending on the writer. Casts hid that; the room
               renders whichever half it actually received. */}
            {presentAgentStrings.map(id => (
              <div key={id} className={room.agentRow}>
                <div className={room.agentDotStopped} />
                <span className={room.agentName}>{id}</span>
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
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendMessage}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send size={14} aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {/* AgentDrive owns its modal — wrapping it in another one stacked two
          scrims and two Esc handlers over the same overlay. */}
      <AgentDrive
        agent={{ agentId: lobby.lobbyId } as IAgent}
        open={showDrive}
        onClose={() => setShowDrive(false)}
        // In a real implementation, we'd pass the special drivePrefix here
      />
    </div>
  );
}
