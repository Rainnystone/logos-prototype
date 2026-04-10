# Gossipelog Runtime Alignment Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `gossipelog` runtime / bootstrap route 的 storyline variant 错位，以及 `PlayWorkbench` 与 engine gossipelog timeout/fallback 语义不一致导致的输入永久锁定问题。

**Architecture:** 保持现有 orchestrator gossipelog sub-loop 与 package-owned relationship state 设计不变，只修两条边界：一是让 `/api/play/gossipelog` 与 `/api/play/gossipelog/bootstrap` 都和 active storyline authored root 对齐，二是让 `PlayWorkbench` 的输入锁引用 `src/agents/gossipelog/runtime-contract.ts` 中与 engine 相同的等待预算，并在超时后允许继续使用上一份稳定关系层进入下一 beat。

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Testing Library

**Execution Status (2026-04-10):**
- Task 1 completed
- Task 2 through Task 5 completed
- Task 6 verification completed with targeted tests, `npm run test:core`, `npm run build`, and full `npm test`

---

## Spec Reference

- `docs/superpowers/specs/2026-04-10-gossipelog-runtime-alignment-design.md`

## Explicit Non-Goals

- 不改 `gossipelog` 的 package-owned state 持久化位置
- 不引入 reference / prompt / memory schema 升级
- 不重写 orchestrator 主循环
- 不新增 agent 管理 UI

## File Map

- Modify: `src/app/api/play/gossipelog/route.ts`
  - 让 gossipelog runtime route 读取 active storyline authored root，而不是 package 基线。
- Modify: `src/app/api/play/gossipelog/bootstrap/route.ts`
  - 让 gossipelog bootstrap route 也读取 active storyline authored root，而不是 package 基线。
- Modify: `src/agents/gossipelog/bootstrap.ts`
  - 让 bootstrap helper 接收并传递 `authoredRootOverride`，确保首次启动路径真正按 storyline variant 读取 runtime story package。
- Modify: `src/app/play/PlayWorkbench.tsx`
  - 让输入锁与 engine gossipelog wait budget 对齐，避免永久锁定。
- Modify: `src/engine/orchestrator.ts`
  - 从共享位置读取 gossipelog wait budget，避免与 UI 漂移。
- Create: `src/agents/gossipelog/runtime-contract.ts`
  - 存放 gossipelog refresh wait budget 等共享运行合同常量。
- Modify: `src/app/__tests__/play.test.tsx`
  - 为 UI 锁与 timeout 后解锁补回归测试。
- Modify: `src/engine/__tests__/orchestrator.test.ts`
  - 如有必要，让 orchestrator 测试改为引用共享预算常量。
- Create or Modify: `src/app/api/play/gossipelog/route.test.ts`
  - 为 storyline variant 对齐补 route 级失败测试。
- Create or Modify: `src/app/api/play/gossipelog/bootstrap/route.test.ts`
  - 为 bootstrap storyline variant 对齐补 route 级失败测试。
- Modify: `src/agents/gossipelog/__tests__/agent.test.ts`
  - 为 bootstrap helper 的 `authoredRootOverride` 传递补失败测试，避免只修 route 顶层但 helper 仍读错 package。
- Modify: `task_plan.md`
  - 记录实现开始与状态变化。
- Modify: `findings.md`
  - 记录修复后的最终边界。
- Modify: `progress.md`
  - 记录 TDD、验证与 review 结果。

## Execution Mode

- 本计划按 `subagent-driven-development` 串行执行写代码任务。
- Task 1 与 Task 2 都会改 runtime 相关合同和测试，不适合并行写入。
- reviewer subagent 可以串行参与 spec compliance review 与 code quality review。

## Task 1: Lock the Storyline-Variant Bugs With Failing Route Tests

**Files:**
- Create or Modify: `src/app/api/play/gossipelog/route.test.ts`
- Create or Modify: `src/app/api/play/gossipelog/bootstrap/route.test.ts`
- Modify: `src/agents/gossipelog/bootstrap.ts`
- Modify: `src/agents/gossipelog/__tests__/agent.test.ts`
- Reference: `src/app/api/play/gossipelog/route.ts`
- Reference: `src/app/api/play/gossipelog/bootstrap/route.ts`
- Reference: `src/app/play/page.tsx`
- Reference: `src/storylines/substrate.ts`

- [ ] **Step 1: 写 route 级失败测试，证明 gossipelog route 当前没有读取 active storyline authored root**

```ts
it('loads the active storyline authored root before running the gossipelog cycle', async () => {
  // arrange a storyline variant whose authoredRoot differs from the base package
  // invoke POST /api/play/gossipelog
  // assert loadRuntimeStoryPackage receives authoredRootOverride from active storyline context
});
```

- [ ] **Step 2: 运行单测并确认它先失败**

Run: `npm test -- src/app/api/play/gossipelog/route.test.ts`
Expected: FAIL because the route currently loads the base package runtime story package directly.

- [ ] **Step 3: 写 bootstrap route 级失败测试，证明首次启动路径也没有读取 active storyline authored root**

```ts
it('passes the active storyline authored root into the bootstrap helper before first-play gossipelog bootstrap', async () => {
  // arrange a storyline variant whose authoredRoot differs from the base package
  // invoke POST /api/play/gossipelog/bootstrap
  // assert bootstrapGossipelogFromWeaverSummary receives authoredRootOverride from active storyline context
});
```

- [ ] **Step 4: 运行 bootstrap 单测并确认它先失败**

Run: `npm test -- src/app/api/play/gossipelog/bootstrap/route.test.ts`
Expected: FAIL because the bootstrap route currently loads the base package runtime story package directly.

- [ ] **Step 5: 写 helper 级失败测试，证明 bootstrap helper 目前不会把 authoredRootOverride 传给 runtime story package loader**

```ts
it('loads the runtime story package from the provided authoredRootOverride during bootstrap', async () => {
  // call bootstrapGossipelogFromWeaverSummary with authoredRootOverride
  // spy on loadRuntimeStoryPackage
  // expect authoredRootOverride to be forwarded into the loader call
});
```

- [ ] **Step 6: 运行 helper 单测并确认它先失败**

Run: `npm test -- src/agents/gossipelog/__tests__/agent.test.ts`
Expected: FAIL because bootstrap helper currently loads the base package runtime story package directly.

- [ ] **Step 7: 在 gossipelog route 与 bootstrap route / helper 中接入 active storyline context，并把 authoredRootOverride 一路传给 runtime story package loader**

Implementation target:

```ts
const storylineContext = await resolveActiveStorylineContext(storyPackageName, { forWrite: false });
const storyPackage = await loadRuntimeStoryPackage(storyPackageName, {
  authoredRootOverride: storylineContext.authoredRoot,
});
```

Bootstrap path implementation target:

```ts
await bootstrapGossipelogFromWeaverSummary({
  storyPackageName,
  weaverSummary,
  relationshipState,
  adapter: createAPIAdapter(adapterConfig),
  authoredRootOverride: storylineContext.authoredRoot,
});
```

- [ ] **Step 8: 再跑 route 与 helper 单测确认通过**

Run:

```bash
npm test -- src/app/api/play/gossipelog/route.test.ts
npm test -- src/app/api/play/gossipelog/bootstrap/route.test.ts
npm test -- src/agents/gossipelog/__tests__/agent.test.ts
```

Expected: PASS

- [ ] **Step 9: 补最小回归断言，证明两个入口的 response shape 和 bootstrap helper 成功路径都没有被这次修复改坏**

```ts
it('preserves the gossipelog bridge response contract after storyline alignment', async () => {
  // assert the route still returns the existing cycle result shape
});
```

- [ ] **Step 10: 运行相关测试文件，确认全部 green**

Run:

```bash
npm test -- src/app/api/play/gossipelog/route.test.ts
npm test -- src/app/api/play/gossipelog/bootstrap/route.test.ts
npm test -- src/agents/gossipelog/__tests__/agent.test.ts
```

Expected: PASS with all route assertions green.

- [ ] **Step 11: 提交 Task 1**

```bash
git add src/app/api/play/gossipelog/route.ts src/app/api/play/gossipelog/bootstrap/route.ts src/agents/gossipelog/bootstrap.ts src/app/api/play/gossipelog/route.test.ts src/app/api/play/gossipelog/bootstrap/route.test.ts src/agents/gossipelog/__tests__/agent.test.ts
git commit -m "fix: align gossipelog routes with active storyline variant"
```

## Task 2: Lock the UI/Engine Wait-Contract Drift With Failing Tests

**Files:**
- Modify: `src/app/__tests__/play.test.tsx`
- Reference: `src/app/play/PlayWorkbench.tsx`
- Reference: `src/engine/orchestrator.ts`

- [ ] **Step 1: 写失败测试，证明 gossipelog pending 初期会锁住输入**

```tsx
it('keeps player input locked while gossipelog settlement is still within the wait budget', async () => {
  // render PlayWorkbench with a pending gossipelogCycleRunner
  // complete one accepted beat
  // assert option buttons, textarea, and submit remain disabled before timeout
});
```

- [ ] **Step 2: 运行单测并确认这条测试反映当前行为**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: PASS or FAIL depending on current regression surface, but the test must accurately capture pre-timeout lock behavior.

- [ ] **Step 3: 再写失败测试，证明超出 gossipelog wait budget 后输入会重新可用**

```tsx
it('re-enables player input after the gossipelog wait budget expires', async () => {
  // render with a gossipelog cycle that never settles
  // finish one accepted beat
  // advance fake timers past the shared wait budget
  // expect controls to become enabled again
});
```

- [ ] **Step 4: 运行测试并确认它先失败**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: FAIL because current PlayWorkbench keeps input disabled until the promise settles.

- [ ] **Step 5: 再写失败测试，证明 timeout 后继续下一 beat 仍沿用上一份稳定关系层**

```tsx
it('continues to the next beat after timeout using the last stable relationship layer', async () => {
  // keep gossipelog pending
  // let timeout unlock the UI
  // submit the next action
  // assert the next beat can run without waiting forever
});
```

- [ ] **Step 6: 运行测试并确认它先失败**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: FAIL because current UI never unlocks, so the next beat cannot be submitted.

- [ ] **Step 7: 写一条失败测试，证明晚到的 finalize 不会重新把页面锁死或抹掉已接受表面**

```tsx
it('keeps the accepted surface stable when a late gossipelog finalize eventually resolves', async () => {
  // timeout unlocks input first
  // late finalize settles afterward
  // assert no return to initializing, no re-lock, no accepted surface loss
});
```

- [ ] **Step 8: 运行 play 测试并确认新增超时相关测试处于 red**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: The timeout-unlock / next-beat / late-finalize tests FAIL before implementation.

- [ ] **Step 9: 提交纯测试红灯状态不可行，因此记录失败结果到 progress.md，暂不提交**

Implementation note:

```md
在 progress.md 中记下哪几条测试按预期先失败，作为 TDD 证据。
```

## Task 3: Implement the Shared Gossipelog Wait Contract

**Files:**
- Create: `src/agents/gossipelog/runtime-contract.ts`
- Modify: `src/engine/orchestrator.ts`
- Modify: `src/app/play/PlayWorkbench.tsx`
- Optionally Modify: `src/engine/__tests__/orchestrator.test.ts`
- Optionally Modify: `src/app/__tests__/play.test.tsx`

- [ ] **Step 1: 新建共享运行合同文件，定义 gossipelog refresh wait budget**

Implementation target:

```ts
export const GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS = 2_000;
```

- [ ] **Step 2: 让 orchestrator 改为引用共享常量，而不是保留私有 magic number**

Implementation target:

```ts
import { GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS } from '@/agents/gossipelog/runtime-contract';
```

- [ ] **Step 3: 若测试依赖固定常量，更新 orchestrator 测试引用**

Run: `npm test -- src/engine/__tests__/orchestrator.test.ts`
Expected: PASS

- [ ] **Step 4: 让 PlayWorkbench 改为引用同一个共享常量，而不是复制超时值**

Implementation target:

```ts
import { GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS } from '@/agents/gossipelog/runtime-contract';
```

- [ ] **Step 5: 若 UI 测试依赖 timer 推进，更新测试以引用同一份共享预算**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: tests compile and timer assumptions stay aligned with the shared contract.

- [ ] **Step 6: 提交 Task 3**

```bash
git add src/agents/gossipelog/runtime-contract.ts src/engine/orchestrator.ts src/app/play/PlayWorkbench.tsx src/engine/__tests__/orchestrator.test.ts src/app/__tests__/play.test.tsx
git commit -m "refactor: share gossipelog wait contract"
```

## Task 4: Implement PlayWorkbench Timeout-Aligned Unlocking

**Files:**
- Modify: `src/app/play/PlayWorkbench.tsx`
- Modify: `src/app/__tests__/play.test.tsx`
- Reference: `src/app/components/PlayerInput.tsx`
- Reference: `src/app/play/runtime.ts`

- [ ] **Step 1: 在 PlayWorkbench 中把“后台仍有 pending sync”与“输入必须继续锁住”拆开**

Implementation target:

```ts
const [isRelationshipSyncBlockingInput, setIsRelationshipSyncBlockingInput] = useState(false);
```

- [ ] **Step 2: 为 gossipelog pending window 增加与共享 wait budget 对齐的 timeout 释放机制**

Implementation target:

```ts
setIsRelationshipSyncBlockingInput(true);
const timeoutId = setTimeout(() => {
  setIsRelationshipSyncBlockingInput(false);
}, GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS);
```

- [ ] **Step 3: 确保 promise 正常提前 settle 时会清理 timeout，并保持原本的 finalize 队列逻辑**

Implementation target:

```ts
// clear timeout on resolve/reject/finalize
// keep pending sync bookkeeping for late finalize
```

- [ ] **Step 4: 让 `isInputLoading` 依赖新的 blocking 状态，而不是无限期依赖所有 pending sync**

Implementation target:

```ts
const isInputLoading =
  status === 'initializing' ||
  status === 'generating' ||
  status === 'auditing' ||
  status === 'rewriting' ||
  isRelationshipSyncBlockingInput ||
  isHydratingWorkbench;
```

- [ ] **Step 5: 跑 play 测试文件，确认 Task 2 的超时解锁测试转绿**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: PASS for timeout-unlock behavior.

- [ ] **Step 6: 再跑 orchestrator 测试，确认没有破坏 engine 现有 timeout/fallback 语义**

Run: `npm test -- src/engine/__tests__/orchestrator.test.ts`
Expected: PASS

- [ ] **Step 7: 提交 Task 4**

```bash
git add src/app/play/PlayWorkbench.tsx src/app/__tests__/play.test.tsx
git commit -m "fix: align play workbench lock with gossipelog timeout"
```

## Task 5: Prevent Late Finalization Failure From Reverting Newer Relationship Truth

**Files:**
- Modify: `src/engine/orchestrator.ts`
- Modify: `src/engine/__tests__/orchestrator.test.ts`

- [ ] **Step 1: 写失败测试，证明一个已经 timeout 的旧 refresh 晚到并在 finalization 阶段失败时，不会把更新后的 `queuedRelationshipLayer` 回滚掉**

```ts
it('does not roll back newer relationship truth when a timed-out refresh later fails during finalization', async () => {
  // let the first refresh time out
  // accept a newer beat so checkpoint / live queued truth move forward
  // then resolve the old refresh and force finalizeRelationshipLayer to fail
  // assert queuedRelationshipLayer still reflects the newer accepted truth
});
```

- [ ] **Step 2: 运行 orchestrator 测试并确认这条新用例先失败**

Run: `npm test -- src/engine/__tests__/orchestrator.test.ts`
Expected: FAIL because current code caches checkpoint binding before awaiting finalization persistence.

- [ ] **Step 3: 在 `orchestrator` 中把“是否仍代表当前 checkpoint”判断放到真正需要回滚或写入 live truth 的时点重新计算，而不是在 await 前缓存**

Implementation target:

```ts
const shouldRestoreFallback = isCurrentCheckpointBinding(refresh);
```

Applied only at the catch / live-truth application point after `await finalizeRelationshipLayer(...)` returns or throws.

- [ ] **Step 4: 再跑 orchestrator 测试，确认新回归用例与现有 timeout/fallback 语义一起转绿**

Run: `npm test -- src/engine/__tests__/orchestrator.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 Task 5**

```bash
git add src/engine/orchestrator.ts src/engine/__tests__/orchestrator.test.ts
git commit -m "fix: preserve newer relationship truth after late finalize failure"
```

## Task 6: Run Focused Regression Verification and Sync Planning Files

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: 跑 route、play、orchestrator 三组 targeted tests**

Run:

```bash
npm test -- src/app/api/play/gossipelog/route.test.ts
npm test -- src/app/__tests__/play.test.tsx
npm test -- src/engine/__tests__/orchestrator.test.ts
```

Expected: PASS

- [ ] **Step 2: 运行一次聚合核心回归，确认没有打坏相关链路**

Run: `npm run test:core`
Expected: PASS

- [ ] **Step 3: 运行 app surface build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: 同步根目录规划文件**

Update:

- `task_plan.md`：将两个 bug 修复状态更新为 complete
- `findings.md`：记录最终 runtime 合同
- `progress.md`：记录 RED → GREEN 的测试证据与验证结果

- [ ] **Step 5: 提交验证与记录**

```bash
git add task_plan.md findings.md progress.md
git commit -m "docs: record gossipelog runtime alignment fixes"
```

- [ ] **Step 6: 做最终全量测试**

Run: `npm test`
Expected: PASS
