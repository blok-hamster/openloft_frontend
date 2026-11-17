'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  getMemoryTurns,
  MemoryScopeParams,
  MemoryTurnPage,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import { formatTurn, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';

const LIMITS = [50, 100, 200];

/**
 * The conversation's transcript: what was actually said, turn by turn, oldest
 * first — the evidence behind the Facts tab, whole-scope instead of one
 * record's source turns.
 *
 * The engine numbers turns and keeps the wording where hydration is on, so
 * the page renders three honest states per turn: dated or not (dates come
 * from the caller's `occurred_at`; no store keeps them for every scope) and
 * worded or not (`text` null — a real answer for stores that keep no turn
 * text, and for turns a forget consumed without a message). `total` is the
 * engine's own turn count, gaps and all.
 */
export default function TurnsTab({ scope }: { scope?: MemoryScopeParams }) {
  const [page, setPage] = useState<MemoryTurnPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);
  /* Late responses must not overwrite newer ones when the scope changes
     while a request is in flight. */
  const loadTokenRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    try {
      const data = await getMemoryTurns({ limit, offset, ...scope });
      if (loadTokenRef.current !== token) return;
      setPage(data);
      setError(null);
    } catch (err) {
      if (loadTokenRef.current !== token) return;
      setPage(null);
      setError(memoryErrorMessage(err));
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, [limit, offset, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = page?.total ?? 0;
  const shown = page?.turns ?? [];
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageNo = Math.floor(offset / limit) + 1;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + shown.length, total);

  const scopeLabel = scope?.agentId
    ? `agent ${scope.agentId}`
    : scope?.shared
      ? 'the shared store'
      : scope?.conversationId
        ? 'every agent'
        : 'every agent, every conversation';

  return (
    <Card>
      <div className={styles.toolbar}>
        <h2 className={styles.sectionTitle}>Transcript</h2>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
        <span className={styles.caption}>
          {page === null
            ? '—'
            : `${total} turn${total === 1 ? '' : 's'} in ${scopeLabel}${
                scope?.conversationId ? `, conversation ${scope.conversationId}` : ''
              }`}
        </span>
      </div>

      {error ? (
        <MemoryStatePanel tone="error" title="Transcript unavailable" body={error} />
      ) : loading && shown.length === 0 ? (
        <SkeletonLoader variant="text" count={6} />
      ) : total === 0 ? (
        <MemoryStatePanel
          title="No turns yet"
          body={
            'This store has consumed no turns, so there is no transcript to read. ' +
            'Turns are consumed by ingests and forgets, not by reads.'
          }
        />
      ) : (
        <>
          {page && !page.has_text && (
            <MemoryStatePanel
              title="No wording on this page"
              body={
                'These turns carry no stored text. The store either keeps no turn ' +
                'wording at all, or every turn here was a counter bump (a forget ' +
                'consumes a turn without a message). The facts survive either way.'
              }
            />
          )}
          <ol className={styles.turnList}>
            {shown.map((turn) => (
              <li key={turn.turn} className={styles.turnRow} id={`turn-${turn.turn}`}>
                <div className={styles.turnMeta}>
                  <span className={styles.turnNumber}>turn {formatTurn(turn.turn)}</span>
                  {turn.occurred_at && (
                    <span className={styles.turnDate}>{turn.occurred_at}</span>
                  )}
                </div>
                {turn.text === null ? (
                  <p className={styles.turnTextMissing}>
                    wording not retained by this store
                  </p>
                ) : (
                  <p className={styles.turnText}>{turn.text}</p>
                )}
              </li>
            ))}
          </ol>

          <div className={styles.pager}>
            <span className={styles.pagerInfo}>
              Page {pageNo} of {totalPages} · showing {from}–{to} of {total}
            </span>
            <div className={styles.toolbarGroup}>
              <Select
                label="Per page"
                options={LIMITS.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(limit)}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setOffset(0);
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
