import { describe, it, expect } from 'vitest';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import { createWeaverImportPartialScenario } from '../scenarios/weaver-import-partial';

describe('S9: Weaver Import Partial (Warnings)', () => {
  it('creates valid scenario with warnings steps', () => {
    const scenario = createWeaverImportPartialScenario();
    expect(scenario.scenarioId).toBe('weaver-import-partial');
    expect(scenario.steps).toHaveLength(5);
  });

  it('adapter provides payload with warnings', async () => {
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
  });
});
