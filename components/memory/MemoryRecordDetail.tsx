import { useCallback, useEffect, useState } from 'react';
import type { MemoryDecayCurve, MemoryRecord, MemoryRecordSource, MemoryScopeParams } from '@/lib/api';
import { getMemoryRecordSource } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryTypeBadge from './MemoryTypeBadge';
import WeightMeter from './WeightMeter';
import DecaySparkline from './DecaySparkline';
import { formatTurn, formatWeight, memoryErrorMessage } from './memoryFormat';
import styles from './Memory.module.css';

interface MemoryRecordDetailProps {
  record: MemoryRecord | null;
  open: boolean;
  onClose: () => void;
  onForget: (record: MemoryRecord) => void;
  /** The record's decay projection, when the caller has it — a curve without
   *  its threshold needs the prune line to be readable, so both travel
   *  together. Optional: surfaces that never fetched one skip the block. */
  decay?: { curve: MemoryDecayCurve; threshold: number; turnsAhead: number } | null;
  /** Sub-scope the record was read from; the source fetch must query the same
   *  store or the drawer answers with a 404 for a record that exists. */
  scope?: MemoryScopeParams;
}

/**
 * One record, its validity, and the verbatim turns it came from.
 *
 * The source turns are the point of the screen. Most memory products hand back
 * a vector and a score and throw the wording away, which leaves "why does it
 * think that?" unanswerable after the fact. Here it is the largest block on
 * the page, and a backend that keeps no turn text says so rather than
 * rendering an empty list.
 */
export default function MemoryRecordDetail({
  record,
  open,
  onClose,
  onForget,
  decay = null,
  scope,
}: MemoryRecordDetailProps) {
  const [source, setSource] = useState<MemoryRecordSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* `record` is already in hand from the list; this fetch adds the source and
     the resolved validity the list does not carry. `onClose` is stable at the
     call site, so `close` is too and Modal's focus handling stays put. */
  const close = useCallback(() => {
    setSource(null);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !record) return;
    let live = true;
    setLoading(true);
    setError(null);
    setSource(null);

    getMemoryRecordSource(record.id, scope)
      .then((data) => {
        if (live) setSource(data);
      })
      .catch((err) => {
        if (live) setError(memoryErrorMessage(err));
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [open, record, scope]);

  if (!record) return null;

  const validity = source?.validity;

  return (
    <Modal open={open} onClose={close} title={record.entity_name}>
      <div className={styles.detailFact}>{record.fact_content}</div>

      <div className={styles.badgeRow}>
        <MemoryTypeBadge type={record.memory_type} />
        <span className={styles.chip}>
          {record.is_active ? 'current' : `superseded at turn ${formatTurn(record.invalid_at)}`}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <div>
          <div className={styles.metaLabel}>Weight</div>
          <div className={styles.metaValue}>
            <WeightMeter weight={record.weight} />
          </div>
        </div>
        <div>
          <div className={styles.metaLabel}>Consolidation</div>
          <div className={styles.metaValue}>{record.consolidation_index}</div>
        </div>
        <div>
          <div className={styles.metaLabel}>Created at turn</div>
          <div className={styles.metaValue}>{formatTurn(record.created_at_turn)}</div>
        </div>
        <div>
          <div className={styles.metaLabel}>Last reinforced</div>
          <div className={styles.metaValue}>{formatTurn(record.last_reinforced_turn)}</div>
        </div>
      </div>

      <div className={styles.detailBlocks}>
        {record.related_entities.length > 0 && (
          <div className={styles.subPanel}>
            <div className={styles.subPanelTitle}>Related entities</div>
            <div className={styles.relatedList}>
              {record.related_entities.map((entity) => (
                <span key={entity} className={styles.relatedTag}>
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={styles.subPanel}>
          <div className={styles.subPanelTitle}>Validity</div>
          {loading && <SkeletonLoader variant="text" count={2} />}
          {error && <p className={styles.stateErrorText}>{error}</p>}
          {validity && (
            <>
              <div className={styles.validityGrid}>
                <div>
                  <div className={styles.metaLabel}>Valid from turn</div>
                  <div className={styles.metaValue}>{formatTurn(validity.valid_at)}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>Valid date</div>
                  <div className={styles.metaValue}>{validity.valid_date ?? '—'}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>Invalid at turn</div>
                  <div className={styles.metaValue}>{formatTurn(validity.invalid_at)}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>Invalid date</div>
                  <div className={styles.metaValue}>{validity.invalid_date ?? '—'}</div>
                </div>
              </div>
              {validity.valid_at_text && (
                <p className={styles.caption}>
                  The extractor recorded this as &ldquo;{validity.valid_at_text}&rdquo;.
                </p>
              )}
              {!validity.has_dates && (
                <p className={styles.caption}>
                  This store was never dated, so the numbers above are turn indices, not calendar
                  dates.
                </p>
              )}
            </>
          )}
        </div>

        {decay && (
          <div className={styles.subPanel}>
            <div className={styles.subPanelTitle}>Decay projection</div>
            <p className={styles.caption}>
              Weight over the next {decay.turnsAhead} turns under the engine&rsquo;s own law,
              projected from now — asking for the curve does not move it.
            </p>
            <DecaySparkline
              points={decay.curve.points}
              threshold={decay.threshold}
              ariaLabel={`${record.entity_name} decays from ${formatWeight(
                decay.curve.current_weight,
              )} to ${
                formatWeight(
                  decay.curve.points[decay.curve.points.length - 1]?.weight ??
                    decay.curve.current_weight,
                )
              } over ${decay.turnsAhead} turns.`}
            />
            <p className={styles.caption}>
              now {formatWeight(decay.curve.current_weight)} → +{decay.turnsAhead}{' '}
              {formatWeight(
                decay.curve.points[decay.curve.points.length - 1]?.weight ??
                  decay.curve.current_weight,
              )}
              {' · '}λ-index {decay.curve.consolidation_index}. The dashed line is the prune
              threshold.
            </p>
          </div>
        )}

        <div className={styles.subPanel}>
          <div className={styles.subPanelTitle}>Source turns</div>
          <p className={styles.caption}>
            The verbatim turns this fact was extracted from. Read them before you change
            anything.
          </p>
          {loading && <SkeletonLoader variant="text" count={3} />}
          {source && source.source_turns.length === 0 && (
            <p className={styles.sourceTurnMissing}>
              No source turns are recorded for this fact.
            </p>
          )}
          {source && source.source_turns.length > 0 && (
            <div className={styles.sourceList}>
              {source.source_turns.map((turn) => (
                <article key={turn.turn} className={styles.sourceTurn}>
                  <div className={styles.sourceTurnHead}>
                    <span>Turn {turn.turn}</span>
                    <span>{turn.timestamp ?? 'no timestamp'}</span>
                  </div>
                  {turn.text === null ? (
                    <p className={styles.sourceTurnMissing}>
                      This store does not retain the wording of turn {turn.turn}. The fact was
                      extracted from it; the words were not kept.
                    </p>
                  ) : (
                    <blockquote className={styles.sourceTurnText}>{turn.text}</blockquote>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.detailActions}>
        <Button variant="danger" onClick={() => onForget(record)}>
          Forget this fact
        </Button>
        <Button variant="ghost" onClick={close}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
