# March Dev Update Phase 4 Findings

## Recovery Order

1. [../../../../../AGENTS.md](../../../../../AGENTS.md)
2. [../recovery/task_plan.md](../recovery/task_plan.md)
3. [../recovery/progress.md](../recovery/progress.md)
4. [../recovery/findings.md](../recovery/findings.md)
5. [task_plan.md](task_plan.md)
6. [progress.md](progress.md)
7. [2026-04-07-phase-4-weaver-agent-management-design.md](2026-04-07-phase-4-weaver-agent-management-design.md)
8. [2026-04-07-phase-4-weaver-and-agent-management-implementation.md](2026-04-07-phase-4-weaver-and-agent-management-implementation.md)
9. [../phase-1/2026-04-02-phase-1-model-surface-design.md](../phase-1/2026-04-02-phase-1-model-surface-design.md)
10. [../phase-3/2026-04-06-phase-3-master-design.md](../phase-3/2026-04-06-phase-3-master-design.md)
11. [../../../../../archive/docs/narrative-editor-redesign/master-record.md](../../../../../archive/docs/narrative-editor-redesign/master-record.md)

## Final Verification

- `npm test` 通过：`90` files / `746` tests
- `npm run build` 通过，仅有既存 ESLint warning
- `npm run type-check:simulation` 通过
- `npm run test:simulation` 通过：`35` files / `349` tests
- 浏览器验收已完成，确认 `agent 管理` 页面、空白创建主流程和文本导入前端接线

## Frozen Product Conclusions

- `weaver agent` 是 built-in、`always-on` 的 sidecar。
- `agent 管理页面` 是 built-in sidecar 的说明与状态页，不是本期主操作入口。
- `weaver` 的主产品动作是“从文本创建一个新的 story package”。
- 文本导入不做预览，不切 `phase` / `beat`，作者原始文本默认沉淀为 `opening hook`。
- `gossipelog` 必须在建包后获得显式初始化，而不是等后续自然收敛。

## Engineering Boundaries

- `weaver` 不应绕开既有服务端 package scaffold / create 主链路。
- `weaver` 解析文本的职责，与 package 持久化职责必须保持分离。
- `weaver` 保持 `1` 个 `weaver-import-skill`；字段差异由结构化输出和代码分发处理。
- sidecar 统一共享 reference loader 框架；每个 sidecar 自己声明 manifest / resolver。
- `prompt assembly` 继续是统一对外 prompt 边界，不直接承载 sidecar 特例分支。
