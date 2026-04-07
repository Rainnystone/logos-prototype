# Task Plan

## Goal

维护仓库级恢复入口，并把当前主线稳定指向已经合并完成的 `Phase 3` 基线与其后续文档。

根目录三件套的职责现在是：

- 跨 phase 的总控索引
- 线程恢复入口
- 当前冻结结论的最短摘要

更细的 `Phase 3` 工作记忆仍以 `docs/superpowers/phase-3/` 为准。

## Current Active Track

- `Phase 1` 已完成并合入主线。
- `Phase 2` 已完成并合入主线。
- `Phase 3 Part 1 / Part 2 / Part 3` 已完成实现、验证，并通过 `PR #6`、`PR #7`、`PR #8` 合入 `branch/narrative-editor`。
- 当前活跃收尾任务不是继续写 `Phase 3` 代码，而是仓库级文档整编：
  - 更新根目录三件套
  - 更新 `Phase 3` 主工作记忆
  - 更新总 spec 与 `docs/codemaps`
  - 重写 `README.md`
  - 新增 `coding-agent-guide.md`
- `Phase 4` / 新 agent 扩展尚未启动。

## Milestones

| 阶段 | 状态 | 说明 |
|---|---|---|
| `Phase 1` | complete | 完成 editor surface 与 authoring model 基础层 |
| `Phase 2` | complete | 完成 runtime continuity / checkpoint substrate |
| `Phase 3 Part 1` | complete | 完成 storyline substrate 与 repository seam |
| `Phase 3 Part 2` | complete | 完成 `故事包管理` 工作区与 storyline workspace |
| `Phase 3 Part 3` | complete | 完成 safe delete storyline 与 local new story package |
| 文档整编 | complete | 根目录索引、总 spec、codemap、README 与 agent 指南已同步到主线真实状态 |

## Current Product Baseline

当前主线应默认认为这些结论成立：

- `故事包管理` 是 editor 默认第一页。
- `checkpoint` 继续是 package-scoped immutable node。
- `storyline` 是作者比较与继续的主边界。
- `storyline-repository.json`、`runtime-sessions.json` 和 `variants/<variantId>/...` 共同组成 `Phase 3` 的 package/storyline substrate。
- `create from source` 已覆盖大部分作者对“复制一条线再继续改”的真实需求。
- `archive` 与独立 `duplicate` 已不再是当前 `Phase 3` 主线。

## Canonical References

- 总设计规格：
  - [docs/superpowers/specs/2026-04-06-phase-3-master-design.md](docs/superpowers/specs/2026-04-06-phase-3-master-design.md)
- `Phase 3` 主工作记忆：
  - [docs/superpowers/phase-3/task_plan.md](docs/superpowers/phase-3/task_plan.md)
  - [docs/superpowers/phase-3/progress.md](docs/superpowers/phase-3/progress.md)
  - [docs/superpowers/phase-3/findings.md](docs/superpowers/phase-3/findings.md)
- 代码地图：
  - [docs/codemaps/architecture.md](docs/codemaps/architecture.md)
  - [docs/codemaps/frontend.md](docs/codemaps/frontend.md)
  - [docs/codemaps/backend.md](docs/codemaps/backend.md)
  - [docs/codemaps/data.md](docs/codemaps/data.md)
- 仓库导览：
  - [README.md](README.md)
  - [coding-agent-guide.md](coding-agent-guide.md)
