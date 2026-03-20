import { describe, expect, it } from 'vitest';

import type { HistoryEntry } from '@/types';
import { getHistoryWindow } from '@/engine/modules/memory-placeholder';

function buildHistoryEntry(index: number, role: HistoryEntry['role']): HistoryEntry {
  return {
    role,
    content: `entry-${index}`,
  };
}

describe('Memory Placeholder', () => {
  it('returns the last five entries from accepted history', () => {
    const acceptedHistory = Array.from({ length: 10 }, (_, index) =>
      buildHistoryEntry(index, index % 2 === 0 ? 'assistant' : 'user'),
    );

    expect(getHistoryWindow(acceptedHistory)).toEqual(acceptedHistory.slice(-5));
  });

  it('returns all entries when history has fewer than five items', () => {
    const acceptedHistory = [
      buildHistoryEntry(1, 'assistant'),
      buildHistoryEntry(2, 'user'),
      buildHistoryEntry(3, 'assistant'),
    ];

    expect(getHistoryWindow(acceptedHistory)).toEqual(acceptedHistory);
  });

  it('returns an empty array when history is empty', () => {
    expect(getHistoryWindow([])).toEqual([]);
  });

  it('returns all entries when history size matches the default window', () => {
    const acceptedHistory = Array.from({ length: 5 }, (_, index) =>
      buildHistoryEntry(index, index % 2 === 0 ? 'assistant' : 'user'),
    );

    expect(getHistoryWindow(acceptedHistory)).toEqual(acceptedHistory);
  });

  it('supports a custom window size', () => {
    const acceptedHistory = Array.from({ length: 6 }, (_, index) =>
      buildHistoryEntry(index, index % 2 === 0 ? 'assistant' : 'user'),
    );

    expect(getHistoryWindow(acceptedHistory, 3)).toEqual(acceptedHistory.slice(-3));
  });

  it('does not mutate the input array', () => {
    const acceptedHistory = Object.freeze([
      buildHistoryEntry(1, 'assistant'),
      buildHistoryEntry(2, 'user'),
      buildHistoryEntry(3, 'assistant'),
      buildHistoryEntry(4, 'user'),
      buildHistoryEntry(5, 'assistant'),
      buildHistoryEntry(6, 'user'),
    ]);

    expect(() => getHistoryWindow(acceptedHistory)).not.toThrow();
    expect(acceptedHistory).toEqual([
      buildHistoryEntry(1, 'assistant'),
      buildHistoryEntry(2, 'user'),
      buildHistoryEntry(3, 'assistant'),
      buildHistoryEntry(4, 'user'),
      buildHistoryEntry(5, 'assistant'),
      buildHistoryEntry(6, 'user'),
    ]);
  });

  it('returns entries in chronological order', () => {
    const acceptedHistory = Array.from({ length: 7 }, (_, index) =>
      buildHistoryEntry(index, index % 2 === 0 ? 'assistant' : 'user'),
    );

    expect(getHistoryWindow(acceptedHistory)).toEqual([
      buildHistoryEntry(2, 'assistant'),
      buildHistoryEntry(3, 'user'),
      buildHistoryEntry(4, 'assistant'),
      buildHistoryEntry(5, 'user'),
      buildHistoryEntry(6, 'assistant'),
    ]);
  });

  it('preserves valid history entry structure', () => {
    const acceptedHistory = [
      buildHistoryEntry(1, 'user'),
      buildHistoryEntry(2, 'assistant'),
    ] as const;

    const historyWindow = getHistoryWindow(acceptedHistory);

    expect(historyWindow[0]?.role).toBe('user');
    expect(historyWindow[0]?.content.length).toBeGreaterThan(0);
    expect(historyWindow[1]?.role).toBe('assistant');
    expect(historyWindow[1]?.content.length).toBeGreaterThan(0);
  });
});
