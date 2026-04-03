# Task Plan

## Goal

为 LOGOS 建立一套独立于正式产品计划目录的 `cloud-friendly mock / simulation test toolset`，用于在不依赖人工逐页点击的前提下，做 authoring、runtime、adapter、sidecar 的系统级回归。

本线程的工作文件统一维护在 `simulation-toolset/` 下，不写入 `docs/superpowers/`。

## Completion Standard

- 明确 authoring / runtime / adapter / sidecar 的正式模拟注入点
- 明确最小可用闭环与首批必覆盖场景
- 输出结构化 trace / report / assertions
- 让 toolset 能独立批跑、落盘、复盘、清理
- 保持 story-agnostic，不绕过 bridge，不把浏览器自动化变成第一版主轴
- 对未来多故事包、storyline、checkpoint、session、agent state 保持兼容方向

## Active Phases

| Phase | Status | Content |
|------|------|------|
| 1 | complete | 读取 README、AGENTS、master record 与相关代码，确认双链路边界 |
| 2 | complete | 收敛正式注入点、MVP 闭环、trace/report 结构与非目标 |
| 3 | complete | 写出独立设计文档与实施计划，冻结目录与线程边界 |
| 4 | complete | 搭建 root 独立 workspace `simulation-toolset/`，隔离文档与实现 |
| 5 | complete | 落地 MVP harness：contracts、recorder、author/player simulator、scripted adapter |
| 6 | complete | 落地 3 个 MVP 场景：happy path、validation failure、adapter failure |
| 7 | complete | 收口阶段 2 文档与验证，确认 no-audit 是正式允许分支 |
| 8 | complete | 完成 Phase 3：fixture isolation、delay adapter、batch runner、timing trace |
| 9 | complete | 完成 Phase 4：route smoke、轻量 UI smoke、sidecar trace normalization、governance/reuse minimums |
| 10 | complete | 完成 Phase 5：Session Continuity + Edit Continuity Simulation（覆盖 Phase 2 runtime session capabilities） |
| 11 | pending | 等产品层进入 `Storage / Repository Substrate` 后，对齐正式 repository seam |

## Phase 4 Scope

- 保持 `route/UI smoke` 都是轻量层：
  - route smoke 走正式 server route
  - UI smoke 走 `jsdom + Testing Library`
  - 不引入 browser-first automation
- 把 gossipelog 观测收敛为通用 sidecar trace contract，而不是只保留 agent-specific raw payload
- 补齐最小 governance / reuse：
  - built-in scenario manifest
  - report `schemaVersion`
  - batch `run-index.json`
  - temp package scavenger
- 明确后置项：
  - 真正 callback-source scheduler
  - 产品层 repository seam
  - 重型 UI regression framework

## Phase 4 Done Criteria

- route smoke 与 UI smoke 全部通过：
  - authoring `sections/[sectionId] -> bridge -> reload -> diagnostics`
  - play `/api/play/gossipelog -> server-side cycle`
  - edit workbench `保存本页 -> shared save route path`
  - play workbench `Start Round -> runtime loop -> sidecar hook`
- gossipelog 观测结果已归一化进入 toolset report contract：
  - `agentId`
  - `stage`
  - `outcome`
  - `sideEffectSummary`
- batch runner 会写出带 manifest metadata 的 `run-index.json`
- temp package scavenger 支持 list / dry-run / remove
- 以下验证全部重新通过：
  - `npm run type-check:simulation`
  - `npm run test:simulation`
  - `npm test -- src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts src/app/api/authoring/packages/[packageName]/diagnostics/route.test.ts src/app/api/play/gossipelog/route.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/orchestrator.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts`

## Thread Rules

- 本线程的工作文件只维护在 `simulation-toolset/docs/`
- 不把本线程产物写入 `docs/superpowers/plans/` 或 `docs/superpowers/specs/`
- 不把 product repository seam 伪装成 simulation 的临时补丁
- 不引入重大依赖，不做大规模重构，不迁移现有模块测试目录

## Output Set

- `simulation-toolset/docs/findings.md`
- `simulation-toolset/docs/progress.md`
- `simulation-toolset/docs/task_plan.md`
- `simulation-toolset/docs/2026-04-01-cloud-simulation-toolset-design.md`
- `simulation-toolset/docs/2026-04-01-cloud-simulation-toolset-implementation-plan.md`
- `simulation-toolset/docs/2026-04-04-session-continuity-simulation-design.md`
- `simulation-toolset/docs/2026-04-04-session-continuity-simulation-implementation.md`

## 2026-04-02 Agent Guide Hardening

- Status: complete
- Scope:
  - rewrite `simulation-toolset/agent-guide.md` as a workflow-first runbook for cloud Codex
  - explain why the toolset exists, what tools it includes, and when to use each layer
  - define a full run workflow covering isolated workspace setup, run artifacts, verification flow, debugging discipline, suggested changes, and cleanup
  - bake in the most reusable rules from `systematic-debugging` without assuming cloud agents have local skills
- Explicit rules:
  - default output is evidence and `suggested-changes.md`, not product code edits
  - default workflow is boundary-first simulation, then cross-boundary verification if needed
  - cleanup and temp-package handling must be recorded as part of the run outcome

## 2026-04-02 Phase 1 Location Projection Alignment

- Status: complete
- Scope:
  - 在当前 Phase 1 worktree 里重新运行 `simulation-toolset`
  - 对齐”场景地点选择会影响 runtime prompt projection”这条新产品边界
  - 为 toolset 增加一条正式 smoke，覆盖 `scene-phase-authoring -> runtime package projection -> generate request`
  - 更新 README、agent guide、task_plan、progress、findings，让文档与实际覆盖范围重新同步
- Explicit rules:
  - 不把”地点存在于世界页”误当成”地点已经进入本轮 prompt”
  - smoke 必须同时覆盖”选中地点进入 prompt”和”清空地点后 prompt 为空”两种状态
  - 结论必须基于当前 worktree 实际运行结果，不沿用 root 工作区旧记录

## 2026-04-04 Phase 5 Session Continuity Simulation

- Status: in_progress
- Design: `simulation-toolset/docs/2026-04-04-session-continuity-simulation-design.md`
- Implementation: `simulation-toolset/docs/2026-04-04-session-continuity-simulation-implementation.md`
- Scope:
  - 覆盖 Phase 2 引入的 runtime session continuity 能力
  - 新增 3 个 observer 模块：SessionObserver、SessionSimulator、EditContinuityObserver
  - 新增 6 个场景：checkpoint persistence、session restore、session reset、stale refresh protection、relationship finalization、edit continuity view
- Scenarios:
  - S1: Checkpoint Persistence — accepted beat 后 checkpoint 正确写入 runtime-sessions.json
  - S2: Session Restore — page refresh 后从 active session 恢复 state/history/relationship
  - S3: Reset Workbench — reset 创建新 session，旧 session 保留，回到 awaiting_start
  - S4: Stale Refresh Protection — 旧 refresh 结果不污染新 session
  - S5: Relationship Finalization — gossipelog refresh 正确 finalize 到绑定的 sessionId/checkpointId
  - S6: Edit Continuity View — CharacterSection 显示 bounded continuity，不暴露 raw checkpoints
- Done Criteria:
  - 所有 6 个场景测试通过
  - `npm run test:simulation` 通过
  - `npm run type-check:simulation` 通过
  - 跨边界回归 (`npm test -- src/runtime-sessions/__tests__/`) 通过
  - 不修改 product runtime 代码
- Explicit rules:
  - 使用 `createTempStoryPackage` 做隔离
  - 在 `finally` 块中清理 temp package
  - 所有场景保持 story-agnostic
