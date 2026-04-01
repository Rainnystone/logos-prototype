import { access, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SimulationReportSchema,
  SimulationScenarioSchema,
} from '@simulation/contracts';
import { createSimulationRecorder } from '@simulation/recorder';
import { writeSimulationReport } from '@simulation/report-writer';
import {
  runSimulationScenario,
  runSimulationScenarioBatch,
} from '@simulation/scenario-runner';

describe('simulation contracts', () => {
  it('accepts a minimal happy-path scenario', () => {
    const parsed = SimulationScenarioSchema.parse({
      scenarioId: 'happy-path',
      packageName: 'sample-scene',
      steps: [],
    });

    expect(parsed.scenarioId).toBe('happy-path');
  });

  it('accepts a minimal simulation report', () => {
    const parsed = SimulationReportSchema.parse({
      scenarioMeta: {
        scenarioId: 'happy-path',
        packageName: 'sample-scene',
      },
      actions: [],
      assertions: [],
      finalState: {},
    });

    expect(parsed.scenarioMeta.packageName).toBe('sample-scene');
  });

  it('builds a report-ready snapshot from recorded actions and assertions', () => {
    const recorder = createSimulationRecorder({
      scenarioId: 'happy-path',
      packageName: 'sample-scene',
    });

    recorder.recordAction({
      kind: 'author.save',
      details: { sectionId: 'worldbase-cast' },
    });
    recorder.recordAssertion({
      name: 'save-applied',
      pass: true,
    });

    const report = recorder.buildReport({
      finalState: {
        status: 'done',
      },
    });

    expect(report.actions).toHaveLength(1);
    expect(report.assertions).toHaveLength(1);
    expect(report.finalState.status).toBe('done');
  });

  it('returns a structured report from a minimal executable scenario', async () => {
    const report = await runSimulationScenario({
      scenarioId: 'happy-path',
      packageName: 'sample-scene',
      run({ recorder }) {
        recorder.recordAction({ kind: 'scenario.start' });
        recorder.recordAssertion({ name: 'minimal-pass', pass: true });

        return Promise.resolve({
          finalState: {
            status: 'ok',
          },
        });
      },
    });

    expect(report.scenarioMeta.scenarioId).toBe('happy-path');
    expect(report.assertions).toHaveLength(1);
    expect(report.finalState.status).toBe('ok');
  });

  it('preserves adapter timing metadata in the structured report', async () => {
    const report = await runSimulationScenario({
      scenarioId: 'delayed-trace',
      packageName: 'sample-scene',
      run({ recorder }) {
        recorder.recordAdapterTrace({
          operation: 'generate',
          outcome: 'delayed',
          delayMs: 20,
          startedAtMs: 100,
          completedAtMs: 124,
          elapsedMs: 24,
        });

        return Promise.resolve({
          finalState: {
            status: 'delayed',
          },
        });
      },
    });

    expect(report.adapterTrace?.[0]).toMatchObject({
      operation: 'generate',
      outcome: 'delayed',
      delayMs: 20,
      startedAtMs: 100,
      completedAtMs: 124,
      elapsedMs: 24,
    });
  });

  it('writes a simulation report to disk as JSON', async () => {
    const outputPath = path.resolve(
      process.cwd(),
      'reports',
      'scenario-runner-test-report.json',
    );
    const report = SimulationReportSchema.parse({
      scenarioMeta: {
        scenarioId: 'writer-test',
        packageName: 'sample-scene',
      },
      actions: [],
      assertions: [],
      finalState: {
        status: 'written',
      },
    });

    await writeSimulationReport(outputPath, report);

    await expect(access(outputPath)).resolves.toBeUndefined();
    await expect(readFile(outputPath, 'utf8')).resolves.toContain('"scenarioId":"writer-test"');

    await rm(outputPath, { force: true });
  });

  it('runs a batch of scenarios and persists one report file per scenario', async () => {
    const outputDir = path.resolve(
      process.cwd(),
      'reports',
      'scenario-runner-batch',
    );

    const batchResult = await runSimulationScenarioBatch({
      scenarios: [
        {
          scenarioId: 'batch-one',
          packageName: 'sample-scene',
          run({ recorder }) {
            recorder.recordAssertion({ name: 'batch-one-pass', pass: true });
            return Promise.resolve({ finalState: { status: 'ok-1' } });
          },
        },
        {
          scenarioId: 'batch-two',
          packageName: 'sample-scene',
          run({ recorder }) {
            recorder.recordAssertion({ name: 'batch-two-pass', pass: true });
            return Promise.resolve({ finalState: { status: 'ok-2' } });
          },
        },
      ],
      outputDir,
    });

    expect(batchResult.reports).toHaveLength(2);
    expect(batchResult.writtenReportPaths).toHaveLength(2);
    const [firstReportPath, secondReportPath] = batchResult.writtenReportPaths;

    expect(firstReportPath).toBeDefined();
    expect(secondReportPath).toBeDefined();
    await expect(access(firstReportPath as string)).resolves.toBeUndefined();
    await expect(access(secondReportPath as string)).resolves.toBeUndefined();

    await rm(outputDir, { recursive: true, force: true });
  });
});
