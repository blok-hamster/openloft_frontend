'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyRound, Plus, Trash2, Copy, Check, AlertTriangle } from 'lucide-react';
import {
  IMemoryConnection,
  IMemoryConnectionIssued,
  MemoryScope,
  listMemoryConnections,
  mintMemoryConnection,
  revokeMemoryConnection,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import ConfirmDestructiveAction from '@/components/dashboard/ConfirmDestructiveAction';
import { useToast } from '@/components/ui/Toast';
import { memoryErrorMessage } from '@/components/memory/memoryFormat';
import IntegrationGuide from '@/components/memory/IntegrationGuide';
import { publicApiBase } from '@/lib/publicApiBase';
import styles from './Connections.module.css';

/**
 * The harnesses a user can point at their memory, and the exact config each one
 * needs. Order matters for scanning: the two most common clients first.
 *
 * This list is deliberately data rather than a switch, because it will grow and
 * every entry is the same shape.
 */
const HARNESSES = [
  {
    id: 'mcp',
    label: 'MCP (Claude Code, Cursor, Codex)',
    note: 'One config block. Recommended — works in any MCP host.',
    transport: 'HTTP / MCP',
    available: true,
  },
  {
    id: 'rest',
    label: 'REST (any language)',
    note: 'Mem0-compatible, so a client already speaking to Mem0 changes base URL and key.',
    transport: 'HTTP',
    available: true,
  },
  {
    id: 'openai',
    label: 'OpenAI-compatible (SDK swap-in)',
    note: 'Chat-completions shape. Does not pass tools/tool_choice, so agentic clients break on it.',
    transport: 'HTTP',
    available: true,
  },
] as const;

export default function ConnectionsPage() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<IMemoryConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mintOpen, setMintOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(true);
  const [minting, setMinting] = useState(false);

  const [issued, setIssued] = useState<IMemoryConnectionIssued | null>(null);
  const [revoking, setRevoking] = useState<IMemoryConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const issuedRef = useRef<HTMLDivElement | null>(null);

  /* A one-time secret below the fold is a secret the user may never see. The
     mint flow closes the dialog and paints the key further down the page;
     bring it into view as soon as it exists. */
  useEffect(() => {
    const node = issuedRef.current;
    /* jsdom (tests) has no scrollIntoView; the browser path is the point. */
    if (issued && typeof node?.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [issued]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listMemoryConnections();
      setConnections(data.results);
    } catch (err) {
      setLoadError(memoryErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Memoised because it is a dependency of the mint callback: an inline array
  // literal there would be a new reference every render and re-run the effect.
  const scopes = useMemo<MemoryScope[]>(() => {
    const out: MemoryScope[] = [];
    if (read) out.push('read');
    if (write) out.push('write');
    return out;
  }, [read, write]);

  const handleMint = useCallback(async () => {
    setMinting(true);
    try {
      const result = await mintMemoryConnection({ label: label.trim(), scopes });
      setIssued(result);
      setMintOpen(false);
      setLabel('');
      setRead(true);
      setWrite(true);
      await load();
      toast('Connection created', 'success');
    } catch (err) {
      toast(memoryErrorMessage(err), 'error');
    } finally {
      setMinting(false);
    }
  }, [label, scopes, load, toast]);

  const handleRevoke = useCallback(async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await revokeMemoryConnection(revoking.keyId);
      toast(`${revoking.label} revoked`, 'success');
      setRevoking(null);
      await load();
    } catch (err) {
      toast(memoryErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }, [revoking, load, toast]);

  const copyKey = useCallback(async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy to the clipboard', 'error');
    }
  }, [issued, toast]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Connections</h1>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setMintOpen(true)}>
          New connection
        </Button>
      </header>

      {/* The endpoint is the same for every connection, so it is shown once
          rather than repeated per row. */}
      <Card className={styles.endpointCard}>
        <div className={styles.endpointRow}>
          <label className={styles.endpointLabel}>Memory endpoint</label>
          {/* SSR resolves the env-only base; a deployed browser upgrades a
              missing env to same-origin. The text is the only divergent node,
              so let React replace it without a hydration warning. */}
          <code className={styles.endpointValue} suppressHydrationWarning>
            {`${publicApiBase()}/memory`}
          </code>
        </div>
        <p className={styles.endpointHint}>
          Calls go through the platform, which attaches the credential for you. Your application
          never holds a service key — it authenticates as <em>you</em>.
        </p>
      </Card>

      <Card className={styles.listCard}>
        <h2 className={styles.sectionTitle}>Active connections</h2>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : loadError ? (
          <div className={styles.errorBox}>
            <AlertTriangle size={16} aria-hidden />
            <span>{loadError}</span>
            <Button variant="ghost" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : connections.length === 0 ? (
          <div className={styles.empty}>
            No connections yet. Create one to connect Claude Code, a REST client, or your own
            service.
          </div>
        ) : (
          <>
            {/* Between the phone cutoff and full width the five columns
                scroll sideways instead of being clipped by the page. */}
            <div className={`${styles.tableScroll} ${styles.stickyFirst}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Label</th>
                    <th scope="col">Key</th>
                    <th scope="col">Scopes</th>
                    <th scope="col">Created</th>
                    <th scope="col">Last used</th>
                    <th scope="col" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => (
                    <tr key={c.keyId}>
                      <td className={styles.labelCell}>{c.label}</td>
                      <td>
                        <code className={styles.keyCell}>{c.keyPrefix}</code>
                      </td>
                      <td>
                        <span className={styles.scopeList}>{c.scopes.join(', ')}</span>
                      </td>
                      <td className={styles.dateCell}>{new Date(c.createdAt).toLocaleString()}</td>
                      <td className={styles.dateCell}>
                        {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : 'Never'}
                      </td>
                      <td className={styles.actionsCell}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={14} />}
                          onClick={() => setRevoking(c)}
                          aria-label={`Revoke ${c.label}`}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* The same connections as cards: five columns do not fit a
                phone. Shapes mirror the records card stack. */}
            <div className={styles.cardStack}>
              {connections.map((c) => (
                <div key={c.keyId} className={styles.tableCard}>
                  <div className={styles.tableCardHead}>
                    <span className={styles.labelCell}>{c.label}</span>
                    <code className={styles.keyCell}>{c.keyPrefix}</code>
                  </div>
                  <div className={styles.tableCardBody}>
                    <dl>
                      <div className={styles.tableCardRow}>
                        <dt>Scopes</dt>
                        <dd>
                          <span className={styles.scopeList}>{c.scopes.join(', ')}</span>
                        </dd>
                      </div>
                      <div className={styles.tableCardRow}>
                        <dt>Created</dt>
                        <dd>{new Date(c.createdAt).toLocaleString()}</dd>
                      </div>
                      <div className={styles.tableCardRow}>
                        <dt>Last used</dt>
                        <dd>{c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : 'Never'}</dd>
                      </div>
                    </dl>
                    <div className={styles.detailActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => setRevoking(c)}
                        aria-label={`Revoke ${c.label}`}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <section className={styles.guideSection}>
        <h2 className={styles.sectionTitle}>Connect a harness</h2>
        <p className={styles.guideIntro}>
          Each harness below is a client of the same memory. Pick one to see the exact config.
        </p>
        <div className={styles.harnessGrid}>
          {HARNESSES.map((h) => (
            <Card key={h.id} className={styles.harnessCard}>
              <div className={styles.harnessHead}>
                <h3 className={styles.harnessLabel}>{h.label}</h3>
                <span className={styles.transport}>{h.transport}</span>
              </div>
              <p className={styles.harnessNote}>{h.note}</p>
              <p className={styles.harnessNote}>
                {issued
                  ? 'Paste the key from the panel above into the config below.'
                  : 'Create a connection to get a key, then use the key in place of the placeholder.'}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {issued && (
        <div ref={issuedRef}>
        <Card className={styles.issuedCard}>
          <div className={styles.issuedHead}>
            <KeyRound size={16} aria-hidden />
            <h2 className={styles.sectionTitle}>Your new key</h2>
          </div>
          {/* Shown once. The platform keeps only a prefix, so a closed or
              reloaded page is an unrecoverable loss — hence the warning. */}
          <p className={styles.issuedWarning}>
            This is the only time this key is shown. Store it now; it cannot be retrieved again.
          </p>
          <div className={styles.keyRow}>
            <code className={styles.keyValue}>{issued.apiKey}</code>
            <Button
              variant={copied ? 'secondary' : 'primary'}
              size="sm"
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={copyKey}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <IntegrationGuide apiKey={issued.apiKey} label={issued.label} scopes={issued.scopes} />
        </Card>
        </div>
      )}

      {/* Mint dialog */}
      <Modal
        open={mintOpen}
        onClose={() => setMintOpen(false)}
        title="New memory connection"
      >
        <div className={styles.mintForm}>
          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Claude Code — laptop"
            maxLength={80}
          />
          <p className={styles.fieldHint}>
            Names the connection in this list. It is not stored by the memory service.
          </p>
          <fieldset className={styles.scopeField}>
            <legend className={styles.scopeLegend}>Scopes</legend>
            <Toggle
              checked={read}
              onChange={setRead}
              label="Read — recall and search"
              ariaLabel="Allow read scope"
            />
            <Toggle
              checked={write}
              onChange={setWrite}
              label="Write — remember and forget"
              ariaLabel="Allow write scope"
            />
            <p className={styles.scopeHint}>
              A read-only key can search your memory but cannot add to or forget from it.
            </p>
          </fieldset>
          <div className={styles.mintActions}>
            <Button variant="ghost" size="sm" type="button" onClick={() => setMintOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={minting}
              disabled={!label.trim() || (!read && !write)}
              onClick={handleMint}
            >
              Create key
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDestructiveAction
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={handleRevoke}
        title={`Revoke ${revoking?.label ?? ''}`}
        confirmText="REVOKE"
        loading={busy}
        description={
          <>
            <p>
              Revoking stops this key immediately. Anything using it starts failing on its next
              call, and the key cannot be restored — you would create a new connection.
            </p>
            <p>
              Your memory is not affected. Revocation changes who can reach it, not what is in it.
            </p>
          </>
        }
      />
    </div>
  );
}
