import { access } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { createAuthorSimulator } from '@simulation/author-simulator';
import { createTempStoryPackage } from '@simulation/temp-package';

describe('temp package helper', () => {
  it('creates an isolated package copy for a scenario run and cleans it up', async () => {
    const fixture = await createTempStoryPackage('sample-scene');

    expect(fixture.packageName).toContain('sample-scene');
    await expect(access(fixture.packagePath)).resolves.toBeUndefined();

    await fixture.cleanup();

    await expect(access(fixture.packagePath)).rejects.toThrow();
  });

  it('supports isolated cleanup per fixture without deleting sibling temp packages', async () => {
    const firstFixture = await createTempStoryPackage('sample-scene');
    const secondFixture = await createTempStoryPackage('sample-scene');

    await firstFixture.cleanup();

    await expect(access(firstFixture.packagePath)).rejects.toThrow();
    await expect(access(secondFixture.packagePath)).resolves.toBeUndefined();

    await secondFixture.cleanup();
  });

  it('drives a worldbase save through the shared bridge and records the result', async () => {
    const simulator = await createAuthorSimulator('sample-scene');

    const result = await simulator.saveWorldBaseCast({
      hero: {
        name: 'Simulation Hero',
      },
    });

    expect(result.saveResult.kind).toBe('save_applied');
    expect(result.trace.sectionId).toBe('worldbase-cast');
    expect(result.trace.resultKind).toBe('save_applied');
    expect(result.reloadedStoryPackage.worldBase.hero.name).toBe('Simulation Hero');

    await simulator.cleanup();
  });
});
