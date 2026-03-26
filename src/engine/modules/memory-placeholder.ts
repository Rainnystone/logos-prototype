import type { HistoryEntry } from '@/types';

export const DEFAULT_WINDOW_SIZE = 5;

/**
 * Returns the current round's `precedingBeats` window from accepted history.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/memory-placeholder.md
 */
export function getHistoryWindow(
  acceptedHistory: readonly HistoryEntry[],
  windowSize: number = DEFAULT_WINDOW_SIZE,
): readonly HistoryEntry[] {
  const normalizedWindowSize = Math.max(0, Math.floor(windowSize));

  if (normalizedWindowSize === 0) {
    return [];
  }

  return acceptedHistory.slice(-normalizedWindowSize);
}
