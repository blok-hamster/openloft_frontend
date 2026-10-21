'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import {
  getMemoryEventTimeline,
  getMemoryEvents,
  MemoryEvent,
  MemoryEventType,
  MemoryScopeParams,
  MemoryTimelinePoint,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import MemoryTypeBadge from '@/components/memory/MemoryTypeBadge';
import { formatTurn, formatWeight, hopsLabel, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';
import views from '../MemoryViews.module.css';

/** The engine's own event vocabulary, in the order the model runs them. */
const EVENT_TYPES: MemoryEventType[] = [
  'weight_update',
  'override',
  'suppression',
  'prune',
  'consolidation',
  'ltp',
  'retrieval',
];

const LIMITS = [50, 100, 200];

/** A parsed, possibly empty, turn bound — the service rejects non-integers. */
function parseTurn(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** The timeline is a fixed window. It used to share the table's `limit`, so
 *  choosing 25 rows silently rewrote the chart's window to 25 buckets — a
 *  display control on one card changing another card's data. */
const TIMELINE_LIMIT = 100;

/**
 * The cognitive event log: every weight update, override, suppression, prune,
 * consolidation, LTP burst and retrieval the engine recorded. Every read
 * here is a read at the service too — no reinforcement, no decay, no events
 * written by looking.
 */
export default function EventsTab({ scope }: { scope?: MemoryScopeParams }) {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState<number | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [timeline, setTimeline] = useState<MemoryTimelinePoint[]>([]);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const [eventType, setEventType] = useState('');
  const [turnFrom, setTurnFrom] = useState('');
  const [turnTo, setTurnTo] = useState('');
  const [limit, setLimit] = useState(100);
  /* Late responses must not overwrite newer ones when filters change while
     a request is in flight. */
  const loadTokenRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    const from = parseTurn(turnFrom);
    const to = parseTurn(turnTo);
    try {
      const [page, points] = await Promise.all([
        getMemoryEvents({
          limit,
          event_type: eventType || undefined,
          turn_from: from,
          turn_to: to,
          ...scope,
        }),
        getMemoryEventTimeline(TIMELINE_LIMIT, scope).catch(() => null),
      ]);
      if (loadTokenRef.current !== token) return;
      setEvents(page.results);
      setTotalEvents(page.total);
      setEventsError(null);
      setTimeline(points ?? []);
      setTimelineError(points === null ? 'Timeline unavailable.' : null);
    } catch (err) {
      if (loadTokenRef.current !== token) return;
      setEvents([]);
      setEventsError(memoryErrorMessage(err));
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, [eventType, turnFrom, turnTo, limit, scope]);

  /* An entity link lands on the graph page with this tab's scope intact, so
     the neighbourhood drawn there is the one the events came from. */
  const graphHref = useCallback(
    (entity: string) => {
      const params = new URLSearchParams({ entity });
      if (scope?.agentId) params.set('agent', scope.agentId);
      if (scope?.conversationId) params.set('conversation', scope.conversationId);
      return `/memory/graph?${params.toString()}`;
    },
    [scope],
  );

  useEffect(() => {
    load();
  }, [load]);

  /* Bars are relative to the busiest bucket in the window, so the scale is
     stated rather than implied. */
  const timelineRows = useMemo(() => {
    const peak = timeline.reduce((max, point) => Math.max(max, point.count), 0);
    return timeline.map((point) => ({
      ...point,
      percent: peak > 0 ? Math.max(2, Math.round((point.count / peak) * 100)) : 0,
    }));
  }, [timeline]);

  const weightChange = (event: MemoryEvent): string => {
    if (event.old_weight === null || event.new_weight === null) return '—';
    return `${formatWeight(event.old_weight)} → ${formatWeight(event.new_weight)}`;
  };

  const typeChange = (event: MemoryEvent): string => {
    if (!event.old_memory_type || !event.new_memory_type) return '—';
    return `${event.old_memory_type} → ${event.new_memory_type}`;
  };

  return (
    <>
      <Card>
        <div className={styles.recordsHead}>
          <h2 className={styles.sectionTitle}>Timeline</h2>
          <span className={styles.caption}>
            {timeline.length > 0
              ? `Last ${TIMELINE_LIMIT} buckets, busiest at full width`
              : ''}
          </span>
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={load}
          >
            Refresh
          </Button>
        </div>
        <p className={styles.recordsHint}>
          What the engine did, turn by turn: facts weighted up or down, overridden, suppressed,
          pruned, consolidated, retrieved. Event counts per turn, newest window first; bar width
          is relative to the busiest bucket in the window, not an absolute scale.
        </p>
        {timelineError && <p className={styles.stateErrorText}>{timelineError}</p>}
        {loading && timeline.length === 0 && <SkeletonLoader variant="text" count={5} />}
        {timeline.length === 0 && !loading && !timelineError && (
          <MemoryStatePanel
            title="No events yet"
            body="The log fills as the memory is used — chat, remember and recall all write to it."
          />
        )}
        {timelineRows.length > 0 && (
          <div className={views.timeline}>
            {timelineRows.map((point) => (
              <div key={`${point.turn}-${point.event_type}`} className={views.timelineRow}>
                <span className={views.timelineTurn}>turn {formatTurn(point.turn)}</span>
                <span className={views.timelineType}>{point.event_type.replace(/_/g, ' ')}</span>
                <span className={views.timelineBar}>
                  <span
                    className={views.timelineBarFill}
                    style={{ width: `${point.percent}%` }}
                  />
                </span>
                <span className={views.timelineCount}>{point.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <Select
              label="Event type"
              options={[
                { value: '', label: 'All types' },
                ...EVENT_TYPES.map((type) => ({ value: type, label: type.replace(/_/g, ' ') })),
              ]}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
            <Input
              label="Turn from"
              value={turnFrom}
              onChange={(e) => setTurnFrom(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={views.turnInput}
            />
            <Input
              label="Turn to"
              value={turnTo}
              onChange={(e) => setTurnTo(e.target.value)}
              inputMode="numeric"
              placeholder="now"
              className={views.turnInput}
            />
            <Select
              label="Rows"
              options={LIMITS.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
          <span className={styles.caption}>
            {totalEvents === null ? '—' : `${totalEvents} events in this window`}
          </span>
        </div>

        {eventsError ? (
          <MemoryStatePanel tone="error" title="Events unavailable" body={eventsError} />
        ) : loading && events.length === 0 ? (
          <SkeletonLoader variant="text" count={6} />
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className={styles.tableCaption}>
                {events.length} of {totalEvents ?? 0} matching events, newest first. Turn numbers
                are counts, not timestamps.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Turn</th>
                  <th scope="col">Type</th>
                  <th scope="col">Entity</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Tier change</th>
                  <th scope="col">Score</th>
                  <th scope="col">Hops</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr key={`${event.turn}-${event.event_type}-${event.record_id ?? index}`}>
                    <td className={styles.cellMono}>{formatTurn(event.turn)}</td>
                    <td>
                      <span className={styles.chip}>{event.event_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      {event.entity_name ? (
                        <Link
                          className={styles.entityButton}
                          href={graphHref(event.entity_name)}
                        >
                          {event.entity_name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={styles.cellMono}>{weightChange(event)}</td>
                    <td className={styles.cellMono}>
                      {event.old_memory_type && event.new_memory_type ? (
                        <span className={styles.badgeRow}>
                          <MemoryTypeBadge type={event.old_memory_type} />
                          <MemoryTypeBadge type={event.new_memory_type} />
                        </span>
                      ) : (
                        typeChange(event)
                      )}
                    </td>
                    <td className={styles.cellMono}>
                      {event.retrieval_score === null ? '—' : event.retrieval_score.toFixed(3)}
                    </td>
                    <td className={styles.cellMono} title={hopsLabel(event.hops)}>
                      {event.hops ?? '—'}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      No events match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className={styles.footNote}>
        Suppressed events carry the record that suppressed them; pruned events are the engine
        dropping a fact on its own. Nothing on this page writes — reading the log is not itself an
        event.
      </p>
    </>
  );
}
