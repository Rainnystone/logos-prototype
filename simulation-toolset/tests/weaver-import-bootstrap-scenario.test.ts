import { describe, it, expect } from 'vitest';

import { createWeaverImportBootstrapScenario } from '../scenarios/weaver-import-bootstrap';

describe('S8: Weaver Import + Bootstrap Success', () => {
  it('defines two-phase import-then-bootstrap scenario', () => {
    const scenario = createWeaverImportBootstrapScenario();
    expect(scenario.scenarioId).toBe('weaver-import-bootstrap');
    expect(scenario.steps).toHaveLength(5);
    expect(scenario.steps[2]).toEqual({ kind: 'gossipelog-bootstrap' });
  });
});
