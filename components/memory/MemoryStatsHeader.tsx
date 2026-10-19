import type { MemoryHealth, MemoryStats } from '@/lib/api';
import Card from '@/components/ui/Card';
import StatusIndicator from '@/components/ui/StatusIndicator';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import styles from './Memory.module.css';

interface MemoryStatsHeaderProps {
  /** `GET /memory/stats` — the turn counter and the hot/cold/event counts. */
  stats: MemoryStats | null;
  /** `GET /memory/events/stats` — the same event count, plus the breakdown. */
  eventStats: { total_events: number; by_type: Record<string, number> } | null;
  /** `GET /memory/records?limit=1` → `total`. The whole store, not the page. */
  totalRecords: number | null;
  health: MemoryHealth | null;
  loading: boolean;
}

/** The service reports counts under keys it owns, so read them defensively. */
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function MemoryStatsHeader({
  stats,
  eventStats,
  totalRecords,
  health,
  loading,
}: MemoryStatsHeaderProps) {
  const hot = count(stats?.hot?.count);
  const coldTotal = count(stats?.cold?.total_events);
  const coldActive = count(stats?.cold?.active_events);
  const eventTypes = Object.entries(eventStats?.by_type ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      {loading && !stats ? (
        <div className={styles.statGrid}>
          <SkeletonLoader variant="text" count={5} />
        </div>
      ) : (
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Current turn</div>
            <div className={styles.statValue}>{stats ? stats.turn : '—'}</div>
            <div className={styles.statHint}>turns processed</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Hot</div>
            <div className={styles.statValue}>{hot ?? '—'}</div>
            <div className={styles.statHint}>facts in working memory</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Cold</div>
            <div className={styles.statValue}>{coldTotal ?? '—'}</div>
            <div className={styles.statHint}>
              {coldActive === null ? 'archived writes' : `${coldActive} still active`}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Cognitive events</div>
            <div className={styles.statValue}>{eventStats?.total_events ?? '—'}</div>
            <div className={styles.statHint}>logged by the engine</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Records</div>
            <div className={styles.statValue}>{totalRecords ?? '—'}</div>
            <div className={styles.statHint}>total facts stored</div>
          </div>
        </div>
      )}

      <div className={styles.healthRow}>
        <StatusIndicator status={health?.status ? 'active' : 'error'} />
        <span className={styles.caption}>
          {health?.status
            ? `Memory service reports ${health.status}.`
            : 'Memory service not reachable for this tenant.'}
        </span>
        {eventTypes.length > 0 && (
          <div className={styles.chipRow}>
            {eventTypes.map(([type, n]) => (
              <span key={type} className={styles.chip}>
                {type.replace(/_/g, ' ')}
                <span className={styles.chipCount}>{n}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
