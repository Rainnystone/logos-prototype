import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { SimulationReport, SimulationRunIndex } from '@simulation/contracts';

export async function writeSimulationReport(
  outputPath: string,
  report: SimulationReport,
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report), 'utf8');
  return outputPath;
}

export async function writeSimulationRunIndex(
  outputPath: string,
  runIndex: SimulationRunIndex,
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(runIndex), 'utf8');
  return outputPath;
}
