# Phase 3 Findings

## 最终恢复点

`Phase 3` 现在应被视为主线里已经存在的实现基线，而不是等待执行的路线图。

最短恢复顺序：

1. [../specs/2026-04-06-phase-3-master-design.md](../specs/2026-04-06-phase-3-master-design.md)
2. `Part 1 / Part 2 / Part 3` 的 spec 与 implementation plan
3. `docs/codemaps/*.md`
4. [README.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/README.md)
5. [coding-agent-guide.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/coding-agent-guide.md)

## 当前冻结结论

- `checkpoint` 继续是 package-scoped immutable node。
- `storyline` 是作者比较与继续的主边界。
- `storyline-repository.json` 负责 storyline metadata，`runtime-sessions.json` 负责 runtime continuity truth。
- `variants/<variantId>/...` 是 materialized authoring workspace，不是 overlay。
- `故事包管理` 是 editor 默认第一页。
- `archive` 已移出当前主线。
- 独立 `duplicate` 已不再保留为主线目标；其主要作者价值已由 `create from source` 覆盖。
- `Part 3` 最终交付包含：
  - safe delete storyline
  - local new story package scaffold
  - destructive-action UX

## 这阶段最重要的实施边界

- package creation 必须走服务端 scaffold，不允许浏览器直接写文件。
- 新建包必须直接创建显式 `Phase 3` scaffold，而不是 legacy 空壳。
- 删除 storyline 时不删除 package-scoped checkpoint graph。
- 删除当前 active storyline 后，必须自动切到邻近可用 storyline。
- 最后一条 storyline 不能删除。
