# Phase 3 Task Plan

## Goal

把 `Phase 3: Package & Storyline Layer` 的设计、实现与验证维持成可恢复、可继续理解的冻结基线。

当前这套文档的职责不是继续指挥一个待执行项目，而是：

- 记录 `Phase 3` 已经完成了什么
- 提供恢复 `Phase 3` 关键设计和实现边界的入口
- 帮后续 phase 或后续 agent 快速判断哪些能力已经落在主线

## Current Status

- `Part 1` 已完成并合入：storyline substrate、repository seam、variant workspace、active storyline resolution。
- `Part 2` 已完成并合入：`故事包管理` 工作区、package selector、storyline rows、checkpoint rail、rename、create-from-source、branch-and-switch。
- `Part 3` 已完成并合入：safe delete storyline、local `new story package`、destructive UX、最终验证。
- 当前 `Phase 3` 已完成主线实现，后续只作为冻结基线供其他工作复用。

## Frozen Part Map

| Part | 已交付内容 |
|---|---|
| `Part 1` | storyline substrate、`storyline-repository.json`、`variants/<variantId>/...`、storyline-bound session、lazy bootstrap migration |
| `Part 2` | `故事包管理` 默认入口、package selector、row-local actions、checkpoint rail、rename、`create from source`、`branch + switch` |
| `Part 3` | safe delete storyline、local new story package scaffold、destructive UX、最终验证 |

## Phase 3 Final Product Shape

`Phase 3` 完成后，仓库当前应默认满足这些事实：

- 一个 story package 内可以有多条 storyline
- `storyline` 通过 checkpoint graph 比较和继续
- authoring truth 可以落在 variant workspace，不再只落在 package-root baseline
- `/edit` 默认先到 `故事包管理`
- `/play` 与 `/edit` 都通过 active storyline 解析当前工作线
- 可以从管理页直接新建本地 story package

## Canonical References

- 总 spec：
  - [../specs/2026-04-06-phase-3-master-design.md](../specs/2026-04-06-phase-3-master-design.md)
- Part specs：
  - [../specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md](../specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md)
  - [../specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md](../specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md)
  - [../specs/2026-04-07-phase-3-part-3-safe-deletion-and-package-creation-design.md](../specs/2026-04-07-phase-3-part-3-safe-deletion-and-package-creation-design.md)
- Part plans：
  - [../plans/2026-04-06-phase-3-part-1-storyline-substrate-implementation.md](../plans/2026-04-06-phase-3-part-1-storyline-substrate-implementation.md)
  - [../plans/2026-04-06-phase-3-part-2-package-storyline-workspace-implementation.md](../plans/2026-04-06-phase-3-part-2-package-storyline-workspace-implementation.md)
  - [../plans/2026-04-07-phase-3-part-3-safe-deletion-and-package-creation-implementation.md](../plans/2026-04-07-phase-3-part-3-safe-deletion-and-package-creation-implementation.md)

## Merge Landmarks

- `PR #6`：`Part 1`
- `PR #7`：`Part 2`
- `PR #8`：`Part 3`
