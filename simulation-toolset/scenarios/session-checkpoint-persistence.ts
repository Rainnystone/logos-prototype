import { loadStoryPackage } from '@/engine/story-loader';
import type { StoryPackage } from '@/types';
import {
  ensureActiveSession,
  recordAcceptedBeat,
  finalizeRelationshipLayer,
} from '@/runtime-sessions/repository';
import type { RuntimeSessionStore } from '@/engine/orchestrator';

import { createPlayerSimulator } from '@simulation/player-simulator';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import { readSession, readCheckpoint } from '@simulation/session-observer';
import { createTempStoryPackage } from '@simulation/temp-package';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

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

export function createSessionCheckpointPersistenceScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'session-checkpoint-persistence',
    packageName: 'sample-scene',
    async run({ recorder }) {
      let fixture: Awaited<ReturnType<typeof createTempStoryPackage>> | null = null;

      try {
        // Use createTempStoryPackage for isolation
        fixture = await createTempStoryPackage('sample-scene');

        recorder.recordAction({
          kind: 'fixture.create',
          details: {
            packageName: fixture.packageName,
            sourcePackageName: fixture.sourcePackageName,
          },
        });

        // Load the story package and disable audit questions to simplify flow
        const runtimeStoryPackage = disableAuditQuestions(
          await loadStoryPackage(fixture.packageName),
        );

        // Create runtime session store for persistence
        const runtimeSessionStore = createRuntimeSessionStore(fixture.packageName);

        // Create scripted adapter that will produce an accepted beat
        const playerAdapter = createScriptedAdapter({
          collapse: [{ alpha: 'alpha-init', beta: 'beta-init', inferenceTrace: 'collapse-trace' }],
          route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
          generate: [{ beatText: 'beat-1-text', options: ['a', 'b', 'c', 'd'] }],
        });

        // Create player simulator with runtime session store
        const player = await createPlayerSimulator({
          packageName: fixture.packageName,
          adapter: playerAdapter,
          storyPackageOverride: runtimeStoryPackage,
          runtimeSessionStore,
        });

        recorder.recordAction({
          kind: 'player.init',
          details: {
            packageName: fixture.packageName,
          },
        });

        // Initialize scene
        await player.initScene();

        // Run a beat that will be accepted
        const beat = await player.runBeat('player test action');

        recorder.recordAction({
          kind: 'player.runBeat',
          details: {
            beatText: beat.beatResult.beatText,
            accepted: beat.trace.accepted,
          },
        });

        recorder.recordRuntimeTrace({
          accepted: beat.trace.accepted,
          forceAccepted: beat.trace.forceAccepted,
          beatText: beat.beatResult.beatText,
          currentBeatIndexInPhase: beat.trace.currentBeatIndexInPhase,
        });

        // Use SessionObserver to read session after beat
        const sessionObservation = await readSession(fixture.packageName);

        recorder.recordAction({
          kind: 'session.read',
          details: {
            sessionId: sessionObservation?.sessionId,
            lifecycle: sessionObservation?.lifecycle,
            checkpointCount: sessionObservation?.checkpointCount,
          },
        });

        // Assertion: Session should exist
        recorder.recordAssertion({
          name: 'session-exists-after-beat',
          pass: sessionObservation !== null,
        });

        // Assertion: Session lifecycle should be in_progress
        recorder.recordAssertion({
          name: 'session-lifecycle-in-progress',
          pass: sessionObservation?.lifecycle === 'in_progress',
          details: `Expected lifecycle 'in_progress', got '${sessionObservation?.lifecycle ?? 'null'}'`,
        });

        // Assertion: Checkpoint should exist (checkpointCount > 0)
        recorder.recordAssertion({
          name: 'checkpoint-created-after-beat',
          pass: (sessionObservation?.checkpointCount ?? 0) > 0,
          details: `Expected checkpointCount > 0, got ${sessionObservation?.checkpointCount ?? 0}`,
        });

        // Assertion: Active checkpoint ID should be set
        recorder.recordAssertion({
          name: 'active-checkpoint-id-set',
          pass: sessionObservation?.activeCheckpointId !== null,
          details: `Expected activeCheckpointId to be set, got '${sessionObservation?.activeCheckpointId ?? 'null'}'`,
        });

        // Read the checkpoint using SessionObserver
        const checkpointId = sessionObservation?.activeCheckpointId;
        const checkpointObservation = checkpointId
          ? await readCheckpoint(fixture.packageName, checkpointId)
          : null;

        recorder.recordAction({
          kind: 'checkpoint.read',
          details: {
            checkpointId: checkpointObservation?.checkpointId,
            acceptedBeatOrdinal: checkpointObservation?.acceptedBeatOrdinal,
            hasStateSnapshot: checkpointObservation?.hasStateSnapshot,
          },
        });

        // Assertion: Checkpoint should exist when ID is provided
        recorder.recordAssertion({
          name: 'checkpoint-readable-by-id',
          pass: checkpointObservation !== null,
        });

        // Assertion: Checkpoint should have correct beat ordinal (1 for first accepted beat)
        recorder.recordAssertion({
          name: 'checkpoint-has-correct-beat-ordinal',
          pass: checkpointObservation?.acceptedBeatOrdinal === 1,
          details: `Expected acceptedBeatOrdinal 1, got ${checkpointObservation?.acceptedBeatOrdinal ?? 'null'}`,
        });

        // Assertion: Checkpoint should have state snapshot
        recorder.recordAssertion({
          name: 'checkpoint-has-state-snapshot',
          pass: checkpointObservation?.hasStateSnapshot === true,
          details: `Expected hasStateSnapshot true, got ${checkpointObservation?.hasStateSnapshot ?? 'null'}`,
        });

        // Assertion: Checkpoint should have transcript
        recorder.recordAssertion({
          name: 'checkpoint-has-transcript',
          pass: checkpointObservation?.hasTranscript === true,
          details: `Expected hasTranscript true, got ${checkpointObservation?.hasTranscript ?? 'null'}`,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            sessionId: sessionObservation?.sessionId ?? 'none',
            lifecycle: sessionObservation?.lifecycle ?? 'none',
            checkpointCount: sessionObservation?.checkpointCount ?? 0,
            activeCheckpointId: checkpointObservation?.checkpointId ?? 'none',
            acceptedBeatOrdinal: checkpointObservation?.acceptedBeatOrdinal ?? 0,
            beatAccepted: beat.trace.accepted,
          },
        };
      } finally {
        // Clean up temp package in finally block
        await fixture?.cleanup();
      }
    },
  };
}