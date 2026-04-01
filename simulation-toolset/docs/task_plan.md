# Task Plan

## Goal

为 LOGOS 设计并分阶段落地一套独立于正式开发计划的 `cloud-friendly mock / simulation test toolset`。本线程的分析、设计、实施计划与后续实现记录统一维护在根目录独立工作区 `simulation-toolset/` 下，避免与现有 `docs/superpowers` 体系混用。

## Completion Standard

- 明确双链路系统中 Authoring / Runtime / Adapter / Sidecar 的正式模拟注入点
- 明确第一阶段最小可用闭环、必须覆盖的场景与非目标
- 明确 trace / report / assertion 的结构
- 明确后续阶段数量、各阶段目标，以及最终工具形态
- 明确哪些测试基础设施应集中，哪些现有测试应保持原位
- 第一阶段先冻结边界与目录；后续阶段按实施计划进入最小实现

## Active Phases

| Phase | Status | Content |
|------|------|------|
| 1 | complete | 阅读 README、AGENTS、master record、authoring/runtime/adapter/agent 相关代码 |
| 2 | complete | 收敛正式注入点、系统级模拟边界、UI smoke 边界与优先风险 |
| 3 | complete | 产出独立设计文档，冻结 MVP 闭环、trace 结构与长期形态 |
| 4 | complete | 产出独立实施计划，定义后续实现阶段与文件责任 |
| 5 | complete | 冻结根目录独立工作区结构，并把设计与实施计划同步到新目录 |
| 6 | complete | 按实施计划完成 Phase 2 MVP：workspace 配置、contracts、最小 harness、三类场景与回归验证 |
| 7 | complete | 收口文档与残余风险，明确 no-audit 分支、cloud 批跑前的并发隔离与时序模拟缺口 |
| 8 | complete | 推进并完成 Phase 3：补并发安全 fixture、延迟型 scripted adapter、批量 scenario runner、timing report contract 与 report 落盘入口 |
| 9 | in_progress | Phase 4A 先落最小 route smoke；并发 batch orchestration、真实 callback-source seam、UI smoke、长期治理继续后置 |
| 10 | pending | 等产品层开始 Storage / Repository Substrate 设计后，让 simulation toolset 对齐新的 package definition / mutable state / repository seam |

## Phase 3 Scope

- 让 temp story package fixture 支持按句柄隔离与定向 cleanup，避免未来 cloud 同进程批跑时相互污染
- 让 scripted adapter 支持 delay / timeout-before-resolution 一类更接近时序问题的模拟，并把关键时序信息写入 trace
- 增加可批量执行多个 scenario 并写出 JSON report 的 runner 入口，作为 cloud 批跑基础
- 保持 story-agnostic，不引入新重依赖，不改动 bridge / orchestrator / gossipelog 的正式边界

## Phase 3 Done Criteria

- 新增并通过 temp package 隔离回归测试，证明不同 fixture 可以独立 cleanup
- 新增并通过 scripted adapter 时序测试，证明 delay 模式与 trace 可用
- 新增并通过 batch scenario runner 测试，证明可以批量执行 scenario 并落盘 report
- `npm run test:simulation` 与 `npm run type-check:simulation` 通过
- 至少一组跨边界现有测试重新通过，确认未破坏正式主链路

## Phase 4A Scope

- 先补 programmatic route smoke，不引入 browser-first UI automation
- 只覆盖最稳定、最正式的 server route：
  - authoring `sections/[sectionId]`
  - authoring `diagnostics`
  - play `gossipelog`
- route smoke 目标是确认 route 仍然接在正式 bridge / diagnostics / server-side gossipelog cycle 上
- 不把 coordinator chat path、llm proxy、重型 UI 点击流纳入这一轮

## Phase 4A Done Criteria

- 新增 route smoke helper，可被 cloud 环境程序化调用
- 新增并通过 route smoke 测试，覆盖：
  - authoring save -> diagnostics
  - play gossipelog server bridge
- `npm run test:simulation` 通过
- `npm run type-check:simulation` 通过
- 一组现有跨边界回归重新通过

## Thread Rules

- 本线程的工作文件只维护在 `simulation-toolset/docs/`
- 不修改现有 `task_plan.md`、`findings.md`、`progress.md`
- 不把本线程产物写入 `docs/superpowers/plans/` 或 `docs/superpowers/specs/`
- 不引入重大依赖，不启动大规模重构，不把现有分散测试整体搬家

## Output Set

- `simulation-toolset/docs/findings.md`
- `simulation-toolset/docs/progress.md`
- `simulation-toolset/docs/2026-04-01-cloud-simulation-toolset-design.md`
- `simulation-toolset/docs/2026-04-01-cloud-simulation-toolset-implementation-plan.md`
