import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MemoryRecord, MemoryScopeParams } from '@/lib/api';
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
  /** Quick scope drill-down when viewing across conversations / agents. */
  /** Quick scope drill-down when viewing across conversations / agents. A
   *  shared-store segment (agentId null) commits `shared: true`, the only way
   *  to address that store exactly. */
  onFilterScope?: (scope: { agentId: string; conversationId: string; shared?: boolean }) => void;
  /** Currently active URL scope so a matching segment does not prompt to filter itself. */
  activeScope?: MemoryScopeParams;
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

const COLUMNS = 10;
const PER_PAGE = [25, 50, 100];

/** What to show in the validity column: the extractor's own wording wins. */
function validLabel(record: MemoryRecord): string {
  return record.valid_at_text ?? record.created_date ?? '—';
}

interface RecordSegment {
  key: string;
  conversationId: string;
  agentId: string | null;
  items: MemoryRecord[];
}

function compareRecords(a: MemoryRecord, b: MemoryRecord, sort: MemorySort): number {
  const factor = sort.dir === 'asc' ? 1 : -1;
  if (sort.key === 'weight') return (a.weight - b.weight) * factor;
  if (sort.key === 'turn') return (a.created_at_turn - b.created_at_turn) * factor;
  return ((TIER_RANK[a.memory_type] ?? 99) - (TIER_RANK[b.memory_type] ?? 99)) * factor;
}

export function groupRecordsByScope(records: MemoryRecord[], sort: MemorySort): RecordSegment[] {
  const groups = new Map<string, RecordSegment>();
  for (const record of records) {
    const conversationId = record.conversation_id ?? 'default';
    const agentId = record.agent_id ?? null;
    const key = `${conversationId}::${agentId ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, conversationId, agentId, items: [] };
      groups.set(key, group);
    }
    group.items.push(record);
  }
  const out = Array.from(groups.values());
  for (const group of out) {
    group.items.sort((a, b) => compareRecords(a, b, sort));
  }
  return out;
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
  onFilterScope,
  activeScope,
  windowNote = null,
}: MemoryRecordTableProps) {
  const segments = useMemo(() => groupRecordsByScope(records, sort), [records, sort]);
  /* Collapse state per agent↔conversation group. Opening every segment at
     once defeats the purpose: the reader wants to see the stores first, then
     drill into the ones that matter. A single-segment view (the URL already
     scoped to one store) opens automatically so there is no extra click. */
  const [openSegments, setOpenSegments] = useState<Set<string>>(() =>
    segments.length === 1 ? new Set([segments[0].key]) : new Set(),
  );

  const isOpen = (key: string) => openSegments.has(key);

  const toggleSegment = (key: string) => {
    setOpenSegments((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setOpenSegments(new Set(segments.map((s) => s.key)));
  const collapseAll = () => setOpenSegments(new Set());
  const allOpen = segments.length > 0 && segments.every((s) => openSegments.has(s.key));

  const isExactActiveSegment = (segment: RecordSegment) => {
    if (activeScope?.conversationId !== segment.conversationId) return false;
    if (segment.agentId === null) {
      // The shared store's segment is matched exactly by the shared scope; an
      // agentless whole-tenant view contains it but is not it, and still
      // offers the narrowing.
      return activeScope?.shared === true;
    }
    return activeScope?.agentId === segment.agentId && !activeScope?.shared;
  };

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + records.length, total);

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

  const renderSegmentMeta = (segment: RecordSegment) => (
    <div className={styles.segmentMeta}>
      <span className={styles.scopePill}>
        <span className={styles.scopePillKey}>conv</span>
        {segment.conversationId}
      </span>
      <span className={styles.scopePill}>
        <span className={styles.scopePillKey}>agent</span>
        {segment.agentId ?? 'default'}
      </span>
      <span className={styles.caption}>
        {segment.items.length} {segment.items.length === 1 ? 'record' : 'records'}
      </span>
    </div>
  );

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
        <div className={styles.segmentControls}>
          <span className={styles.caption}>
            {segments.length} {segments.length === 1 ? 'store' : 'stores'}
          </span>
          <div className={styles.toolbarGroup}>
            <Button variant="ghost" size="sm" onClick={expandAll} disabled={allOpen}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} disabled={!allOpen && segments.length === 0}>
              Collapse all
            </Button>
          </div>
        </div>
        <table className={styles.table}>
          <caption className={styles.tableCaption}>
            {from}–{to} of {total} records, grouped by conversation_id and agent_id. Ordering
            applies within each group.
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={ariaSort('type')}>
                {headerButton('type', 'Type')}
              </th>
              <th scope="col">Entity</th>
              <th scope="col">Conversation ID</th>
              <th scope="col">Agent ID</th>
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
            {segments.map((segment) => (
              <Fragment key={segment.key}>
                <tr
                  className={`${styles.segmentRow} ${styles.segmentRowClickable}`}
                  onClick={() => toggleSegment(segment.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSegment(segment.key);
                    }
                  }}
                  aria-expanded={isOpen(segment.key)}
                  aria-label={`Toggle ${segment.conversationId} / ${segment.agentId ?? 'shared store'}`}
                >
                  <td colSpan={COLUMNS} className={styles.segmentCell}>
                    <div className={styles.segmentBar}>
                      <div className={styles.segmentMeta}>
                        <span className={styles.scopePill}>
                          <span className={styles.scopePillKey}>conv</span>
                          {segment.conversationId}
                        </span>
                        <span className={styles.scopePill}>
                          <span className={styles.scopePillKey}>agent</span>
                          {segment.agentId === null ? 'shared store' : segment.agentId}
                        </span>
                        <span className={styles.caption}>
                          {segment.items.length} {segment.items.length === 1 ? 'record' : 'records'}
                        </span>
                      </div>
                      <span className={styles.segmentChevron} aria-hidden="true">
                        {isOpen(segment.key) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      {onFilterScope && !isExactActiveSegment(segment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilterScope(
                              segment.agentId === null
                                ? {
                                    conversationId: segment.conversationId,
                                    agentId: '',
                                    shared: true,
                                  }
                                : {
                                    conversationId: segment.conversationId,
                                    agentId: segment.agentId ?? '',
                                    shared: false,
                                  },
                            )
                          }}
                        >
                          Filter scope
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {isOpen(segment.key) && (
                  <>
                    {segment.items.map((record) => (
                      <tr key={record.id} className={record.is_active ? undefined : styles.rowSuperseded}>
                        <td>
                          <MemoryTypeBadge type={record.memory_type} />
                        </td>
                        <td>
                          <button type="button" className={styles.entityButton} onClick={() => onSelect(record)}>
                            {record.entity_name}
                          </button>
                        </td>
                        <td className={styles.cellMono}>{record.conversation_id ?? 'default'}</td>
                        <td className={styles.cellMono}>{record.agent_id ?? 'default'}</td>
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
                  </>
                )}
              </Fragment>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={COLUMNS} className={styles.emptyCell}>
                  {windowNote ?? 'No records in this window.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* The same segmented records as cards: ten columns do not fit a phone. */}
      <div className={styles.cardStack}>
        {segments.map((segment) => (
          <Fragment key={segment.key}>
            <div
              className={`${styles.segmentMobileHead} ${styles.segmentMobileHeadClickable}`}
              onClick={() => toggleSegment(segment.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSegment(segment.key);
                }
              }}
              aria-expanded={isOpen(segment.key)}
            >
              {renderSegmentMeta(segment)}
              <span className={styles.segmentChevron} aria-hidden="true">
                {isOpen(segment.key) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              {onFilterScope && !isExactActiveSegment(segment) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterScope(
                      segment.agentId === null
                        ? {
                            conversationId: segment.conversationId,
                            agentId: '',
                            shared: true,
                          }
                        : {
                            conversationId: segment.conversationId,
                            agentId: segment.agentId ?? '',
                            shared: false,
                          },
                    )
                  }}
                >
                  Filter scope
                </Button>
              )}
            </div>
            {isOpen(segment.key) && (
              <>
                {segment.items.map((record) => (
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
                          <dt>Conversation ID</dt>
                          <dd>{record.conversation_id ?? 'default'}</dd>
                        </div>
                        <div className={styles.tableCardRow}>
                          <dt>Agent ID</dt>
                          <dd>{record.agent_id ?? 'default'}</dd>
                        </div>
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
              </>
            )}
          </Fragment>
        ))}
        {records.length === 0 && (
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
