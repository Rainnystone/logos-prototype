import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createStorylineObserver } from '@simulation/storyline-observer';

/**
 * Create a legacy bootstrap flow scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md Section 10.1-10.4
 *
 * This scenario verifies:
 * - Legacy packages (without storyline-repository.json) still work
 * - The package resolves as one implicit default storyline
 * - First write triggers bootstrap and materializes the repository
 * - Bootstrap creates default variant workspace
 * - Bootstrap binds existing session or creates new session
 */
export function createLegacyBootstrapFlowScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'legacy_bootstrap_flow',
    packageName: 'test-package',

    async run({ recorder }) {
      // Create kernel WITHOUT initial repository (simulating legacy package)
      const kernel = createMockKernel('test-package');
      const substrate = createSubstrateMock(kernel);
      const observer = createStorylineObserver(kernel);

      // Verify initial state is legacy (no repository)
      const initialState = kernel.getState();
      recorder.recordAssertion({
        name: 'legacy-implicit-context-detected',
        pass: !initialState.storylineRepository,
        details: {
          hasRepository: !!initialState.storylineRepository,
        },
      });

      // Resolve in read mode - should return implicit context
      const readContext = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: false,
      });

      recorder.recordAssertion({
        name: 'implicit-default-storyline-resolved',
        pass: readContext.isLegacyImplicit,
        details: {
          isLegacyImplicit: readContext.isLegacyImplicit,
          storylineId: readContext.storyline.storylineId,
        },
      });

      // Record action for read resolution
      recorder.recordAction({
        kind: 'storyline.bootstrap_legacy',
        details: {
          operation: 'resolve_read_mode',
          isLegacyImplicit: readContext.isLegacyImplicit,
        },
      });

      // Now trigger bootstrap by resolving for write
      const writeContext = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Record bootstrap triggered
      recorder.recordAction({
        kind: 'storyline.bootstrap_legacy',
        details: {
          operation: 'bootstrap_triggered',
          forWrite: true,
        },
      });

      // Verify bootstrap was triggered
      recorder.recordAssertion({
        name: 'bootstrap-triggered-on-write',
        pass: !writeContext.isLegacyImplicit,
        details: {
          isLegacyImplicit: writeContext.isLegacyImplicit,
        },
      });

      // Verify repository was created
      const afterBootstrapState = kernel.getState();
      recorder.recordAssertion({
        name: 'repository-created-after-bootstrap',
        pass: !!afterBootstrapState.storylineRepository,
        details: {
          hasRepository: !!afterBootstrapState.storylineRepository,
        },
      });

      // Verify default variant created
      const variantId = writeContext.variant.variantId;
      const variantState = kernel.getState().variantsById[variantId];
      recorder.recordAssertion({
        name: 'default-variant-created',
        pass: !!variantState,
        details: {
          variantId,
          hasVariantState: !!variantState,
        },
      });

      // Verify variant workspace structure
      recorder.recordAssertion({
        name: 'variant-workspace-structure-valid',
        pass: variantState?.variantId === variantId,
        details: {
          variantId,
          hasWorldBase: variantState?.hasWorldBase,
          hasScene: variantState?.hasScene,
        },
      });

      // Verify session bound or created
      const sessionId = writeContext.storyline.activeSessionId;
      const session = kernel.getState().runtimeSessions.sessionsById[sessionId];
      recorder.recordAssertion({
        name: 'session-bound-or-created',
        pass: !!session,
        details: {
          sessionId,
          hasSession: !!session,
        },
      });

      // Verify session is storyline-bound
      const storyline = kernel.getState().storylineRepository?.storylinesById[writeContext.storyline.storylineId];
      recorder.recordAssertion({
        name: 'session-storyline-bound',
        pass: storyline?.activeSessionId === sessionId,
        details: {
          storylineId: writeContext.storyline.storylineId,
          sessionId,
          storylineActiveSessionId: storyline?.activeSessionId,
        },
      });

      // After bootstrap, context should not be legacy implicit
      const afterContext = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: false,
      });

      recorder.recordAssertion({
        name: 'explicit-substrate-after-bootstrap',
        pass: !afterContext.isLegacyImplicit,
        details: {
          isLegacyImplicit: afterContext.isLegacyImplicit,
        },
      });

      // Verify activeStorylineId resolves
      recorder.recordAssertion({
        name: 'active-storyline-id-resolves',
        pass: !!kernel.getState().storylineRepository?.activeStorylineId,
        details: {
          activeStorylineId: kernel.getState().storylineRepository?.activeStorylineId,
        },
      });

      // Capture final state before cleanup
      const summary = observer.getSummary();

      // Cleanup
      kernel.cleanup();

      return {
        finalState: {
          storylineCount: summary.storylineCount,
          variantCount: summary.variantCount,
          sessionCount: summary.sessionCount,
          activeStorylineId: summary.activeStorylineId,
          activeSessionId: summary.activeSessionId,
        },
      };
    },
  };
}
