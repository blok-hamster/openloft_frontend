'use client';

import { MemoryDecayPoint } from '@/lib/api';
import styles from './Memory.module.css';

/**
 * The decay-law drawing, shared. `Memory.module.css` already holds the weight
 * meter — the other drawing of a number in [0, 1] — so its vocabulary carries
 * over: a thin track, a single line, and the prune threshold as the only
 * colour. Nothing here computes; callers hand in already-projected points.
 */
export const DECAY_CHART = { width: 100, height: 40 };

/** Weights are 0–1; a projection point outside that is a service bug, not a
 *  value to draw off-canvas. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** The polyline for the curve itself — the caller composes it with the
 *  threshold line so a card can add its own chrome around it. */
export function decayLine(points: MemoryDecayPoint[]): string {
  return points
    .map((point, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * DECAY_CHART.width : 0;
      const y = DECAY_CHART.height - clamp01(point.weight) * DECAY_CHART.height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface DecaySparklineProps {
  points: MemoryDecayPoint[];
  threshold: number;
  /** One short sentence: what the chart shows and what it cannot change. */
  ariaLabel: string;
}

export default function DecaySparkline({ points, threshold, ariaLabel }: DecaySparklineProps) {
  const thresholdY = DECAY_CHART.height - clamp01(threshold) * DECAY_CHART.height;

  if (points.length === 0) return null;

  return (
    <svg
      className={styles.sparkSvg}
      viewBox={`0 0 ${DECAY_CHART.width} ${DECAY_CHART.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <line
        className={styles.sparkThreshold}
        x1="0"
        x2={DECAY_CHART.width}
        y1={thresholdY}
        y2={thresholdY}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        className={styles.sparkLine}
        points={decayLine(points)}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
