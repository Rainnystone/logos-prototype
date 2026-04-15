# Superpowers Archive

这里存放已经从 `docs/superpowers/` 退役的历史 plan、spec 和过程工作记忆。

放在这里的文档仍然可以作为回看记录、设计演变参考和历史决策痕迹使用，但它们不再默认代表当前分支上的活动实施依据。

如果一整轮 multi-phase 开发更新已经完成并需要整体封板，优先归档到：

- `archive/docs/dev-updates/`

而不是继续把 phase 级 spec / plan / 工作记忆拆散混放在这里。

如果是单一工作流（spec/plan/根追踪三件套）封板，优先归档到：

- `archive/docs/workstreams/<date>-<topic>/`

当前仍然活跃、需要优先查看的 superpowers 文档，继续保留在：

- `docs/superpowers/plans/`
- `docs/superpowers/specs/`

归档区当前分为四类：

- `archive/docs/superpowers/plans/`
  已完成、暂停或被后续工作替代的历史 implementation plan
- `archive/docs/superpowers/specs/`
  已被后续活动文档替代的历史设计稿
- `archive/docs/superpowers/plans/drafts/`
  当时为并行执行或拆分任务产生的中间草稿
- `archive/docs/superpowers/recovery/`
  从根目录 `task_plan.md`、`progress.md`、`findings.md` 封板归档下来的会话级工作记忆快照
- `archive/docs/superpowers/tracks/`
  已退役的 track 级工作记忆目录，通常保存某条已完成主题轨道的 `task_plan` / `progress` / `findings` 快照

如果后续还有新的 superpowers 文档需要退役，优先按这个结构继续归档，而不是混放到别的 archive 目录。

最近归档的一组文档包括：

- `archive/docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md`
- `archive/docs/superpowers/plans/2026-04-09-play-latency-audit-streaming.md`
- `archive/docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md`
- `archive/docs/superpowers/specs/2026-04-09-play-latency-audit-streaming-design.md`
- `archive/docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md`
- `archive/docs/superpowers/recovery/2026-04-09-root-workspace-memory/`

最近完成并已整体封板的一轮开发更新是：

- `archive/docs/dev-updates/march-dev-update/README.md`

最近完成并已归档的单工作流是：

- `archive/docs/workstreams/2026-04-10-gossipelog-memory-reference/README.md`
