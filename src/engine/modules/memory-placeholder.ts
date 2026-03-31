import type { HistoryEntry } from '@/types';

/**
 * Returns the current round's `precedingBeats` window from accepted history.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/memory-placeholder.md
 */
export function getHistoryWindow(
  acceptedHistory: readonly HistoryEntry[],
  windowSize?: number,
): readonly HistoryEntry[] {
  if (windowSize === undefined) {
    return acceptedHistory.slice();
  }

  const normalizedWindowSize = Math.max(0, Math.floor(windowSize));

  if (normalizedWindowSize === 0) {
    return [];
  }

  return acceptedHistory.slice(-normalizedWindowSize);
}
