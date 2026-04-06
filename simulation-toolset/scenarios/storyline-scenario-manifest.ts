/**
 * Storyline Scenario Manifest.
 *
 * This manifest provides a central registry for all storyline flow scenarios.
 * Each flow scenario is listed with its ID, title, description, and tags.
 */

import type { StorylineFlowId } from '@simulation/scenario-manifest';

/**
 * Storyline flow scenario metadata.
 */
export interface StorylineFlowScenarioMetadata {
  readonly flowId: StorylineFlowId;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly file: string;
}

/**
 * Built-in storyline flow scenarios.
 */
const BUILT_IN_STORYLINE_FLOW_SCENARIOS: readonly StorylineFlowScenarioMetadata[] = [
  {
    flowId: 'create_from_source_and_continue',
    title: 'Create from Source and Continue',
    description:
      'Create a new storyline from a source package and continue play. Verifies new storyline creation, variant copying, and session binding.',
    tags: ['storyline', 'create', 'source', 'runtime'],
    file: './storyline-flows/create-from-source-and-continue',
  },
  {
    flowId: 'branch_from_checkpoint_flow',
    title: 'Branch from Checkpoint',
    description:
      'Branch a new storyline from an existing checkpoint. Verifies checkpoint reachability, variant copying, and session root.',
    tags: ['storyline', 'branch', 'checkpoint', 'runtime'],
    file: './storyline-flows/branch-from-checkpoint-flow',
  },
  {
    flowId: 'switch_and_continue',
    title: 'Switch and Continue',
    description:
      'Switch to an existing storyline and continue play. Verifies session binding and storyline activation.',
    tags: ['storyline', 'switch', 'runtime'],
    file: './storyline-flows/switch-and-continue',
  },
  {
    flowId: 'rename_and_verify',
    title: 'Rename and Verify',
    description:
      'Rename a storyline and verify workspace consistency. Verifies display name update and runtime session preservation.',
    tags: ['storyline', 'rename', 'workspace'],
    file: './storyline-flows/rename-and-verify',
  },
  {
    flowId: 'legacy_bootstrap_flow',
    title: 'Legacy Bootstrap',
    description:
      'Bootstrap from legacy runtime-sessions file without storyline repository. Verifies default storyline creation and implicit context.',
    tags: ['storyline', 'legacy', 'bootstrap'],
    file: './storyline-flows/legacy-bootstrap-flow',
  },
  {
    flowId: 'full_storyline_runtime_flow',
    title: 'Full Storyline Runtime Flow',
    description:
      'Complete runtime flow with storyline context. Verifies storyline continuation, accepted beat recording, checkpoint branching, and trace replayability.',
    tags: ['storyline', 'runtime', 'e2e', 'branch', 'checkpoint'],
    file: './storyline-flows/full-storyline-runtime-flow',
  },
];

/**
 * List all storyline flow scenario metadata.
 */
export function listStorylineFlowScenarioMetadata(): readonly StorylineFlowScenarioMetadata[] {
  return [...BUILT_IN_STORYLINE_FLOW_SCENARIOS];
}

/**
 * Get metadata for a specific storyline flow by ID.
 */
export function getStorylineFlowScenarioMetadata(
  flowId: StorylineFlowId,
): StorylineFlowScenarioMetadata | undefined {
  return BUILT_IN_STORYLINE_FLOW_SCENARIOS.find((entry) => entry.flowId === flowId);
}

/**
 * Get storyline flow scenario metadata by tag.
 */
export function getStorylineFlowScenariosByTag(
  tag: string,
): readonly StorylineFlowScenarioMetadata[] {
  return BUILT_IN_STORYLINE_FLOW_SCENARIOS.filter((entry) => entry.tags.includes(tag));
}