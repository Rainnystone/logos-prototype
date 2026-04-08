# March Dev Update

这是一次已经封板的四阶段开发更新档案。

它收拢了原先分散在根目录、`docs/superpowers/specs/`、`docs/superpowers/plans/`、`docs/superpowers/phase-3/` 和 `docs/superpowers/phase-4/` 下的 Phase 1 到 Phase 4 材料，目的是把这轮更新从“活跃执行入口”明确退役为“历史封板档案”，避免后续工作继续误把它当作当前主线。

## 档案结构

- [phase-1/README.md](phase-1/README.md)
  `March Dev Update Phase 1` 的 design 与 implementation plan。
- [phase-2/README.md](phase-2/README.md)
  `March Dev Update Phase 2` 的 design 与 implementation plan。
- [phase-3/](phase-3/README.md)
  `March Dev Update Phase 3` 的 master / part spec、implementation plan、工作记忆与视觉参考。
- [phase-4/](phase-4/README.md)
  `March Dev Update Phase 4` 的 design、implementation plan 与工作记忆。
- [recovery/](recovery/)
  这轮更新封板前的根目录三件套快照。

## 推荐阅读顺序

1. [../../../../AGENTS.md](../../../../AGENTS.md)
2. [recovery/task_plan.md](recovery/task_plan.md)
3. [recovery/progress.md](recovery/progress.md)
4. [recovery/findings.md](recovery/findings.md)
5. 按需进入对应 phase 目录
6. 如果需要回到当前代码结构，再读 [../../../../docs/codemaps/architecture.md](../../../../docs/codemaps/architecture.md)

## 状态

- `March Dev Update Phase 1`：已完成并封板
- `March Dev Update Phase 2`：已完成并封板
- `March Dev Update Phase 3`：已完成、已合并并封板
- `March Dev Update Phase 4`：已完成实现、验证与最终收口，并封板

## 当前与历史的边界

- 这组文档保留的是“March Dev Update 完成时”的设计、执行和验证状态。
- 根目录新的 `task_plan.md`、`progress.md`、`findings.md` 已经重置，用于下一轮大更新。
- 以后如果还有新的多阶段更新，也应按同样模式在 `archive/docs/dev-updates/` 下新增一组独立档案，而不是把不同轮次继续混在一起。
