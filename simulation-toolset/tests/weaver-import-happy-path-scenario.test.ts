import { describe, expect, it } from 'vitest';

import { createWeaverImportHappyPathScenario } from '../scenarios/weaver-import-happy-path';

import { runSimulationScenario } from '@simulation/scenario-runner';
import { createScriptedAdapter } from '@simulation/scripted-adapter';

describe('S7: Weaver Import Happy Path', () => {
  it('completes weaver import with valid scenario definition and structured traces', async () => {
    const report = await runSimulationScenario(createWeaverImportHappyPathScenario());

    expect(report.assertions.every((item) => item.pass)).toBe(true);
    expect(report.adapterTrace?.[0]).toMatchObject({
      operation: 'weaverImport',
      outcome: 'result',
    });
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'weaver-import-returned-source-summary',
        pass: true,
      }),
    );
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'weaver-import-returned-world-base',
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

  it('scripted adapter provides weaver import response', async () => {
    const adapter = createScriptedAdapter({
      weaverImport: [
        {
          sourceSummary: 'Explorer story.',
          importSummary: 'World and cast extracted.',
          openingHook: 'An explorer ventures into unknown territory.',
          worldBase: {},
          coreCast: [],
          antagonists: [],
          npcCharacters: [],
          locations: [],
          warnings: [],
          unresolvedGaps: [],
        },
      ],
    });

    const result = await adapter.weaverImport!({
      sourceText: 'An explorer ventures into unknown territory.',
      resolvedReferences: [],
    });

    expect(result.sourceSummary).toBe('Explorer story.');
    const ops = adapter.getTrace().operations;
    expect(ops).toHaveLength(1);
    const firstOp = ops[0]!;
    expect(firstOp.operation).toBe('weaverImport');
    expect(firstOp.outcome).toBe('result');
  });
});
