/**
 * Tests for MockKernel integration with MockClock.
 *
 * Verifies that MockKernel uses the provided MockClock for timestamp generation
 * instead of system time, ensuring deterministic test behavior.
 */

import { describe, expect, it } from 'vitest';

import { createMockKernel } from '@simulation/mock-kernel';
import { createMockClock } from '@simulation/mock-clock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { createSubstrateMock } from '@simulation/substrate-mock';

describe('MockKernel with MockClock', () => {
  describe('kernel creation with clock', () => {
    it('accepts a clock option', () => {
      const clock = createMockClock({ mode: 'frozen', initialTime: new Date('2026-04-08T12:00:00.000Z') });
      const kernel = createMockKernel('test-package', { clock });

      expect(kernel).toBeDefined();
    });

    it('uses clock for internal timestamps', () => {
      const frozenTime = new Date('2026-04-08T12:00:00.000Z');
      const clock = createMockClock({ mode: 'frozen', initialTime: frozenTime });
      const kernel = createMockKernel('test-package', { clock });

      // Kernel should expose the clock for timestamp access
      expect(kernel.clock.now()).toBe('2026-04-08T12:00:00.000Z');
    });
  });

  describe('MockFixtureBuilder with clock', () => {
    it('uses kernel clock for buildStoryline timestamps', () => {
      const frozenTime = new Date('2026-04-08T12:00:00.000Z');
      const clock = createMockClock({ mode: 'frozen', initialTime: frozenTime });
      const kernel = createMockKernel('test-package', { clock });
      const builder = createMockFixtureBuilder(kernel);

      const result = builder.buildStoryline({ storylineId: 'sl_test', name: 'Test Line' });

      // Get the storyline from kernel state
      const state = kernel.getState();
      const storyline = state.storylineRepository?.storylinesById[result.storylineId];

      expect(storyline?.createdAt).toBe('2026-04-08T12:00:00.000Z');
      expect(storyline?.updatedAt).toBe('2026-04-08T12:00:00.000Z');
    });

    it('uses controlled clock for sequential operations', () => {
      const clock = createMockClock({ mode: 'controlled', initialTime: new Date('2026-04-08T12:00:00.000Z') });
      const kernel = createMockKernel('test-package', { clock });
      const builder = createMockFixtureBuilder(kernel);

      // First operation at 12:00:00
      const result1 = builder.buildStoryline({ storylineId: 'sl_1', name: 'Line 1' });

      // Verify first storyline was created with correct timestamp
      const state1 = kernel.getState();
      const sl1 = state1.storylineRepository?.storylinesById['sl_1'];
      expect(sl1?.createdAt).toBe('2026-04-08T12:00:00.000Z');

      // Advance clock by 1 second
      clock.advance(1000);

      // Second operation at 12:00:01
      const result2 = builder.buildStoryline({ storylineId: 'sl_2', name: 'Line 2' });

      // Note: buildStoryline creates a new repository each time, so sl_2 replaces sl_1
      const state2 = kernel.getState();
      const sl2 = state2.storylineRepository?.storylinesById['sl_2'];
      expect(sl2?.createdAt).toBe('2026-04-08T12:00:01.000Z');
    });
  });

  describe('SubstrateMock with clock', () => {
    it('uses kernel clock for updateStorylineDisplayName', async () => {
      const clock = createMockClock({ mode: 'controlled', initialTime: new Date('2026-04-08T12:00:00.000Z') });
      const kernel = createMockKernel('test-package', { clock });
      const builder = createMockFixtureBuilder(kernel);
      const substrate = createSubstrateMock(kernel);

      // Create storyline at 12:00:00
      builder.buildStoryline({ storylineId: 'sl_test', name: 'Original Name' });

      // Advance clock by 5 seconds
      clock.advance(5000);

      // Update at 12:00:05
      const result = await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId: 'sl_test',
        nextDisplayName: 'New Name',
      });

      expect(result.storyline.updatedAt).toBe('2026-04-08T12:00:05.000Z');
    });
  });

  describe('backward compatibility', () => {
    it('creates default real clock when no clock provided', () => {
      const kernel = createMockKernel('test-package');

      // Should have a clock that behaves like real time
      expect(kernel.clock).toBeDefined();
      expect(kernel.clock.getMode()).toBe('real');
    });
  });
});