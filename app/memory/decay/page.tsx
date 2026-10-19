'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getMemoryDecayCurves, MemoryDecayCurve, MemoryDecayProjection } from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import MemoryTypeBadge from '@/components/memory/MemoryTypeBadge';
import { formatWeight, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';
import views from '../MemoryViews.module.css';

const HORIZONS = [10, 25, 50, 100];

/** Past this the grid is a scroll and the page says so. */
const MAX_CURVES = 12;

const CHART = { width: 100, height: 40 };

/** Weights are 0–1; a projection point outside that is a service bug, not a
 *  value to draw off-canvas. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** The engine's own decay law, `w0 * e^{-λΔt}`, projected forward from now.
 *  Asking for the curve cannot move it: this is a read. */
export default function DecayPage() {
  const [projection, setProjection] = useState<MemoryDecayProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [turnsAhead, setTurnsAhead] = useState(50);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjection(await getMemoryDecayCurves(turnsAhead));
      setError(null);
    } catch (err) {
      setProjection(null);
      setError(memoryErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [turnsAhead]);

  useEffect(() => {
    load();
  }, [load]);

  const curves = projection?.curves ?? [];
  const visible = curves.slice(0, MAX_CURVES);

  /** Where a curve crosses the prune threshold, if it does. */
  const crossingTurn = (curve: MemoryDecayCurve, threshold: number): number | null => {
    if (threshold <= 0) return null;
    for (const point of curve.points) {
      if (point.weight <= threshold) return point.turn;
    }
    return null;
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Decay</h1>
          <p className={styles.pageSub}>
            Where every fact is heading if nothing reinforces it. Weight decays as{' '}
            <code>w0 · e^(-λ·Δt)</code> over conversational turns, with λ set per memory tier — a
            Core Anchor never decays, and an ephemeral fact decays fast. A curve crossing the prune
            threshold is a fact the engine will drop on its own.
          </p>
        </div>
        <div className={styles.toolbarGroup}>
          <Select
            label="Horizon"
            options={HORIZONS.map((n) => ({ value: String(n), label: `+${n} turns` }))}
            value={String(turnsAhead)}
            onChange={(e) => setTurnsAhead(Number(e.target.value))}
          />
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={load}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <MemoryStatePanel tone="error" title="Decay projection unavailable" body={error} />
      ) : loading && !projection ? (
        <SkeletonLoader variant="text" count={6} />
      ) : !projection ? (
        <MemoryStatePanel title="No projection" body="Curves appear once facts are stored." />
      ) : (
        <>
          <Card>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Current turn</div>
                <div className={styles.statValue}>{projection.current_turn}</div>
                <div className={styles.statHint}>the projection starts here</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Prune threshold</div>
                <div className={styles.statValue}>{formatWeight(projection.prune_threshold)}</div>
                <div className={styles.statHint}>weight at which the engine prunes</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Curves</div>
                <div className={styles.statValue}>{curves.length}</div>
                <div className={styles.statHint}>
                  {curves.length > MAX_CURVES ? `showing ${MAX_CURVES}` : 'every stored fact'}
                </div>
              </div>
            </div>
            {curves.length > MAX_CURVES && (
              <p className={styles.recordsHint}>
                Showing the first {MAX_CURVES} of {curves.length} curves. The service projects every
                record; this page draws a window of them.
              </p>
            )}
          </Card>

          {visible.length === 0 ? (
            <MemoryStatePanel
              title="Nothing to project"
              body="No records are stored yet, so there is nothing to decay."
            />
          ) : (
            <div className={views.curveGrid}>
              {visible.map((curve) => {
                const thresholdY = CHART.height - clamp01(projection.prune_threshold) * CHART.height;
                const points = curve.points.map((point, index) => {
                  const x =
                    curve.points.length > 1
                      ? (index / (curve.points.length - 1)) * CHART.width
                      : 0;
                  const y = CHART.height - clamp01(point.weight) * CHART.height;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                const finalWeight = curve.points[curve.points.length - 1]?.weight ?? curve.current_weight;
                const crosses = crossingTurn(curve, projection.prune_threshold);

                return (
                  <div key={curve.record_id} className={views.curveCard}>
                    <div className={views.curveHead}>
                      <MemoryTypeBadge type={curve.memory_type} />
                      <span className={views.curveEntity}>{curve.entity_name}</span>
                    </div>
                    <div className={views.curveMeta}>
                      <span>now {formatWeight(curve.current_weight)}</span>
                      <span>λ-index {curve.consolidation_index}</span>
                      <span>
                        +{turnsAhead} {formatWeight(finalWeight)}
                      </span>
                    </div>
                    <svg
                      className={views.curveSvg}
                      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${curve.entity_name} decays from ${formatWeight(
                        curve.current_weight,
                      )} to ${formatWeight(finalWeight)} over ${turnsAhead} turns${
                        crosses === null ? '' : `, crossing the prune threshold at turn ${crosses}`
                      }.`}
                    >
                      <line
                        className={views.curveThreshold}
                        x1="0"
                        x2={CHART.width}
                        y1={thresholdY}
                        y2={thresholdY}
                        vectorEffect="non-scaling-stroke"
                      />
                      <polyline
                        className={views.curveLine}
                        points={points.join(' ')}
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <p className={styles.caption}>
                      {crosses === null
                        ? 'Stays above the prune threshold across the horizon.'
                        : `Crosses the prune threshold at turn ${crosses} if nothing reinforces it.`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <p className={styles.footNote}>
        A flat line is a Core Anchor — its λ is zero and nothing prunes it. The dashed line on each
        chart is the prune threshold. Projecting forward is a read: asking for the curve cannot move
        it.
      </p>
    </div>
  );
}
