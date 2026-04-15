# Gossipelog Relationship Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重写 gossipelog runtime 链路的前提下，为 `gossipelogUpdate` 增加 reference，并把 gossipelog 从边级快照升级为带时间戳、因果字段、完整历史和显式当前关系的有向关系记忆。

**Architecture:** 保持现有 package-owned `agents/gossipelog/character-relationships.yaml` 作为唯一真相层，原地从 schemaVersion 1 升级到 schemaVersion 2。更新链路继续走 `update -> merge/persist -> injection`，但 update 从“edge delta”改成“memory entry update”，injection 继续复用现有 `relationshipLayer` 外壳，只把其内部语义升级为“当前关系强调 + 全历史轨迹”。

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Zod, YAML

---

## Spec Reference

- `docs/superpowers/specs/2026-04-10-gossipelog-memory-reference-design.md`

## Explicit Non-Goals

- 不把 gossipelog state 从 package-owned 改成 storyline-owned
- 不新增 gossipelog 的独立 sidecar 或新 route
- 不新增 editor 写入 UI
- 不在注入前新增“历史压缩”LLM 角色
- 不重写 orchestrator 主循环

## Execution Mode

- 本计划必须串行执行。
- `src/agents/gossipelog/agent.ts`
- `src/agents/gossipelog/merge.ts`
- `src/agents/gossipelog/repository.ts`
- `src/types/character-relationships.ts`
- `src/types/gossipelog-skill-packets.ts`

这些文件会被多个任务连续修改，默认不允许并行写入。

## File Map

### New Files

- Create: `src/agents/gossipelog/references/relationship-reference.md`
  - repo 内 gossipelog update reference，承接外部 `reference.md` 的草稿内容并补系统内输出约束。

### Core Production Files

- Modify: `src/agents/gossipelog/definition.ts`
  - 注册 gossipelog update reference manifest，并升级侧边栏显示文案。
- Modify: `src/types/character-relationships.ts`
  - 定义 schemaVersion 2 的 relationship memory 文件结构，并保留 v1 兼容读取能力。
- Modify: `src/types/gossipelog-skill-packets.ts`
  - 定义新的 gossipelog memory update 输出合同与维持兼容的 injection 输出合同。
- Modify: `src/engine/types/adapter-interface.ts`
  - 扩展 gossipelog update/injection 请求合同，加入 `phaseId`、`beatIndex`、`resolvedReferences` 和新的 memory 结构。
- Modify: `src/agents/gossipelog/contracts.ts`
  - 扩展 `RunGossipelogCycleInput`，要求 phase/beat 上下文。
- Modify: `src/agents/gossipelog/repository.ts`
  - 读取 v1/v2 gossipelog state，迁移旧数据，统一写回 v2。
- Modify: `src/agents/gossipelog/merge.ts`
  - 从“baseline/recentDelta/highlightNextPrompt”切到“currentRelation + history[]”。
- Modify: `src/agents/gossipelog/agent.ts`
  - 加载 reference、构造新 update request、消费 memory update、构造新的 injection request。
- Modify: `src/engine/api-adapter/adapter.ts`
  - 验证 gossipelog update/injection 新请求形状。
- Modify: `src/engine/api-adapter/schema-mapper.ts`
  - 为新 gossipelog request/response 合同生成 provider schema。
- Modify: `src/engine/api-adapter/prompt-templates.ts`
  - 渲染 gossipelog update reference 块、phase/beat 上下文、current/history 关系文本。
- Modify: `src/app/play/runtime.ts`
  - 浏览器 gossipelog bridge 加入 `phaseId` 和 `beatIndex`。
- Modify: `src/app/api/play/gossipelog/route.ts`
  - 解析并转发 `phaseId` 和 `beatIndex`。
- Modify: `src/engine/orchestrator.ts`
  - 调用 gossipelog refresh 时补传 accepted beat 对应的 `phaseId` 和 `beatIndex`。
- Modify: `src/agents/agent-surface.ts`
  - 将 gossipelog surface 摘要升级为关系记忆视角。

### Tests

- Modify: `src/types/__tests__/character-relationships.test.ts`
- Modify: `src/agents/gossipelog/__tests__/repository.test.ts`
- Modify: `src/agents/gossipelog/__tests__/merge.test.ts`
- Modify: `src/agents/gossipelog/__tests__/agent.test.ts`
- Modify: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Modify: `src/app/play/runtime.test.ts`
- Modify: `src/app/api/play/gossipelog/route.test.ts`
- Modify: `src/agents/__tests__/agent-surface.test.ts`

### Tracking Files

- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

## Task 1: Lock the New Contracts and Reference Shape

**Files:**
- Create: `src/agents/gossipelog/references/relationship-reference.md`
- Modify: `src/agents/gossipelog/definition.ts`
- Modify: `src/types/character-relationships.ts`
- Modify: `src/types/gossipelog-skill-packets.ts`
- Modify: `src/engine/types/adapter-interface.ts`
- Test: `src/types/__tests__/character-relationships.test.ts`
- Test: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- Test: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`

- [ ] **Step 1: Write the failing schema test for relationship memory v2**

```ts
it('accepts schemaVersion 2 relationship memory edges with currentRelation and full history', () => {
  const parsed = CharacterRelationshipsFileSchema.parse({
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 2,
      storyPackage: 'sample-scene',
    },
    relationshipsBySource: {
      chr_core01: {
        targets: {
          chr_hero01: {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            currentRelation: {
              phaseId: 'phase-01-prologue',
              beatIndex: 2,
              roundId: 'round-0002',
              functionalRole: '情感锚点',
              mindsetTags: ['信任'],
              summary: '把对方视为暂时可信的支点。',
              triggerEvent: '对方替自己挡下盘问',
              reasoning: '这证明对方至少暂时站在自己这边',
              causalAction: '在众人面前替其说话',
            },
            history: [
              {
                phaseId: 'phase-01-prologue',
                beatIndex: 1,
                roundId: 'round-0001',
                functionalRole: null,
                mindsetTags: [],
                summary: '刚刚认识，开始形成注意。',
                triggerEvent: '第一次见面',
                reasoning: '需要先观察对方',
                causalAction: '记住了对方的名字',
              },
            ],
          },
        },
      },
    },
  });

  expect(parsed.relationshipsBySource.chr_core01?.targets.chr_hero01?.history).toHaveLength(1);
});
```

- [ ] **Step 2: Write the failing contract test for gossipelog memory updates**

```ts
it('accepts gossipelog update results that emit memoryUpdates instead of edgeUpdates', () => {
  const parsed = GossipelogUpdateResultSchema.parse({
    involvedRoleIds: ['chr_core01', 'chr_hero01'],
    invocationNoOp: false,
    memoryUpdates: [
      {
        sourceRoleId: 'chr_core01',
        targetRoleId: 'chr_hero01',
        shouldCreateEdge: true,
        nextCurrentRelation: {
          phaseId: 'phase-01-prologue',
          beatIndex: 1,
          roundId: 'round-0001',
          functionalRole: null,
          mindsetTags: [],
          summary: '对对方留下初始印象。',
          triggerEvent: '第一次照面',
          reasoning: '需要继续观察',
          causalAction: '开始留意对方动向',
        },
      },
    ],
  });

  expect(parsed.memoryUpdates[0]?.sourceRoleId).toBe('chr_core01');
});
```

- [ ] **Step 3: Write the failing prompt-template test for resolved references**

```ts
it('renders resolved gossipelog references inside the update prompt', () => {
  const prompt = buildGossipelogUpdateUserPrompt({
    ...sampleGossipelogUpdateRequest,
    phaseId: 'phase-01-prologue',
    beatIndex: 1,
    resolvedReferences: [
      {
        referenceId: 'relationship-reference',
        injectionLabel: 'Relationship reference',
        relativePath: 'src/agents/gossipelog/references/relationship-reference.md',
        contents: '# Relationship rules',
        estimatedTokens: 20,
      },
    ],
  });

  expect(prompt).toContain('[Resolved References]');
  expect(prompt).toContain('Relationship reference');
});
```

- [ ] **Step 4: Run the contract-focused tests and confirm they fail**

Run:

```bash
npm test -- src/types/__tests__/character-relationships.test.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts
```

Expected:

- FAIL because `schemaVersion: 2`, `memoryUpdates`, `phaseId`, `beatIndex`, and `resolvedReferences` are not modeled yet.

- [ ] **Step 5: Implement the minimal type and request-contract changes**

```ts
export const RelationshipMemoryEntrySchema = z.object({
  phaseId: z.string().nullable(),
  beatIndex: z.number().int().positive().nullable(),
  roundId: z.string(),
  functionalRole: z.string().nullable(),
  mindsetTags: z.array(z.string()),
  summary: z.string(),
  triggerEvent: z.string(),
  reasoning: z.string(),
  causalAction: z.string(),
}).strict();
```

- [ ] **Step 6: Create the local gossipelog reference and register its manifest**

```ts
referenceManifestsByOperation: {
  gossipelogUpdate: [
    {
      referenceId: 'relationship-reference',
      resolverKey: 'repo-text',
      relativePath: 'src/agents/gossipelog/references/relationship-reference.md',
      loadPolicy: 'operation-scoped',
      required: true,
      injectionLabel: 'Relationship reference',
      priority: 100,
    },
  ],
},
```

- [ ] **Step 7: Re-run the contract-focused tests and confirm they pass**

Run:

```bash
npm test -- src/types/__tests__/character-relationships.test.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts
```

Expected:

- PASS with the new v2 schema and gossipelog update prompt contract.

- [ ] **Step 8: Commit the contract/reference scaffold**

```bash
git add src/agents/gossipelog/references/relationship-reference.md src/agents/gossipelog/definition.ts src/types/character-relationships.ts src/types/gossipelog-skill-packets.ts src/engine/types/adapter-interface.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/types/__tests__/character-relationships.test.ts
git commit -m "feat: add gossipelog memory contracts"
```

## Task 2: Migrate the Persisted Relationship File and Merge Logic

**Files:**
- Modify: `src/agents/gossipelog/repository.ts`
- Modify: `src/agents/gossipelog/merge.ts`
- Test: `src/agents/gossipelog/__tests__/repository.test.ts`
- Test: `src/agents/gossipelog/__tests__/merge.test.ts`

- [ ] **Step 1: Write the failing repository test for v1-to-v2 migration**

```ts
it('loads a v1 gossipelog file and returns a v2 relationship memory shape', async () => {
  await writeFile(relationshipPath, `
meta:
  fileType: character-relationships
  schemaVersion: 1
  storyPackage: ${packageName}
relationshipsBySource:
  chr_core01:
    targets:
      chr_hero01:
        sourceRoleId: chr_core01
        targetRoleId: chr_hero01
        baseline:
          state: guarded trust
          lastAbsorbedRound: round-0008
        recentDelta:
          state: trust increased after direct protection
          sourceRound: round-0009
        highlightNextPrompt: true
`, 'utf8');

  const file = await loadCharacterRelationships(packageName);

  expect(file.meta.schemaVersion).toBe(2);
  expect(file.relationshipsBySource.chr_core01?.targets.chr_hero01?.history.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Write the failing merge test for currentRelation plus history append**

```ts
it('appends the new current relation to history and replaces currentRelation', () => {
  const merged = mergeRelationshipUpdates(existingFile, {
    involvedRoleIds: ['chr_core01', 'chr_hero01'],
    invocationNoOp: false,
    memoryUpdates: [
      {
        sourceRoleId: 'chr_core01',
        targetRoleId: 'chr_hero01',
        shouldCreateEdge: false,
        nextCurrentRelation: {
          phaseId: 'phase-02-hunt',
          beatIndex: 3,
          roundId: 'round-0011',
          functionalRole: '情感锚点',
          mindsetTags: ['信任', '依赖'],
          summary: '把对方视为可靠依托。',
          triggerEvent: '对方冒险救下自己',
          reasoning: '对方用行动证明了忠诚',
          causalAction: '主动向其透露秘密',
        },
      },
    ],
  }, { heroRoleId: 'chr_hero01' });

  expect(merged.relationshipsBySource.chr_core01?.targets.chr_hero01?.currentRelation.roundId).toBe('round-0011');
  expect(merged.relationshipsBySource.chr_core01?.targets.chr_hero01?.history).toHaveLength(2);
});
```

- [ ] **Step 3: Run repository and merge tests to verify they fail**

Run:

```bash
npm test -- src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts
```

Expected:

- FAIL because repository still expects v1-only shape and merge still operates on `edgeUpdates`.

- [ ] **Step 4: Implement migration-on-read and v2-only writeback**

```ts
function migrateLegacyEdgeToMemoryEdge(edge: LegacyRelationshipEdge): RelationshipMemoryEdge {
  const history = [];

  history.push({
    phaseId: null,
    beatIndex: null,
    roundId: edge.baseline.lastAbsorbedRound,
    functionalRole: null,
    mindsetTags: [],
    summary: edge.baseline.state,
    triggerEvent: '',
    reasoning: '',
    causalAction: '',
  });

  if (edge.recentDelta) {
    history.push({
      phaseId: null,
      beatIndex: null,
      roundId: edge.recentDelta.sourceRound,
      functionalRole: null,
      mindsetTags: [],
      summary: edge.recentDelta.state,
      triggerEvent: '',
      reasoning: '',
      causalAction: '',
    });
  }

  return {
    sourceRoleId: edge.sourceRoleId,
    targetRoleId: edge.targetRoleId,
    currentRelation: history[history.length - 1]!,
    history,
  };
}
```

- [ ] **Step 5: Implement new merge semantics while preserving hero-source rejection**

```ts
if (memoryUpdate.sourceRoleId === options.heroRoleId) {
  throw new Error('hero-outgoing relationship memories are not persisted.');
}
```

- [ ] **Step 6: Re-run repository and merge tests and confirm they pass**

Run:

```bash
npm test -- src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts
```

Expected:

- PASS with v1 migration and v2 merge behavior.

- [ ] **Step 7: Commit the repository and merge upgrade**

```bash
git add src/agents/gossipelog/repository.ts src/agents/gossipelog/merge.ts src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts
git commit -m "feat: persist gossipelog relationship memory"
```

## Task 3: Wire Phase/Beat Context and Reference Through the Update Path

**Files:**
- Modify: `src/agents/gossipelog/contracts.ts`
- Modify: `src/agents/gossipelog/agent.ts`
- Modify: `src/app/play/runtime.ts`
- Modify: `src/app/api/play/gossipelog/route.ts`
- Modify: `src/engine/orchestrator.ts`
- Modify: `src/engine/api-adapter/adapter.ts`
- Modify: `src/engine/api-adapter/schema-mapper.ts`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Test: `src/agents/gossipelog/__tests__/agent.test.ts`
- Test: `src/app/play/runtime.test.ts`
- Test: `src/app/api/play/gossipelog/route.test.ts`

- [ ] **Step 1: Write the failing browser bridge test for `phaseId` and `beatIndex`**

```ts
it('posts phaseId and beatIndex through the browser gossipelog bridge', async () => {
  const fetchImpl = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      updateRequest: {},
      updateResult: { involvedRoleIds: [], invocationNoOp: true, memoryUpdates: [] },
      injectionRequest: {},
      relationshipLayer: { highlightedDeltasText: '', stableBackgroundText: '' },
    }),
  }));

  const runner = createBrowserGossipelogCycleRunner({
    adapterConfig: null,
    fetchImpl: fetchImpl as never,
  });

  await runner({
    storyPackageName: 'sample-scene',
    storyPackage: storyPackageFixture,
    acceptedBeatText: 'beat',
    roundId: 'round-1',
    phaseId: 'phase-01-prologue',
    beatIndex: 1,
  } as never);

  expect(fetchImpl).toHaveBeenCalledWith('/api/play/gossipelog', expect.objectContaining({
    body: expect.stringContaining('"phaseId":"phase-01-prologue"'),
  }));
});
```

- [ ] **Step 2: Write the failing agent test for resolved references plus phase/beat**

```ts
it('builds a gossipelog update request with resolved references and accepted beat coordinates', async () => {
  const result = await runGossipelogCycle({
    adapter,
    storyPackageName: packageName,
    storyPackage,
    acceptedBeatText: 'accepted beat text',
    roundId: 'round-0011',
    phaseId: 'phase-02-hunt',
    beatIndex: 3,
  });

  expect(result.updateRequest.phaseId).toBe('phase-02-hunt');
  expect(result.updateRequest.beatIndex).toBe(3);
  expect(result.updateRequest.resolvedReferences.length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run the runtime/update-path tests and confirm they fail**

Run:

```bash
npm test -- src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts src/app/api/play/gossipelog/route.test.ts
```

Expected:

- FAIL because the browser bridge, route, and cycle input do not carry `phaseId`, `beatIndex`, or `resolvedReferences` yet.

- [ ] **Step 4: Extend `RunGossipelogCycleInput` and browser/route payloads**

```ts
export interface RunGossipelogCycleInput {
  readonly adapter: Pick<LLMAdapter, 'gossipelogInjection' | 'gossipelogUpdate'>;
  readonly storyPackageName: string;
  readonly storyPackage: StoryPackage;
  readonly acceptedBeatText: string;
  readonly roundId: string;
  readonly phaseId: string;
  readonly beatIndex: number;
  readonly lastStableRelationshipLayer?: GossipelogInjectionResult;
}
```

- [ ] **Step 5: Pass the accepted beat coordinates from orchestrator into the gossipelog refresh**

```ts
scheduleRelationshipRefresh(
  attemptOutcome.generationResult.beatText,
  roundId,
  phasePlan.phaseId,
  stateBeforeBeat.sceneState.currentBeatIndexInPhase,
  checkpointId,
  runtimeSessionId,
);
```

- [ ] **Step 6: Load reference contents inside `runGossipelogCycle` and forward them to the update request**

```ts
const resolvedReferences = await resolveSidecarReferences({
  agentId: gossipelogAgentDefinition.agentId,
  operationKind: 'gossipelogUpdate',
  manifests: gossipelogAgentDefinition.referenceManifestsByOperation?.gossipelogUpdate ?? [],
});
```

- [ ] **Step 7: Re-run the runtime/update-path tests and confirm they pass**

Run:

```bash
npm test -- src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts src/app/api/play/gossipelog/route.test.ts
```

Expected:

- PASS with phase/beat/reference data visible end-to-end.

- [ ] **Step 8: Commit the update-path wiring**

```bash
git add src/agents/gossipelog/contracts.ts src/agents/gossipelog/agent.ts src/app/play/runtime.ts src/app/api/play/gossipelog/route.ts src/engine/orchestrator.ts src/engine/api-adapter/adapter.ts src/engine/api-adapter/schema-mapper.ts src/engine/api-adapter/prompt-templates.ts src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts src/app/api/play/gossipelog/route.test.ts
git commit -m "feat: wire gossipelog memory update context"
```

## Task 4: Keep Full History in Injection and Refresh the Sidecar Surface

**Files:**
- Modify: `src/agents/gossipelog/agent.ts`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Modify: `src/agents/agent-surface.ts`
- Test: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- Test: `src/agents/gossipelog/__tests__/agent.test.ts`
- Test: `src/agents/__tests__/agent-surface.test.ts`

- [ ] **Step 1: Write the failing injection test for current-vs-history prompt layering**

```ts
it('returns a relationship layer that separates current relation emphasis from historical trajectory', async () => {
  const result = await runGossipelogCycle({
    adapter: {
      gossipelogUpdate: async () => ({
        involvedRoleIds: ['chr_core01', 'chr_hero01'],
        invocationNoOp: false,
        memoryUpdates: [memoryUpdateFixture],
      }),
      gossipelogInjection: async () => ({
        highlightedDeltasText: '当前关系：chr_core01 -> chr_hero01 视其为情感锚点。',
        stableBackgroundText: '历史关系：phase-01 beat-1 初识；phase-02 beat-3 建立信任。',
      }),
    },
    ...cycleInput,
  });

  expect(result.relationshipLayer.highlightedDeltasText).toContain('当前关系');
  expect(result.relationshipLayer.stableBackgroundText).toContain('历史关系');
});
```

- [ ] **Step 2: Write the failing surface summary test**

```ts
it('summarizes gossipelog state as relationship memory instead of link counts', async () => {
  const items = await loadAgentSurfaceItems('__phase4-imported-package-readable-gossipelog__');
  const gossipelogItem = items.find((item) => item.agentId === 'gossipelog');

  expect(gossipelogItem?.latestStateLine).toMatch(/current relation|history|memory/i);
});
```

- [ ] **Step 3: Run the injection/surface tests and confirm they fail**

Run:

```bash
npm test -- src/engine/api-adapter/__tests__/prompt-templates.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/agents/__tests__/agent-surface.test.ts
```

Expected:

- FAIL because injection prompts and surface summaries still speak the old snapshot vocabulary.

- [ ] **Step 4: Implement the new injection prompt wording while keeping the outer `relationshipLayer` contract unchanged**

```ts
return [
  '[Current Relationships]',
  formatCurrentRelationships(request.relationshipSubgraph),
  '',
  '[Relationship History]',
  formatRelationshipHistory(request.relationshipSubgraph),
].join('\n');
```

- [ ] **Step 5: Update the surface summary to describe current relation and history coverage**

```ts
return `${trackedEdgeCount} directed relationship memory edge${trackedEdgeCount === 1 ? '' : 's'} tracked. ${historyEntryCount} history entr${historyEntryCount === 1 ? 'y' : 'ies'} retained.`;
```

- [ ] **Step 6: Re-run the injection/surface tests and confirm they pass**

Run:

```bash
npm test -- src/engine/api-adapter/__tests__/prompt-templates.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/agents/__tests__/agent-surface.test.ts
```

Expected:

- PASS with explicit current/history layering and updated surface copy.

- [ ] **Step 7: Commit the injection and surface upgrade**

```bash
git add src/agents/gossipelog/agent.ts src/engine/api-adapter/prompt-templates.ts src/agents/agent-surface.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/agents/__tests__/agent-surface.test.ts
git commit -m "feat: inject gossipelog relationship history"
```

## Task 5: Run Regression Verification and Sync Project Tracking

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Reference: `docs/superpowers/specs/2026-04-10-gossipelog-memory-reference-design.md`

- [ ] **Step 1: Run the focused gossipelog regression suite**

Run:

```bash
npm test -- src/types/__tests__/character-relationships.test.ts src/agents/gossipelog/__tests__/repository.test.ts src/agents/gossipelog/__tests__/merge.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/app/play/runtime.test.ts src/app/api/play/gossipelog/route.test.ts src/agents/__tests__/agent-surface.test.ts
```

Expected:

- PASS with all new gossipelog memory and reference behavior green.

- [ ] **Step 2: Run the route/bootstrap regression slice**

Run:

```bash
npm test -- src/app/api/play/gossipelog/route.test.ts src/app/api/play/gossipelog/bootstrap/route.test.ts
```

Expected:

- PASS and confirm the new memory/reference work did not break the previously fixed runtime alignment path.

- [ ] **Step 3: Run the app build**

Run:

```bash
npm run build
```

Expected:

- PASS with no TypeScript or Next.js build failures.

- [ ] **Step 4: Run the full test suite**

Run:

```bash
npm test
```

Expected:

- PASS.

- [ ] **Step 5: Update the project tracking files with the final implementation and verification results**

```md
- `task_plan.md`: mark implementation and verification complete
- `findings.md`: record final memory schema, migration behavior, and prompt semantics
- `progress.md`: record exact commands and outcomes
```

- [ ] **Step 6: Commit the verification and tracking sync**

```bash
git add task_plan.md findings.md progress.md
git commit -m "docs: record gossipelog memory rollout"
```

## Final Verification Checklist

- [ ] `gossipelogUpdate` loads repo-local reference content
- [ ] new gossipelog state writes `schemaVersion: 2`
- [ ] old gossipelog state migrates on read
- [ ] `phaseId + beatIndex + roundId` reach the update request
- [ ] non-hero directed memories append full history
- [ ] `relationshipLayer` distinguishes current relation from historical trajectory
- [ ] editor sidecar surface summarizes memory state rather than link count only
- [ ] `npm run build` passes
- [ ] `npm test` passes
