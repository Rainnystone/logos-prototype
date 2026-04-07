# Task Plan

## Goal

维护仓库级恢复入口，并把当前主线稳定指向已经完成的 `Phase 3` 基线，以及正在准备中的 `Phase 4` 入口。

根目录三件套的职责现在是：

- 跨 phase 的总控索引
- 线程恢复入口
- 当前冻结结论的最短摘要

更细的 `Phase 3` 工作记忆仍以 `docs/superpowers/phase-3/` 为准。

## Current Active Track

- `Phase 1` 已完成并合入主线。
- `Phase 2` 已完成并合入主线。
- `Phase 3 Part 1 / Part 2 / Part 3` 已完成实现、验证，并通过 `PR #6`、`PR #7`、`PR #8` 合入 `branch/narrative-editor`。
- `Phase 3` 的仓库级文档整编已经完成，当前应把它视为冻结基线，而不是待继续执行的主线计划。
- 当前活跃任务已切换为 `Phase 4` 准备，不再继续扩写 `Phase 3` 主线。
- `docs/superpowers/specs/` 与 `docs/superpowers/plans/` 下还没有正式的 `Phase 4` spec / implementation plan 文件。
- 现阶段已经能确认的 `Phase 4` 入口边界只有：
  - 产品方向仍以 `new import agent` 与 `real agent management operations` 为主
  - `gossipelog agent` 是仓库里当前第一个真实落地的 sidecar agent
  - `coordinator` 仍是 authoring coordinator，不应重新定义为 sidecar agent roster 的一员

## Milestones

| 阶段 | 状态 | 说明 |
|---|---|---|
| `Phase 1` | complete | 完成 editor surface 与 authoring model 基础层 |
| `Phase 2` | complete | 完成 runtime continuity / checkpoint substrate |
| `Phase 3 Part 1` | complete | 完成 storyline substrate 与 repository seam |
| `Phase 3 Part 2` | complete | 完成 `故事包管理` 工作区与 storyline workspace |
| `Phase 3 Part 3` | complete | 完成 safe delete storyline 与 local new story package |
| 文档整编 | complete | 根目录索引、总 spec、codemap、README 与 agent 指南已同步到主线真实状态 |
| `Phase 4` 准备 | in_progress | 已进入入口澄清与恢复文档同步，但尚未形成正式 spec / plan |

## Current Product Baseline

当前主线应默认认为这些结论成立：

- `故事包管理` 是 editor 默认第一页。
- `checkpoint` 继续是 package-scoped immutable node。
- `storyline` 是作者比较与继续的主边界。
- `storyline-repository.json`、`runtime-sessions.json` 和 `variants/<variantId>/...` 共同组成 `Phase 3` 的 package/storyline substrate。
- `create from source` 已覆盖大部分作者对“复制一条线再继续改”的真实需求。
- `archive` 与独立 `duplicate` 已不再是当前 `Phase 3` 主线。

## Phase 4 Prep Baseline

在正式 `Phase 4` 文档落盘前，当前仓库级恢复应先假定这些边界成立：

- `Phase 4` 是建立在 `Phase 3` 已冻结 substrate 之上的下一阶段，不应把 `Phase 3` 当成未完工路线图重新打开。
- sidecar agent 扩展应建立在现有 agent seam 与 deterministic bridge 边界之上，而不是回退到浏览器直写文件或放大 `coordinator` 职责。
- 如果后续要补写正式 `Phase 4` spec / plan，优先锚定现有已落地的 `gossipelog agent`、`AGENTS.md` 的 agent 边界说明，以及 `Phase 1` 设计文档里留下的 phase defer 口径。

## Canonical References

- 总设计规格：
  - [docs/superpowers/specs/2026-04-06-phase-3-master-design.md](docs/superpowers/specs/2026-04-06-phase-3-master-design.md)
- `Phase 4` 入口边界：
  - [AGENTS.md](AGENTS.md)
  - [archive/docs/narrative-editor-redesign/master-record.md](archive/docs/narrative-editor-redesign/master-record.md)
  - [docs/superpowers/specs/2026-04-02-phase-1-model-surface-design.md](docs/superpowers/specs/2026-04-02-phase-1-model-surface-design.md)
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
