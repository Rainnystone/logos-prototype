import path from 'node:path';

import type { SimulationReport } from '@simulation/contracts';
import { SimulationReportSchema } from '@simulation/contracts';
import {
  createSimulationRecorder,
  type SimulationRecorder,
} from '@simulation/recorder';
import { writeSimulationReport } from '@simulation/report-writer';

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
};

function buildBatchReportPath(outputDir: string, report: SimulationReport, index: number): string {
  const fileName = `${String(index + 1).padStart(2, '0')}-${report.scenarioMeta.scenarioId}.json`;
  return path.resolve(outputDir, fileName);
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

  return {
    reports,
    writtenReportPaths,
  };
}
