import styles from './Memory.module.css';
import { formatWeight, weightPercent } from './memoryFormat';

/**
 * A record's weight, as a meter and a number.
 *
 * The number is the truth; the meter is the glance. Both come from tokens —
 * the fill is `--memory-weight-fill` on a `--memory-weight-track`, so a theme
 * change moves them together.
 */
export default function WeightMeter({ weight }: { weight: number }) {
  const percent = weightPercent(weight);

  return (
    <span className={styles.weight}>
      <span
        className={styles.weightTrack}
        role="img"
        aria-label={`Weight ${formatWeight(weight)} of 1`}
      >
        <span className={styles.weightFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.weightValue}>{formatWeight(weight)}</span>
    </span>
  );
}
