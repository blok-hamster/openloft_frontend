'use client';

import { useCallback, useState } from 'react';
import { MessageSquarePlus, RefreshCw, Send, Trash2 } from 'lucide-react';
import {
  chatMemory,
  recallMemory,
  rememberMemory,
  MemoryRecallResult,
  MemoryRememberResult,
  MemoryType,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import MemoryTypeBadge from '@/components/memory/MemoryTypeBadge';
import { formatScore, hopsLabel, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';
import views from '../MemoryViews.module.css';

const ROLES = ['user', 'assistant'] as const;
const TOP_K = [3, 5, 10, 20];

interface Turn {
  role: (typeof ROLES)[number];
  content: string;
  /** The engine's turn counter, present on replies only. */
  turn?: number;
}

/**
 * The chat surface, on purpose. Every other page in this dashboard is
 * read-only; this one is not. /chat and /remember extract facts into the
 * live memory, and /recall reinforces the records it surfaces — which is
 * exactly why the console's search box does not use these endpoints. The
 * conversation scope input keeps experiments out of a scope that matters.
 */
export default function PlaygroundPage() {
  const [conversationId, setConversationId] = useState('');

  /* --- Chat --- */
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [liveConversation, setLiveConversation] = useState<string | null>(null);

  /* --- Recall --- */
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [recallResult, setRecallResult] = useState<MemoryRecallResult | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [recallError, setRecallError] = useState<string | null>(null);

  /* --- Remember --- */
  const [rows, setRows] = useState<Turn[]>([{ role: 'user', content: '' }]);
  const [rememberResult, setRememberResult] = useState<MemoryRememberResult | null>(null);
  const [remembering, setRemembering] = useState(false);
  const [rememberError, setRememberError] = useState<string | null>(null);

  const scope = useCallback(
    () => (conversationId.trim() === '' ? undefined : conversationId.trim()),
    [conversationId],
  );

  const send = useCallback(async () => {
    const text = message.trim();
    if (text === '') return;
    setSending(true);
    setChatError(null);
    try {
      const result = await chatMemory({
        message: text,
        history: turns.map(({ role, content }) => ({ role, content })),
        conversationId: scope(),
      });
      setTurns((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: result.reply, turn: result.turn },
      ]);
      setLiveConversation(result.conversation_id);
      setMessage('');
    } catch (err) {
      setChatError(memoryErrorMessage(err));
    } finally {
      setSending(false);
    }
  }, [message, turns, scope]);

  const recall = useCallback(async () => {
    const text = query.trim();
    if (text === '') return;
    setRecalling(true);
    setRecallError(null);
    try {
      setRecallResult(
        await recallMemory({ query: text, topK, conversationId: scope() }),
      );
    } catch (err) {
      setRecallResult(null);
      setRecallError(memoryErrorMessage(err));
    } finally {
      setRecalling(false);
    }
  }, [query, topK, scope]);

  const remember = useCallback(async () => {
    const messages = rows
      .map((row) => ({ role: row.role, content: row.content.trim() }))
      .filter((row) => row.content !== '');
    if (messages.length === 0) return;
    setRemembering(true);
    setRememberError(null);
    try {
      setRememberResult(await rememberMemory({ messages, conversationId: scope() }));
    } catch (err) {
      setRememberResult(null);
      setRememberError(memoryErrorMessage(err));
    } finally {
      setRemembering(false);
    }
  }, [rows, scope]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Playground</h1>
          <p className={styles.pageSub}>
            The endpoints an application integrates with, callable by hand: one turn with memory
            interposed, the context the engine would inject, and a transcript to ingest. Useful for
            answering &ldquo;what does the memory actually do with this?&rdquo; before wiring a
            client.
          </p>
        </div>
      </header>

      <div className={views.callout}>
        <div className={styles.subPanelTitle}>This page writes to your memory</div>
        <p className={styles.caption}>
          Chat and remember extract facts, and recall reinforces the records it surfaces — the same
          behaviour a real client gets. Everything else in this dashboard is read-only. Point the
          conversation scope at a scratch value while trying things.
        </p>
      </div>

      <Card>
        <div className={views.fieldRow}>
          <Input
            label="Conversation scope"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="scratch"
            className={views.grow}
            autoComplete="off"
          />
        </div>
        <p className={styles.caption}>
          Optional, and only inside your own tenant: two scopes stay separate memories. Leave it
          empty to use the tenant&rsquo;s default scope. All three tools below share it.
        </p>
      </Card>

      {/* --- Chat: one turn, memory interposed --- */}
      <Card>
        <h2 className={styles.sectionTitle}>Chat</h2>
        <p className={styles.recordsHint}>
          Recall, inject, generate and write in a single call — the engine fuses fact extraction into
          generation, so one message both answers and remembers.
        </p>

        {turns.length > 0 && (
          <div className={views.transcript}>
            {turns.map((turn, index) => (
              <article key={`${turn.role}-${index}`} className={views.turnBox}>
                <div className={views.turnBoxHead}>
                  <span className={views.turnBoxRole}>{turn.role}</span>
                  {turn.turn !== undefined && <span>turn {turn.turn}</span>}
                </div>
                <p className={views.turnBoxBody}>{turn.content}</p>
              </article>
            ))}
          </div>
        )}

        {turns.length === 0 && (
          <p className={styles.caption}>No turns yet. Send a message to start.</p>
        )}

        <div className={views.fieldRow}>
          <Input
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should the agent remember?"
            className={views.grow}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            variant="primary"
            icon={<Send size={14} aria-hidden="true" />}
            loading={sending}
            disabled={message.trim() === ''}
            onClick={send}
          >
            Send
          </Button>
          {turns.length > 0 && (
            <Button variant="ghost" onClick={() => { setTurns([]); setLiveConversation(null); }}>
              Clear
            </Button>
          )}
        </div>

        {liveConversation && (
          <p className={styles.caption}>
            Engine conversation id: <code>{liveConversation}</code>
          </p>
        )}
        {chatError && (
          <MemoryStatePanel tone="error" title="Chat failed" body={chatError} />
        )}
      </Card>

      {/* --- Recall: the context the engine would inject --- */}
      <Card>
        <h2 className={styles.sectionTitle}>Recall</h2>
        <p className={styles.recordsHint}>
          What a client assembling its own prompt would receive for a query: the injected context,
          the hits behind it, and what they cost in tokens. Retrieval reinforces what it surfaces.
        </p>

        <div className={views.fieldRow}>
          <Input
            label="Query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you know about me?"
            className={views.grow}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                recall();
              }
            }}
          />
          <Select
            label="Top K"
            options={TOP_K.map((n) => ({ value: String(n), label: String(n) }))}
            value={String(topK)}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
          <Button
            variant="primary"
            icon={<RefreshCw size={14} aria-hidden="true" />}
            loading={recalling}
            disabled={query.trim() === ''}
            onClick={recall}
          >
            Recall
          </Button>
        </div>

        {recallError && <MemoryStatePanel tone="error" title="Recall failed" body={recallError} />}

        {recallResult && (
          <>
            <p className={styles.caption}>
              {recallResult.hits.length} hits · ~{recallResult.token_estimate} tokens of context ·
              turn {recallResult.turn}
            </p>
            <div className={views.contextBlock}>
              {recallResult.context === '' ? '(empty context — nothing relevant stored)' : recallResult.context}
            </div>
            <div className={views.hitList}>
              {recallResult.hits.map((hit, index) => (
                <div key={hit.id ?? `${hit.entity_name}-${index}`} className={views.turnBox}>
                  <div className={views.turnBoxHead}>
                    <MemoryTypeBadge type={hit.memory_type as MemoryType} />
                    <span className={views.turnBoxRole}>{hit.entity_name}</span>
                    <span title={hopsLabel(hit.hop_distance)}>
                      {hopsLabel(hit.hop_distance)}
                    </span>
                    <span className={styles.readout}>
                      <span className={styles.readoutKey}>score</span>
                      {formatScore(hit.score)}
                    </span>
                  </div>
                  <p className={views.turnBoxBody}>{hit.fact}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* --- Remember: ingest a transcript --- */}
      <Card>
        <h2 className={styles.sectionTitle}>Remember</h2>
        <p className={styles.recordsHint}>
          Ingest a transcript without generating a reply — one extraction pass over the messages,
          for backfilling history a client already holds.
        </p>

        {rows.map((row, index) => (
          <div key={index} className={views.messageRow}>
            <Select
              aria-label={`Message ${index + 1} role`}
              options={ROLES.map((role) => ({ value: role, label: role }))}
              value={row.role}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((item, i) =>
                    i === index ? { ...item, role: e.target.value as Turn['role'] } : item,
                  ),
                )
              }
            />
            <Input
              aria-label={`Message ${index + 1} content`}
              value={row.content}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, content: e.target.value } : item)),
                )
              }
              placeholder={row.role === 'user' ? 'What the user said' : 'What the assistant said'}
              className={views.messageContent}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} aria-hidden="true" />}
              aria-label={`Remove message ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}

        <div className={views.fieldRow}>
          <Button
            variant="ghost"
            icon={<MessageSquarePlus size={14} aria-hidden="true" />}
            onClick={() => setRows((prev) => [...prev, { role: 'user', content: '' }])}
          >
            Add message
          </Button>
          <Button
            variant="primary"
            loading={remembering}
            onClick={remember}
            disabled={rows.every((row) => row.content.trim() === '')}
          >
            Ingest
          </Button>
        </div>

        {rememberError && (
          <MemoryStatePanel tone="error" title="Ingest failed" body={rememberError} />
        )}

        {rememberResult && (
          <div className={styles.statGrid}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Updates ingested</div>
              <div className={styles.statValue}>{rememberResult.updates_ingested}</div>
              <div className={styles.statHint}>facts extracted from the transcript</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Overrides suppressed</div>
              <div className={styles.statValue}>{rememberResult.overrides_suppressed}</div>
              <div className={styles.statHint}>newer facts that lost to existing ones</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Consolidated</div>
              <div className={styles.statValue}>{rememberResult.consolidated ? 'yes' : 'no'}</div>
              <div className={styles.statHint}>whether consolidation ran after ingest</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Turn</div>
              <div className={styles.statValue}>{rememberResult.turn}</div>
              <div className={styles.statHint}>turns processed after this ingest</div>
            </div>
          </div>
        )}
      </Card>

      <p className={styles.footNote}>
        Every call here is the real thing, scoped to your tenant. Nothing on this page is simulated,
        and nothing is sandboxed — that is the point of a playground with real memory behind it.
      </p>
    </div>
  );
}
