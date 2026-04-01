import { describe, expect, it } from 'vitest';

import {
  runAuthoringRouteSmoke,
  runPlayGossipelogRouteSmoke,
} from '@simulation/route-smoke';

describe('route smoke', () => {
  it('drives authoring save and diagnostics through the official routes', async () => {
    const result = await runAuthoringRouteSmoke('sample-scene');

    expect(result.sectionSave.responseStatus).toBe(200);
    expect(result.sectionSave.saveKind).toBe('save_applied');
    expect(result.sectionSave.changedFiles.length).toBeGreaterThan(0);
    expect(result.sectionSave.reloadedHeroName).toBe(result.sectionSave.requestedHeroName);
    expect(result.diagnostics.responseStatus).toBe(200);
    expect(result.diagnostics.packageName).toBe(result.packageName);
    expect(result.diagnostics.overallStatus).toBe('healthy');
  });

  it('drives the server-side play gossipelog bridge through the official route', async () => {
    const result = await runPlayGossipelogRouteSmoke('sample-scene');

    expect(result.responseStatus).toBe(200);
    expect(result.updateAcceptedBeatText).toBe(result.acceptedBeatText);
    expect(result.relationshipLayer.highlightedDeltasText.length).toBeGreaterThan(0);
    expect(result.relationshipLayer.stableBackgroundText.length).toBeGreaterThan(0);
  });
});
