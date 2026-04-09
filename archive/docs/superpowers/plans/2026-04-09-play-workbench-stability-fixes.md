# Play Workbench Stability Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 March Dev update 后 `/play` workbench 的一组稳定性与交互问题，在不改变 `gossipelog` 既定后台流程的前提下，让用户侧体验稳定、输入受控，且错误路径不残留半成品状态。

**Architecture:** 保持现有 orchestrator 与 `gossipelog` 关系层刷新链路不变，只在 workbench 客户端增加“后台流程存在但不抢 UI 状态”的协调层。输入侧增加同步锁与关系刷新锁，workbench 重建时避免不必要的清空与回流，错误路径通过回归测试确保不追加未 accepted 内容，且 reload 后仍与已接受的 continuity 一致。

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Testing Library

---

## Explicit Non-Goals

- 本轮明确不处理 `runtime usage` 的显示、累计、storyline copy 对齐或任何相关派生问题。
- 本轮不改 `gossipelog` 的后台执行语义，不改 orchestrator 如何等待关系层结果，只修用户可见的 UI/UX 感受。

## File Map

- Modify: `src/app/__tests__/play.test.tsx`
  - play workbench 的主回归测试入口；新增 gossipelog UX 锁、重复点击防抖、页面稳定性、错误路径与 reload 一致性回归测试。
- Modify: `src/app/play/PlayWorkbench.tsx`
  - 增加 workbench 级输入锁与关系刷新中的 UI 协调；避免按钮在用户视角下过早重新可用。
- Modify: `task_plan.md`
  - 将当前 packet 状态同步到正式 plan。
- Modify: `progress.md`
  - 记录 plan、subagent dispatch、验证结果。
- Modify: `findings.md`
  - 记录本轮根因结论与最终 UX 边界。

## Execution Mode

- 本计划按 `subagent-driven-development` 串行执行，不并行派发实现 subagent。
- 原因：`src/app/__tests__/play.test.tsx` 与 `src/app/play/PlayWorkbench.tsx` 是共享主战场，并行实现会产生 ownership 冲突。
- 如需只读分析或文档审阅，可以并行派只读 reviewer；写代码 worker 必须串行。

## Task 1: Write the Failing Workbench Regression Tests

**Files:**
- Modify: `src/app/__tests__/play.test.tsx`
- Test: `src/app/__tests__/play.test.tsx`

- [ ] **Step 1: 写“gossipelog 未完成时锁住输入”的失败测试**

```tsx
it('keeps all player actions disabled while the accepted beat is waiting for gossipelog settlement', async () => {
  // render PlayWorkbench with a pending gossipelogCycleRunner
  // startRound(user)
  // expect option buttons, free text textarea, and submit button to stay disabled
});
```

- [ ] **Step 2: 运行单测并确认它先失败**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 新增测试 FAIL，当前实现会在 accepted 后重新启用输入。

- [ ] **Step 3: 写“用户快速重复点击选项只会提交一次”的失败测试**

```tsx
it('ignores repeated option clicks until the next accepted option set is ready', async () => {
  // fire two clicks synchronously on the same option
  // expect only one new accepted beat to be recorded
});
```

- [ ] **Step 4: 再次运行单测并确认它先失败**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 新增重复点击测试 FAIL，当前实现可能接受重复提交或没有同步锁。

- [ ] **Step 5: 写“后台收尾期间 workbench 不应发生明显重装配”的失败测试**

```tsx
it('keeps the accepted workbench surface stable while gossipelog settlement is still pending', async () => {
  // render with a pending gossipelogCycleRunner
  // finish one accepted beat
  // assert current beat, accepted history, and visible workspace remain present
  // assert the UI does not fall back to initializing / start-round placeholder during the pending window
});
```

- [ ] **Step 6: 再次运行单测并确认它先失败**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 页面稳定性测试 FAIL，当前实现若在 pending gossipelog 时重建 workbench，会暴露 initializing 或 start-round 相关回退状态。

- [ ] **Step 7: 写“API 持久化报错后不追加未 accepted 内容”的失败或证明性回归测试**

```tsx
it('keeps the last accepted beat visible and avoids appending failed transient output after an API persistence error', async () => {
  // force recordAcceptedBeat to fail after a prior accepted beat exists
  // expect accepted history length unchanged
  // expect no new beat text appended
});
```

- [ ] **Step 8: 运行单测并确认它的当前状态**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 若 FAIL，则后续实现修复；若 PASS，则保留该测试作为回归保护，并在 progress.md 里明确“问题已被测试证伪，无需生产代码改动”。

- [ ] **Step 9: 写“报错后 reload 仍保持已接受 continuity”的失败测试**

```tsx
it('rehydrates to the last accepted continuity after an API persistence error and remount', async () => {
  // create one accepted beat
  // trigger a later recordAcceptedBeat API failure without creating a new accepted beat
  // remount PlayWorkbench with the persisted runtime session view
  // expect the last accepted beat/history to be restored, with no failed transient content
});
```

- [ ] **Step 10: 运行单测并确认它先失败**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: reload consistency 测试 FAIL；若意外 PASS，则记录为“问题已被测试证伪”并保留为回归测试。

- [ ] **Step 11: 提交测试工作**

```bash
git add src/app/__tests__/play.test.tsx
git commit -m "test: cover play workbench stability regressions"
```

## Task 2: Implement the Minimal Workbench Input Lock and UX Coordination

**Files:**
- Modify: `src/app/play/PlayWorkbench.tsx`
- Optionally Modify: `src/app/components/PlayerInput.tsx`
- Test: `src/app/__tests__/play.test.tsx`

- [ ] **Step 1: 基于 Task 1 的失败测试，先设计一个同步输入锁边界**

Implementation target:

```ts
const [isInteractionLocked, setIsInteractionLocked] = useState(false);
const runInFlightRef = useRef(false);
const [pendingRelationshipSyncCount, setPendingRelationshipSyncCount] = useState(0);
```

- [ ] **Step 2: 先实现最小锁逻辑，不改 gossipelog 真正流程**

Implementation target:

```ts
// lock immediately before starting a round / submitting an option
// keep locked while runBeat is in flight
// if gossipelog settlement is still pending after acceptance, keep player input disabled
// release only when the next valid option set is genuinely ready for user interaction
```

- [ ] **Step 3: 运行目标测试并确认通过**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: Task 1 的输入锁与重复点击失败测试转绿。

- [ ] **Step 4: 只在必要时调整 PlayerInput 组件**

Implementation target:

```tsx
<PlayerInput
  isLoading={isInputLoading || isResetting || isInteractionLocked}
  disabled={!roundStarted || sceneComplete || isResetting || isInteractionLocked}
/>
```

- [ ] **Step 5: 再跑一次目标测试，确认没有引入新的 UI 回归**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: player input 相关测试保持 green。

- [ ] **Step 6: 提交最小实现**

```bash
git add src/app/play/PlayWorkbench.tsx src/app/components/PlayerInput.tsx src/app/__tests__/play.test.tsx
git commit -m "fix: stabilize play workbench input locking"
```

## Task 3: Stabilize the Workbench Surface During Pending Gossipelog Settlement

**Files:**
- Modify: `src/app/play/PlayWorkbench.tsx`
- Test: `src/app/__tests__/play.test.tsx`

- [ ] **Step 1: 找出 pending gossipelog 时导致 workbench 回退或跳动的最小 UI 状态切换点**

Implementation target:

```ts
// avoid clearing accepted surface just because a rebuild or pending relationship sync is in progress
// preserve currentState / beat display / beat history while background settlement is pending
```

- [ ] **Step 2: 做最小实现，只修 UI 呈现，不改 gossipelog 执行语义**

Implementation target:

```ts
// do not reset to initializing placeholder if the user already has an accepted surface
// keep the accepted workspace visible while lock state prevents new interaction
```

- [ ] **Step 3: 跑页面稳定性目标测试并确认通过**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 页面稳定性测试转绿。

- [ ] **Step 4: 再跑一次目标测试，确认没有引入新的回退状态**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 输入锁、页面稳定、已有 continuity 相关测试保持 green。

- [ ] **Step 5: 提交页面稳定性修复**

```bash
git add src/app/play/PlayWorkbench.tsx src/app/__tests__/play.test.tsx
git commit -m "fix: keep play workbench stable during gossipelog settlement"
```

## Task 4: Verify the API Error Path and Only Patch Production Code If the Regression Test Proves a Gap

**Files:**
- Modify: `src/app/__tests__/play.test.tsx`
- Optionally Modify: `src/app/play/PlayWorkbench.tsx`
- Test: `src/app/__tests__/play.test.tsx`

- [ ] **Step 1: 跑 API 错误路径回归测试，确认当前真实行为**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: 看新增 API persistence error 与 reload consistency 测试是 red 还是 green。

- [ ] **Step 2: 如果测试已绿，确认这个 packet 不需要生产代码改动**

Expected outcome:

```md
No code patch required for Task 4; the new API persistence error regression tests already prove the behavior is safe.
```

- [ ] **Step 3: 如果测试是红，做最小修补**

Implementation target:

```ts
// keep previous accepted beat/history
// clear only transient interaction lock or transient pending UI state
// do not mutate saved continuity
// ensure a remount / reload still resolves to the last accepted runtime session view
```

- [ ] **Step 4: 重新运行错误路径测试**

Run: `npm test -- src/app/__tests__/play.test.tsx`
Expected: API persistence error 测试转绿。

- [ ] **Step 5: 提交此 packet**

```bash
git add src/app/__tests__/play.test.tsx src/app/play/PlayWorkbench.tsx
git commit -m "test: guard play runtime error recovery"
```

## Completion Checklist

> This is a global finish checklist, not an implementation packet for subagent dispatch. Run it after Tasks 1-4 are complete.

**Files:**
- Modify: `docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md`
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md`

- [ ] **Step 1: 跑聚焦测试**

Run: `npm test -- src/app/__tests__/play.test.tsx src/app/components/__tests__/PlayerInput.test.tsx`
Expected: targeted UI/workbench tests 全绿。

- [ ] **Step 2: 跑完整测试**

Run: `npm test`
Expected: exit 0。

- [ ] **Step 3: 跑构建**

Run: `npm run build`
Expected: exit 0。

- [ ] **Step 4: 如本地 dev server 仍在，手动复查 `/play`**

Run:

```bash
npm run dev
```

Then inspect `http://localhost:3000/play` with a real browser flow.

Check:
- gossipelog 对用户侧表现为后台流程，不触发明显页面跳动
- 选项在后台未完成或用户已选中后保持不可再次点击
- 报错后不出现未 accepted 的新 beat / 新 history
- 页面刷新或重新进入 `/play` 后，仍停留在最后一个已接受的 continuity，而不是带回失败中的半成品状态

- [ ] **Step 5: 同步恢复文档**

Update:
- `docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md` 中已完成的步骤
- `task_plan.md` packet 状态
- `progress.md` 测试与构建结果
- `findings.md` 根因与取舍结论

- [ ] **Step 6: 提交收口**

```bash
git add task_plan.md progress.md findings.md docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md
git commit -m "docs: record play workbench stability plan and verification"
```
