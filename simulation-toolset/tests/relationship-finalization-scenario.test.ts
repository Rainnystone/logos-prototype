import { describe, expect, it } from 'vitest';

import { createRelationshipFinalizationScenario } from '../scenarios/relationship-finalization';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('relationship finalization scenario', () => {
  it('verifies gossipelog finalization targets correct session and checkpoint with layer convergence', async () => {
    const report = await runSimulationScenario(createRelationshipFinalizationScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Verify gossipelog cycle ran
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
    });

    // Verify session observation was captured
    expect(report.finalState).toHaveProperty('activeSessionId');
    expect(report.finalState).toHaveProperty('activeCheckpointId');

    // Verify session-level and checkpoint-level layers converged
    expect(report.finalState).toHaveProperty('sessionLayerText');
    expect(report.finalState).toHaveProperty('checkpointLayerText');
    expect(report.finalState.sessionLayerText).toBe(report.finalState.checkpointLayerText);

    // Verify the relationship layer has content
    expect(report.finalState.sessionLayerText).toBeTruthy();
  });
});