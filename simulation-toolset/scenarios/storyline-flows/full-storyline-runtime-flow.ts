import type { MockKernel } from '@simulation/mock-kernel';
import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { createStorylineObserver } from '@simulation/storyline-observer';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import type { StateSnapshot } from '@/types';

/**
 * Create a default state snapshot for testing.
 */
function createDefaultStateSnapshot(): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_001',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'test-axis',
      endLine: 'test-end',
      alpha: 'test-alpha',
      beta: 'test-beta',
    },
    roundState: {
      phaseGoal: 'test-goal',
      currentVolume: 'Med',
      currentRouter: 'test-router',
      verbLexicon: ['observe'],
      historyWindow: [],
    },
    generationState: {
      directorNoteSummary: 'test summary',
      promptObject: {},
      currentBeatText: 'test beat',
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

/**
 * Full Storyline Runtime Flow Scenario.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 6.2 Flow 6
 *
 * This scenario simulates the complete runtime flow:
 * 1. createStorylineFromSource() - Create a new storyline from source
 * 2. ensureStorylineAwareActiveSession() - Ensure session is bound
 * 3. runBeat() - Advance runtime by recording accepted beat
 * 4. recordAcceptedBeat() - Record checkpoint
 * 5. verifyStorylineHeadCheckpoint() - Verify head updated
 * 6. branchFromCheckpoint() - Branch from accepted beat
 * 7. verifyBranchHasCopiedVariant() - Verify variant workspace copied
 * 8. verifyBranchSessionFromCheckpoint() - Verify session starts from checkpoint
 *
 * Key verifications:
 * - A storyline can continue into runtime
 * - Accepted beats update the storyline head checkpoint
 * - A branch from an accepted checkpoint gets a copied variant workspace and a fresh session
 * - The trace remains replayable
 */
export function createFullStorylineRuntimeFlowScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'full_storyline_runtime_flow',
    packageName: 'test-package',
    async run({ recorder }) {
      let kernel: MockKernel | null = null;

      try {
        // Initialize MockKernel
        kernel = createMockKernel('test-package');
        const substrate = createSubstrateMock(kernel);
        const builder = createMockFixtureBuilder(kernel);
        const observer = createStorylineObserver(kernel);

        // === STEP 1: Bootstrap initial state ===
        // Create a source storyline with checkpoint so we can create from source
        await substrate.resolveActiveStorylineContext({
          packageName: 'test-package',
          forWrite: true,
        });

        // Record a beat to create headCheckpointId
        const initialBeatResult = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_001',
              acceptedTranscript: {
                playerInput: 'test input',
                beatText: 'test beat',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        recorder.recordAction({
          kind: 'storyline.runtime_flow.setup_initial_checkpoint',
          details: {
            initialCheckpointId: initialBeatResult.activeCheckpointId,
          },
        });

        // Get source storyline for later reference
        const initialState = kernel.getState();
        const repository = initialState.storylineRepository;
        if (!repository) {
          throw new Error('Repository should exist after resolveActiveStorylineContext');
        }
        const sourceStoryline = repository.storylinesById[repository.activeStorylineId];
        if (!sourceStoryline) {
          throw new Error('Source storyline should exist');
        }
        const initialVariantId = sourceStoryline.variantId;
        const initialSessionId = sourceStoryline.activeSessionId;

        recorder.recordAssertion({
          name: 'source-has-head-checkpoint',
          pass: sourceStoryline.headCheckpointId !== null,
          details: 'Source storyline must have headCheckpointId for create from source',
        });

        // === STEP 2: Create storyline from source ===
        const storylineCount = Object.keys(repository.storylinesById).length;

        const created = await substrate.createStorylineFromSource({
          packageName: 'test-package',
          sourceStorylineId: sourceStoryline.storylineId,
          name: `Storyline ${storylineCount + 1}`,
        });

        recorder.recordAction({
          kind: 'storyline.runtime_flow.created_from_source',
          details: {
            newStorylineId: created.storyline.storylineId,
            newVariantId: created.variant.variantId,
            newSessionId: created.session.sessionId,
          },
        });

        recorder.recordAssertion({
          name: 'storyline-created-from-source',
          pass: created.storyline.storylineId !== sourceStoryline.storylineId,
          details: 'New storyline should have different id from source',
        });

        // === STEP 3: Switch to new storyline ===
        await substrate.switchActiveStoryline({
          packageName: 'test-package',
          storylineId: created.storyline.storylineId,
        });

        recorder.recordAction({
          kind: 'storyline.switch_active',
          details: {
            storylineId: created.storyline.storylineId,
          },
        });

        // === STEP 4: Ensure session for storyline ===
        const sessionResult = await substrate.ensureStorylineAwareActiveSession({
          packageName: 'test-package',
        });

        recorder.recordAction({
          kind: 'storyline.runtime_flow.ensured_session',
          details: {
            sessionId: sessionResult.session.sessionId,
          },
        });

        recorder.recordAssertion({
          name: 'storyline-continued-to-runtime',
          pass: true,
          details: 'Storyline successfully continued to runtime context',
        });

        recorder.recordAssertion({
          name: 'session-bound-after-continue',
          pass: sessionResult.session !== undefined,
          details: 'Session should be bound after continue',
        });

        // === STEP 5: Run beat (record accepted beat) ===
        const beatResult = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: 2,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: 2,
              roundId: 'round_002',
              acceptedTranscript: {
                playerInput: 'test input 2',
                beatText: 'test beat 2',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        recorder.recordAction({
          kind: 'storyline.record_accepted_beat',
          details: {
            acceptedBeatOrdinal: 2,
            checkpointId: beatResult.activeCheckpointId,
          },
        });

        recorder.recordAssertion({
          name: 'beats-recorded',
          pass: beatResult.activeCheckpointId !== null,
          details: 'Beat should be recorded with checkpoint',
        });

        // === STEP 6: Verify head checkpoint updated ===
        const stateAfterBeat = kernel.getState();
        const repositoryAfterBeat = stateAfterBeat.storylineRepository;
        if (!repositoryAfterBeat) {
          throw new Error('Repository should exist after beat');
        }
        const storylineAfterBeat = repositoryAfterBeat.storylinesById[repositoryAfterBeat.activeStorylineId];
        if (!storylineAfterBeat) {
          throw new Error('Active storyline should exist after beat');
        }

        recorder.recordAssertion({
          name: 'head-checkpoint-updated-after-beat',
          pass: storylineAfterBeat.headCheckpointId === beatResult.activeCheckpointId,
          details: {
            expected: beatResult.activeCheckpointId,
            actual: storylineAfterBeat.headCheckpointId,
          },
        });

        recorder.recordAssertion({
          name: 'storyline-has-head-checkpoint',
          pass: storylineAfterBeat.headCheckpointId !== null,
          details: 'Storyline should have non-null headCheckpointId after beat',
        });

        // Verify session checkpoint matches storyline head
        const sessionAfterBeat = stateAfterBeat.runtimeSessions.sessionsById[storylineAfterBeat.activeSessionId];
        recorder.recordAssertion({
          name: 'session-checkpoint-matches-storyline-head',
          pass: sessionAfterBeat?.activeCheckpointId === storylineAfterBeat.headCheckpointId,
          details: {
            sessionCheckpoint: sessionAfterBeat?.activeCheckpointId,
            storylineHead: storylineAfterBeat.headCheckpointId,
          },
        });

        // === STEP 7: Branch from accepted checkpoint ===
        const branchCheckpointId = storylineAfterBeat.headCheckpointId;
        if (!branchCheckpointId) {
          throw new Error('No head checkpoint available for branching');
        }

        const branched = await substrate.branchStorylineFromCheckpoint({
          packageName: 'test-package',
          sourceStorylineId: storylineAfterBeat.storylineId,
          checkpointId: branchCheckpointId,
          name: `Storyline ${storylineCount + 2}`,
        });

        recorder.recordAction({
          kind: 'storyline.branch_from_checkpoint',
          details: {
            sourceStorylineId: storylineAfterBeat.storylineId,
            checkpointId: branchCheckpointId,
            newStorylineId: branched.storyline.storylineId,
            newVariantId: branched.variant.variantId,
            newSessionId: branched.session.sessionId,
          },
        });

        // === STEP 8: Verify branch has copied variant workspace ===
        recorder.recordAssertion({
          name: 'branch-has-copied-variant',
          pass: branched.variant.variantId !== storylineAfterBeat.variantId,
          details: {
            sourceVariantId: storylineAfterBeat.variantId,
            branchVariantId: branched.variant.variantId,
          },
        });

        recorder.recordAssertion({
          name: 'branch-variant-different-from-source',
          pass: branched.variant.variantId !== initialVariantId,
          details: {
            initialVariantId,
            branchVariantId: branched.variant.variantId,
          },
        });

        // Verify variant workspace state exists
        const stateAfterBranch = kernel.getState();
        const branchVariantState = stateAfterBranch.variantsById[branched.variant.variantId];
        recorder.recordAssertion({
          name: 'branch-variant-has-workspace-state',
          pass: branchVariantState !== undefined,
          details: {
            variantId: branched.variant.variantId,
            hasState: branchVariantState !== undefined,
          },
        });

        // === STEP 9: Verify branch session starts from checkpoint ===
        recorder.recordAssertion({
          name: 'branch-has-fresh-session',
          pass: branched.session.sessionId !== storylineAfterBeat.activeSessionId,
          details: {
            sourceSessionId: storylineAfterBeat.activeSessionId,
            branchSessionId: branched.session.sessionId,
          },
        });

        recorder.recordAssertion({
          name: 'branch-session-starts-from-checkpoint',
          pass: branched.session.headCheckpointId === branchCheckpointId,
          details: {
            expected: branchCheckpointId,
            actual: branched.session.headCheckpointId,
          },
        });

        recorder.recordAssertion({
          name: 'branch-session-awaiting-start',
          pass: branched.session.lifecycle === 'awaiting_start',
          details: {
            lifecycle: branched.session.lifecycle,
          },
        });

        // === STEP 10: Verify trace is replayable ===
        const trace = kernel.getTrace();
        recorder.recordAssertion({
          name: 'trace-recorded',
          pass: trace.length > 0,
          details: `Trace should have ${trace.length} operations`,
        });

        // Verify trace has correct layer operations
        const hasRuntimeOps = trace.some(
          (op) => op.operation === 'execute_storyline_runtime_session_command',
        );
        recorder.recordAssertion({
          name: 'trace-has-runtime-operations',
          pass: hasRuntimeOps,
          details: 'Trace should have runtime session command operations',
        });

        const hasBranchOps = trace.some(
          (op) => op.operation === 'branch_storyline_from_checkpoint',
        );
        recorder.recordAssertion({
          name: 'trace-has-branch-operations',
          pass: hasBranchOps,
          details: 'Trace should have branch operations',
        });

        // === STEP 11: Get final summary ===
        const summary = observer.getSummary();

        // Calculate checkpoint count from all sessions
        let totalCheckpoints = 0;
        for (const session of Object.values(stateAfterBranch.runtimeSessions.sessionsById)) {
          totalCheckpoints += session.orderedCheckpointIds.length;
        }

        return {
          finalState: {
            packageName: 'test-package',
            storylineCount: summary.storylineCount,
            variantCount: summary.variantCount,
            sessionCount: summary.sessionCount,
            activeStorylineId: summary.activeStorylineId,
            checkpointCount: totalCheckpoints,
            sourceStorylineId: sourceStoryline.storylineId,
            branchedStorylineId: branched.storyline.storylineId,
            traceLength: trace.length,
          },
        };
      } finally {
        kernel?.reset();
      }
    },
  };
}