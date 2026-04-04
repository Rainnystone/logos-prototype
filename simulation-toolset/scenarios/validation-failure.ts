import { saveSectionDraft } from '@/authoring/persistence/bridge';
import { createWorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import { loadStoryPackage } from '@/engine/story-loader';

import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';

export function createValidationFailureScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'validation-failure',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const before = await loadStoryPackage(fixture.packageName);
        const saveResult = await saveSectionDraft({
          requestId: 'scenario-validation-failure',
          source: 'page',
          packageName: fixture.packageName,
          sectionId: 'worldbase-cast',
          payload: {},
        });
        const after = await loadStoryPackage(fixture.packageName);

        recorder.recordAction({
          kind: 'author.save.invalid',
          details: {
            packageName: fixture.packageName,
          },
        });
        recorder.recordAuthoringTrace({
          sectionId: 'worldbase-cast',
          resultKind: saveResult.kind,
          ...(saveResult.kind === 'save_blocked'
            ? { blockingIssues: [...saveResult.blockingIssues] }
            : {}),
        });
        recorder.recordAssertion({
          name: 'save-blocked',
          pass: saveResult.kind === 'save_blocked',
        });
        recorder.recordAssertion({
          name: 'worldbase-unchanged',
          pass: JSON.stringify(before.worldBase) === JSON.stringify(after.worldBase),
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            resultKind: saveResult.kind,
            blockingIssues:
              saveResult.kind === 'save_blocked' ? [...saveResult.blockingIssues] : [],
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}

export function createValidationSuccessScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'validation-success',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const storyPackage = await loadStoryPackage(fixture.packageName);
        const draft = createWorldBaseCastDraft(storyPackage.worldBase);
        const modifiedDraft = {
          ...draft,
          hero: { ...draft.hero, name: 'Test Hero Updated' },
        };

        const saveResult = await saveSectionDraft({
          requestId: 'scenario-validation-success',
          source: 'page',
          packageName: fixture.packageName,
          sectionId: 'worldbase-cast',
          payload: { uiFields: modifiedDraft },
        });

        const afterPackage = await loadStoryPackage(fixture.packageName);

        recorder.recordAction({
          kind: 'author.save.valid',
          details: {
            packageName: fixture.packageName,
          },
        });
        recorder.recordAuthoringTrace({
          sectionId: 'worldbase-cast',
          resultKind: saveResult.kind,
        });
        recorder.recordAssertion({
          name: 'save-applied',
          pass: saveResult.kind === 'save_applied',
        });
        recorder.recordAssertion({
          name: 'worldbase-changed',
          pass: afterPackage.worldBase.hero.name === 'Test Hero Updated',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            resultKind: saveResult.kind,
            blockingIssues: [],
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
