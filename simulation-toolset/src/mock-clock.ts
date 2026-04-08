/**
 * MockClock - controlled time source for simulation.
 *
 * Provides deterministic time behavior for tests:
 * - 'frozen': Always returns the same timestamp
 * - 'controlled': Can be advanced manually for testing time-dependent logic
 * - 'real': Passthrough to system time (default, backward compatible)
 *
 * Reference: simulation-toolset/docs/findings.md "统一 Mock 时钟设计"
 */

export type MockClockMode = 'frozen' | 'controlled' | 'real';

export interface MockClockOptions {
  /**
   * Clock mode:
   * - 'frozen': Time never changes
   * - 'controlled': Time can be advanced manually
   * - 'real': Use system time (default)
   */
  mode?: MockClockMode;

  /**
   * Initial time. Required for 'frozen' and 'controlled' modes.
   * Defaults to current system time if not specified.
   */
  initialTime?: Date;
}

export interface MockClock {
  /**
   * Get current timestamp as ISO string.
   */
  now(): string;

  /**
   * Get current timestamp as Date object.
   */
  nowAsDate(): Date;

  /**
   * Get current timestamp in milliseconds since epoch.
   */
  nowMs(): number;

  /**
   * Advance time by specified milliseconds.
   * Only works in 'controlled' mode.
   * @throws Error if called in 'frozen' or 'real' mode
   */
  advance(ms: number): void;

  /**
   * Set time to a specific date.
   * @throws Error if called in 'real' mode
   */
  set(date: Date): void;

  /**
   * Get the clock mode.
   */
  getMode(): MockClockMode;
}

/**
 * Create a MockClock instance.
 */
export function createMockClock(options: MockClockOptions = {}): MockClock {
  const mode = options.mode ?? 'real';
  let currentTimeMs: number;

  if (options.initialTime) {
    currentTimeMs = options.initialTime.getTime();
  } else {
    currentTimeMs = Date.now();
  }

  return {
    now(): string {
      if (mode === 'real') {
        return new Date().toISOString();
      }
      return new Date(currentTimeMs).toISOString();
    },

    nowAsDate(): Date {
      if (mode === 'real') {
        return new Date();
      }
      return new Date(currentTimeMs);
    },

    nowMs(): number {
      if (mode === 'real') {
        return Date.now();
      }
      return currentTimeMs;
    },

    advance(ms: number): void {
      if (mode === 'real') {
        throw new Error('Cannot advance time in "real" mode');
      }
      if (mode === 'frozen') {
        // Frozen mode ignores advance, but doesn't throw
        return;
      }
      if (ms < 0) {
        throw new Error('Cannot advance time by negative milliseconds');
      }
      currentTimeMs += ms;
    },

    set(date: Date): void {
      if (mode === 'real') {
        throw new Error('Cannot set time in "real" mode');
      }
      if (mode === 'frozen') {
        throw new Error('Cannot set time in "frozen" mode');
      }
      currentTimeMs = date.getTime();
    },

    getMode(): MockClockMode {
      return mode;
    },
  };
}