'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Send, Trash2 } from 'lucide-react';
import {
  chatMemory,
  recallMemory,
  rememberMemory,
  MemoryRecallHit,
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

const SUGGESTIONS = [
  'My name is Ada, and I prefer concise answers.',
  'What do you know about me?',
  'Remind yourself to check the decay thresholds.',
];

/**
 * The chat surface, on purpose. Every other page in this dashboard is
 * read-only; this one is not: /chat and /remember extract facts into the
 * live memory and /recall reinforces the records it surfaces — exactly why
 * the console's search box does not use these endpoints.
 *
 * The page is a chat, laid out like one — transcript in the middle, composer
 * under it, scope in the header — because the three input boxes and result
 * stacks it used to be answered the API's shape, not the product's. Recall
 * and ingest keep a place in the side rail: the two tools a real client gets,
 * one call each, pointed at the same conversation scope.
 */
export default function PlaygroundPage() {
  const [agentId, setAgentId] = useState('');
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

  const [tool, setTool] = useState<'recall' | 'ingest'>('recall');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  /* A transcript that pushes you to scroll manually is a bad transcript:
     follow the tail whenever anything is appended. */
  useEffect(() => {
    const list = scrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns, sending]);

  /* A memory is scoped by the (agent, conversation) pair. Empty on either
     means "any" — at the service that is the tenant's own default store, the
     same one the records page lands on when its scope bar is cleared. */
  const scope = useCallback(
    () => ({
      agentId: agentId.trim() || undefined,
      conversationId: conversationId.trim() || undefined,
    }),
    [agentId, conversationId],
  );

  /* The composer grows with its text and shrinks back after a send, which is
     the one behaviour chat clients are expected to have. */
  const autosize = useCallback(() => {
    const box = composerRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 128)}px`;
  }, []);

  const send = useCallback(async () => {
    const text = message.trim();
    if (text === '' || sending) return;
    const turnPayload = turns;
    setSending(true);
    setChatError(null);
    setMessage('');
    window.requestAnimationFrame(autosize);
    try {
      const result = await chatMemory({
        message: text,
        history: turnPayload.map(({ role, content }) => ({ role, content })),
        ...scope(),
      });
      setTurns((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: result.reply, turn: result.turn },
      ]);
      setLiveConversation(result.conversation_id);
    } catch (err) {
      setChatError(memoryErrorMessage(err));
      setMessage(text);
    } finally {
      setSending(false);
    }
  }, [message, turns, sending, scope, autosize]);

  const recall = useCallback(async () => {
    const text = query.trim();
    if (text === '' || recalling) return;
    setRecalling(true);
    setRecallError(null);
    try {
      setRecallResult(await recallMemory({ query: text, topK, ...scope() }));
    } catch (err) {
      setRecallResult(null);
      setRecallError(memoryErrorMessage(err));
    } finally {
      setRecalling(false);
    }
  }, [query, topK, recalling, scope]);

  const remember = useCallback(async () => {
    const messages = rows
      .map((row) => ({ role: row.role, content: row.content.trim() }))
      .filter((row) => row.content !== '');
    if (messages.length === 0 || remembering) return;
    setRemembering(true);
    setRememberError(null);
    try {
      setRememberResult(await rememberMemory({ messages, ...scope() }));
    } catch (err) {
      setRememberResult(null);
      setRememberError(memoryErrorMessage(err));
    } finally {
      setRemembering(false);
    }
  }, [rows, remembering, scope]);

  const clearChat = useCallback(() => {
    setTurns([]);
    setLiveConversation(null);
    setChatError(null);
  }, []);

  const startFromSuggestion = useCallback(
    (suggestion: string) => {
      setMessage(suggestion);
      autosize();
      composerRef.current?.focus();
    },
    [autosize],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Playground</h1>
        </div>
      </header>

      <div className={views.playgroundLayout}>
        {/* --- The chat --- */}
        <section className={views.chatPanel} aria-label="Memory chat">
          <div className={views.chatHead}>
            <Input
              label="Agent scope"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="every agent"
              autoComplete="off"
              className={views.chatScope}
            />
            <Input
              label="Conversation scope"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              placeholder="scratch"
              autoComplete="off"
              className={views.chatScope}
            />
            {liveConversation && (
              <span className={views.chatConversationId} title={liveConversation}>
                engine id {liveConversation}
              </span>
            )}
            <Button variant="ghost" onClick={clearChat} disabled={turns.length === 0}>
              Clear
            </Button>
          </div>

          <div className={views.chatScroll} ref={scrollRef}>
            {turns.length === 0 ? (
              <div className={views.chatEmpty}>
                <p className={styles.caption}>
                  Nothing sent yet. Say something the memory should hold on to — facts are
                  extracted as the reply generates.
                </p>
                <div className={views.chatSuggest}>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={views.suggestion}
                      onClick={() => startFromSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn, index) => (
                <article
                  key={`${turn.role}-${index}`}
                  className={`${views.bubbleRow} ${
                    turn.role === 'user' ? views.bubbleRowUser : views.bubbleRowAssistant
                  }`}
                >
                  <p className={turn.role === 'user' ? views.bubbleUser : views.bubbleAssistant}>
                    {turn.content}
                  </p>
                  {turn.role === 'assistant' && turn.turn !== undefined && (
                    <span className={views.bubbleMeta}>turn {turn.turn}</span>
                  )}
                </article>
              ))
            )}

            {sending && (
              <div className={views.typingRow} aria-label="Waiting for the memory's reply">
                <span className={views.typingDot} />
                <span className={views.typingDot} />
                <span className={views.typingDot} />
              </div>
            )}
          </div>

          {chatError && (
            <MemoryStatePanel tone="error" title="Chat failed" body={chatError} />
          )}

          <div className={views.composer}>
            <textarea
              ref={composerRef}
              className={views.composerInput}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                autosize();
              }}
              rows={1}
              placeholder="Message the agent…"
              aria-label="Message"
              disabled={sending}
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
          </div>
        </section>

        {/* --- The side rail: recall and ingest, same scope, same behaviour
             a real integration gets --- */}
        <aside className={views.toolRail}>
          <div className={views.callout}>
            <div className={styles.subPanelTitle}>This page writes to your memory</div>
            <p className={styles.caption}>
              Chat and ingest extract facts, and recall reinforces what it surfaces. Point both
              scopes at scratch values while trying things — one agent in one conversation is one
              store, separate from any other.
            </p>
          </div>

          <Card>
            <div className={views.toolTabs} role="tablist" aria-label="Playground tools">
              <button
                type="button"
                role="tab"
                id="playground-tab-recall"
                aria-controls="playground-panel"
                aria-selected={tool === 'recall'}
                tabIndex={tool === 'recall' ? 0 : -1}
                className={tool === 'recall' ? `${views.tabButton} ${views.tabButtonActive}` : views.tabButton}
                onClick={() => setTool('recall')}
              >
                Recall
              </button>
              <button
                type="button"
                role="tab"
                id="playground-tab-ingest"
                aria-controls="playground-panel"
                aria-selected={tool === 'ingest'}
                tabIndex={tool === 'ingest' ? 0 : -1}
                className={tool === 'ingest' ? `${views.tabButton} ${views.tabButtonActive}` : views.tabButton}
                onClick={() => setTool('ingest')}
              >
                Ingest
              </button>
            </div>

            <div className={views.railBody} role="tabpanel" id="playground-panel" aria-labelledby={`playground-tab-${tool}`}>
              {tool === 'recall' ? (
                <>
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
                  <div className={views.messageRow}>
                    <Select
                      label="Top K"
                      options={TOP_K.map((n) => ({ value: String(n), label: String(n) }))}
                      value={String(topK)}
                      onChange={(e) => setTopK(Number(e.target.value))}
                    />
                    <Button
                      variant="primary"
                      loading={recalling}
                      disabled={query.trim() === ''}
                      onClick={recall}
                    >
                      Recall
                    </Button>
                  </div>

                  {recallError && (
                    <MemoryStatePanel tone="error" title="Recall failed" body={recallError} />
                  )}

                  {recallResult && (
                    <>
                      <p className={styles.caption}>
                        {recallResult.hits.length} hits · ~{recallResult.token_estimate} tokens of
                        context · turn {recallResult.turn}
                      </p>
                      <div className={views.contextBlock}>
                        {recallResult.context === ''
                          ? '(empty context — nothing relevant stored)'
                          : recallResult.context}
                      </div>
                      <div className={views.hitList}>
                        {recallResult.hits.map((hit, index) => (
                          <RecallHitCard key={hit.id ?? `${hit.entity_name}-${index}`} hit={hit} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className={styles.caption}>
                    Ingest a transcript without generating a reply — one extraction pass, for
                    backfilling history a client already holds.
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
                              i === index
                                ? { ...item, role: e.target.value as Turn['role'] }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        aria-label={`Message ${index + 1} content`}
                        value={row.content}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, content: e.target.value } : item,
                            ),
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

                  <div className={views.messageRow}>
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
                    <div className={views.railStats}>
                      <div className={views.railStat}>
                        <div className={views.railStatLabel}>Updates ingested</div>
                        <div className={views.railStatValue}>
                          {rememberResult.updates_ingested}
                        </div>
                      </div>
                      <div className={views.railStat}>
                        <div className={views.railStatLabel}>Suppressed</div>
                        <div className={views.railStatValue}>
                          {rememberResult.overrides_suppressed}
                        </div>
                      </div>
                      <div className={views.railStat}>
                        <div className={views.railStatLabel}>Consolidated</div>
                        <div className={views.railStatValue}>
                          {rememberResult.consolidated ? 'yes' : 'no'}
                        </div>
                      </div>
                      <div className={views.railStat}>
                        <div className={views.railStatLabel}>Turn</div>
                        <div className={views.railStatValue}>{rememberResult.turn}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <p className={styles.footNote}>
        Every call here is the real thing, scoped to your tenant. Nothing on this page is simulated,
        and nothing is sandboxed — that is the point of a playground with real memory behind it.
      </p>
    </div>
  );
}

/** One recall hit, compact: the tier badge, the entity, how the graph was
 *  walked to reach it, and the score. */
function RecallHitCard({ hit }: { hit: MemoryRecallHit }) {
  return (
    <div className={views.turnBox}>
      <div className={views.turnBoxHead}>
        <MemoryTypeBadge type={hit.memory_type as MemoryType} />
        <span className={views.turnBoxRole}>{hit.entity_name}</span>
        <span title={hopsLabel(hit.hop_distance)}>{hopsLabel(hit.hop_distance)}</span>
        <span className={styles.readout}>
          <span className={styles.readoutKey}>score</span>
          {formatScore(hit.score)}
        </span>
      </div>
      <p className={views.turnBoxBody}>{hit.fact}</p>
    </div>
  );
}
