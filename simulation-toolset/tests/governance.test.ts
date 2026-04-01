import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getScenarioManifestEntry,
  listBuiltInScenarioManifestEntries,
} from '@simulation/scenario-manifest';
import {
  listSimulationTempPackages,
  scavengeSimulationTempPackages,
} from '@simulation/temp-package-scavenger';
import { runSimulationScenarioBatch } from '@simulation/scenario-runner';

describe('simulation governance', () => {
  it('exposes built-in scenario manifest metadata for cloud batch runs', () => {
    const happyPath = getScenarioManifestEntry('happy-path');
    const allEntries = listBuiltInScenarioManifestEntries();

    expect(happyPath).toMatchObject({
      scenarioId: 'happy-path',
      title: 'Happy Path',
    });
    expect(allEntries.length).toBeGreaterThanOrEqual(3);
  });

  it('writes a batch run index with schema version and scenario metadata', async () => {
    const outputDir = path.resolve(process.cwd(), 'reports', 'governance-batch');

    const result = await runSimulationScenarioBatch({
      scenarios: [
        {
          scenarioId: 'happy-path',
          packageName: 'sample-scene',
          run({ recorder }) {
            recorder.recordAssertion({ name: 'happy-pass', pass: true });
            return Promise.resolve({
              finalState: {
                status: 'ok',
              },
            });
          },
        },
      ],
      outputDir,
    });

    expect(result.writtenIndexPath).toBeDefined();
    await expect(access(result.writtenIndexPath as string)).resolves.toBeUndefined();
    const payload = JSON.parse(await readFile(result.writtenIndexPath as string, 'utf8')) as {
      readonly schemaVersion?: number;
      readonly reports?: ReadonlyArray<{
        readonly scenarioId?: string;
        readonly title?: string;
        readonly reportPath?: string;
      }>;
    };

    expect(payload.schemaVersion).toBeGreaterThan(0);
    expect(payload.reports?.[0]).toMatchObject({
      scenarioId: 'happy-path',
      title: 'Happy Path',
      reportPath: result.writtenReportPaths[0],
    });

    await rm(outputDir, { recursive: true, force: true });
  });

  it('lists and scavenges temp simulation directories inside a target root', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'simulation-scavenger-'));
    const tempDir = path.join(rootDir, '.tmp-simulation-alpha');
    const nonTempDir = path.join(rootDir, 'keep-me');

    await mkdir(tempDir, { recursive: true });
    await mkdir(nonTempDir, { recursive: true });

    const listed = await listSimulationTempPackages(rootDir);
    expect(listed).toEqual([tempDir]);

    const dryRun = await scavengeSimulationTempPackages({
      rootDir,
      dryRun: true,
    });
    expect(dryRun.removedPaths).toEqual([tempDir]);
    await expect(access(tempDir)).resolves.toBeUndefined();

    const removed = await scavengeSimulationTempPackages({
      rootDir,
      dryRun: false,
    });
    expect(removed.removedPaths).toEqual([tempDir]);
    await expect(access(tempDir)).rejects.toThrow();
    await expect(access(nonTempDir)).resolves.toBeUndefined();

    await rm(rootDir, { recursive: true, force: true });
  });
});
