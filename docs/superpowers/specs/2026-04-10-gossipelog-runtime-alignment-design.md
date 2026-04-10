# Gossipelog Runtime Alignment Design

**Date:** 2026-04-10

**Status:** Approved for planning

## Goal

修复 `gossipelog` runtime 链路里的两个当前缺陷，并在不扩张范围的前提下统一运行合同：

1. `gossipelog` server route 必须和 `/play` 主工作台读取同一份 active storyline variant authored workspace。
2. `PlayWorkbench` 的输入锁必须与 engine 当前的 `gossipelog` 等待语义一致：允许等待一段固定预算；若超时，则继续使用上一份稳定关系层，而不是无限阻塞用户进入下一 beat。

## Problem Summary

当前仓库里有两个彼此相关但边界清晰的问题。

第一，`/play` 页面已经会先解析 active storyline context，再以该 storyline 的 authored workspace 作为 runtime 读取根；但 `/api/play/gossipelog` 仍然直接按 `storyPackageName` 从 package 基线读取 runtime story package。这会导致主 play runtime 与 `gossipelog` cycle 基于不同的数据源工作，尤其会在 scene cast、角色定义、scene authored 内容发生 storyline variant 偏移时产生错位。

同类问题也存在于 `/api/play/gossipelog/bootstrap`。首次启动时如果触发 bootstrap，这条路径同样可能读取到 package 基线，而不是当前 active storyline 的 authored workspace。

第二，engine 的 orchestrator 已经实现了“等待 gossipelog 刷新一段固定预算，超时后回退到上一份稳定 `relationshipLayer` 并继续”的合同；但前端 `PlayWorkbench` 仍然以“关系同步 promise 是否彻底 settle”为输入锁条件。只要 gossipelog cycle 或 finalize 链路长时间悬挂，页面就可能一直保持输入禁用状态，和 engine 现有合同不一致。

## Scope

本轮只修以下范围：

- `gossipelog` runtime route 的 storyline variant 对齐
- `gossipelog` bootstrap route 的 storyline variant 对齐
- `PlayWorkbench` 输入锁与 engine timeout/fallback 语义对齐
- 必要的共享等待预算抽取，防止前后端再次漂移
- 对应测试补齐

本轮明确不处理：

- `gossipelog` reference / prompt contract 升级
- “人际关系记忆”数据模型设计
- `gossipelog` state 文件从 package-owned 改为 storyline-owned
- orchestrator 主循环的整体重构
- 新 UI 或 agent-surface 语义扩张

## Existing Behavior

### Runtime Story Package Loading

- `/play` 页面在进入 `PlayWorkbench` 前，会先解析 active storyline context，并将 `authoredRootOverride` 传给 `loadRuntimeStoryPackage(...)`。
- `/api/play/gossipelog` route 当前未解析 storyline context，而是直接 `loadRuntimeStoryPackage(storyPackageName)`。
- `/api/play/gossipelog/bootstrap` route 当前同样直接 `loadRuntimeStoryPackage(storyPackageName)`。
- `runGossipelogCycle(...)` 使用传入的 `storyPackage` 构建 candidate role 集、scene cast framing、update request 和 injection request。

结果是：`PlayWorkbench` 与 `gossipelog` cycle 可能基于不同的 authored source 工作。

### Gossipelog Waiting Semantics

- orchestrator 在 accepted beat 后异步调度 `gossipelog` refresh。
- 下一次 `runBeat(...)` 真正组 prompt 前，会等待 pending refresh 一段固定预算。
- 若该预算内完成，则使用刷新后的 `relationshipLayer`。
- 若失败，则回退到上一份稳定层。
- 若超时，则停止继续等待，后续 prompt 继续使用上一份稳定层。

### PlayWorkbench Locking

- `PlayWorkbench` 会把 `isRelationshipSyncPending` 并入 `isInputLoading`。
- `PlayerInput` 的按钮、选项和自由输入直接受 `isLoading` / `disabled` 控制。
- 当前 pending sync 只有在 gossipelog cycle promise settle 或 finalize promise settle 后才释放。
- 前端没有自己的 timeout/cancel，也没有和 orchestrator budget 对齐的释放机制。

## Design Decision

采用最小对齐修复，不重写运行时架构。

### Decision 1: Align Gossipelog Routes With Active Storyline Variant

这轮要一起修正两个入口：

- `/api/play/gossipelog`
- `/api/play/gossipelog/bootstrap`

它们都必须和 `/play` 页面使用同一份 active storyline runtime source。

具体做法：

- 在 route 中解析 active storyline context
- 读取该 storyline 对应的 `authoredRoot`
- 将 `authoredRootOverride` 传入 `loadRuntimeStoryPackage(...)`

这样可以保证：

- 主工作台看到的 runtime authored 内容
- `gossipelog` cycle 用于角色边界和 cast 裁剪的内容
- bootstrap 首次种子化时读取的 opening hook、scene cast 与角色定义
- runtime continuity restore 重新进入时看到的内容

三者保持一致。

这次不改变 `gossipelog` 关系 state 的 package-owned 持久化位置。因为当前 bug 是 runtime read-model 错位，不是 state ownership 设计本身。

### Decision 2: Keep Engine as the Source of Truth for Wait/Fallback Semantics

第二个问题的修复目标不是“让前端彻底不锁”，也不是“把系统改成严格强阻塞”，而是让前端对齐 engine 现有合同。

因此，统一后的语义是：

- accepted beat 之后，后台仍可异步进行 gossipelog refresh 与 late finalize
- 用户在短时间窗口内仍会看到输入锁，避免和刚完成的后台收尾打架
- 一旦超过 engine 允许的等待预算，前端必须允许继续下一 beat
- 继续下一 beat 时使用上一份稳定 `relationshipLayer`
- 晚到的后台结果仍可在绑定仍然有效时写回 continuity，但不能重新把页面锁死

### Decision 3: Extract a Shared Gossipelog Wait Budget

为了避免前后端再次各写一套时间常量，本轮需要把 gossipelog wait budget 抽到共享位置，让 orchestrator 与 `PlayWorkbench` 都引用同一个值。

这份预算是行为合同的一部分，而不是 UI 偏好或局部实现细节。

共享模块固定放在：

- `src/agents/gossipelog/runtime-contract.ts`

该模块只导出纯常量，不依赖 Node、route、React 或服务端专属 API，因此可以同时被：

- `src/engine/orchestrator.ts`
- `src/app/play/PlayWorkbench.tsx`

安全引用。

## Proposed Changes

### A. Storyline-Aligned Gossipelog Routes

调整以下两个入口：

- `src/app/api/play/gossipelog/route.ts`
- `src/app/api/play/gossipelog/bootstrap/route.ts`

- 解析 active storyline context
- 使用 `context.authoredRoot` 调用 `loadRuntimeStoryPackage(...)`
- 保持其他 request body shape 不变

这应当是 route 级最小修复，不改变 gossipelog request/response 合同。

### B. Shared Wait Contract

新增一个共享常量模块，用于表达 gossipelog refresh 的等待预算。

要求：

- 不把 UI 细节放进去
- 名称明确表达这是 gossipelog refresh wait budget
- orchestrator 与 `PlayWorkbench` 都从这里读取

本轮固定采用：

```ts
export const GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS = 2_000;
```

### C. PlayWorkbench Lock Alignment

调整 `src/app/play/PlayWorkbench.tsx` 中 pending sync 的控制方式：

- 保留当前 pending sync 跟踪能力，用于 late finalize 和 hydration 协调
- 将“输入是否必须继续禁用”与“后台是否还有未 settle promise”分离
- 新增与共享 wait budget 对齐的 UI lock 预算
- 若 gossipelog cycle / finalize 在预算内完成，行为保持不变
- 若超过预算，解除输入锁，但不丢弃后台晚到结果

修复后应满足：

- accepted beat 后短时间内仍然锁住输入
- 超过预算后，如果后台仍未返回，用户可以继续开始下一 beat
- 晚到的 finalize 若仍绑定当前 session/checkpoint，可静默写回 continuity
- 页面不会因为后台 promise 一直 pending 而永久停在不可操作状态

## Testing Strategy

本轮按 TDD 实施，每个行为先写失败测试。

### Route Alignment Tests

新增或扩展测试，证明：

- 当 active storyline variant 的 authored workspace 与 package 基线不同，`/api/play/gossipelog` 使用的是 variant authored root
- 当 active storyline variant 的 authored workspace 与 package 基线不同，`/api/play/gossipelog/bootstrap` 也使用的是 variant authored root
- `runGossipelogCycle(...)` 收到的 story package 与 `/play` 页面 runtime 使用的是同一 source

### PlayWorkbench Locking Tests

新增或扩展测试，证明：

- 在 gossipelog refresh 刚进入 pending 时，输入仍被锁住
- 一旦超过共享 wait budget，即使后台未返回，输入会重新可用
- timeout 后继续下一 beat 时，仍沿用上一份稳定关系层
- 晚到的 gossipelog / finalize 结果不会让页面回退到初始化，也不会重新锁死输入

### Regression Verification

完成后至少跑：

- gossipelog route / runtime 相关 targeted tests
- `PlayWorkbench` UI tests
- orchestrator gossipelog timeout/fallback tests
- `npm run build`

## File Impact

核心受影响文件预期包括：

- `src/app/api/play/gossipelog/route.ts`
- `src/app/api/play/gossipelog/bootstrap/route.ts`
- `src/app/play/PlayWorkbench.tsx`
- `src/agents/gossipelog/runtime-contract.ts`
- 对应 route / play / orchestrator 测试文件

根目录文件需要同步：

- `task_plan.md`
- `findings.md`
- `progress.md`

## Risks

- 如果 UI 只做“超时后解锁”而不处理 late finalize 的状态绑定，可能引入新的 continuity 竞争
- 如果共享 wait budget 放错位置，后续容易再次出现 engine 和 UI 漂移
- 如果 route 对齐只修 gossipelog，不验证现有 runtime-session restore 的 variant 假设，可能留下新的认知空洞
- 如果 bootstrap route 不和主 route 一起修，首次启动路径仍会留下同类错位

## Acceptance Criteria

- `gossipelog` route 与 `gossipelog bootstrap` route 都和 `/play` 页面对同一 active storyline variant 对齐
- `PlayWorkbench` 的输入锁与 engine timeout/fallback 语义一致
- 用户不会因 gossipelog / finalize 长时间悬挂而永久失去进入下一 beat 的能力
- 超时后的下一 beat 继续使用上一份稳定关系层，不破坏现有 orchestrator 合同
- 新增测试先失败后转绿，且构建通过
