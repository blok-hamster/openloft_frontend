'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { getMemoryScopes, MemoryScopeTree } from '@/lib/api';
import styles from './Memory.module.css';

/** The two caller-selectable sub-scopes, as this bar carries them. An empty
 *  agent id with `shared` false means "unscoped", which at the service is the
 *  whole tenant — every agent, every conversation. */
export interface MemoryScopeValues {
  agentId: string;
  conversationId: string;
  /** The pre-agent shared store, addressed exactly. No caller-chosen agent
   *  string can name that store — its key IS the tenant — so it needs a flag
   *  rather than an id. */
  shared: boolean;
}

interface MemoryScopeBrowserProps {
  agentId: string;
  conversationId: string;
  shared: boolean;
  /** Called with the next committed scope. The page owns the URL; the bar
   *  only proposes values. */
  onChange: (next: MemoryScopeValues) => void;
}

/** Select stand-in for the shared store, whose agent_id is null. Built from a
 *  character the scope charset (`[A-Za-z0-9_-]`) forbids, so no real agent id
 *  can ever collide with it. */
const SHARED = '*shared*';

const ALL = '';

/**
 * The scope selector as a browser, not a pair of blind text fields.
 *
 * Agent and conversation ids are caller-chosen, so nothing else in the API
 * can answer "what exists" — a user had to already know an id to type one
 * into the old free-text fields. This fetches the scope tree once and offers
 * the stores that actually hold data: pick an agent (or the shared store),
 * pick one of its conversations, and the view narrows. A store with no data
 * yet — the aim-before-ingest case — is still typeable in the advanced
 * field, which is why the free-text inputs stay.
 *
 * Committed on selection rather than per keystroke: each commit re-answers
 * every read on the page. The URL is the source of truth — back and forward
 * navigation re-enter with different committed values, so the selects are
 * reset during render against the previous commit, the pattern React
 * recommends over an effect for state that belongs to its input.
 */
export default function MemoryScopeBrowser({
  agentId,
  conversationId,
  shared,
  onChange,
}: MemoryScopeBrowserProps) {
  const [tree, setTree] = useState<MemoryScopeTree | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [agent, setAgent] = useState(shared ? SHARED : agentId);
  const [conversation, setConversation] = useState(conversationId);
  /* The free-text pair behind the advanced disclosure. */
  const [manualAgent, setManualAgent] = useState(agentId);
  const [manualConversation, setManualConversation] = useState(conversationId);

  const [prevCommitted, setPrevCommitted] = useState({ agentId, conversationId, shared });
  if (
    prevCommitted.agentId !== agentId ||
    prevCommitted.conversationId !== conversationId ||
    prevCommitted.shared !== shared
  ) {
    setPrevCommitted({ agentId, conversationId, shared });
    setAgent(shared ? SHARED : agentId);
    setConversation(conversationId);
    setManualAgent(agentId);
    setManualConversation(conversationId);
  }

  useEffect(() => {
    let cancelled = false;
    getMemoryScopes()
      .then((data) => {
        if (cancelled) return;
        setTree(data);
      })
      .catch(() => {
        if (cancelled) return;
        // The tree is an affordance, not the data: its absence must not blank
        // the page. The selects stay usable (unscoped / advanced) either way.
        setTree({ tenant: '', agents: [], has_turn_dates: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const agentOptions = useMemo(() => {
    const options = [{ value: ALL, label: 'All agents' }];
    for (const entry of tree?.agents ?? []) {
      if (entry.agent_id === null) {
        options.push({ value: SHARED, label: 'Shared store' });
      } else {
        options.push({
          value: entry.agent_id,
          label: `${entry.agent_id} · ${entry.conversations.length} conversation${entry.conversations.length === 1 ? '' : 's'}`,
        });
      }
    }
    return options;
  }, [tree]);

  /* The chosen store's conversations; with every agent chosen, the union of
     them all — deduplicated, because one conversation id can hold data under
     several agents, and each label then counts the union, not one store's. */
  const conversationOptions = useMemo(() => {
    const entries = (tree?.agents ?? []).filter((entry) => {
      if (agent === ALL) return true;
      if (agent === SHARED) return entry.agent_id === null;
      return entry.agent_id === agent;
    });
    const byId = new Map<string, { records: number; turns: number }>();
    for (const entry of entries) {
      for (const conversation of entry.conversations) {
        const known = byId.get(conversation.conversation_id);
        byId.set(conversation.conversation_id, {
          records: (known?.records ?? 0) + conversation.records,
          turns: Math.max(known?.turns ?? 0, conversation.max_turn),
        });
      }
    }
    const options = [{ value: ALL, label: 'All conversations' }];
    for (const [id, counts] of byId) {
      options.push({
        value: id,
        label: `${id} · ${counts.records} fact${counts.records === 1 ? '' : 's'} · ${counts.turns} turn${counts.turns === 1 ? '' : 's'}`,
      });
    }
    return options;
  }, [tree, agent]);

  /* Whether the selects currently disagree with the committed scope — that is
     what "Apply" in the advanced field answers for typed ids, and what the
     selects commit immediately, so nothing here lingers unapplied. */
  const scoped = agentId !== '' || conversationId !== '' || shared;
  const manualDirty =
    manualAgent.trim() !== agentId || manualConversation.trim() !== conversationId;
  const noStores = tree !== null && tree.agents.length === 0;

  const commit = (next: MemoryScopeValues) => {
    setAdvancedOpen(false);
    onChange(next);
  };

  /* A select can commit immediately: the chosen value is already the whole
     proposal, unlike the text fields where half-typed input must not fire. */
  const commitAgent = (next: string) => {
    setAgent(next);
    setConversation(ALL); // a different store rarely keeps the old conversation
    if (next === SHARED) {
      commit({ agentId: '', conversationId: '', shared: true });
    } else {
      commit({ agentId: next, conversationId: '', shared: false });
    }
  };

  const commitConversation = (next: string) => {
    setConversation(next);
    if (agent === SHARED) {
      commit({ agentId: '', conversationId: next, shared: true });
    } else {
      commit({ agentId: agent, conversationId: next, shared: false });
    }
  };

  return (
    <div className={styles.scopeBar}>
      <div className={styles.scopeInput}>
        <Select
          label="Agent"
          value={agent}
          onChange={(e) => commitAgent(e.target.value)}
          options={agentOptions}
          disabled={noStores}
        />
      </div>
      <div className={styles.scopeInput}>
        <Select
          label="Conversation"
          value={conversation}
          onChange={(e) => commitConversation(e.target.value)}
          options={conversationOptions}
          disabled={noStores}
        />
      </div>
      {scoped && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setAgent(ALL);
            setConversation(ALL);
            commit({ agentId: '', conversationId: '', shared: false });
          }}
        >
          Clear scope
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        icon={
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{ transform: advancedOpen ? 'rotate(180deg)' : undefined }}
          />
        }
        onClick={() => setAdvancedOpen(!advancedOpen)}
        aria-expanded={advancedOpen}
      >
        Advanced
      </Button>
      <span className={styles.caption}>
        {tree === null
          ? 'loading stores…'
          : noStores
            ? 'no stores hold data yet — write something first, or aim ahead in Advanced'
            : scoped
              ? shared
                ? 'scoped view — the shared store'
                : 'scoped view — one store'
              : 'whole-tenant view — every agent, every conversation'}
      </span>

      {advancedOpen && (
        <form
          className={styles.scopeAdvanced}
          onSubmit={(event) => {
            event.preventDefault();
            commit({
              agentId: manualAgent.trim(),
              conversationId: manualConversation.trim(),
              shared: false,
            });
          }}
        >
          <Input
            label="Agent id"
            value={manualAgent}
            onChange={(e) => setManualAgent(e.target.value)}
            placeholder="every agent"
            className={styles.scopeInput}
            autoComplete="off"
          />
          <Input
            label="Conversation id"
            value={manualConversation}
            onChange={(e) => setManualConversation(e.target.value)}
            placeholder="every conversation"
            className={styles.scopeInput}
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" disabled={!manualDirty}>
            Apply
          </Button>
          <span className={styles.caption}>
            For aiming at a store that has no data yet — the selects above list
            stores that already hold something.
          </span>
        </form>
      )}
    </div>
  );
}
