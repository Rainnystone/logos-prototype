import path from 'node:path';

import type { SimulationReport, SimulationRunIndex } from '@simulation/contracts';
import {
  SIMULATION_SCHEMA_VERSION,
  SimulationReportSchema,
  SimulationRunIndexSchema,
} from '@simulation/contracts';
import {
  createSimulationRecorder,
  type SimulationRecorder,
} from '@simulation/recorder';
import {
  writeSimulationReport,
  writeSimulationRunIndex,
} from '@simulation/report-writer';
import { getScenarioManifestEntry } from '@simulation/scenario-manifest';

type ScenarioRunResult = {
  readonly finalState: SimulationReport['finalState'];
};

export type ExecutableSimulationScenario = {
  readonly scenarioId: string;
  readonly packageName: string;
  run(input: { recorder: SimulationRecorder }): Promise<ScenarioRunResult> | ScenarioRunResult;
};

export type SimulationScenarioBatchResult = {
  readonly reports: readonly SimulationReport[];
  readonly writtenReportPaths: readonly string[];
  readonly writtenIndexPath?: string;
};

function buildBatchReportPath(outputDir: string, report: SimulationReport, index: number): string {
  const fileName = `${String(index + 1).padStart(2, '0')}-${report.scenarioMeta.scenarioId}.json`;
  return path.resolve(outputDir, fileName);
}

function buildBatchIndexPath(outputDir: string): string {
  return path.resolve(outputDir, 'run-index.json');
}

export async function runSimulationScenario(
  scenario: ExecutableSimulationScenario,
): Promise<SimulationReport> {
  const recorder = createSimulationRecorder({
    scenarioId: scenario.scenarioId,
    packageName: scenario.packageName,
  });
  const result = await scenario.run({ recorder });

  return SimulationReportSchema.parse(
    recorder.buildReport({
      finalState: result.finalState,
    }),
  );
}

export async function runSimulationScenarioBatch(input: {
  readonly scenarios: readonly ExecutableSimulationScenario[];
  readonly outputDir?: string;
}): Promise<SimulationScenarioBatchResult> {
  const reports: SimulationReport[] = [];
  const writtenReportPaths: string[] = [];

  for (const scenario of input.scenarios) {
    const report = await runSimulationScenario(scenario);
    reports.push(report);

    if (input.outputDir) {
      const outputPath = buildBatchReportPath(input.outputDir, report, reports.length - 1);
      const writtenPath = await writeSimulationReport(outputPath, report);
      writtenReportPaths.push(writtenPath);
    }
  }

  let writtenIndexPath: string | undefined;

  if (input.outputDir) {
    const runIndex = SimulationRunIndexSchema.parse({
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      reports: reports.map((report, index) => {
        const manifestEntry = getScenarioManifestEntry(report.scenarioMeta.scenarioId);

        return {
          scenarioId: report.scenarioMeta.scenarioId,
          packageName: report.scenarioMeta.packageName,
          reportPath: writtenReportPaths[index] ?? buildBatchReportPath(input.outputDir as string, report, index),
          ...(manifestEntry ? { title: manifestEntry.title, tags: [...manifestEntry.tags] } : {}),
        };
      }),
    } satisfies SimulationRunIndex);

    writtenIndexPath = await writeSimulationRunIndex(
      buildBatchIndexPath(input.outputDir),
      runIndex,
    );
  }

  return {
    reports,
    writtenReportPaths,
    ...(writtenIndexPath ? { writtenIndexPath } : {}),
  };
}
