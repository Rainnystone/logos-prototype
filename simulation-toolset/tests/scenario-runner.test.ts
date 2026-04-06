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
import { createMockKernel } from '@simulation/mock-kernel';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';

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
      schemaVersion: 1,
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

  it('accepts a normalized sidecar agent trace', () => {
    const parsed = SimulationReportSchema.parse({
      schemaVersion: 1,
      scenarioMeta: {
        scenarioId: 'agent-trace',
        packageName: 'sample-scene',
      },
      actions: [],
      assertions: [],
      finalState: {},
      agentTrace: [
        {
          agentId: 'gossipelog',
          stage: 'cycle',
          outcome: 'fallback',
          stableBackgroundText: 'stable background',
          sideEffectSummary: ['update:no-op'],
        },
      ],
    });

    expect(parsed.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      outcome: 'fallback',
    });
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
    expect(report.schemaVersion).toBeGreaterThan(0);
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
      schemaVersion: 1,
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
    expect(batchResult.writtenIndexPath).toBeDefined();
    const [firstReportPath, secondReportPath] = batchResult.writtenReportPaths;

    expect(firstReportPath).toBeDefined();
    expect(secondReportPath).toBeDefined();
    await expect(access(firstReportPath as string)).resolves.toBeUndefined();
    await expect(access(secondReportPath as string)).resolves.toBeUndefined();

    await rm(outputDir, { recursive: true, force: true });
  });

  // ============================================================================
  // Kernel-backed Scenario Tests (Task 5)
  // ============================================================================

  describe('kernel-backed scenarios', () => {
    it('accepts kernel-backed scenario input', async () => {
      const kernel = createMockKernel('kernel-test-package');
      const builder = createMockFixtureBuilder(kernel);
      builder.buildStoryline({
        storylineId: 'storyline_test',
        name: 'Test Storyline',
        withCheckpoints: [1],
      });

      const report = await runSimulationScenario({
        scenarioId: 'kernel-backed-test',
        packageName: 'kernel-test-package',
        run({ recorder }) {
          recorder.recordAction({ kind: 'kernel.init' });
          recorder.recordAssertion({ name: 'kernel-state-valid', pass: true });

          return Promise.resolve({
            finalState: {
              kernelState: kernel.getState(),
              status: 'kernel-ok',
            },
          });
        },
      });

      expect(report.scenarioMeta.scenarioId).toBe('kernel-backed-test');
      expect(report.finalState.status).toBe('kernel-ok');

      await kernel.cleanup();
    });

    it('kernel-backed batch scenarios write manifest correctly', async () => {
      const kernel1 = createMockKernel('kernel-batch-1');
      const kernel2 = createMockKernel('kernel-batch-2');

      const outputDir = path.resolve(
        process.cwd(),
        'reports',
        'kernel-batch-test',
      );

      const batchResult = await runSimulationScenarioBatch({
        scenarios: [
          {
            scenarioId: 'kernel-scenario-1',
            packageName: 'kernel-batch-1',
            run({ recorder }) {
              recorder.recordAssertion({ name: 'kernel-1-pass', pass: true });
              return Promise.resolve({
                finalState: { kernelActive: true },
              });
            },
          },
          {
            scenarioId: 'kernel-scenario-2',
            packageName: 'kernel-batch-2',
            run({ recorder }) {
              recorder.recordAssertion({ name: 'kernel-2-pass', pass: true });
              return Promise.resolve({
                finalState: { kernelActive: true },
              });
            },
          },
        ],
        outputDir,
      });

      expect(batchResult.reports).toHaveLength(2);
      expect(batchResult.writtenIndexPath).toBeDefined();

      // Verify run index contains manifest entries
      const indexContent = await readFile(batchResult.writtenIndexPath as string, 'utf8');
      const indexParsed = JSON.parse(indexContent);

      expect(indexParsed.schemaVersion).toBe(1);
      expect(indexParsed.reports).toHaveLength(2);
      expect(indexParsed.reports[0].scenarioId).toBe('kernel-scenario-1');

      await rm(outputDir, { recursive: true, force: true });
      await kernel1.cleanup();
      await kernel2.cleanup();
    });

    it('kernel state is captured in finalState', async () => {
      const kernel = createMockKernel('kernel-state-capture');
      const builder = createMockFixtureBuilder(kernel);

      builder.withSession({ sessionId: 'sess_capture', lifecycle: 'awaiting_start', isActive: true });
      builder.withVariantWorkspace({ variantId: 'variant_test', hasWorldBase: true });

      const report = await runSimulationScenario({
        scenarioId: 'kernel-state-capture-test',
        packageName: 'kernel-state-capture',
        run({ recorder }) {
          const state = kernel.getState();
          recorder.recordAction({ kind: 'kernel.snapshot', details: { snapshotId: kernel.snapshot() } });

          return Promise.resolve({
            finalState: {
              activeSessionId: state.runtimeSessions.activeSessionId,
              variantCount: Object.keys(state.variantsById).length,
            },
          });
        },
      });

      expect(report.finalState.activeSessionId).toBe('sess_capture');
      expect(report.finalState.variantCount).toBe(1);

      await kernel.cleanup();
    });
  });
});
