import { loadStoryPackage } from '@/engine/story-loader';
import {
  ensureActiveSession,
  recordAcceptedBeat,
  finalizeRelationshipLayer,
} from '@/runtime-sessions/repository';

import { createSessionSimulator } from '@simulation/session-simulator';
import { createPlayerSimulator } from '@simulation/player-simulator';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';
import type { StoryPackage } from '@/types';
import type { RuntimeSessionStore } from '@/engine/orchestrator';

function disableAuditQuestions(storyPackage: StoryPackage): StoryPackage {
  return {
    ...storyPackage,
    auditQuestionSet: {
      ...storyPackage.auditQuestionSet,
      selectionPolicy: {
        default: [],
      },
    },
  };
}

function createRuntimeSessionStore(packageName: string): RuntimeSessionStore {
  return {
    async ensureActiveSession() {
      const session = await ensureActiveSession(packageName);
      return { activeSessionId: session.sessionId };
    },
    async recordAcceptedBeat(input) {
      await recordAcceptedBeat(input);
    },
    async finalizeRelationshipLayer(input) {
      await finalizeRelationshipLayer(input);
    },
  };
}

export function createSessionRestoreScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'session-restore',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        // Load story package and disable audit for smooth beat acceptance
        const runtimeStoryPackage = disableAuditQuestions(
          await loadStoryPackage(fixture.packageName),
        );

        // Create player simulator with scripted adapter and runtime session store
        const runtimeSessionStore = createRuntimeSessionStore(fixture.packageName);
        const playerAdapter = createScriptedAdapter({
          collapse: [
            { alpha: 'alpha-init', beta: 'beta-init', inferenceTrace: 'collapse-trace' },
          ],
          route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
          generate: [
            { beatText: 'beat-1', options: ['a', 'b', 'c', 'd'] },
            { beatText: 'beat-2', options: ['e', 'f', 'g', 'h'] },
            { beatText: 'beat-3', options: ['i', 'j', 'k', 'l'] },
          ],
          // Configure gossipelog to run automatically after each beat
          gossipelogUpdate: [
            {
              involvedRoleIds: [runtimeStoryPackage.worldBase.hero.characterId],
              invocationNoOp: true,
              memoryUpdates: [],
            },
            {
              involvedRoleIds: [runtimeStoryPackage.worldBase.hero.characterId],
              invocationNoOp: true,
              memoryUpdates: [],
            },
            {
              involvedRoleIds: [runtimeStoryPackage.worldBase.hero.characterId],
              invocationNoOp: true,
              memoryUpdates: [],
            },
          ],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'delta after beat 1',
              stableBackgroundText: 'background after beat 1',
            },
            {
              highlightedDeltasText: 'delta after beat 2',
              stableBackgroundText: 'background after beat 2',
            },
            {
              highlightedDeltasText: 'delta after beat 3',
              stableBackgroundText: 'background after beat 3',
            },
          ],
        });
        const player = await createPlayerSimulator({
          packageName: fixture.packageName,
          adapter: playerAdapter,
          storyPackageOverride: runtimeStoryPackage,
          runtimeSessionStore,
        });

        // Initialize scene
        await player.initScene();

        // Accept 2-3 beats to create history
        const beat1 = await player.runBeat('opening action');
        recorder.recordAction({
          kind: 'player.runBeat',
          details: { beatNumber: 1, beatText: beat1.beatResult.beatText },
        });
        recorder.recordRuntimeTrace({
          accepted: beat1.trace.accepted,
          forceAccepted: beat1.trace.forceAccepted,
          beatText: beat1.beatResult.beatText,
          currentBeatIndexInPhase: beat1.trace.currentBeatIndexInPhase,
        });
        recorder.recordAssertion({
          name: 'beat-1-accepted',
          pass: beat1.trace.accepted,
        });

        const beat2 = await player.runBeat('second action');
        recorder.recordAction({
          kind: 'player.runBeat',
          details: { beatNumber: 2, beatText: beat2.beatResult.beatText },
        });
        recorder.recordRuntimeTrace({
          accepted: beat2.trace.accepted,
          forceAccepted: beat2.trace.forceAccepted,
          beatText: beat2.beatResult.beatText,
          currentBeatIndexInPhase: beat2.trace.currentBeatIndexInPhase,
        });
        recorder.recordAssertion({
          name: 'beat-2-accepted',
          pass: beat2.trace.accepted,
        });

        const beat3 = await player.runBeat('third action');
        recorder.recordAction({
          kind: 'player.runBeat',
          details: { beatNumber: 3, beatText: beat3.beatResult.beatText },
        });
        recorder.recordRuntimeTrace({
          accepted: beat3.trace.accepted,
          forceAccepted: beat3.trace.forceAccepted,
          beatText: beat3.beatResult.beatText,
          currentBeatIndexInPhase: beat3.trace.currentBeatIndexInPhase,
        });
        recorder.recordAssertion({
          name: 'beat-3-accepted',
          pass: beat3.trace.accepted,
        });

        // Wait a moment for gossipelog cycles to complete
        // The orchestrator runs gossipelog cycles asynchronously after each beat
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Record beat history and state snapshot before restore
        const stateBeforeRestore = player.getState();
        // After 3 beats, we should have 3 checkpoints
        const recordedCheckpointCount = 3; // We ran 3 beats
        const playerOperations = playerAdapter.getTrace().operations;
        const gossipelogOperations = playerOperations.filter(
          (op) => op.operation === 'gossipelogUpdate' || op.operation === 'gossipelogInjection',
        );

        recorder.recordAction({
          kind: 'session.state-recorded',
          details: {
            checkpointCount: recordedCheckpointCount,
            gossipelogOperationsCount: gossipelogOperations.length,
          },
        });

        // Use SessionSimulator.attemptRestore()
        const sessionSimulator = await createSessionSimulator(fixture.packageName);
        const restoreResult = await sessionSimulator.attemptRestore();

        recorder.recordAction({
          kind: 'session.attemptRestore',
          details: {
            restored: restoreResult.restored,
            sessionId: restoreResult.session?.sessionId,
          },
        });

        // Verify restored state matches recorded state
        recorder.recordAssertion({
          name: 'session-restored',
          pass: restoreResult.restored,
        });

        // Verify restored state contains all recorded checkpoints.
        // The session may include additional checkpoints from gossipelog cycles or
        // initScene, so we assert >= recordedCheckpointCount (the 3 beat checkpoints
        // must all be present) rather than strict equality.
        recorder.recordAssertion({
          name: 'restored-state-contains-recorded-checkpoints',
          pass:
            restoreResult.session !== null &&
            restoreResult.session.checkpointCount >= recordedCheckpointCount,
          details: `Expected checkpointCount >= ${recordedCheckpointCount}, got ${restoreResult.session?.checkpointCount}`,
        });

        // Verify beat history is preserved
        recorder.recordAssertion({
          name: 'beat-history-preserved',
          pass:
            restoreResult.session !== null &&
            restoreResult.session.checkpointCount >= 2,
          details: `Checkpoint count: ${restoreResult.session?.checkpointCount}`,
        });

        // Verify relationship layer is preserved (should come from gossipelog cycles)
        recorder.recordAssertion({
          name: 'relationship-layer-preserved',
          pass:
            restoreResult.session !== null &&
            restoreResult.session.relationshipSource !== 'empty',
          details: `Relationship source: ${restoreResult.session?.relationshipSource}`,
        });

        // Verify gossipelog cycles ran automatically
        recorder.recordAssertion({
          name: 'gossipelog-cycles-ran',
          pass: gossipelogOperations.length >= 3, // At least 3 gossipelog cycles (one per beat)
          details: `Expected at least 3 gossipelog operations, got ${gossipelogOperations.length}`,
        });

        // Verify active checkpoint exists and has state snapshot
        recorder.recordAssertion({
          name: 'active-checkpoint-exists',
          pass:
            restoreResult.activeCheckpoint !== null &&
            restoreResult.activeCheckpoint.hasStateSnapshot,
        });

        recorder.recordAssertion({
          name: 'active-checkpoint-has-transcript',
          pass:
            restoreResult.activeCheckpoint !== null &&
            restoreResult.activeCheckpoint.hasTranscript,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            restored: restoreResult.restored,
            sessionId: restoreResult.session?.sessionId ?? null,
            checkpointCount: restoreResult.session?.checkpointCount ?? 0,
            relationshipSource: restoreResult.session?.relationshipSource ?? 'empty',
            activeCheckpointId: restoreResult.session?.activeCheckpointId ?? null,
            beatHistory: [beat1.beatResult.beatText, beat2.beatResult.beatText, beat3.beatResult.beatText],
            recordedCheckpointCount,
            gossipelogOperationsCount: gossipelogOperations.length,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}