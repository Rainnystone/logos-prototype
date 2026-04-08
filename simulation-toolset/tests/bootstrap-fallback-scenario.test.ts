import { describe, it, expect } from 'vitest';

import { createBootstrapFallbackScenario } from '../scenarios/bootstrap-fallback';

describe('S10: Bootstrap Fallback', () => {
  it('defines fallback scenario', () => {
    const scenario = createBootstrapFallbackScenario();
    expect(scenario.scenarioId).toBe('bootstrap-fallback');
    expect(scenario.steps).toHaveLength(5);
    expect(scenario.steps[1]).toEqual({ kind: 'gossipelog-bootstrap-force-fail' });
  });
});
