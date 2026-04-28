# Documentation Governance

## 文档用途

这份文件定义仓库文档的生命周期治理规则，重点是：

- 哪些文档属于当前活跃执行面
- 哪些文档属于归档参考面
- 何时可以从活跃面迁移到归档面
- agent 在不同任务下的默认加载顺序

本文件不负责代码路由细节，不替代 `AGENTS.md` 或 `coding-agent-guide.md`。

## 文档分工与权威边界

- `AGENTS.md`：本仓库当前活动指令文件，定义稳定执行纪律、验证纪律和协作规则。
- `CLAUDE.md`：保留文件，不作为当前活动指令源；如与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准，除非人类明确要求迁移。
- `coding-agent-guide.md`：任务分流、入口文件、implementation packet 落点与首轮验证入口。
- `coding-agent-guide.md` 不维护归档工作流清单；归档状态统一由本文件维护。
- `documentation-governance.md`：文档生命周期、活跃/归档边界、命名与加载规则。
- `docs/codemaps/*.md`：深层结构图，只在路由文档不足时补充加载。
- `docs/superpowers/specs/` 与 `docs/superpowers/plans/`：当前活跃规格与计划。
- `archive/`：历史参考，不是默认执行入口。

## 活跃与归档规则

1. 活跃文档与归档文档必须分离，不混放在同一执行入口中。
2. `archive/` 默认只用于历史追溯，不作为新任务第一入口。
3. 任何归档动作都不是自动行为；必须先得到人类明确确认。
4. 对同一工作流，`spec/plan` 与对应 tracking 文件应一起归档，避免上下文断裂。
5. 根目录 tracking 文件只允许在“已确认归档后”重置，不能为了整洁提前清空。

## 活跃文档面

| 文档面 | 当前用途 | 何时可退出活跃面 |
| --- | --- | --- |
| `AGENTS.md` | 仓库级执行纪律与边界规则 | 仅在人类明确迁移指令文件时 |
| `coding-agent-guide.md` | 首轮任务分流与代码入口导航 | 路由结构变更并完成同步更新后 |
| `documentation-governance.md` | 文档生命周期与归档契约 | 治理规则更新并完成同步后 |
| `docs/superpowers/specs/` | 仍在推进的设计规格 | 对应工作流确认完成并准备归档 |
| `docs/superpowers/plans/` | 仍在推进的执行计划 | 对应工作流确认完成并准备归档 |
| `task_plan.md` / `progress.md` / `findings.md` | 多轮会话的根级追踪与恢复 | 对应工作流确认完成并与 plan/spec 一起归档 |

当前观察：`2026-04-10-gossipelog-memory-reference` 与 `2026-04-10-gossipelog-runtime-alignment-fixes` 均已确认归档到 `archive/docs/workstreams/` 下的同名目录。根目录三件套已重置为下一轮工作流预留入口，`docs/superpowers/specs/` 与 `docs/superpowers/plans/` 当前仅保留 README。

## 关键路径地图

| What | Where |
| --- | --- |
| Active instruction file | `AGENTS.md` |
| Routing guide | `coding-agent-guide.md` |
| Documentation governance | `documentation-governance.md` |
| Active specs | `docs/superpowers/specs/` |
| Active plans | `docs/superpowers/plans/` |
| Root tracking files | `task_plan.md`, `progress.md`, `findings.md` |
| Deep system maps | `docs/codemaps/` |
| Archive root | `archive/` |

## 归档结构与命名

- 既有历史材料继续保存在 `archive/docs/` 与 `archive/vendor/`。
- 新完成工作流推荐使用可检索的容器目录，例如 `archive/docs/workstreams/YYYY-MM-DD-topic/`。
- 已落地示例：`archive/docs/workstreams/2026-04-10-gossipelog-memory-reference/`、`archive/docs/workstreams/2026-04-10-gossipelog-runtime-alignment-fixes/`。
- 本文件只维护“当前归档状态”和“归档规则”，不维护完整历史流水清单。
- 归档 tracking 文件不要保留泛名，建议：
  - `archive-task-plan.md`
  - `archive-progress.md`
  - `archive-findings.md`
- 归档目录命名应包含时间与主题，保证 CLI 搜索可区分。

## 加载顺序与约束

默认读取顺序：

1. `AGENTS.md`
2. `coding-agent-guide.md`
3. `documentation-governance.md`
4. 根级 tracking 文件（当任务涉及多轮进展、恢复或计划执行时）
5. 对应活跃 `specs/plans`
6. `docs/codemaps/*.md`（仅当首轮路由信息不足）
7. `archive/`（仅当需要历史背景）

禁止默认行为：

- 不因为“存在归档资料”就先读归档。
- 不因为“看起来已完成”就自动清理 tracking 文件。

## 转场规则（活跃 → 归档）

1. 任务达到表面完成态。
2. agent 询问人类是否确认该工作流归档。
3. 人类确认后再执行：归档计划/规格/追踪文件，并更新相关文档引用。
4. 仅在归档完成后，才允许重置根级 tracking 文件。

如果人类拒绝归档：保持现状继续活跃，不迁移、不清空。
