# Architecture Deepening Roadmap

> Origin: `/improve-codebase-architecture` run on 2026-07-15
> Evidence: [.scratch/architecture-review-20260715.html](../../../.scratch/architecture-review-20260715.html)
> Status: Active roadmap — each slice graduates to its own spec before implementation

## Problem Statement

LOGOS 的 authoring、runtime、sidecar、API 四个层在持续演进中积累了若干结构性债务：重复的回滚模式、逐字复制的工具函数、近乎相同的 submit handler、分散的不变量常量，以及若干删除测试失败的浅层模块。这些债务各自不大，但合在一起降低了 locality、testability 和 agent 可操作性——改一处要在 N 个调用点同步修改，测试被迫穿透 interface，agent 在 dispatch packet 时难以圈定边界。

## Solution

采用 **roadmap + 独立 slice spec** 的两阶方式，而不是写一个覆盖全部候选的巨型 spec：

1. **本文档是顶层 roadmap**：记录 7 个候选的优先级、依赖、并行性，作为后续规划的单一入口。
2. **每个候选独立走 `to-spec` → `to-issues` → `implement` 流程**：保持每个 packet 单一主目标、单一验证路径，符合 [AGENTS.md](../../../AGENTS.md) 的 Implementation Packet Discipline。

这样既有顶层视野，又保持每个 packet 独立闭环，任一 slice 出问题不阻塞其他 slice。

## Candidate Inventory

| # | 候选 | 主域 | 推荐强度 | 风险 | 规模 |
|---|---|---|---|---|---|
| 1 | Bridge per-section handler table | authoring/persistence | Strong | 高 | 大 |
| 2 | Extract provider-utils | engine/api-adapter | Strong | 低 | 中 |
| 3 | Extract `useSectionSave` hook | app/edit (UI) | Strong | 中 | 中 |
| 4 | Extract `createPackageWithOptionalBootstrap` | app/api/authoring | Worth exploring | 中 | 中 |
| 5 | Unify v1→v2 migration | authoring/persistence | Worth exploring | 中 | 小 |
| 6 | Shared invariant constants | engine + types | Speculative | 低 | 小 |
| 7 | Delete dead shallow modules | engine + runtime-sessions + authoring | Strong | 低 | 小 |

## Sequencing Strategy

按"风险递增、收益前置"排序，先清理战场再做大重构：

### Phase A — 清理与低风险提取（可并行启动）

**Slice #7 — Delete dead shallow modules**（先做）

- 删除 [memory-placeholder.ts](../../../src/engine/modules/memory-placeholder.ts)、[copy.ts](../../../src/runtime-sessions/copy.ts)、[authoring-status.ts](../../../src/authoring/persistence/authoring-status.ts)
- 删除测试已确认这些是 pass-through：删除后复杂度在调用点重新出现，但调用点本身就只是一行调用，直接 inline 即可
- 验证：`npm test` + `npm run build`
- 并行性：与任何 slice 无冲突，可独立 dispatch

**Slice #2 — Extract provider-utils**（可与 #7 并行）

- 从 [anthropic.ts](../../../src/engine/api-adapter/providers/anthropic.ts) 和 [openai-compatible.ts](../../../src/engine/api-adapter/providers/openai-compatible.ts) 提取 ~140 行逐字重复的工具函数到 `provider-utils.ts`
- 纯提取，无行为变化
- 验证：`npm test -- src/engine/api-adapter/`
- 并行性：与 #7 无共享文件，可并行

### Phase B — 常量收敛（依赖 Phase A 完成）

**Slice #6 — Shared invariant constants**（#2 完成后顺势做）

- 收敛 `PHASE_BEAT_COUNT=4`（导出但从未导入）和 retry ceiling `=3`（在 4 个模块中硬编码）
- 与 #2 同域（engine/api-adapter），顺势处理
- 验证：`npm test -- src/engine/`
- 并行性：依赖 #2 完成（共享 engine/api-adapter 文件）

### Phase C — UI 层独立 packet

**Slice #3 — Extract `useSectionSave` hook**（可与 Phase B 并行）

- 从 [EditWorkbench.tsx](../../../src/app/edit/EditWorkbench.tsx) 的 3 个 ~100 行近乎相同的 submit handler 提取 hook
- 独立 UI 层，与 engine/authoring-persistence 无共享文件
- 验证：`npm test -- src/app/edit/`
- 并行性：与 Phase B 无冲突，可并行

### Phase D — Authoring persistence 层串行推进

**Slice #5 — Unify v1→v2 migration**（先做）

- 从 [merge.ts](../../../src/authoring/persistence/merge.ts) 和 repository.ts 提取 4 个重复的迁移 helper 到 `migration.ts`
- 比 #1 规模小，先做可以熟悉 authoring/persistence 域
- 验证：`npm test -- src/authoring/persistence/`
- 并行性：与 #1 共享 authoring/persistence 域，必须串行，先做 #5

**Slice #1 — Bridge per-section handler table**（#5 完成后做）

- 重构 [bridge.ts](../../../src/authoring/persistence/bridge.ts)（960 行），提取 handler registry + `withRollback` helper，消除 5× 重复回滚模式
- 最大重构，依赖 #5 完成后对域的熟悉度
- 验证：`npm test -- src/authoring/persistence/__tests__/bridge.test.ts` + `npm run build`
- 并行性：与 #5 共享主文件，必须串行

### Phase E — 编排层（最后做）

**Slice #4 — Extract `createPackageWithOptionalBootstrap`**（经验积累后做）

- 从 package 创建路由提取编排 5 个领域的 orchestrator
- 依赖前面 slice 积累的提取经验
- 验证：`npm test -- src/app/api/authoring/packages/`
- 并行性：与 Phase D 无共享文件，但建议最后做

## Dependency & Parallelism

```text
Phase A (并行):
  #7 delete dead modules ──┐
  #2 extract provider-utils ┤
                            ↓
Phase B (串行依赖 #2):
  #6 shared constants ──────┤
                            │   Phase C (与 B 并行):
                            │   #3 useSectionSave hook ──┤
                            ↓                            │
Phase D (串行):                                          │
  #5 unify migration ──────┤                             │
                            ↓                            │
  #1 bridge handler table ─┤                             │
                            ↓                            ↓
Phase E:                                                   │
  #4 createPackage orchestrator ─────────────────────────┘
```

**并行性总结**：
- #7 与 #2 可完全并行（无共享文件）
- #3 可与 Phase B（#6）并行（不同域）
- #5 与 #1 必须串行（共享 authoring/persistence 主文件）
- #4 建议最后做，但不强制依赖

## Per-Slice Outlines

每个 slice 后续走独立 `to-spec` 流程，以下是 slice 级摘要，供后续 spec 起草时引用。

### Slice #7 — Delete dead shallow modules

- **Goal**: 移除 3 个删除测试失败的浅层模块，让调用点直接 inline
- **Owned files**: `src/engine/modules/memory-placeholder.ts`、`src/runtime-sessions/copy.ts`、`src/authoring/persistence/authoring-status.ts` 及其调用点
- **Deletion test result**: 删除后复杂度在调用点重新出现，但调用点本身只有一行，inline 后净复杂度下降
- **Verification**: `npm test` + `npm run build`
- **Parallel**: yes（与任何 slice 无冲突）

### Slice #2 — Extract provider-utils

- **Goal**: 消除 anthropic.ts 与 openai-compatible.ts 之间 ~140 行逐字重复
- **Owned files**: `src/engine/api-adapter/providers/anthropic.ts`、`openai-compatible.ts`、新增 `provider-utils.ts`
- **Seam**: 现有 provider 接口不变，只提取内部 helper
- **Verification**: `npm test -- src/engine/api-adapter/`
- **Parallel**: yes（与 #7 无共享文件）

### Slice #6 — Shared invariant constants

- **Goal**: 收敛 `PHASE_BEAT_COUNT` 和 retry ceiling 等不变量到单一 source
- **Owned files**: `src/engine/api-adapter/`、`src/types/`、相关调用点
- **Risk**: `PHASE_BEAT_COUNT` 当前是死导出，需确认是否真的无调用
- **Verification**: `npm test -- src/engine/`
- **Parallel**: no（依赖 #2 完成同域清理）

### Slice #3 — Extract `useSectionSave` hook

- **Goal**: 消除 EditWorkbench.tsx 的 3 个 ~100 行 submit handler 重复
- **Owned files**: `src/app/edit/EditWorkbench.tsx`、新增 `src/app/edit/shared/useSectionSave.ts`
- **Seam**: hook 接口 = `(sectionId, payload) => Promise<SaveResult>`
- **Verification**: `npm test -- src/app/edit/`
- **Parallel**: yes（与 Phase B 无冲突）

### Slice #5 — Unify v1→v2 migration

- **Goal**: 提取 merge.ts 与 repository.ts 中 4 个重复的迁移 helper
- **Owned files**: `src/authoring/persistence/merge.ts`、`repository.ts`、新增 `migration.ts`
- **Verification**: `npm test -- src/authoring/persistence/`
- **Parallel**: no（与 #1 共享域，必须先于 #1）

### Slice #1 — Bridge per-section handler table

- **Goal**: 重构 bridge.ts 的 5× 重复回滚模式为 handler registry + `withRollback`
- **Owned files**: `src/authoring/persistence/bridge.ts`、`__tests__/bridge.test.ts`
- **Risk**: 960 行最深模块，必须保持外部接口不变
- **Verification**: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts` + `npm run build`
- **Parallel**: no（依赖 #5 完成）

### Slice #4 — Extract `createPackageWithOptionalBootstrap`

- **Goal**: 从 package 创建路由提取编排 5 个领域的 orchestrator
- **Owned files**: `src/app/api/authoring/packages/route.ts`、新增 orchestrator 模块
- **Verification**: `npm test -- src/app/api/authoring/packages/`
- **Parallel**: yes（与 Phase D 无共享文件，但建议最后做）

## Alignment with Workspace Rules

本 roadmap 显式对齐 [AGENTS.md](../../../AGENTS.md) 的以下规则：

### Implementation Packet Discipline（§8）

- 每个 slice = 一个 packet，有单一主目标、单一主模块、单一验证路径
- 共享主生产文件的 slice（#5 与 #1）显式标注串行
- 不共享主文件的 slice（#7 与 #2、#3 与 Phase B）标注可并行
- 每个 slice 声明 owned files、verification、parallel 标记

### Spec Co-evolution（§1）

- 本 roadmap 是顶层 spec，后续每个 slice 走独立 `to-spec` → `to-issues` → `implement`
- 实施过程中若 code、tests、spec 出现分歧，以当前分支代码为准并同步三者

### LLM vs Code Boundary（§5）

- 所有 7 个 slice 都是确定性代码重构，不涉及语义理解
- 不需要 LLM 步骤；若实施中发现"需要理解文本含义"，按 Blocker Protocol 停下

### Module & Bridge Dependency Discipline（§4）

- Slice #1 不改变 Bridge 的外部接口，只重构内部 handler 组织
- Slice #2 不改变 provider 接口，只提取内部 helper
- Slice #3 的 hook 不绕过 Bridge，仍通过 Bridge 提交

## Out of Scope

- 本 roadmap **不实施任何代码改动**，只提供规划
- 不替代每个 slice 的独立 `to-spec` 流程——slice 级 spec 需要单独的用户确认和 seam 讨论
- 不涵盖架构审查中未列出的候选（例如未来发现的新债务）
- 不改变 AGENTS.md 定义的核心域对象边界（Scene / Phase / Beat / checkpoint / storyline / variant）

## Further Notes

- 架构审查的原始 HTML 报告在 [.scratch/architecture-review-20260715.html](../../../.scratch/architecture-review-20260715.html)，包含每个候选的 before/after 可视化图表
- 7 个候选均通过 deletion test 验证：删除模块后复杂度要么消失（pass-through，应删），要么在 N 个调用点重新出现（earning its keep，应深化）
- 推荐强度排序：Strong（#1、#2、#3、#7）> Worth exploring（#4、#5）> Speculative（#6）
- 推荐从 Phase A 开始，因为 #7 和 #2 风险最低且可并行，能快速验证 roadmap 的流程是否顺畅

## Next Steps

1. 用户确认本 roadmap 的排序和并行性分析
2. 从 Phase A 的 #7（或 #2）开始，走独立 `to-spec` 流程
3. 每个 slice 完成后，更新本 roadmap 的状态标记
4. 若某 slice 的 `to-spec` 发现新依赖或风险，回来修订本 roadmap
