# Task Plan

## Goal

完成 `weaver` 导入 contract optimization implementation 的最终验证与仓库级文档同步，确认这轮工作只落在 reference、prompt、shared contract、provider schema、parser 与 deterministic seed-mapping 对齐，不扩成系统重构。

## Success Criteria

- targeted verification 集通过：
  - `npm test -- src/types/__tests__/type-conformance.test.ts src/engine/api-adapter/__tests__/prompt-templates.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/api-adapter/__tests__/response-parsers.test.ts src/story-packages/__tests__/import-seed.test.ts src/agents/weaver/__tests__/agent.test.ts`
- 全量测试通过：`npm test`
- 生产构建通过：`npm run build`
- 格式检查通过：`git diff --check`
- 同步 approved implementation plan 文件与这三个 tracking 文件：
  - [docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md](docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md)
  - [task_plan.md](task_plan.md)
  - [progress.md](progress.md)
  - [findings.md](findings.md)
- 收尾提交完成，且不包含额外生产代码变更

## Scope

本线程已完成 verification + doc sync + 收尾提交，不执行实现代码；不得扩大到新的生产行为、UI/UX、sidecar 架构或 reminder 流程。

## Active Track

- 轨道：`weaver` import contract optimization implementation verification / delivery
- 当前状态：实现面已收口，最终验证、tracking sync 与 commit 收尾已完成
- 当前 spec：
  - [docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md](docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md)
- 当前 plan：
  - [docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md](docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md)

## Frozen Boundaries

- 目标是“优化和强化 `weaver` 的 reference / contract guidance”，不是重新定义 `weaver` 是什么。
- 允许局部提取失败，但不允许把“稀疏输出”当成优化目标。
- `warnings` / `unresolvedGaps` 目前保留为兼容字段，不再作为 prompt/reference 的主强调点。
- `openingHook` 的 persisted source of truth 继续来自作者原始 `sourceText`，不是模型改写结果。
- `suggestedPackageName` 继续只是 display-name suggestion，不拥有最终 slug / package identity。

## Work Packets

| 状态 | 任务块 | 说明 |
| --- | --- | --- |
| complete | Packet 1 | 将 dedicated worktree 同步到最新 `branch/narrative-editor`，确认 baseline 已恢复干净 |
| complete | Packet 2 | 重读规则、spec、shared contract、reference、prompt、schema、parser、seed-mapping 与现有测试 |
| complete | Packet 3 | 编写 implementation plan，锁定 file map、task decomposition 与 verification paths |
| complete | Packet 4 | 执行 plan review，修复 reviewer 指出的缺口并重新审阅 |
| complete | Packet 5 | 完成最终验证、tracking sync、格式检查与收尾提交 |

## Current References

- [AGENTS.md](AGENTS.md)
- [coding-agent-guide.md](coding-agent-guide.md)
- [progress.md](progress.md)
- [findings.md](findings.md)
- [docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md](docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md)
- [docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md](docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md)
- [src/agents/weaver/references/import-reference.md](src/agents/weaver/references/import-reference.md)
- [src/types/weaver.ts](src/types/weaver.ts)
- [src/story-packages/import-seed.ts](src/story-packages/import-seed.ts)
- [src/engine/api-adapter/prompt-templates.ts](src/engine/api-adapter/prompt-templates.ts)
- [src/engine/api-adapter/schema-mapper.ts](src/engine/api-adapter/schema-mapper.ts)
- [src/engine/api-adapter/response-parsers.ts](src/engine/api-adapter/response-parsers.ts)
