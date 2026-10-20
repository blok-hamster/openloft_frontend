'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import {
  getMemoryEventStats,
  getMemoryHealth,
  getMemoryRecords,
  getMemoryStats,
  MemoryHealth,
  MemoryRecord,
  MemoryStats,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import MemoryStatsHeader from '@/components/memory/MemoryStatsHeader';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import MemoryTypeBadge from '@/components/memory/MemoryTypeBadge';
import { formatTurn, formatWeight, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';

interface EventStats {
  total_events: number;
  by_type: Record<string, number>;
}

type Settled<T> = { ok: true; value: T } | { ok: false; reason: unknown };

/**
 * One settled outcome, so a single unavailable endpoint degrades its own tile
 * instead of blanking the whole console. A memory read surface that is half
 * up should still render the half that is.
 */
async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (reason) {
    return { ok: false, reason };
  }
}

const RECENT = 5;

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [recent, setRecent] = useState<MemoryRecord[]>([]);
  const [health, setHealth] = useState<MemoryHealth | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    const [s, ev, rec, he] = await Promise.all([
      settle(getMemoryStats()),
      settle(getMemoryEventStats()),
      settle(getMemoryRecords({ limit: RECENT })),
      settle(getMemoryHealth()),
    ]);

    if (s.ok) setStats(s.value);
    if (ev.ok) setEventStats(ev.value);
    if (rec.ok) {
      setRecent(rec.value.results);
      setTotalRecords(rec.value.total);
    }
    setHealth(he.ok ? he.value : null);

    const outcomes = [s, ev, rec, he];
    const firstFailure = outcomes.find((outcome) => !outcome.ok);
    if (firstFailure && outcomes.every((outcome) => !outcome.ok)) {
      setOverviewError(memoryErrorMessage(firstFailure.reason));
    } else {
      setOverviewError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Console</h1>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={loadOverview}
        >
          Refresh
        </Button>
      </header>

      {overviewError && (
        <MemoryStatePanel tone="error" title="Memory service unavailable" body={overviewError}>
          <p className={styles.pageSub}>
            The console needs the memory read surface. Until it answers, the counts below stay
            empty.
          </p>
        </MemoryStatePanel>
      )}

      <MemoryStatsHeader
        stats={stats}
        eventStats={eventStats}
        totalRecords={totalRecords}
        health={health}
        loading={loading}
      />

      <Card>
        <div className={styles.recordsHead}>
          <h2 className={styles.sectionTitle}>Browsing the log</h2>
          <Link className={styles.entityButton} href="/memory/records">
            All records →
          </Link>
        </div>
        <p className={styles.recordsHint}>
          Records, the event log behind them, and how every fact decays all live under
          Records. The graph is what recall walks, and Playground calls the same
          endpoints a client would.
        </p>
        {recent.length === 0 ? (
          <MemoryStatePanel
            title="Nothing stored yet"
            body="Facts appear here once a client writes to this memory — chat, remember, or any integration."
          />
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className={styles.tableCaption}>
                The {recent.length} most recently stored facts, newest turn first.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Entity</th>
                  <th scope="col">Fact</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Turn</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <MemoryTypeBadge type={record.memory_type} />
                    </td>
                    <td>
                      <Link
                        className={styles.entityButton}
                        href={`/memory/graph?entity=${encodeURIComponent(record.entity_name)}`}
                      >
                        {record.entity_name}
                      </Link>
                    </td>
                    <td className={styles.factCell}>
                      <span className={styles.factText}>{record.fact_content}</span>
                    </td>
                    <td className={styles.cellMono}>{formatWeight(record.weight)}</td>
                    <td className={styles.cellMono}>{formatTurn(record.created_at_turn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className={styles.footNote}>
        Turn numbers are counts, not timestamps. Weights are proportions of full strength. Nothing
        on this page changes what the agent remembers.
      </p>
    </div>
  );
}
