import { describe, expect, it } from 'vitest';

import { runAgentSurfaceUiSmoke } from '@simulation/ui-smoke';

describe('agent surface UI smoke', () => {
  it('loads agent surface items for a temp package and returns gossipelog and weaver', async () => {
    const result = await runAgentSurfaceUiSmoke('sample-scene');

    // Both built-in sidecars must appear
    expect(result.renderedAgentIds).toContain('gossipelog');
    expect(result.renderedAgentIds).toContain('weaver');
    expect(result.renderedAgentIds.length).toBeGreaterThanOrEqual(2);

    // Package name follows the temp-package convention
    expect(result.packageName).toMatch(/^\.tmp-simulation-/);
  });

  it('reports bounded status count >= 0 for a fresh temp package', async () => {
    const result = await runAgentSurfaceUiSmoke('sample-scene');

    // boundedStatusCount must be a non-negative integer
    expect(Number.isInteger(result.boundedStatusCount)).toBe(true);
    expect(result.boundedStatusCount).toBeGreaterThanOrEqual(0);
  });

  it('confirms no disable toggle exists in the rendered panel', async () => {
    const result = await runAgentSurfaceUiSmoke('sample-scene');

    // The agent surface is read-only; there should never be a disable toggle
    expect(result.hasDisableToggle).toBe(false);
  });
});
