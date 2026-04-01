# Findings

## Confirmed Boundaries

- LOGOS 当前是严格双链路系统：
  - Runtime Loop 走 `Player Input -> Orchestrator -> Adapter -> Audit/Accept`
  - Authoring Loop 走 `Structured Save Request -> Bridge -> Validation -> Writeback -> Reload`
- `coordinator` 不是 sidecar agent，也不是文件写回边界。
- 正式写回边界在 [bridge.ts](F:/vibe%20coding/LOGOS-Narrative-Editor/src/authoring/persistence/bridge.ts)。
- 第一个真正落地的 sidecar agent 是 `gossipelog agent`。

## Confirmed Stable Seams

- 作者侧最稳定正式注入点是 `saveSectionDraft()`：
  - 页面 route 和 coordinator route 都汇入这条共享链路。
- 玩家侧最稳定正式注入点是 `createOrchestrator(...).initScene()` 与 `runBeat()`。
- runtime 中的 auditor 不是强制步骤。
  - 当前结构允许作者不勾选任何 audit question，从而让 runtime 合法地不触发 `audit()`。
  - simulation toolset 不能把 auditor 误建模成必经节点。
- 外部 provider / callback 的最佳 fake seam 是 `LLMAdapter`。
- sidecar 生命周期的最佳观测点是 `runGossipelogCycle()` 返回的结构化结果与其 package-state 文件副作用。

## Existing Test Reality

- 现有关键边界已经有较强测试覆盖：
  - authoring bridge
  - orchestrator
  - gossipelog agent
  - play runtime wrapper
- 已验证关键回归测试 52/52 通过，说明这些 seam 当前可作为第一版 simulation harness 的落点。

## Current Documentation Reality

- 仓库当前不存在实际可用的 `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 目录。
- 当前可依赖的活边界主要来自：
  - `README.md`
  - `AGENTS.md`
  - `archive/docs/narrative-editor-redesign/master-record.md`
  - 相关归档 superpowers 文档
- 因此本线程不应伪造“已有 active 计划目录”这一前提。

## MVP Direction

- 第一版不应以浏览器自动化为主。
- 第一版应该是“边界注入式 harness + 结构化 trace/report + 少量 route/UI smoke”。
- 最小闭环建议定义为：
  - 作者 structured save
  - bridge validation/writeback/reload
  - runtime package load
  - player runBeat
  - adapter outbound/inbound
  - accepted beat
  - gossipelog refresh 或 fallback
  - trace/assertions/report

## What Should Be Centralized

- 应集中的是“simulation 基础设施”：
  - temp package fixture
  - scripted adapter
  - author simulator
  - player simulator
  - sidecar observer
  - recorder / trace / report writer
  - scenario runner
- 不建议第一步就把现有散落单元测试整体搬家。
- 更合理的做法是把 simulation toolset 升格为根目录独立工作区 `simulation-toolset/`，然后逐步吸收重复 helper。
- 为避免污染主仓库边界，toolset 更适合拥有自己的最小 `tsconfig`、`vitest` 配置与脚本入口，而不是直接把主配置粗暴扩到根目录全部文件。

## Highest-Value Failure Risks

- validation failure
- writeback 后 reload drift
- adapter timeout / malformed response / provider error
- accepted beat 后的 gossipelog fallback
- 下一拍 prompt 吃到过期 relationship layer
- authoring state 与 runtime state desync

## Proposed Post-Design Phases

- 阶段 2：MVP harness 落地
- 阶段 3：场景扩展与 cloud 批跑
- 阶段 4：基础设施化与可持续复用

## Phase 3 Focus

- 现阶段最值得优先补的不是更多故事场景，而是 cloud 运行必需的三个基础能力：
  - fixture isolation
  - batch execution
  - delayed response simulation
- Phase 3 目前采用的是“顺序 batch + 自动落盘 + 最小时序元数据”的路线：
  - `runSimulationScenarioBatch(...)` 先保持顺序执行，避免把并发调度和 fixture 生命周期问题绑在一起
  - `delay` 模式只模拟 pull-style `LLMAdapter` promise 延迟，不重定义 callback source
  - timing 元数据进入 simulation report contract，便于 cloud 复盘
- `duplicate / out-of-order` 在当前 pull-style `LLMAdapter` 接口下，不适合一开始就硬做成复杂 callback 框架。
  - 更稳的阶段 3 路线是先补 delay / timeout / report persistence / per-fixture cleanup。
  - 真正的 callback-source loopback 如果后续需要，应作为阶段 4 的扩展 seam 再引入。

## Final Shape

- 最终不应是临时脚本集合。
- 最终应是一层位于单元测试与浏览器回归之间的正式系统级 simulation 基础设施：
  - 保留现有模块测试
  - 新增根目录独立的 simulation workspace
  - 输出结构化 JSON report
  - 补少量 smoke，而不是用浏览器点击承担主回归职责
