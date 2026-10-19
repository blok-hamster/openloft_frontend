import type { MemoryType } from '@/lib/api';
import styles from './Memory.module.css';
import { MEMORY_TYPE_NOTES, memoryTypeLabel } from './memoryFormat';

const TYPE_CLASS: Record<MemoryType, string> = {
  CoreAnchor: styles.badgeCore,
  ActiveContext: styles.badgeActive,
  EphemeralState: styles.badgeEphemeral,
};

/**
 * The memory tier, as a colour plus a word. The colour is load-bearing: a
 * console reading hundreds of rows identifies the tier from the badge before
 * it reads the label.
 */
export default function MemoryTypeBadge({ type }: { type: MemoryType | string | null }) {
  const label = memoryTypeLabel(type as MemoryType);
  const known = type === 'CoreAnchor' || type === 'ActiveContext' || type === 'EphemeralState';

  return (
    <span
      className={`${styles.badge} ${known ? TYPE_CLASS[type as MemoryType] : styles.badgeUnknown}`}
      title={known ? `${label} — ${MEMORY_TYPE_NOTES[type as MemoryType]}` : undefined}
    >
      {label}
    </span>
  );
}
