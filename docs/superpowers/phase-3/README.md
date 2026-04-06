# Phase 3 Workspace

## Purpose

这个目录是 `Phase 3: Package & Storyline Layer` 的主工作记忆入口。

- 根目录 `task_plan.md`、`findings.md`、`progress.md` 只保留跨 phase 关键节点与恢复入口。
- `Phase 3` 的详细规划、发现、执行日志与 review 节点，优先记录在本目录。
- 正式 design spec 与 implementation plan 仍然遵循仓库既有规范，放在：
  - `docs/superpowers/specs/`
  - `docs/superpowers/plans/`

## Directory Map

| 文件 | 用途 |
|---|---|
| `task_plan.md` | `Phase 3` 当前阶段、完成标准、part 顺序与状态 |
| `findings.md` | `Phase 3` 研究结论、对象边界、拆解理由、待冻结问题 |
| `progress.md` | `Phase 3` 会话日志、review 结果、验证记录 |

## Expected Document Flow

当前推荐流程如下：

1. 写 `Phase 3` 总 design spec
2. 冻结 `Phase 3` 的 part 切法与交付顺序
3. 写 `Part 1` spec
4. 写 `Part 1` implementation plan
5. 执行并验证 `Part 1`
6. 再进入 `Part 2`
7. 最后进入 `Part 3`

## Official Spec / Plan Convention

正式文档继续使用日期命名，不在本目录重复保存第二份。

当前预期会出现的正式文档类型：

- `docs/superpowers/specs/YYYY-MM-DD-phase-3-master-design.md`
- `docs/superpowers/specs/YYYY-MM-DD-phase-3-part-1-*.md`
- `docs/superpowers/plans/YYYY-MM-DD-phase-3-part-1-*.md`
- 后续 `Part 2`、`Part 3` 文档同理

## Current Status

- 文档工作区已建立。
- 下一步进入 `Phase 3` 总 design spec。
