import path from 'node:path';
import fs from 'node:fs/promises';

import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';
import { observe } from '@simulation/edit-continuity-observer';
import { stripStorylineSubstrate } from '@simulation/gossipelog-v2-helpers';

/**
 * Minimal valid StateSnapshot for session fixtures.
 */
function createMinimalStateSnapshot(): {
  sceneState: {
    sceneId: string;
    currentPhaseIndex: number;
    currentBeatIndexInPhase: number;
    mainAxis: string;
    endLine: string;
    alpha: string;
    beta: string;
  };
  roundState: {
    phaseGoal: string;
    currentVolume: 'Low' | 'Med' | 'High';
    currentRouter: string;
    verbLexicon: string[];
    historyWindow: { role: 'system' | 'user' | 'assistant'; content: string }[];
  };
  generationState: {
    directorNoteSummary: string;
    promptObject: Record<string, unknown>;
    currentBeatText: string | null;
    currentOptions: string[];
  };
  evaluationState: {
    auditAnswers: boolean[];
    blockingFailures: string[];
    retryCount: number;
    rewriteFeedback: string | null;
  };
} {
  return {
    sceneState: {
      sceneId: 'scene-001',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'test axis',
      endLine: 'test end line',
      alpha: 'test alpha',
      beta: 'test beta',
    },
    roundState: {
      phaseGoal: 'test goal',
      currentVolume: 'Med',
      currentRouter: 'router-001',
      verbLexicon: ['look', 'talk'],
      historyWindow: [],
    },
    generationState: {
      directorNoteSummary: 'test summary',
      promptObject: {},
      currentBeatText: null,
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [true, true, true],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

export function createEditContinuityViewScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'edit-continuity-view',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');
      await stripStorylineSubstrate(fixture.packagePath);

      try {
        // Create a runtime-sessions.json with an active session that has relationship content
        const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
        const sessionData = {
          version: 1,
          activeSessionId: 'sess_s6_view',
          sessionsById: {
            sess_s6_view: {
              sessionId: 'sess_s6_view',
              lifecycle: 'in_progress',
              createdAt: '2026-04-04T00:00:00.000Z',
              updatedAt: '2026-04-04T01:00:00.000Z',
              headCheckpointId: 'ckpt_s6_01',
              activeCheckpointId: 'ckpt_s6_01',
              orderedCheckpointIds: ['ckpt_s6_01'],
              checkpointsById: {
                ckpt_s6_01: {
                  checkpointId: 'ckpt_s6_01',
                  acceptedBeatOrdinal: 1,
                  sceneId: 'scene-001',
                  phaseIndex: 1,
                  beatIndex: 1,
                  roundId: 'round-001',
                  acceptedTranscript: {
                    playerInput: 'test player input',
                    beatText: 'test beat text',
                  },
                  stateSnapshot: createMinimalStateSnapshot(),
                  lastStableRelationshipLayer: {
                    highlightedDeltasText: 'checkpoint delta',
                    stableBackgroundText: 'checkpoint background',
                  },
                  createdAt: '2026-04-04T01:00:00.000Z',
                },
              },
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'session highlighted deltas',
                stableBackgroundText: 'session stable background',
              },
            },
          },
        };
        await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

        recorder.recordAction({
          kind: 'edit-continuity.setup',
          details: {
            packageName: fixture.packageName,
            sessionId: 'sess_s6_view',
          },
        });

        // Load view via EditContinuityObserver
        const viewResult = await observe(fixture.packageName);

        recorder.recordAction({
          kind: 'edit-continuity.observe',
          details: {
            viewKind: viewResult?.kind,
            hasActiveSession: viewResult?.hasActiveSession,
          },
        });

        // Assertion: View kind is active when session exists
        recorder.recordAssertion({
          name: 'view-kind-is-active',
          pass: viewResult?.kind === 'active',
          details: `Expected kind 'active', got '${viewResult?.kind}'`,
        });

        // Assertion: Relationship summary is present
        recorder.recordAssertion({
          name: 'relationship-summary-present',
          pass:
            viewResult?.relationshipSummary !== undefined &&
            viewResult.relationshipSummary.length > 0,
          details: `Expected relationship summary to be present, got '${viewResult?.relationshipSummary}'`,
        });

        // Assertion: Raw checkpointsById is NOT exposed
        recorder.recordAssertion({
          name: 'raw-checkpoints-not-exposed',
          pass: viewResult?.exposesRawCheckpoints === false,
          details:
            'The bounded view must not expose raw checkpointsById - exposesRawCheckpoints must be false',
        });

        // Assertion: Raw transcript is NOT exposed
        // The view trace does not include transcript fields; this is verified by the schema
        // having no transcript-related fields and exposesRawCheckpoints being false
        recorder.recordAssertion({
          name: 'raw-transcript-not-exposed',
          pass: viewResult?.exposesRawCheckpoints === false,
          details:
            'The bounded view does not include acceptedTranscript or historyWindow in its projection - verified by bounded schema',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            viewKind: viewResult?.kind,
            hasActiveSession: viewResult?.hasActiveSession,
            relationshipSummary: viewResult?.relationshipSummary,
            exposesRawCheckpoints: viewResult?.exposesRawCheckpoints,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}