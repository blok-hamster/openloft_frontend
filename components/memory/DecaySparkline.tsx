'use client';

import { MemoryDecayPoint } from '@/lib/api';
import Sparkline from '@/components/ui/Sparkline';
import styles from './Memory.module.css';

/**
 * The decay-law drawing — a Sparkline with the memory palette and a
 * threshold. The kit owns the geometry (auto-scaling, the single-sample
 * guard, the threshold line); this adapter supplies the meaning:
 * weights are absolute 0–1, the dashed line is the prune threshold, and
 * the chart is a labelled image because it answers "when will this fact
 * be forgotten" in a shape, not a number.
 */
export const DECAY_CHART = { width: 100, height: 40 };

/** Weights are 0–1; a projection point outside that is a service bug, not a
 *  value to draw off-canvas. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface DecaySparklineProps {
  points: MemoryDecayPoint[];
  threshold: number;
  /** One short sentence: what the chart shows and what it cannot change. */
  ariaLabel: string;
}

export default function DecaySparkline({ points, threshold, ariaLabel }: DecaySparklineProps) {
  if (points.length === 0) return null;

  return (
    <Sparkline
      data={points.map((point) => clamp01(point.weight))}
      width={DECAY_CHART.width}
      height={DECAY_CHART.height}
      domain={[0, 1]}
      threshold={clamp01(threshold)}
      label={ariaLabel}
      fluid
      preserveAspectRatio="none"
      className={styles.sparkSvg}
      lineClassName={styles.sparkLine}
      thresholdClassName={styles.sparkThreshold}
    />
  );
}
