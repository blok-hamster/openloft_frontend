'use client';

import type { ReactNode } from 'react';
import styles from './Memory.module.css';

interface MemoryStatePanelProps {
  title: string;
  body?: ReactNode;
  /** `error` uses the coral border and title colour from the design guide. */
  tone?: 'neutral' | 'error';
  children?: ReactNode;
}

/**
 * The console's empty and failure states. A memory read surface that is partly
 * unavailable should still render the parts that are, and say plainly which
 * part is not answering — an empty table reads as "no facts stored", which is
 * a very different (and wrong) statement.
 */
export default function MemoryStatePanel({
  title,
  body,
  tone = 'neutral',
  children,
}: MemoryStatePanelProps) {
  return (
    <div className={`${styles.statePanel} ${tone === 'error' ? styles.stateError : ''}`}>
      <div className={styles.stateTitle}>{title}</div>
      {body && <p className={styles.stateBody}>{body}</p>}
      {children}
    </div>
  );
}
