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
| 4 | pending | 编写 `Part 1` spec。 |
| 5 | pending | 编写 `Part 1` implementation plan。 |
| 6 | pending | 执行并验证 `Part 1`。 |
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
| `Part 1` | 把 storyline substrate 做成正式底座 | storyline repository seam、variant workspace 模型、storyline-bound session 语义、兼容迁移 | 不负责完整故事包管理 UI；不把新建 story package 当地基 |
| `Part 2` | 把 substrate 变成作者可用工作区 | 故事包管理页、storyline 列表、切换/继续/从 checkpoint 分叉的核心工作流 | 不要求一次补齐全部管理动作 |
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
