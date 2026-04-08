import { describe, expect, it } from 'vitest';

import { createWeaverImportPartialScenario } from '../scenarios/weaver-import-partial';

import { runSimulationScenario } from '@simulation/scenario-runner';
import { createScriptedAdapter } from '@simulation/scripted-adapter';

describe('S9: Weaver Import Partial (Warnings)', () => {
  it('completes weaver import with warnings and scaffold defaults', async () => {
    const report = await runSimulationScenario(createWeaverImportPartialScenario());

    expect(report.assertions.every((item) => item.pass)).toBe(true);
    expect(report.adapterTrace?.[0]).toMatchObject({
      operation: 'weaverImport',
      outcome: 'result',
    });
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'payload-has-warnings',
        pass: true,
      }),
    );
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'payload-has-unresolved-gaps',
        pass: true,
      }),
    );
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'scaffold-defaults-fill-gaps',
        pass: true,
      }),
    );
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'adapter-trace-recorded-weaver-import',
        pass: true,
      }),
    );
  });

  it('scripted adapter provides payload with warnings and unresolved gaps', async () => {
    const adapter = createScriptedAdapter({
      weaverImport: [
        {
          sourceSummary: 'Vague text.',
          importSummary: 'Minimal extraction.',
          openingHook: 'A vague text with little structure.',
          worldBase: {},
          coreCast: [],
          antagonists: [],
          npcCharacters: [],
          locations: [],
          warnings: ['No clear protagonist.', 'Setting ambiguous.'],
          unresolvedGaps: ['Missing world setting.'],
        },
      ],
    });

    const result = await adapter.weaverImport!({
      sourceText: 'A vague text with little structure.',
      resolvedReferences: [],
    });

    expect(result.warnings).toHaveLength(2);
    expect(result.unresolvedGaps).toHaveLength(1);
    expect(result.worldBase).toEqual({});
    expect(result.coreCast).toHaveLength(0);
    expect(result.antagonists).toHaveLength(0);
    expect(result.npcCharacters).toHaveLength(0);
    expect(result.locations).toHaveLength(0);

    const ops = adapter.getTrace().operations;
    expect(ops).toHaveLength(1);
    const firstOp = ops[0]!;
    expect(firstOp.operation).toBe('weaverImport');
    expect(firstOp.outcome).toBe('result');
  });
});
