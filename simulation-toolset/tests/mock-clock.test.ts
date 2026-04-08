/**
 * Tests for MockClock - controlled time source for simulation.
 *
 * MockClock provides deterministic time behavior for tests:
 * - Frozen time (always returns same timestamp)
 * - Controlled time (can be advanced manually)
 * - Real time passthrough (default, for backward compatibility)
 */

import { describe, expect, it } from 'vitest';

import { createMockClock, type MockClockMode } from '@simulation/mock-clock';

describe('MockClock', () => {
  describe('frozen mode', () => {
    it('returns the same timestamp on every call', () => {
      const frozenTime = new Date('2026-04-08T12:00:00.000Z');
      const clock = createMockClock({ mode: 'frozen', initialTime: frozenTime });

      const t1 = clock.now();
      const t2 = clock.now();
      const t3 = clock.now();

      expect(t1).toBe('2026-04-08T12:00:00.000Z');
      expect(t2).toBe('2026-04-08T12:00:00.000Z');
      expect(t3).toBe('2026-04-08T12:00:00.000Z');
    });

    it('ignores advance() calls without throwing', () => {
      const clock = createMockClock({ mode: 'frozen', initialTime: new Date('2026-04-08T12:00:00.000Z') });

      clock.advance(1000); // Should not throw, but also not change time

      expect(clock.now()).toBe('2026-04-08T12:00:00.000Z');
    });

    it('cannot set time', () => {
      const clock = createMockClock({ mode: 'frozen', initialTime: new Date('2026-04-08T12:00:00.000Z') });

      expect(() => clock.set(new Date('2026-04-08T15:00:00.000Z'))).toThrow();
    });

    it('reports correct mode', () => {
      const clock = createMockClock({ mode: 'frozen' });
      expect(clock.getMode()).toBe('frozen');
    });
  });

  describe('controlled mode', () => {
    it('starts at initial time', () => {
      const initialTime = new Date('2026-04-08T12:00:00.000Z');
      const clock = createMockClock({ mode: 'controlled', initialTime });

      expect(clock.now()).toBe('2026-04-08T12:00:00.000Z');
    });

    it('advances time by milliseconds', () => {
      const clock = createMockClock({ mode: 'controlled', initialTime: new Date('2026-04-08T12:00:00.000Z') });
      clock.advance(1000);

      expect(clock.now()).toBe('2026-04-08T12:00:01.000Z');
    });

    it('can be set to a specific time', () => {
      const clock = createMockClock({ mode: 'controlled' });
      clock.set(new Date('2026-04-08T15:30:00.000Z'));

      expect(clock.now()).toBe('2026-04-08T15:30:00.000Z');
    });

    it('supports chaining multiple advance calls', () => {
      const clock = createMockClock({ mode: 'controlled', initialTime: new Date('2026-04-08T12:00:00.000Z') });
      clock.advance(1000);
      clock.advance(2000);

      expect(clock.now()).toBe('2026-04-08T12:00:03.000Z');
    });

    it('throws on negative advance', () => {
      const clock = createMockClock({ mode: 'controlled' });

      expect(() => clock.advance(-100)).toThrow('negative');
    });

    it('nowAsDate returns Date object', () => {
      const clock = createMockClock({ mode: 'controlled', initialTime: new Date('2026-04-08T12:00:00.000Z') });

      const date = clock.nowAsDate();

      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2026-04-08T12:00:00.000Z');
    });

    it('nowMs returns milliseconds', () => {
      const clock = createMockClock({ mode: 'controlled', initialTime: new Date('2026-04-08T12:00:00.000Z') });

      expect(clock.nowMs()).toBe(new Date('2026-04-08T12:00:00.000Z').getTime());
    });

    it('reports correct mode', () => {
      const clock = createMockClock({ mode: 'controlled' });
      expect(clock.getMode()).toBe('controlled');
    });
  });

  describe('real mode (default)', () => {
    it('returns current system time', () => {
      const clock = createMockClock({ mode: 'real' });

      const before = Date.now();
      const result = clock.nowMs();
      const after = Date.now();

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('advances with real time', async () => {
      const clock = createMockClock({ mode: 'real' });

      const t1 = clock.nowMs();
      await new Promise((r) => setTimeout(r, 10));
      const t2 = clock.nowMs();

      expect(t2).toBeGreaterThan(t1);
    });

    it('throws on advance', () => {
      const clock = createMockClock({ mode: 'real' });

      expect(() => clock.advance(1000)).toThrow('real');
    });

    it('throws on set', () => {
      const clock = createMockClock({ mode: 'real' });

      expect(() => clock.set(new Date())).toThrow('real');
    });

    it('is the default mode', () => {
      const clock = createMockClock();
      expect(clock.getMode()).toBe('real');
    });
  });

  describe('default initialTime', () => {
    it('uses current system time when not specified (frozen)', () => {
      const before = Date.now();
      const clock = createMockClock({ mode: 'frozen' });
      const time = clock.nowMs();
      const after = Date.now();

      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });

    it('uses current system time when not specified (controlled)', () => {
      const before = Date.now();
      const clock = createMockClock({ mode: 'controlled' });
      const time = clock.nowMs();
      const after = Date.now();

      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });
  });
});