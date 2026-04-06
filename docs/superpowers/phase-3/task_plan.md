# Phase 3 Task Plan

## Goal

把 `Phase 3: Package & Storyline Layer` 拆成可独立设计、计划、执行和验证的几个部分，先冻结总设计，再按 part 的依赖顺序推进实现，避免在 UI、仓储和 authoring 语义之间反复返工。

本阶段完成标准应至少满足：

- `Phase 3` 总 design spec 已写出、review 通过并获用户确认。
- `Phase 3` 的 part 切法、依赖顺序与每个 part 的完成标准已经冻结。
- 每个 part 在进入代码实现前，都先有自己的 spec 与 implementation plan。
- 根目录三件套只保留关键里程碑，本目录成为 `Phase 3` 的主工作记忆。

## Active Phases

| 阶段 | 状态 | 内容 |
|---|---|---|
| 1 | complete | 建立 `docs/superpowers/phase-3/` 工作区，并把根目录三件套切换为 `Phase 3` 总控索引模式。 |
| 2 | complete | `Phase 3` 总 design spec 已写出并通过独立 review。 |
| 3 | complete | `Phase 3` 的 part 边界、依赖关系与每个 part 的完成标准已在总 spec 中冻结。 |
| 4 | complete | `Part 1` spec 已写出、完成多轮 review 收口，并进入用户确认后的正式基线。 |
| 5 | complete | `Part 1` implementation plan 已写出并通过独立 plan review。 |
| 6 | complete | `Part 1` 已完成实现、验证、浏览器手验与记录同步。 |
| 7 | pending | 编写 `Part 2` spec。 |
| 8 | pending | 编写 `Part 2` implementation plan。 |
| 9 | pending | 执行并验证 `Part 2`。 |
| 10 | pending | 编写 `Part 3` spec。 |
| 11 | pending | 编写 `Part 3` implementation plan。 |
| 12 | pending | 执行并验证 `Part 3`，收口 `Phase 3`。 |

## Frozen Inputs From Earlier Phases

- `Phase 2` 已交付 package-scoped runtime checkpoints，且 `checkpointId` 继续保持 opaque、package-scoped，不编码 `storylineId` 或 UI 标签。
- `checkpoint` 在 `Phase 3` 中继续被视为 package-scoped immutable node。
- `storyline` 应作为指向 checkpoint 的 ref / pointer layer，而不是复制整段历史。
- `session` 是当前活动工作线，后续需要与某条 storyline 的 head 发生绑定。
- 仅有 `checkpoint + storyline ref` 还不够，因为当前 authoring 保存仍然是 package-global baseline。
- `Phase 3` 必须补上 storyline-scoped authoring variant / revision 语义，用来支持“比较不同设置下的故事走向”。
- package-level `Storage / Repository Substrate` 应先于 UI 落地。
- “故事包管理”页应替换当前“控制台”页，但 UI 必须消费已冻结好的 substrate，而不是反向驱动底层对象边界。
- `storyline v1` 的目标集合仍然包含：
  - 新建分支线
  - 切换
  - 删除
  - 重命名
  - 归档
  - 复制
- 每个 part 收口前都要做一次独立的 UI / UX 复核。

## Current Recommended Shape

当前推荐 `Phase 3` 按 3 个主要 part 推进：

1. `Part 1`
   - 冻结 `checkpoint / storyline / session / authoring variant` 的对象合同
   - 引入 package-level repository seam
   - 明确 mutable state 与 package definition 的分层
2. `Part 2`
   - 用“故事包管理”替换当前“控制台”
   - 接入 storyline workspace 的读取、展示与核心继续/分叉工作流
3. `Part 3`
   - 补齐 storyline 管理动作与 UX 收口
   - 完成切换、重命名、归档、复制、删除等动作的正式交付

这组切法当前是推荐方向，最终以总 spec review 通过后的版本为准。

## Frozen Part Map

| Part | 核心目标 | 主要产物 | 明确不承担的事 |
|---|---|---|---|
| `Part 1` | 把 storyline substrate 做成正式底座 | storyline repository seam、variant workspace 模型、storyline-bound session 语义、兼容迁移、无 UI substrate primitives（create/switch/branch） | 不负责完整故事包管理 UI；不把新建 story package 当地基；不交付 rename/archive/delete 这类管理动作 |
| `Part 2` | 把 substrate 变成作者可用工作区 | 故事包管理页、storyline 列表，以及对 `Part 1` substrate primitives 的 UI 接入 | 不要求一次补齐全部管理动作；不再回头重新定义底层对象模型 |
| `Part 3` | 补齐 storyline v1 管理动作并收口 UX | 重命名、归档、复制、删除、失败回退、空态与最终收尾验证 | 不再回头改 `Part 1` 的对象边界 |

## Bootstrap Non-Goals

- 当前文档启动阶段不写产品代码。
- 当前文档启动阶段不写 `Phase 3` 总 implementation plan。
- 当前文档启动阶段不提前冻结所有文件路径与全部任务颗粒度；这些应在总 spec 之后按 part 再细化。

## Master Spec Status

- 正式总 spec 已写出：
  - `docs/superpowers/specs/2026-04-06-phase-3-master-design.md`
- 当前状态：
  - `Approved`
- 下一步：
  - 交给用户确认
  - 再进入 `Part 1` spec

## Review Findings Absorbed Into Master Spec

- `authoring variant` 已正式冻结为唯一物理模型：
  - materialized authoring workspace
- `storyline head / active session / active checkpoint` 的主从关系已冻结为显式不变量
- package-level repository seam 已补出明确的责任切分与首版物理拓扑
- 旧 package 的兼容策略已冻结为 lazy bootstrap migration

## Part 1 Frozen Decisions So Far

以下决定已由用户明确确认，后续 `Part 1` spec 应直接继承：

| 议题 | 已冻结决定 |
|---|---|
| `Part 1` 范围 | 做 substrate，并把 `/play` 与 `/edit` 默认接到 `activeStorylineId -> variant workspace -> active session` |
| storyline 仓储文件 | 采用 package-root `storyline-repository.json` |
| `authoring variant` 物理模型 | 采用 `variants/<variantId>/...` 下的 materialized workspace |
| package baseline 角色 | package-root baseline YAML 继续作为 baseline / scaffold / import-export anchor，不再作为 storyline-aware 常规写目标 |
| `session` 绑定事实源 | `storyline-repository.json` 负责 storyline 与 session 绑定；`runtime-sessions.json` 继续承载 continuity truth |
| 迁移方式 | 采用 lazy bootstrap migration |
| “从 checkpoint 继续”的作者可见入口 | 不在 `Part 1` 暴露作者可见入口；只在底层能力上为 `Part 2` 做好地基 |
| storyline 管理动作 | `Part 1` 不承担 rename / archive / copy / delete 等管理动作 |
| 新建 story package | 继续留在 `Part 2` companion slice |

当前仍待冻结的问题：

- 当前已无 `Part 1` 级对象边界 blocker；下一步直接进入 `Part 1` spec。

## Frozen Variant Creation Rules

| 场景 | 已冻结规则 |
|---|---|
| 新建 storyline | 立即复制来源 storyline 当前绑定的 variant workspace，生成新的 `variantId` |
| duplicate storyline | 立即完整复制被 duplicate 的 storyline 当前 variant workspace |
| 从 checkpoint 分叉 storyline | 仍复制来源 storyline 当前 variant workspace，只改变新的 storyline head / active session 锚点 |
| 禁止方案 | 不采用 overlay inheritance；不采用 deferred first-write materialization |

## Part 1 Spec Status

- 正式 `Part 1` spec 已写出：
  - `docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md`
- 当前状态：
  - `Reviewed, pending user confirmation`
- 下一步：
  - 交给用户确认
  - 如用户认可，则进入 `Part 1` implementation plan

## Part 1 Implementation Plan Status

- 正式 `Part 1` implementation plan 已写出：
  - `docs/superpowers/plans/2026-04-06-phase-3-part-1-storyline-substrate-implementation.md`
- 当前状态：
  - `Execution complete`
- 下一步：
  - 进入 `Part 2` spec
  - 基于已冻结的 `Part 1` substrate 开始设计故事包管理工作区

## Part 1 Execution Checkpoints

| Task | 状态 | 说明 |
|---|---|---|
| `Task 1` | complete | storyline repository contract、workspace helpers、定向测试和双 review 已通过。 |
| `Task 2` | complete | storyline substrate service、runtime-session 同步、失败路径收口与双 review 已通过。 |
| `Task 3` | complete | authored load/save target-resolution seam、legacy/non-materializing 兼容与双 review 已通过。 |
| `Task 4` | complete | `/edit` 与 `/play` 页面级默认解析已接到 active storyline，补齐了单次 context resolve 与页面级 storyline-aware 覆盖，并通过双 review。 |
| `Task 5` | complete | 已完成定向回归、`build`、simulation type-check / test、全量 `npm test`、浏览器手验以及 Phase 3 记录同步。 |
