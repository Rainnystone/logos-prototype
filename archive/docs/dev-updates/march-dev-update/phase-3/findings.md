# March Dev Update Phase 3 Findings

## Recovery Order

1. [2026-04-06-phase-3-master-design.md](2026-04-06-phase-3-master-design.md)
2. `Part 1 / Part 2 / Part 3` 的 design 与 implementation plan
3. [task_plan.md](task_plan.md)
4. [progress.md](progress.md)
5. [../../../../../docs/codemaps/architecture.md](../../../../../docs/codemaps/architecture.md)
6. [../../../../../README.md](../../../../../README.md)
7. [../../../../../coding-agent-guide.md](../../../../../coding-agent-guide.md)

## Frozen Product Conclusions

- `checkpoint` 继续是 package-scoped immutable node。
- `storyline` 是作者比较与继续的主边界。
- `storyline-repository.json` 负责 storyline metadata，`runtime-sessions.json` 负责 runtime continuity truth。
- `variants/<variantId>/...` 是 materialized authoring workspace，不是 overlay。
- `故事包管理` 是 editor 默认第一页。
- `archive` 与独立 `duplicate` 已从 `Phase 3` 主线移出。

## Engineering Boundaries

- package creation 必须走服务端 scaffold，不允许浏览器直接写文件。
- 新建包必须直接创建显式 `Phase 3` scaffold，而不是 legacy 空壳。
- 删除 storyline 时不删除 package-scoped checkpoint graph。
- 删除当前 active storyline 后，必须自动切到邻近可用 storyline。
- 最后一条 storyline 不能删除。
