# Findings

## Confirmed Boundaries

- LOGOS 当前是严格双链路系统：
  - Runtime Loop：`Player Input -> Orchestrator -> Adapter -> Audit/Accept`
  - Authoring Loop：`Structured Save Request -> Bridge -> Validation -> Writeback -> Reload`
- `coordinator` 不是 sidecar agent，也不是文件写回边界
- 正式写回边界在 `src/authoring/persistence/bridge.ts`
- 当前第一个真实落地的 sidecar agent 是 `gossipelog agent`

## Confirmed Stable Seams

- 作者侧最稳定的正式注入点是 `saveSectionDraft()`
- 玩家侧最稳定的正式注入点是 `createOrchestrator(...).initScene()` 与 `runBeat()`
- adapter / provider 的最佳 fake seam 是 `LLMAdapter`
- sidecar 生命周期的最佳观测点是 `runGossipelogCycle()` 的结构化结果与其 side effects
- runtime 里的 auditor 不是强制步骤：
  - 如果作者没有勾选任何 audit question，runtime 不触发 `audit()` 仍是合法行为

## MVP Direction

- 第一版不应以浏览器自动化为主
- 第一版应采用：
  - 边界注入式 harness
  - 结构化 trace / report
  - 少量 route / UI smoke
- 最小闭环应覆盖：
  - 作者 structured save
  - bridge validation / writeback / reload
  - runtime package load
  - player runBeat
  - adapter outbound / inbound
  - accepted beat
  - gossipelog refresh 或 fallback
  - trace / assertions / report

## Phase 4 Route Smoke Decision

- route smoke 应直接验证正式 server route 是否仍接在共享链路上
- 它的职责是检查入口是否还连着正式边界，不承担重 UI 回归职责
- 本阶段覆盖：
  - authoring `sections/[sectionId]`
  - authoring `diagnostics`
  - play `gossipelog`

## Phase 4 UI Smoke Decision

- UI smoke 可以做，但必须很轻
- 第一版选择 `jsdom + Testing Library`，不引入 browser-first automation
- edit UI smoke 只验证：
  - workbench 仍把保存动作发到共享 save route path
- play UI smoke 只验证：
  - `Start Round` 仍能进入正式 runtime loop
  - sidecar hook 仍会在 UI 驱动下被调用
- 由于 isolated workspace 需要直接执行真实 `.tsx` 页面，toolset 自己的 `vitest.config.ts` 必须接入 React plugin

## Phase 4 Sidecar Extension Decision

- sidecar 扩展层第一版的重点不是“支持更多 agent 名字”，而是建立统一观测 contract
- gossipelog 先作为第一种 sidecar，被归一化到：
  - `agentId`
  - `stage`
  - `outcome`
  - `sideEffectSummary`
- raw gossipelog result 仍然保留在 observer 返回值里，作为底层证据
- scenario 与 report 层优先消费统一 trace，而不是继续绑死 gossipelog-specific nested payload

## Phase 4 Governance Decision

- governance / reuse 的第一版只做最小必要项：
  - built-in scenario manifest
  - report `schemaVersion`
  - batch `run-index.json`
  - temp package scavenger
- 这些能力属于 simulation toolset 自己的基础设施，不需要等待产品架构调整
- 但 `package root / repository seam` 不应在 toolset 里临时发明
- 正式 repository seam 仍应留给后续产品层的 `Storage / Repository Substrate`

## Temp Fixture Risk Clarification

- 当前 temp fixture 的确会在 `src/story-packages/` 下创建 `.tmp-simulation-*`
- 这不是 harness 偷懒，而是当前正式 seam 本身仍把 package root 固定在 `src/story-packages/`
- 因此该问题的性质是：
  - 不是当前 authoring/runtime correctness blocker
  - 是 repo hygiene / cloud workspace hygiene 风险
- 成功运行时，`fixture.cleanup()` 已能阻止新残留继续增长
- 但异常退出或共享 workspace 批跑时，仍需要 scavenger 和隔离工作区治理

## Future Compatibility Rule

- toolset 的长期目标不是“只会跑当前 sample package”
- 它应准备适配未来产品边界：
  - 多故事包管理
  - storyline
  - checkpoint
  - session continuity
  - agent state scope
  - storage / repository substrate
- 因此 best practice 是：
  - 不把 `src/story-packages/` 当长期契约
  - 不把“复制整包目录”当 storyline / session 的长期方案
  - 让 scenario / trace / assertions 未来能挂上 `storylineId`、`checkpointId`、`sessionId`
  - 等正式 repository seam 出现后，toolset 优先迁移到 seam，而不是继续直接碰目录

## 2026-04-02 Agent Guide Best Practice

- The best shape for `agent-guide.md` is a workflow-first runbook, not a short quickstart and not a raw tool inventory.
- The real purpose of this toolset is to let cloud Codex spend time on structured regression, boundary tracing, and evidence capture while the human is doing other work.
- Therefore the guide must explain:
  - why a run is being executed
  - which toolset layer to use for which kind of verification
  - how to create and maintain run artifacts
  - how to record debug evidence
  - how to write modification suggestions without editing code
  - how to clean up temp artifacts at the end of the run
- The most reusable guidance from `systematic-debugging` for this workflow is:
  - root-cause-first investigation
  - backward tracing across boundaries
  - evidence collection before suggestions
  - one hypothesis at a time
- Two supporting patterns are also worth carrying into the guide:
  - prefer condition-based waiting over arbitrary sleeps when a cloud run needs async investigation
  - suggest defense-in-depth directions when a product bug clearly needs stronger boundary validation, but keep that as a recommendation rather than an in-run implementation
