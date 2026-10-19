import type { MemoryType } from '@/lib/api';

/**
 * Display helpers for the memory console.
 *
 * Every number the memory service returns is either a turn index, a weight in
 * [0, 1], or a hop count. None of them are human-readable as-is, and all three
 * are easy to render misleadingly — a turn number is not a date, and a hop
 * count is not a score — so the wording lives here rather than being spelled
 * out at each call site.
 */

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  CoreAnchor: 'Core Anchor',
  ActiveContext: 'Active Context',
  EphemeralState: 'Ephemeral',
};

/** What the tier decides, in one clause, for the badge's accessible name. */
export const MEMORY_TYPE_NOTES: Record<MemoryType, string> = {
  CoreAnchor: 'a persistent identity fact',
  ActiveContext: 'a fact under active use',
  EphemeralState: 'a short-lived state fact',
};

export function memoryTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Unknown';
  return MEMORY_TYPE_LABELS[type as MemoryType] ?? type;
}

/** Turn indices are counts, not timestamps. Never format one as a date. */
export function formatTurn(turn: number | null | undefined): string {
  return turn === null || turn === undefined ? '—' : String(turn);
}

/** Weights are stored 0–1 and read as a proportion of full strength. */
export function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return '—';
  return weight.toFixed(3);
}

export function weightPercent(weight: number | null | undefined): number {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return 0;
  return Math.max(0, Math.min(100, weight * 100));
}

/**
 * Hop distance is real information about *how* the record was reached through
 * the entity graph: 0 is a direct vector match, and each hop above that is one
 * edge of spreading activation. It is not a quality score, so it is never
 * rendered as one.
 */
export function hopsLabel(hops: number | null | undefined): string {
  if (hops === null || hops === undefined) return 'unknown reach';
  if (hops <= 0) return 'direct hit';
  if (hops === 1) return '1 hop through the entity graph';
  return `${hops} hops through the entity graph`;
}

/** Retrieval scores are cosine similarities, so they only read as 0–1. */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return '—';
  return score.toFixed(3);
}

/** The service's own error wording when it has some, otherwise a plain one. */
export function memoryErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: unknown; detail?: unknown } } } | null)
    ?.response?.data;
  const raw = data?.error ?? data?.detail;
  if (typeof raw === 'string' && raw.trim() !== '') return raw;
  return 'The memory service did not answer. Try again in a moment.';
}

/** `turn_from` / `turn_to` are inclusive turn indices, not offsets. */
export function formatTurnRange(from: number, to: number): string {
  return from === to ? `turn ${from}` : `turns ${from}–${to}`;
}
