import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './Memory.module.css';

/** The two caller-selectable sub-scopes, as this bar carries them. An empty
 *  string means "unscoped", which at the service is the tenant's own default
 *  store — the one that predates agent scoping. */
export interface MemoryScopeValues {
  agentId: string;
  conversationId: string;
}

interface MemoryScopeBarProps {
  agentId: string;
  conversationId: string;
  /** Called with the next committed scope. The page owns the URL; the bar
   *  only proposes values. */
  onChange: (next: MemoryScopeValues) => void;
}

/**
 * A memory is scoped by the (agent, conversation) pair, so every surface that
 * browses one store says which pair it is looking at. Committed on submit
 * rather than per keystroke: each change re-answers every read on the page.
 * The names are caller-chosen but live inside the caller's own tenant — the
 * service namespaces them under it — so this is a view selector, never a
 * tenancy move.
 */
export default function MemoryScopeBar({
  agentId,
  conversationId,
  onChange,
}: MemoryScopeBarProps) {
  const [agent, setAgent] = useState(agentId);
  const [conversation, setConversation] = useState(conversationId);

  /* The URL is the source of truth — back and forward navigation re-enter
     with different committed values. Reset during render against the previous
     commit, the pattern React recommends over an effect for state that
     belongs to its input. */
  const [prevCommitted, setPrevCommitted] = useState({ agentId, conversationId });
  if (prevCommitted.agentId !== agentId || prevCommitted.conversationId !== conversationId) {
    setPrevCommitted({ agentId, conversationId });
    setAgent(agentId);
    setConversation(conversationId);
  }

  const dirty = agent.trim() !== agentId || conversation.trim() !== conversationId;
  const scoped = agentId !== '' || conversationId !== '';

  return (
    <form
      className={styles.scopeBar}
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ agentId: agent.trim(), conversationId: conversation.trim() });
      }}
    >
      <Input
        label="Agent id"
        value={agent}
        onChange={(e) => setAgent(e.target.value)}
        placeholder="every agent"
        className={styles.scopeInput}
        autoComplete="off"
      />
      <Input
        label="Conversation id"
        value={conversation}
        onChange={(e) => setConversation(e.target.value)}
        placeholder="every conversation"
        className={styles.scopeInput}
        autoComplete="off"
      />
      <Button type="submit" variant="secondary" disabled={!dirty}>
        Apply
      </Button>
      {scoped && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setAgent('');
            setConversation('');
            onChange({ agentId: '', conversationId: '' });
          }}
        >
          Clear scope
        </Button>
      )}
      <span className={styles.caption}>
        {scoped
          ? 'scoped view — one agent, one conversation'
          : 'whole-tenant view — every agent, every conversation'}
      </span>
    </form>
  );
}
