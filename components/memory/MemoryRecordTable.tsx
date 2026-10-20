import { useMemo } from 'react';
import type { MemoryRecord } from '@/lib/api';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryTypeBadge from './MemoryTypeBadge';
import WeightMeter from './WeightMeter';
import { formatTurn, formatWeight } from './memoryFormat';
import styles from './Memory.module.css';

export type MemorySortKey = 'weight' | 'turn' | 'type';
export type MemorySortDir = 'asc' | 'desc';

export interface MemorySort {
  key: MemorySortKey;
  dir: MemorySortDir;
}

interface MemoryRecordTableProps {
  records: MemoryRecord[];
  /** The whole filtered set, from the page envelope — not `records.length`. */
  total: number;
  limit: number;
  offset: number;
  loading: boolean;
  sort: MemorySort;
  onSortChange: (sort: MemorySort) => void;
  onLimitChange: (limit: number) => void;
  onOffsetChange: (offset: number) => void;
  onSelect: (record: MemoryRecord) => void;
  /** Set when the fetched window sits entirely behind a client-side filter —
      the empty cell then explains the filter instead of implying no data. */
  windowNote?: string | null;
}

/**
 * Tier order rather than alphabetical: CoreAnchor is the most persistent tier
 * and EphemeralState the least, so ascending runs most-persistent first, which
 * is the order the tiers mean.
 */
const TIER_RANK: Record<string, number> = {
  CoreAnchor: 0,
  ActiveContext: 1,
  EphemeralState: 2,
};

const COLUMNS = 8;
const PER_PAGE = [25, 50, 100];

/** What to show in the validity column: the extractor's own wording wins. */
function validLabel(record: MemoryRecord): string {
  return record.valid_at_text ?? record.created_date ?? '—';
}

export default function MemoryRecordTable({
  records,
  total,
  limit,
  offset,
  loading,
  sort,
  onSortChange,
  onLimitChange,
  onOffsetChange,
  onSelect,
  windowNote = null,
}: MemoryRecordTableProps) {
  /* The service returns records newest creation turn first and takes no sort
     parameter, so ordering is applied to the window that was fetched. The
     caption says so rather than implying a globally sorted table. */
  const rows = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...records].sort((a, b) => {
      if (sort.key === 'weight') return (a.weight - b.weight) * factor;
      if (sort.key === 'turn') return (a.created_at_turn - b.created_at_turn) * factor;
      return ((TIER_RANK[a.memory_type] ?? 99) - (TIER_RANK[b.memory_type] ?? 99)) * factor;
    });
  }, [records, sort]);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + rows.length, total);

  const headerButton = (key: MemorySortKey, label: string) => (
    <button
      type="button"
      className={styles.sortButton}
      onClick={() =>
        onSortChange({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' })
      }
      title={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      <span className={styles.sortArrow} aria-hidden="true">
        {sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );

  const ariaSort = (key: MemorySortKey) =>
    sort.key !== key ? 'none' : sort.dir === 'asc' ? 'ascending' : 'descending';

  if (loading && records.length === 0) {
    return (
      <div>
        <SkeletonLoader variant="text" count={COLUMNS} />
      </div>
    );
  }

  return (
    <div>
      <div className={`${styles.tableScroll} ${styles.stickyFirst}`}>
        <table className={styles.table}>
          <caption className={styles.tableCaption}>
            {from}–{to} of {total} records. Ordering applies to this page: the service
            returns records newest creation turn first and takes no sort parameter.
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={ariaSort('type')}>
                {headerButton('type', 'Type')}
              </th>
              <th scope="col">Entity</th>
              <th scope="col">Fact</th>
              <th scope="col" aria-sort={ariaSort('weight')}>
                {headerButton('weight', 'Weight')}
              </th>
              <th scope="col" aria-sort={ariaSort('turn')}>
                {headerButton('turn', 'Turn')}
              </th>
              <th scope="col">Valid from</th>
              <th scope="col">Invalid at</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr key={record.id} className={record.is_active ? undefined : styles.rowSuperseded}>
                <td>
                  <MemoryTypeBadge type={record.memory_type} />
                </td>
                <td>
                  <button type="button" className={styles.entityButton} onClick={() => onSelect(record)}>
                    {record.entity_name}
                  </button>
                </td>
                <td className={styles.factCell}>
                  <span className={styles.factText}>{record.fact_content}</span>
                </td>
                <td>
                  <WeightMeter weight={record.weight} />
                </td>
                <td className={styles.cellMono}>
                  {formatTurn(record.created_at_turn)}
                  <span className={styles.validText}>{record.created_date ?? 'undated'}</span>
                </td>
                <td className={styles.cellMono}>
                  {validLabel(record)}
                  <span className={styles.validText}>
                    turn {formatTurn(record.valid_at ?? record.created_at_turn)}
                  </span>
                </td>
                <td className={styles.cellMono}>
                  {record.invalid_at === null ? 'current' : formatTurn(record.invalid_at)}
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => onSelect(record)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS} className={styles.emptyCell}>
                  {windowNote ?? 'No records in this window.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* The same records as cards: eight columns do not fit a phone. */}
      <div className={styles.cardStack}>
        {rows.map((record) => (
          <div key={record.id} className={styles.tableCard}>
            <div className={styles.tableCardHead}>
              <MemoryTypeBadge type={record.memory_type} />
              <button type="button" className={styles.entityButton} onClick={() => onSelect(record)}>
                {record.entity_name}
              </button>
            </div>
            <div className={styles.tableCardBody}>
              <p className={styles.tableCardFact}>{record.fact_content}</p>
              <dl>
                <div className={styles.tableCardRow}>
                  <dt>Weight</dt>
                  <dd>{formatWeight(record.weight)}</dd>
                </div>
                <div className={styles.tableCardRow}>
                  <dt>Turn</dt>
                  <dd>{formatTurn(record.created_at_turn)}</dd>
                </div>
                <div className={styles.tableCardRow}>
                  <dt>Valid from</dt>
                  <dd>{validLabel(record)}</dd>
                </div>
                <div className={styles.tableCardRow}>
                  <dt>Invalid at</dt>
                  <dd>{record.invalid_at === null ? 'current' : formatTurn(record.invalid_at)}</dd>
                </div>
              </dl>
              <div className={styles.detailActions}>
                <Button variant="secondary" size="sm" onClick={() => onSelect(record)}>
                  Open record
                </Button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className={styles.emptyCell}>{windowNote ?? 'No records in this window.'}</div>
        )}
      </div>

      <div className={styles.pager}>
        <span className={styles.pagerInfo}>
          Page {page} of {totalPages} · showing {from}–{to} of {total}
        </span>
        <div className={styles.toolbarGroup}>
          <Select
            label="Per page"
            options={PER_PAGE.map((n) => ({ value: String(n), label: String(n) }))}
            value={String(limit)}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={offset === 0}
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={offset + limit >= total}
            onClick={() => onOffsetChange(offset + limit)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
