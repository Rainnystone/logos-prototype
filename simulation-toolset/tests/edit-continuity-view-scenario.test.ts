import { describe, expect, it } from 'vitest';

import { createEditContinuityViewScenario } from '../scenarios/edit-continuity-view';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('edit continuity view scenario', () => {
  it('verifies bounded projection: active view with relationship summary, no raw data exposure', async () => {
    const report = await runSimulationScenario(createEditContinuityViewScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // View kind is active when session exists
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'view-kind-is-active',
        pass: true,
      }),
    );

    // Relationship summary is present
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'relationship-summary-present',
        pass: true,
      }),
    );

    // Raw checkpointsById is NOT exposed
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'raw-checkpoints-not-exposed',
        pass: true,
      }),
    );

    // Raw transcript is NOT exposed
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'raw-transcript-not-exposed',
        pass: true,
      }),
    );
  });
});