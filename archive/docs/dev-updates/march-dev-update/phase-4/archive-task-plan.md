# March Dev Update Phase 4 Task Plan

## Goal

保存 `March Dev Update Phase 4` 的冻结产品边界、实现入口和最终验证状态。

这个文件现在是归档摘要，不再作为当前活跃 implementation plan 的替代物。

## Final Status

- `Phase 4` 的 design 与 implementation plan 都已执行完毕。
- `Task 1` 到 `Task 7` 已全部完成。
- `weaver agent`、shared sidecar reference loader、`agent 管理` 页面，以及 `gossipelog bootstrap / fallback` 已落地并验证完成。

## Frozen Decision Map

| 主题 | 当前冻结结论 |
|---|---|
| agent 名称 | `weaver agent` |
| agent 类型 | built-in `sidecar`，`always-on` |
| 页面改造 | `控制台` 已改为 `agent 管理页面` |
| extension | `Phase 4` 不做 |
| 主入口位置 | `故事包管理 -> 新建故事包` |
| 创建方式 | `空白创建 / 文本导入` 二选一 |
| 导入范围 | 仅支持 `粘贴文本 -> 新建 story package` |
| 导入策略 | 不做预览，直接运行导入 + 建包 |
| 落盘策略 | 复用既有 package scaffold / create path |
| opening hook | 作者原始 `sourceText` 是权威来源 |
| gossipelog 初始化 | 建包后 bootstrap；首次 Play 前仅在缺失/损坏时 fallback |
| sidecar 控制面 | built-in sidecar 只有展示，没有关闭 |
| reference 架构 | 统一 shared loader + per-sidecar manifest / resolver |

## Canonical References

- [2026-04-07-phase-4-weaver-agent-management-design.md](2026-04-07-phase-4-weaver-agent-management-design.md)
- [2026-04-07-phase-4-weaver-and-agent-management-implementation.md](2026-04-07-phase-4-weaver-and-agent-management-implementation.md)
- [archive-task-plan.md](archive-task-plan.md)
- [archive-progress.md](archive-progress.md)
- [archive-findings.md](archive-findings.md)
- [../phase-1/2026-04-02-phase-1-model-surface-design.md](../phase-1/2026-04-02-phase-1-model-surface-design.md)
- [../phase-3/2026-04-06-phase-3-master-design.md](../phase-3/2026-04-06-phase-3-master-design.md)
- [../../../../../archive/docs/narrative-editor-redesign/master-record.md](../../../../../archive/docs/narrative-editor-redesign/master-record.md)
