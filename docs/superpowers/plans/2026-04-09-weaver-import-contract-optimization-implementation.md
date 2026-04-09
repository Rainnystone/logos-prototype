# Weaver Import Contract Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 强化 `weaver` 的 model-facing import contract 与 heavy reference，让自由文本导入时更容易抽到正确结构、更不容易把脏 shape 送进 deterministic seed-mapping，同时保持局部缺失非阻塞。

**Architecture:** 这轮不改 `weaver` 的系统角色、不拆 skill、不改 UI。实现只围绕一条轻量中间 contract 展开：以 `src/types/weaver.ts` 作为 canonical shared contract anchor，同步收紧 reference、prompt、provider-facing response schema mirror、parser projection 和 deterministic import-seed mapping，让它们描述同一套轻量但明确的 seed shape。`warnings` / `unresolvedGaps` 继续保留为兼容字段，但不再作为 prompt/reference 的主强调点，也不引入新的 author-facing reminder 流程。

**Tech Stack:** Next.js 15, React 19, TypeScript, Zod, Vitest, Testing Library

---

## Explicit Non-Goals

- 不改 `weaver` 的 sidecar 架构，不拆 skill，不新增 skill。
- 不改 `agent 管理` 页、故事包创建 UI、导入交互流程或任何其它 UI/UX surface。
- 不改 package creation 的 deterministic scaffold / create path。
- 不把 `weaver` 扩成“导入到现有 package”。
- 不把 `weaver` 变成最终 authoring schema writer。

## File Map

- Modify: `src/types/weaver.ts`
  - 冻结轻量中间 import contract；把 inner seed shape 从 passthrough object 提升成明确但轻量的 object schema。
- Modify: `src/types/__tests__/type-conformance.test.ts`
  - 锁住 shared contract 的 required/optional 行为、最小 shape、兼容字段语义。
- Modify: `src/agents/weaver/references/import-reference.md`
  - 把 heavy reference 从原则型说明升级成字段映射、bounded extraction 规则与 extraction examples。
- Modify: `src/engine/api-adapter/prompt-templates.ts`
  - 收紧 `weaver` prompt 的 `[Instructions]` 与 `[Output Contract]`，明确“尽量多抽，但最小 shape 是保底，不是目标”。
- Modify: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
  - 锁住 `weaver` prompt 是否表达了正确 contract 与 extraction guidance。
- Modify: `src/engine/api-adapter/schema-mapper.ts`
  - 维护 provider-facing `weaver` response schema mirror，使其和 shared contract 锚点保持同步。
- Modify: `src/engine/api-adapter/response-parsers.ts`
  - 让 parser 作为 shared contract 的 projection，而不是另一份宽松壳或第二个域 owner。
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
  - 锁住 provider response format 的字段、required keys 和 inner object descriptions。
- Modify: `src/engine/api-adapter/__tests__/response-parsers.test.ts`
  - 锁住 parser 对轻量 contract 的接受/拒绝边界。
- Modify: `src/story-packages/import-seed.ts`
  - 同步 deterministic seed-mapping，让 name-only `npcCharacters` 等最小 shape 在代码里真实成立，而不是只存在于文档中。
- Modify: `src/story-packages/__tests__/import-seed.test.ts`
  - 锁住 sparse-but-valid payload 和 name-only fallback 的 mapping 行为。
- Modify: `src/agents/weaver/__tests__/agent.test.ts`
  - 锁住 `runWeaverImport()` 返回的 payload / summary 继续与 shared contract 对齐。
- Modify: `task_plan.md`
  - 将当前 track 切到 `weaver` import contract 优化 implementation plan。
- Modify: `progress.md`
  - 记录 plan、review 和当前 worktree 基线已恢复干净。
- Modify: `findings.md`
  - 记录为什么这轮优化只改 reference/contract layers，不扩成 UI 或系统重构。

## Execution Mode

- 本计划默认按 `subagent-driven-development` 串行执行。
- 原因：这轮的共享主轴是同一套 `weaver` contract，`src/types/weaver.ts`、`schema-mapper.ts`、`response-parsers.ts` 和 `import-seed.ts` 会互相依赖，默认不适合并行写代码。
- 可并行的 only-read packet 仅限 reviewer；写代码 packet 默认串行推进并在每个 packet 后 review。

## Task 1: Freeze the Shared Lightweight Weaver Contract

**Files:**
- Modify: `src/types/weaver.ts`
- Modify: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`

- [x] **Step 1: 先写 shared contract 的失败测试**

```ts
expect(
  types.WeaverImportPayloadSchema.parse({
    sourceSummary: 'source summary',
    importSummary: 'import summary',
    openingHook: 'opening hook',
    worldBase: {
      settingSummary: 'setting',
      worldRules: 'rules',
    },
    hero: {
      displayName: 'Hero',
    },
    coreCast: [{ displayName: 'Core One' }],
    antagonists: [{ displayName: 'Antagonist One' }],
    npcCharacters: [{ displayName: 'NPC One' }],
    locations: [{ displayName: 'Harbor District' }],
    warnings: [],
    unresolvedGaps: [],
  }),
).toMatchObject({
  hero: { displayName: 'Hero' },
  npcCharacters: [{ displayName: 'NPC One' }],
});
```

- [x] **Step 2: 再写应该失败的 shape 边界测试**

```ts
expect(() =>
  types.WeaverImportPayloadSchema.parse({
    sourceSummary: 'source summary',
    importSummary: 'import summary',
    openingHook: 'opening hook',
    worldBase: {},
    coreCast: [{}],
    antagonists: [],
    npcCharacters: [],
    locations: [],
    warnings: [],
    unresolvedGaps: [],
  }),
).toThrow();

expect(
  types.WeaverImportPayloadSchema.parse({
    suggestedPackageName: 'weaver-pack',
    sourceSummary: 'source summary',
    importSummary: 'import summary',
    openingHook: 'model-side extracted hook',
    worldBase: {},
    coreCast: [],
    antagonists: [],
    npcCharacters: [],
    locations: [],
    warnings: [],
    unresolvedGaps: [],
  }),
).toMatchObject({
  suggestedPackageName: 'weaver-pack',
  openingHook: 'model-side extracted hook',
});
```

- [x] **Step 3: 运行单测并确认它先失败**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts`
Expected: FAIL，因为当前 contract 仍接受 broad passthrough object，而不是要求 `displayName` 等轻量字段。

- [x] **Step 4: 在 `src/types/weaver.ts` 实现最小但明确的 inner schemas**

Implementation target:

```ts
const WeaverWorldBaseSeedSchema = z
  .object({
    settingSummary: z.string().trim().min(1).optional(),
    worldRules: z.string().trim().min(1).optional(),
    toneBaseline: z.string().trim().min(1).optional(),
    locationPatch: z.string().trim().min(1).optional(),
    npcCharactersSummary: z.string().trim().min(1).optional(),
  })
  .strict();

const WeaverNamedSeedSchema = z
  .object({
    displayName: z.string().trim().min(1),
    roleSummary: z.string().trim().min(1).optional(),
  })
  .strict();

const WeaverNpcSeedSchema = z
  .object({
    displayName: z.string().trim().min(1),
    summary: z.string().trim().min(1).optional(),
    roleSummary: z.string().trim().min(1).optional(),
  })
  .strict();

const WeaverLocationSeedSchema = z
  .object({
    displayName: z.string().trim().min(1),
    summary: z.string().trim().min(1).optional(),
  })
  .strict();

export {
  WeaverWorldBaseSeedSchema,
  WeaverNamedSeedSchema,
  WeaverNpcSeedSchema,
  WeaverLocationSeedSchema,
};
```

- [x] **Step 5: 保留兼容字段，但不要扩大它们的职责**

Implementation target:

```ts
warnings: z.array(z.string().trim().min(1)),
unresolvedGaps: z.array(z.string().trim().min(1)),
```

说明：这两个字段暂时继续保留在 transport/shared contract 中，避免系统性变更；后续优化只是不再把它们作为 reference/prompt 的主强调点。

- [x] **Step 6: 重新运行 contract 单测并确认通过**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts`
Expected: PASS

- [x] **Step 7: 提交 shared contract packet**

```bash
git add src/types/weaver.ts src/types/__tests__/type-conformance.test.ts
git commit -m "refactor: freeze weaver import seed contract"
```

## Task 2: Strengthen the Heavy Reference and Prompt Contract

**Files:**
- Modify: `src/agents/weaver/references/import-reference.md`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Modify: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- Test: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`

- [x] **Step 1: 为 `weaver` prompt 新增失败测试，锁住正确 guidance**

```ts
const prompt = buildWeaverImportUserPrompt(sampleWeaverImportRequest);

expect(prompt).toContain('attempt the fullest bounded extraction the text can support');
expect(prompt).toContain('minimal shapes are fallback floors, not the preferred target');
expect(prompt).toContain('worldBase is a lightweight seed object');
expect(prompt).toContain('suggestedPackageName is only a display-name suggestion');
expect(prompt).toContain('persisted scene openingHook still comes from the original source text');
expect(prompt).toContain('npcCharacters[]: displayName required; summary and roleSummary optional');
expect(prompt).not.toContain('Keep uncertainty bounded via warnings and unresolved gaps.');
```

- [x] **Step 2: 运行 prompt 单测并确认先失败**

Run: `npm test -- src/engine/api-adapter/__tests__/prompt-templates.test.ts`
Expected: FAIL，因为当前 `weaver` prompt 仍然只列顶层 keys，并把 `warnings/unresolvedGaps` 当主 guidance。

- [x] **Step 3: 改写 heavy reference，不要让它变成“鼓励偷懒”的 escape hatch**

Implementation target:

```md
- prefer fuller bounded extraction over sparse shells
- use name-only only when the source truly cannot support richer detail
- worldBase is a lightweight seed object with settingSummary / worldRules / toneBaseline / locationPatch / npcCharactersSummary
- include one manuscript-style extraction example and one minimal-fallback example
```

- [x] **Step 4: 同步改 `buildWeaverImportUserPrompt()` 的 contract 文案**

Implementation target:

```ts
'[Instructions]',
'Extract the fullest bounded bootstrap structure the source text can support.',
'Do not invent facts, but do not stop at minimal shapes when richer evidence-backed extraction is available.',
'Minimal shapes are fallback floors, not the preferred target.',
...
'[Output Contract]',
'Return JSON only and do not add extra keys.',
'suggestedPackageName: optional display-name suggestion only; deterministic code still owns final package slug/identity.',
'openingHook: extracted comparison field only; persisted scene openingHook still comes from the original sourceText.',
'worldBase: lightweight seed object with settingSummary?, worldRules?, toneBaseline?, locationPatch?, npcCharactersSummary?',
'hero: optional object with displayName required and roleSummary optional',
'coreCast / antagonists: arrays of objects with displayName required and roleSummary optional',
'npcCharacters: array of objects with displayName required and summary?/roleSummary? optional',
'locations: array of objects with displayName required and summary? optional',
'warnings / unresolvedGaps: compatibility fields only; use them sparingly and do not prefer them over extraction',
```

- [x] **Step 5: 重新运行 prompt 单测并确认通过**

Run: `npm test -- src/engine/api-adapter/__tests__/prompt-templates.test.ts`
Expected: PASS

- [x] **Step 6: 提交 prompt/reference packet**

```bash
git add src/agents/weaver/references/import-reference.md src/engine/api-adapter/prompt-templates.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts
git commit -m "docs: strengthen weaver import guidance"
```

## Task 3: Align Provider Response Schema and Parser to the Shared Contract

**Files:**
- Modify: `src/engine/api-adapter/schema-mapper.ts`
- Modify: `src/engine/api-adapter/response-parsers.ts`
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Modify: `src/engine/api-adapter/__tests__/response-parsers.test.ts`
- Test: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Test: `src/engine/api-adapter/__tests__/response-parsers.test.ts`

- [x] **Step 1: 先写 provider response format 的失败测试**

```ts
const request = mapForWeaverImport(sampleWeaverImportRequest, 'openai-compatible');
const responseSchema = request.responseFormat?.schema;

expect(responseSchema.properties.worldBase).toMatchObject({
  type: 'object',
  additionalProperties: false,
});
expect(responseSchema.properties.hero.required).toContain('displayName');
expect(responseSchema.properties.coreCast.items.properties.displayName.type).toBe('string');
expect(responseSchema.properties.antagonists.items.required).toContain('displayName');
expect(responseSchema.properties.npcCharacters.items.required).toContain('displayName');
expect(responseSchema.properties.locations.items.required).toContain('displayName');
```

- [x] **Step 2: 再写 parser 的失败测试**

```ts
expect(
  parseWeaverImportResult(
    JSON.stringify({
      sourceSummary: 'source',
      importSummary: 'summary',
      openingHook: 'hook',
      worldBase: {},
      coreCast: [{}],
      antagonists: [],
      npcCharacters: [],
      locations: [],
      warnings: [],
      unresolvedGaps: [],
    }),
  ),
).toThrow(/weaverImport/i);
```

- [x] **Step 3: 运行 targeted tests 并确认它们先失败**

Run: `npm test -- src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts`
Expected: FAIL，因为当前 provider schema 与 parser 仍使用 broad passthrough object。

- [x] **Step 4: 在 `schema-mapper.ts` 中把 `weaver` response schema 投影成轻量 inner contract**

Implementation target:

```ts
worldBase: {
  type: 'object',
  additionalProperties: false,
  properties: {
    settingSummary: { type: 'string', description: '...' },
    worldRules: { type: 'string', description: '...' },
    toneBaseline: { type: 'string', description: '...' },
    locationPatch: { type: 'string', description: '...' },
    npcCharactersSummary: { type: 'string', description: '...' },
  },
},
coreCast: {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['displayName'],
    properties: {
      displayName: { type: 'string', description: '...' },
      roleSummary: { type: 'string', description: '...' },
    },
  },
},
hero: {
  type: 'object',
  additionalProperties: false,
  required: ['displayName'],
  properties: {
    displayName: { type: 'string', description: '...' },
    roleSummary: { type: 'string', description: '...' },
  },
},
antagonists: {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['displayName'],
    properties: {
      displayName: { type: 'string', description: '...' },
      roleSummary: { type: 'string', description: '...' },
    },
  },
},
npcCharacters: {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['displayName'],
    properties: {
      displayName: { type: 'string', description: '...' },
      summary: { type: 'string', description: '...' },
      roleSummary: { type: 'string', description: '...' },
    },
  },
},
locations: {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['displayName'],
    properties: {
      displayName: { type: 'string', description: '...' },
      summary: { type: 'string', description: '...' },
    },
  },
},
```

- [x] **Step 5: 在 `response-parsers.ts` 中使用与 shared contract 一致的 inner schema**

Implementation target:

```ts
const WeaverImportResultResponseSchema = WeaverImportPayloadSchema.extend({
  usage: UsageInfoSchema.optional(),
}).strict();
```

如果直接复用 shared schema 不方便，至少要通过同一套 exported inner schemas 组装，而不是再维护第三套 passthrough shape。

- [x] **Step 6: 重新运行 targeted tests 并确认通过**

Run: `npm test -- src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts`
Expected: PASS

- [x] **Step 7: 提交 adapter contract packet**

```bash
git add src/engine/api-adapter/schema-mapper.ts src/engine/api-adapter/response-parsers.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts
git commit -m "refactor: align weaver adapter contract"
```

## Task 4: Make Deterministic Seed Mapping Honor Sparse-but-Valid Extraction

**Files:**
- Modify: `src/story-packages/import-seed.ts`
- Modify: `src/story-packages/__tests__/import-seed.test.ts`
- Modify: `src/agents/weaver/__tests__/agent.test.ts`
- Test: `src/story-packages/__tests__/import-seed.test.ts`
- Test: `src/agents/weaver/__tests__/agent.test.ts`

- [x] **Step 1: 写 name-only `npcCharacters` fallback 的失败测试**

```ts
const result = applyTextImportSeed({
  ...baseInput,
  payload: createWeaverPayload({
    npcCharacters: [{ displayName: '老码头守夜人' }],
  }),
});

expect(result.worldBase.npcCharacters).toContain('老码头守夜人');
```

- [x] **Step 2: 再写 sparse-but-valid payload 的失败测试**

```ts
const result = applyTextImportSeed({
  ...baseInput,
  payload: createWeaverPayload({
    worldBase: { settingSummary: '近未来沿海都市' },
    hero: { displayName: '林深' },
    coreCast: [{ displayName: '周珂' }],
    antagonists: [],
    npcCharacters: [],
    locations: [{ displayName: '灯塔塔区' }],
  }),
});

expect(result.worldBase.hero.name).toBe('林深');
expect(result.worldBase.hero.characterSummary).toBe(baseWorldBase.hero.characterSummary);
expect(result.worldBase.coreCast[0]?.name).toBe('周珂');
expect(result.worldBase.locations[0]?.name).toBe('灯塔塔区');
```

- [x] **Step 3: 运行 targeted tests 并确认先失败**

Run: `npm test -- src/story-packages/__tests__/import-seed.test.ts src/agents/weaver/__tests__/agent.test.ts`
Expected: FAIL，因为当前 `npcCharacters` name-only shape 不会被 deterministic mapping 消费。

- [x] **Step 4: 在 `import-seed.ts` 中补上 bounded fallback，不增加新的 UI 或 author-facing behavior**

Implementation target:

```ts
return (
  readString(seedObject.summary) ??
  readString(seedObject.roleSummary) ??
  readString(seedObject.displayName)
);
```

并保持其它规则不变：

```ts
// openingHook persisted source of truth still comes from sourceText
// sparse arrays remain valid
// richer extracted roleSummary/summary still overrides fallback defaults
```

- [x] **Step 5: 让 `agent.test.ts` 的 sample payload 继续与 shared contract 对齐**

Implementation target:

```ts
npcCharacters: [
  {
    displayName: '值班维修技师',
    summary: '受事故波及的值班员与维修技师',
  },
],
```

- [x] **Step 6: 重新运行 targeted tests 并确认通过**

Run: `npm test -- src/story-packages/__tests__/import-seed.test.ts src/agents/weaver/__tests__/agent.test.ts`
Expected: PASS

- [x] **Step 7: 提交 deterministic mapping packet**

```bash
git add src/story-packages/import-seed.ts src/story-packages/__tests__/import-seed.test.ts src/agents/weaver/__tests__/agent.test.ts
git commit -m "fix: honor sparse weaver import payloads"
```

## Task 5: Final Verification and Documentation Sync

**Files:**
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/engine/api-adapter/__tests__/prompt-templates.test.ts`
- Test: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Test: `src/engine/api-adapter/__tests__/response-parsers.test.ts`
- Test: `src/story-packages/__tests__/import-seed.test.ts`
- Test: `src/agents/weaver/__tests__/agent.test.ts`

- [x] **Step 1: 运行 `weaver` 相关 targeted verification 集**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts src/story-packages/__tests__/import-seed.test.ts src/agents/weaver/__tests__/agent.test.ts`
Expected: PASS

- [x] **Step 2: 运行全量测试**

Run: `npm test`
Expected: PASS with `90` test files and `755` tests unless the suite count changes for legitimate new tests.

- [x] **Step 3: 运行生产构建验证**

Run: `npm run build`
Expected: PASS

- [x] **Step 4: 同步仓库级追踪文件**

Update targets:

```md
docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md -> approved implementation plan file already committed
task_plan.md   -> active track switched to weaver import contract optimization implementation
progress.md    -> record each task completion and verification
findings.md    -> freeze final boundary: no system redesign, no UI/UX expansion, reference/contract alignment only
```

- [x] **Step 5: 做格式检查**

Run: `git diff --check`
Expected: PASS

- [x] **Step 6: 提交收尾 packet**

```bash
git add docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md task_plan.md progress.md findings.md
git commit -m "docs: record weaver contract optimization delivery"
```

## Reviewer Focus

- 优先看 plan 有没有偷偷把范围扩成 `weaver` 重构、UI 变更或新的提醒机制。
- 确认每个 packet 都只有一个主目标和一条主验证路径，没有把 prompt、schema、mapping、UI 混成一个任务。
- 确认 `warnings` / `unresolvedGaps` 被当成兼容字段，而不是这轮优化的主产物。
- 确认 `name-only` 规则不只写在 reference 里，而是明确要求同步 deterministic mapping 和测试。
