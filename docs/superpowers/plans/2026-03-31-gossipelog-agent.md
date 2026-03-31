# Gossipelog Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Phase 1 `gossipelog agent` sidecar so each accepted beat can update package-owned directional relationship state and feed a dedicated dynamic relationship layer into the next prompt cycle.

**Architecture:** Keep the runtime boundary strict. Deterministic code owns accepted-beat timing, role bounding, file persistence, merge rules, and prompt handoff; the two gossipelog skills own bounded semantic judgment only. Implement the closed loop end to end: accepted beat enters the orchestrator, the agent shell builds bounded context from current Scene role data plus package-owned relationship state, the update skill returns structured deltas, deterministic code merges and persists them, the injection skill rebuilds prompt-ready relationship text, and the next prompt cycle reads that refreshed `relationshipLayer`. The accepted beat should return to the player immediately when possible, but if the player submits the next action before the pending gossipelog refresh finishes, the orchestrator must wait for that refresh before assembling the next prompt. Phase 1 should not add provider-level streaming for this path. New agent-shell code should land under `src/agents/`, while package-owned gossipelog data should land under `src/story-packages/<package>/agents/gossipelog/`.

**Tech Stack:** TypeScript, Zod, YAML-backed story packages, existing LOGOS orchestrator and API adapter pipeline, Vitest.

**Out of Scope For This Plan:** Do not add an agent management page, toggle UI, or opportunistic Play Workbench/editor UI/UX redesign in this phase. This plan only lays the shared agent skeleton and package-local data layout that future management UI can read.

---

## File Map

**Create:**
- `src/agents/registry.ts`
- `src/agents/gossipelog/definition.ts`
- `src/agents/gossipelog/index.ts`
- `src/types/character-relationships.ts`
- `src/types/gossipelog-skill-packets.ts`
- `src/types/__tests__/character-relationships.test.ts`
- `src/agents/gossipelog/skills/relationship-update/`
- `src/agents/gossipelog/skills/relationship-injection/`
- `src/agents/gossipelog/repository.ts`
- `src/agents/gossipelog/merge.ts`
- `src/agents/gossipelog/agent.ts`
- `src/agents/gossipelog/__tests__/repository.test.ts`
- `src/agents/gossipelog/__tests__/merge.test.ts`
- `src/agents/gossipelog/__tests__/agent.test.ts`
- `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- `src/story-packages/sample-scene/agents/gossipelog/config.yaml`
- `src/story-packages/sample-scene/agents/gossipelog/character-relationships.yaml`

**Modify:**
- `src/types/index.ts`
- `src/types/prompt-object.ts`
- `src/types/__tests__/type-conformance.test.ts`
- `src/engine/schema-validator.ts`
- `src/engine/__tests__/schema-validator.test.ts`
- `src/engine/types/adapter-interface.ts`
- `src/engine/api-adapter/prompt-templates.ts`
- `src/engine/api-adapter/schema-mapper.ts`
- `src/engine/api-adapter/response-parsers.ts`
- `src/engine/api-adapter/adapter.ts`
- `src/engine/api-adapter/__tests__/adapter.test.ts`
- `src/engine/api-adapter/__tests__/response-parsers.test.ts`
- `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- `src/engine/api-adapter/__tests__/fixtures.ts`
- `src/engine/modules/prompt-assembler.ts`
- `src/engine/modules/__tests__/prompt-assembler.test.ts`
- `src/engine/orchestrator.ts`
- `src/engine/__tests__/fixtures/audit-loop-fixtures.ts`
- `src/engine/__tests__/orchestrator.test.ts`
- `src/engine/__tests__/e2e/helpers/e2e-mock-adapter.ts`
- `src/engine/__tests__/e2e/audit-behavior.test.ts`
- `src/engine/__tests__/e2e/phase-end-processing.test.ts`
- `src/engine/__tests__/e2e/state-transitions.test.ts`
- `src/engine/__tests__/mock-adapter.test.ts`
- `src/engine/__mocks__/mock-adapter.ts`
- `src/engine/__mocks__/workbench-demo-adapter.ts`
- `src/app/play/runtime.ts`
- `src/app/play/PlayWorkbench.tsx`
- `src/story-packages/__tests__/sample-scene.test.ts`
- `src/engine/__tests__/e2e/full-phase-run.test.ts` (if the existing runtime regression coverage is the cleanest place for the final closed-loop assertion)

### Task 0: Freeze Shared Agent Skeleton

**Files:**
- Create: `src/agents/registry.ts`
- Create: `src/agents/gossipelog/definition.ts`
- Create: `src/agents/gossipelog/index.ts`
- Create: `src/agents/gossipelog/skills/relationship-update/`
- Create: `src/agents/gossipelog/skills/relationship-injection/`
- Create: `src/story-packages/sample-scene/agents/gossipelog/config.yaml`

- [ ] **Step 1: Add the shared agent root and the gossipelog definition entrypoint**

```ts
export const gossipelogAgentDefinition = {
  agentId: 'gossipelog',
  displayName: 'gossipelog agent',
  skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
  packageConfigPath: 'agents/gossipelog/config.yaml',
  packageStatePath: 'agents/gossipelog/character-relationships.yaml',
} as const;
```

- [ ] **Step 2: Register `gossipelog agent` in `src/agents/registry.ts` so later management work has one stable read point**

- [ ] **Step 3: Create the colocated gossipelog skill folders under `src/agents/gossipelog/skills/` and keep both Phase 1 skills there**

- [ ] **Step 4: Create the package-local gossipelog folder under `src/story-packages/sample-scene/agents/gossipelog/` and reserve `config.yaml` for later per-package enablement or settings**

- [ ] **Step 5: Keep this task structural only; do not add an agent management page, toggle UI, or any other new UI/UX work**

- [ ] **Step 6: Commit**

```bash
git add src/agents/registry.ts src/agents/gossipelog/definition.ts src/agents/gossipelog/index.ts src/agents/gossipelog/skills/relationship-update/ src/agents/gossipelog/skills/relationship-injection/ src/story-packages/sample-scene/agents/gossipelog/config.yaml
git commit -m "feat: add shared gossipelog agent skeleton"
```

### Task 1: Freeze Phase 1 Gossipelog Contracts

**Files:**
- Create: `src/types/character-relationships.ts`
- Create: `src/types/gossipelog-skill-packets.ts`
- Create: `src/types/__tests__/character-relationships.test.ts`
- Modify: `src/types/prompt-object.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/__tests__/type-conformance.test.ts`
- Modify: `src/engine/schema-validator.ts`
- Modify: `src/engine/__tests__/schema-validator.test.ts`

- [ ] **Step 1: Write the failing schema tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  CharacterRelationshipsFileSchema,
  GossipelogInjectionResultSchema,
  GossipelogUpdateResultSchema,
  PromptObjectSchema,
} from '@/types';

describe('gossipelog contracts', () => {
  it('accepts the Phase 1 relationship file shape', () => {
    const parsed = CharacterRelationshipsFileSchema.parse({
      meta: {
        fileType: 'character-relationships',
        schemaVersion: 1,
        storyPackage: 'sample-scene',
      },
      relationshipsBySource: {
        chr_core01: {
          targets: {
            chr_hero01: {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              baseline: {
                state: 'guarded trust',
                lastAbsorbedRound: 'round-0008',
              },
              recentDelta: {
                state: 'trust increased after direct protection',
                sourceRound: 'round-0009',
              },
              highlightNextPrompt: true,
            },
          },
        },
      },
    });

    expect(parsed.relationshipsBySource.chr_core01.targets.chr_hero01.highlightNextPrompt).toBe(
      true,
    );
  });

  it('accepts the update-skill payload', () => {
    const parsed = GossipelogUpdateResultSchema.parse({
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'delta',
          replaceBaseline: false,
          recentDelta: {
            state: 'trust increased after direct protection',
            sourceRound: 'round-0009',
          },
        },
      ],
    });

    expect(parsed.edgeUpdates[0]?.mode).toBe('delta');
  });

  it('accepts the injection-skill payload and prompt object relationship layer', () => {
    const injection = GossipelogInjectionResultSchema.parse({
      highlightedDeltasText: 'chr_core01 -> chr_hero01: trust has risen this round.',
      stableBackgroundText: 'chr_core01 -> chr_hero01: long-term baseline is guarded trust.',
    });

    const promptObject = PromptObjectSchema.parse({
      worldBase: {
        mainCharacters: 'hero',
        npcCharacters: '',
        locationPatch: 'school rooftop',
      },
      relationshipLayer: injection,
      history: [],
      narrative: {
        mainAxis: 'axis',
        endLine: 'end line',
        phaseGoal: 'goal',
        alpha: 'alpha',
        beta: 'beta',
      },
      directorNote: {
        volume: 'Low',
        router: 'Observe',
        verbLexicon: ['observe'],
        beatConstraints: 'rule',
        optionConstraints: 'rule',
      },
    });

    expect(promptObject.relationshipLayer.highlightedDeltasText.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the schema tests to verify they fail**

Run: `npm test -- src/types/__tests__/character-relationships.test.ts src/types/__tests__/type-conformance.test.ts src/engine/__tests__/schema-validator.test.ts`

Expected: FAIL because the new relationship file schema, skill packet schemas, and `PromptObject.relationshipLayer` do not exist yet.

- [ ] **Step 3: Add the new schemas and prompt contract**

```ts
export const RelationshipBaselineSchema = z
  .object({
    state: z.string(),
    lastAbsorbedRound: z.string(),
  })
  .strict();

export const RelationshipDeltaSchema = z
  .object({
    state: z.string(),
    sourceRound: z.string(),
  })
  .strict();

export const RelationshipLayerSchema = z
  .object({
    highlightedDeltasText: z.string(),
    stableBackgroundText: z.string(),
  })
  .strict();
```

- [ ] **Step 4: Export and validate the new contracts**

```ts
export * from '@/types/character-relationships';
export * from '@/types/gossipelog-skill-packets';
```

- [ ] **Step 5: Re-run the schema tests**

Run: `npm test -- src/types/__tests__/character-relationships.test.ts src/types/__tests__/type-conformance.test.ts src/engine/__tests__/schema-validator.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/character-relationships.ts src/types/gossipelog-skill-packets.ts src/types/__tests__/character-relationships.test.ts src/types/prompt-object.ts src/types/index.ts src/types/__tests__/type-conformance.test.ts src/engine/schema-validator.ts src/engine/__tests__/schema-validator.test.ts
git commit -m "feat: add gossipelog runtime contracts"
```

### Task 2: Add Adapter-Facing Gossipelog Skill Calls

**Files:**
- Modify: `src/engine/types/adapter-interface.ts`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Modify: `src/engine/api-adapter/schema-mapper.ts`
- Modify: `src/engine/api-adapter/response-parsers.ts`
- Modify: `src/engine/api-adapter/adapter.ts`
- Modify: `src/engine/api-adapter/__tests__/adapter.test.ts`
- Modify: `src/engine/api-adapter/__tests__/response-parsers.test.ts`
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Modify: `src/engine/api-adapter/__tests__/fixtures.ts`
- Modify: `src/engine/__mocks__/mock-adapter.ts`
- Modify: `src/engine/__mocks__/workbench-demo-adapter.ts`
- Modify: `src/engine/__tests__/mock-adapter.test.ts`

- [ ] **Step 1: Write the failing adapter and local-adapter tests**

```ts
it('maps the relationship-update skill request to a strict JSON schema response', () => {
  const request = mapForGossipelogUpdate(sampleGossipelogUpdateRequest, 'openai');
  expect(request.responseFormat?.name).toBe('logos_gossipelog_update_result');
});

it('parses the relationship-injection skill response', () => {
  const parsed = parseGossipelogInjectionResult(
    '{"highlightedDeltasText":"delta","stableBackgroundText":"background"}',
    undefined,
  );
  expect(parsed.stableBackgroundText).toBe('background');
});

it('demo and mock adapters expose deterministic gossipelog skill methods', async () => {
  const adapter = createWorkbenchDemoAdapter();
  await expect(adapter.gossipelogInjection?.(sampleGossipelogInjectionRequest)).resolves.toBeDefined();
});
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run: `npm test -- src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts src/engine/__tests__/mock-adapter.test.ts`

Expected: FAIL because the new skill request mappers, response parsers, and adapter entry points do not exist yet.

- [ ] **Step 3: Extend the adapter interface and provider mapping**

```ts
export interface LLMAdapter {
  collapse(request: CollapseInput): Promise<CollapseResponse>;
  route?(request: RouteRequest): Promise<RouteResult>;
  generate?(request: PromptObject): Promise<GenerateResult>;
  audit?(request: AuditPacket): Promise<AuditResult>;
  settlement?(request: PhaseConsequenceRequest): Promise<PhaseConsequenceResponse>;
  gossipelogUpdate?(request: GossipelogUpdateRequest): Promise<GossipelogUpdateResult>;
  gossipelogInjection?(request: GossipelogInjectionRequest): Promise<GossipelogInjectionResult>;
}
```

- [ ] **Step 4: Wire the new methods through the API adapter and deterministic local adapters**

```ts
async gossipelogUpdate(requestInput) {
  const request = attachModel(
    mapForGossipelogUpdate(validateGossipelogUpdateRequest(requestInput), config.provider),
    config.providerConfig.model,
  );
  const response = await provider.call(request);
  return deepFreeze(parseGossipelogUpdateResult(response.content, response.usage));
}
```

- [ ] **Step 5: Re-run the adapter tests**

Run: `npm test -- src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts src/engine/__tests__/mock-adapter.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/types/adapter-interface.ts src/engine/api-adapter/prompt-templates.ts src/engine/api-adapter/schema-mapper.ts src/engine/api-adapter/response-parsers.ts src/engine/api-adapter/adapter.ts src/engine/api-adapter/__tests__/adapter.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/fixtures.ts src/engine/__mocks__/mock-adapter.ts src/engine/__mocks__/workbench-demo-adapter.ts src/engine/__tests__/mock-adapter.test.ts
git commit -m "feat: add gossipelog adapter skill calls"
```

### Task 3: Add Package-Local Relationship Repository And Merge Rules

**Files:**
- Create: `src/agents/gossipelog/repository.ts`
- Create: `src/agents/gossipelog/merge.ts`
- Create: `src/agents/gossipelog/__tests__/repository.test.ts`
- Create: `src/agents/gossipelog/__tests__/merge.test.ts`
- Create: `src/story-packages/sample-scene/agents/gossipelog/character-relationships.yaml`
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`

- [ ] **Step 1: Write the failing repository and merge tests**

```ts
it('loads an existing package-local character-relationships file', async () => {
  const file = await loadCharacterRelationships('sample-scene');
  expect(file.meta.fileType).toBe('character-relationships');
});

it('returns a deterministic empty file when an existing package path has no relationship file yet', async () => {
  const file = await loadOrCreateCharacterRelationships(tempPackageName);
  expect(file.relationshipsBySource).toEqual({});
});

it('keeps the current file unchanged on invocation-level no-op', () => {
  const merged = mergeRelationshipUpdates(existingFile, {
    involvedRoleIds: ['chr_core01'],
    invocationNoOp: true,
    edgeUpdates: [],
  });

  expect(merged).toEqual(existingFile);
});

it('creates a thin baseline plus current delta for a genuine new_edge', () => {
  const merged = mergeRelationshipUpdates(existingFile, {
    involvedRoleIds: ['chr_core01', 'chr_ant01'],
    invocationNoOp: false,
    edgeUpdates: [
      {
        sourceRoleId: 'chr_core01',
        targetRoleId: 'chr_ant01',
        mode: 'new_edge',
        replaceBaseline: false,
        baseline: {
          state: 'first-contact caution',
          lastAbsorbedRound: 'round-0010',
        },
        recentDelta: {
          state: 'hostility registered after first confrontation',
          sourceRound: 'round-0010',
        },
      },
    ],
  });

  expect(merged.relationshipsBySource.chr_core01.targets.chr_ant01.baseline.state).toBe(
    'first-contact caution',
  );
});

it('rejects hero-outgoing long-term edges in Phase 1', () => {
  expect(() =>
    mergeRelationshipUpdates(existingFile, {
      involvedRoleIds: ['chr_hero01', 'chr_core01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_hero01',
          targetRoleId: 'chr_core01',
          mode: 'delta',
          replaceBaseline: false,
          recentDelta: {
            state: 'hero decided to trust core one',
            sourceRound: 'round-0010',
          },
        },
      ],
    }),
  ).toThrow(/hero-outgoing/i);
});

it('absorbs a consumed highlighted delta into baseline before applying a later round update', () => {
  const settled = absorbConsumedDeltas(fileWithConsumedHighlight, 'round-0011');
  expect(settled.relationshipsBySource.chr_core01.targets.chr_hero01.recentDelta).toBeNull();
});
```

- [ ] **Step 2: Run the repository and merge tests to verify they fail**

Run: `npm test -- src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts`

Expected: FAIL because the repository, sample file, and deterministic merge helpers do not exist yet.

- [ ] **Step 3: Create the package-local repository and sample relationship file**

```ts
export async function loadOrCreateCharacterRelationships(
  packageName: string,
): Promise<CharacterRelationshipsFile> {
  const filePath = resolveCharacterRelationshipsPath(packageName);

  try {
    return await readCharacterRelationshipsFile(filePath);
  } catch {
    return createEmptyCharacterRelationshipsFile(packageName);
  }
}
```

- [ ] **Step 4: Implement deterministic merge helpers**

```ts
export function absorbConsumedDeltas(
  file: CharacterRelationshipsFile,
  currentRoundId: string,
): CharacterRelationshipsFile {
  // if highlightNextPrompt was already consumed before currentRoundId,
  // move recentDelta.state into baseline.state, stamp lastAbsorbedRound,
  // clear recentDelta, clear highlightNextPrompt
}

export function mergeRelationshipUpdates(
  file: CharacterRelationshipsFile,
  update: GossipelogUpdateResult,
): CharacterRelationshipsFile {
  // no-op => unchanged
  // new_edge => create thin baseline then attach delta
  // hero-outgoing sourceRoleId => reject in Phase 1
  // replaceBaseline => replace baseline.state before attaching delta
  // ordinary delta => keep baseline, replace recentDelta, set highlightNextPrompt=true
}
```

- [ ] **Step 5: Re-run the repository and merge tests**

Run: `npm test -- src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts src/story-packages/__tests__/sample-scene.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/agents/gossipelog/repository.ts src/agents/gossipelog/merge.ts src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts src/story-packages/sample-scene/agents/gossipelog/character-relationships.yaml src/story-packages/__tests__/sample-scene.test.ts
git commit -m "feat: add gossipelog relationship repository"
```

### Task 4: Add The Gossipelog Agent Shell

**Files:**
- Create: `src/agents/gossipelog/agent.ts`
- Create: `src/agents/gossipelog/__tests__/agent.test.ts`

- [ ] **Step 1: Write the failing agent-shell tests**

```ts
it('builds a bounded update context from accepted beat, current role definitions, and current relationship subgraph', async () => {
  const result = await runGossipelogCycle({
    adapter,
    storyPackageName: 'sample-scene',
    storyPackage,
    acceptedBeatText: 'accepted beat text',
    roundId: 'round-0009',
  });

  expect(result.updateRequest.candidateRoles.map((role) => role.characterId)).toEqual([
    'chr_hero01',
    'chr_core01',
    'chr_ant01',
  ]);
  expect(result.updateRequest.sceneCastRoleIds).toEqual(['chr_hero01', 'chr_core01', 'chr_ant01']);
  expect(result.updateRequest.sceneCastFraming.sceneId).toBe('scene-fixture');
});

it('rejects skill-returned role IDs that escape the Scene-bounded candidate set', async () => {
  await expect(runGossipelogCycle(outOfBoundsFixture)).rejects.toThrow(/candidate set/i);
});

it('completes the update -> merge -> persist -> injection sub-loop and returns prompt-ready relationship text', async () => {
  const result = await runGossipelogCycle(validFixture);
  expect(result.relationshipLayer.highlightedDeltasText.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the agent-shell tests to verify they fail**

Run: `npm test -- src/agents/gossipelog/__tests__/agent.test.ts`

Expected: FAIL because the agent shell and bounded context pack builder do not exist yet.

- [ ] **Step 3: Implement the shell exactly along the spec boundary**

```ts
const currentFile = await loadOrCreateCharacterRelationships(storyPackageName);
const settledFile = absorbConsumedDeltas(currentFile, roundId);
const candidateRoles = resolveSceneCandidateRoles(storyPackage.worldBase);
const updateRequest = buildGossipelogUpdateRequest({
  acceptedBeatText,
  sceneCastRoleIds: candidateRoles.map((role) => role.characterId),
  sceneCastFraming: {
    sceneId: storyPackage.sceneSpec.sceneId,
    castRoleIds: candidateRoles.map((role) => role.characterId),
  },
  candidateRoles,
  roleDefinitions: candidateRoles,
  relationshipSubgraph: selectRelationshipSubgraph(settledFile, candidateRoles),
  roundId,
});
const updateResult = await adapter.gossipelogUpdate?.(updateRequest);
const mergedFile = mergeRelationshipUpdates(settledFile, updateResult);
await saveCharacterRelationships(storyPackageName, mergedFile);
const injectionResult = await adapter.gossipelogInjection?.(
  buildGossipelogInjectionRequest({
    sceneCastRoleIds: candidateRoles.map((role) => role.characterId),
    sceneCastFraming: {
      sceneId: storyPackage.sceneSpec.sceneId,
      castRoleIds: candidateRoles.map((role) => role.characterId),
    },
    roleDefinitions: candidateRoles,
    relationshipSubgraph: selectRelationshipSubgraph(mergedFile, candidateRoles),
  }),
);
```

- [ ] **Step 4: Re-run the agent-shell tests**

Run: `npm test -- src/agents/gossipelog/__tests__/agent.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/gossipelog/agent.ts src/agents/gossipelog/__tests__/agent.test.ts
git commit -m "feat: add gossipelog agent shell"
```

### Task 5: Integrate Gossipelog Into The Orchestrator And Runtime Path

**Files:**
- Modify: `src/engine/modules/prompt-assembler.ts`
- Modify: `src/engine/modules/__tests__/prompt-assembler.test.ts`
- Modify: `src/engine/orchestrator.ts`
- Modify: `src/engine/__tests__/fixtures/audit-loop-fixtures.ts`
- Modify: `src/engine/__tests__/orchestrator.test.ts`
- Modify: `src/engine/__tests__/e2e/helpers/e2e-mock-adapter.ts`
- Modify: `src/engine/__tests__/e2e/audit-behavior.test.ts`
- Modify: `src/engine/__tests__/e2e/phase-end-processing.test.ts`
- Modify: `src/engine/__tests__/e2e/state-transitions.test.ts`
- Modify: `src/engine/__tests__/e2e/full-phase-run.test.ts`
- Modify: `src/app/play/runtime.ts`
- Modify: `src/app/play/PlayWorkbench.tsx`

- [ ] **Step 1: Write the failing prompt-assembler and orchestrator tests**

```ts
it('includes relationshipLayer in the assembled prompt object', () => {
  const promptObject = assemblePromptObject({
    ...baseInput,
    relationshipLayer: {
      highlightedDeltasText: 'delta block',
      stableBackgroundText: 'background block',
    },
  });

  expect(promptObject.relationshipLayer.stableBackgroundText).toBe('background block');
});

it('pushes each accepted beat through gossipelog and uses the refreshed relationship layer on the following beat', async () => {
  const orchestrator = createOrchestrator({
    adapter,
    storyPackageName: 'sample-scene',
    storyPackage,
  });

  await orchestrator.initScene();
  await orchestrator.runBeat('opening action');
  const second = await orchestrator.runBeat('follow-up action');

  expect(second.state.generationState.promptObject).toHaveProperty('relationshipLayer');
});

it('returns the accepted beat before the background gossipelog refresh finishes', async () => {
  const { adapter, releaseGossipelogRefresh } = createDeferredGossipelogAdapter();
  const orchestrator = createOrchestrator({
    adapter,
    storyPackageName: 'sample-scene',
    storyPackage,
  });

  await orchestrator.initScene();
  const firstBeatPromise = orchestrator.runBeat('opening action');
  await expect(firstBeatPromise).resolves.toMatchObject({
    beatResult: {
      beatText: expect.any(String),
    },
  });

  releaseGossipelogRefresh();
});

it('waits for a still-running gossipelog refresh when the player submits the next action too quickly', async () => {
  const { adapter, releaseGossipelogRefresh } = createDeferredGossipelogAdapter();
  const orchestrator = createOrchestrator({
    adapter,
    storyPackageName: 'sample-scene',
    storyPackage,
  });

  await orchestrator.initScene();
  await orchestrator.runBeat('opening action');
  const secondBeatPromise = orchestrator.runBeat('follow-up action');

  expect(adapter.generateCallCount).toBe(1);
  releaseGossipelogRefresh();
  await expect(secondBeatPromise).resolves.toMatchObject({
    beatResult: {
      beatText: expect.any(String),
    },
  });
});
```

- [ ] **Step 2: Run the prompt/orchestrator tests to verify they fail**

Run: `npm test -- src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/engine/__tests__/e2e/phase-end-processing.test.ts src/engine/__tests__/e2e/state-transitions.test.ts`

Expected: FAIL because `PromptObject`, `PromptAssemblerInput`, and the orchestrator do not yet carry the new relationship layer.

- [ ] **Step 3: Thread story-package identity and next-round relationship state through the runtime**

```ts
export interface OrchestratorConfig {
  readonly adapter: LLMAdapter;
  readonly storyPackage: StoryPackage;
  readonly storyPackageName: string;
}

let queuedRelationshipLayer: RelationshipLayer = createEmptyRelationshipLayer();
let pendingRelationshipRefresh: Promise<void> | null = null;
```

- [ ] **Step 4: Keep tracked workbench adapters from dropping the new skill methods**

```ts
async gossipelogUpdate(request) {
  return adapter.gossipelogUpdate ? adapter.gossipelogUpdate(request) : defaultNoOpUpdate(request);
},

async gossipelogInjection(request) {
  return adapter.gossipelogInjection
    ? adapter.gossipelogInjection(request)
    : defaultEmptyInjection(request);
},
```

- [ ] **Step 5: Enforce the non-blocking accepted-beat handoff**

```ts
async function waitForPendingRelationshipRefresh() {
  if (pendingRelationshipRefresh) {
    await pendingRelationshipRefresh;
  }
}

function scheduleRelationshipRefresh(args: AcceptedBeatRefreshArgs) {
  pendingRelationshipRefresh = gossipelogAgent
    .handleAcceptedBeat(args)
    .then((layer) => {
      queuedRelationshipLayer = layer;
    })
    .finally(() => {
      pendingRelationshipRefresh = null;
    });
}

// Before assembling the next beat prompt:
await waitForPendingRelationshipRefresh();

// This wait is the explicit fallback rule for fast-clicking players:
// accepted-beat return stays non-blocking when possible,
// but the next submitted action must not assemble a prompt against stale relationship state.

// After the current beat is accepted and state is ready to return:
scheduleRelationshipRefresh({
  storyPackageName: config.storyPackageName,
  storyPackage: config.storyPackage,
  acceptedBeatText: attemptOutcome.generationResult.beatText,
  roundId,
});
return { beatResult, state };
```

- [ ] **Step 6: Re-run the prompt/orchestrator tests**

Run: `npm test -- src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/engine/__tests__/e2e/phase-end-processing.test.ts src/engine/__tests__/e2e/state-transitions.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/engine/modules/prompt-assembler.ts src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/orchestrator.ts src/engine/__tests__/fixtures/audit-loop-fixtures.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/helpers/e2e-mock-adapter.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/engine/__tests__/e2e/phase-end-processing.test.ts src/engine/__tests__/e2e/state-transitions.test.ts src/engine/__tests__/e2e/full-phase-run.test.ts src/app/play/runtime.ts src/app/play/PlayWorkbench.tsx
git commit -m "feat: wire gossipelog through orchestrator runtime flow"
```

### Task 6: Render The Dynamic Relationship Layer In Generate Prompts

**Files:**
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Create: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- Modify: `src/engine/api-adapter/__tests__/fixtures.ts`

- [ ] **Step 1: Write the failing prompt-template tests**

```ts
it('renders the dynamic relationship layer in the system prompt after world base content', () => {
  const systemPrompt = buildGenerateSystemPrompt(samplePromptObject);
  expect(systemPrompt).toContain('[Dynamic Relationship Layer]');
  expect(systemPrompt.indexOf('[Dynamic Relationship Layer]')).toBeGreaterThan(
    systemPrompt.indexOf('[World Base]'),
  );
});

it('keeps history as message entries while relationshipLayer stays in the system prompt', () => {
  const request = mapForGenerate(samplePromptObject, 'openai');
  expect(request.system).toContain('[Dynamic Relationship Layer]');
  expect(request.messages[0]?.role).toBe('user');
});
```

- [ ] **Step 2: Run the prompt-template tests to verify they fail**

Run: `npm test -- src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts`

Expected: FAIL because the generate prompt currently ignores `relationshipLayer`.

- [ ] **Step 3: Insert the new relationship section without collapsing it into world base or director note**

```ts
'[Dynamic Relationship Layer]',
`Highlighted deltas: ${prompt.relationshipLayer.highlightedDeltasText || 'none'}`,
`Stable background: ${prompt.relationshipLayer.stableBackgroundText || 'none'}`,
```

- [ ] **Step 4: Re-run the prompt-template tests**

Run: `npm test -- src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/api-adapter/prompt-templates.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/fixtures.ts
git commit -m "feat: render gossipelog relationship layer in prompts"
```

### Task 7: Validate The Closed Runtime Loop End To End

**Files:**
- Modify: `src/engine/__tests__/orchestrator.test.ts`
- Modify: `src/engine/__tests__/e2e/full-phase-run.test.ts` (if this is the cleanest home for the final regression)

- [ ] **Step 1: Add one regression that proves the full loop is closed**

```ts
it('completes accepted beat -> role data load -> relationship update -> persistence -> prompt injection for the next beat', async () => {
  const orchestrator = createOrchestrator({
    adapter,
    storyPackageName: 'sample-scene',
    storyPackage,
  });

  await orchestrator.initScene();
  const first = await orchestrator.runBeat('opening action');
  const second = await orchestrator.runBeat('follow-up action');

  expect(first.state.generationState.currentBeatText).toBeTruthy();
  expect(second.state.generationState.promptObject).toMatchObject({
    relationshipLayer: {
      highlightedDeltasText: expect.any(String),
      stableBackgroundText: expect.any(String),
    },
  });
});

it('does not block accepted-beat return on the background relationship refresh, but does wait before assembling the following beat', async () => {
  const { adapter, releaseGossipelogRefresh } = createDeferredGossipelogAdapter();
  const orchestrator = createOrchestrator({
    adapter,
    storyPackageName: 'sample-scene',
    storyPackage,
  });

  await orchestrator.initScene();
  const firstResult = await orchestrator.runBeat('opening action');
  expect(firstResult.beatResult.beatText).toBeTruthy();

  releaseGossipelogRefresh();
  const secondResult = await orchestrator.runBeat('follow-up action');
  expect(secondResult.state.generationState.promptObject).toHaveProperty('relationshipLayer');
});
```

- [ ] **Step 2: Run the focused runtime suites**

Run: `npm test -- src/types/__tests__/character-relationships.test.ts src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts`

Expected: PASS

- [ ] **Step 3: Run the broader core suite**

Run: `npm run test:core`

Expected: PASS

- [ ] **Step 4: Run the full repository suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 5: Launch the play workbench and verify the runtime manually**

Run: `npm run dev`

Verify:
- the first accepted beat completes without waiting for another player action
- `agents/gossipelog/character-relationships.yaml` updates after an accepted beat
- the next beat is generated with a non-empty `relationshipLayer`
- the workbench still boots when no provider config is saved, using the deterministic local adapter path

- [ ] **Step 6: Commit**

```bash
git add src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/full-phase-run.test.ts
git commit -m "test: validate gossipelog runtime loop"
```
