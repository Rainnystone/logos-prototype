# Cloud-Friendly Simulation Toolset Design

## 1. Purpose

本设计的目标不是替代所有测试，也不是生成正式产品 spec，而是为 LOGOS 建立一层独立、可脚本化、可扩展、可结构化复盘的 simulation regression 基础设施。

它重点服务三类参与者：

1. 作者侧输入
2. 玩家侧输入
3. 外部 adapter / provider / callback source

## 2. Why This Should Not Be Browser-First

第一版不应以浏览器自动化为主，理由如下：

- 当前正式系统边界已经存在于服务层与运行时层，不需要先靠 DOM 点击证明链路存在。
- 浏览器回归会引入大量与主问题无关的脆弱因素：
  - 页面结构变动
  - 文案变动
  - 交互节奏变动
  - cloud 环境不稳定
- 这次真正需要建立的是“系统级模拟回归基础设施”，而不是“点击式回归脚本库”。

因此第一版应遵循：

- 系统级模拟：边界注入
- 页面验证：少量 smoke

## 3. Confirmed Stable Injection Points

### 3.1 Author Simulator

作者侧最稳定、最正式的模拟注入点是：

- [bridge.ts](F:/vibe%20coding/LOGOS-Narrative-Editor/src/authoring/persistence/bridge.ts) 中的 `saveSectionDraft()`

原因：

- 它已经覆盖正式作者链路中的关键阶段：
  - save request normalization
  - deterministic validation
  - writeback
  - reload
  - save result
- 页面 route 和 coordinator route 都汇入同一条共享保存路径。

### 3.2 Player Simulator

玩家侧最稳定、最正式的模拟注入点是：

- [orchestrator.ts](F:/vibe%20coding/LOGOS-Narrative-Editor/src/engine/orchestrator.ts) 中的 `createOrchestrator()`
- 以及返回实例上的 `initScene()` 与 `runBeat()`

原因：

- 它们直接驱动 Runtime Loop 的正式执行。
- 不依赖 Play UI，即可稳定复现 beat 级行为。
- `audit()` 不是无条件必经步骤。
  - 当前结构允许作者在配置层不选中任何 audit question，此时 runtime 可以合法地不触发 auditor。
  - 第一版 simulation toolset 必须支持并显式记录这条 no-audit 分支。

### 3.3 Fake / Loopback Adapter

adapter 层最适合做 fake / loopback seam 的位置是：

- [adapter-interface.ts](F:/vibe%20coding/LOGOS-Narrative-Editor/src/engine/types/adapter-interface.ts) 中的 `LLMAdapter`

原因：

- 这是 engine 的正式依赖注入边界。
- 可以一次覆盖：
  - collapse
  - route
  - generate
  - audit
  - settlement
  - gossipelogUpdate
  - gossipelogInjection

这比直接 fake 某个具体 provider 更适合第一版系统回归。

### 3.4 Sidecar Observation

`gossipelog agent` 或未来 sidecar agent 的生命周期，当前最适合通过以下两层观测：

1. [agent.ts](F:/vibe%20coding/LOGOS-Narrative-Editor/src/agents/gossipelog/agent.ts) 的结构化返回值
2. package-owned state 文件副作用

当前 gossipelog 已暴露出足够清晰的生命周期证据：

- update request
- update result
- injection request
- relationship layer
- fallback source
- fallback layer

## 4. Scope Split

### 4.1 Suitable For System Simulation

- authoring save loop
- runtime beat progression
- adapter outbound/inbound contract
- gossipelog accepted-beat side loop
- reload consistency
- final state snapshot and assertions

### 4.2 Suitable Only For Lightweight Smoke

- `/edit` 页面是否仍能接到 section save route
- `/play` 页面是否仍能启动 round
- diagnostics route 是否仍返回结构化结果

## 5. MVP Closed Loop

第一阶段最小闭环定义如下：

`作者 structured save -> bridge validation/writeback/reload -> 玩家 initScene/runBeat -> adapter outbound -> scripted inbound -> accepted beat -> sidecar refresh 或 fallback -> trace/report/assertions`

补充说明：

- `audit()` 应被视为 runtime 中的条件分支，而不是最小闭环的固定节点。
- 当 package 未选中任何 audit question 时，happy path 完全可以是“直接 generate -> accepted beat -> sidecar”。

如果要进一步收窄，唯一建议收窄的是：

- 暂不覆盖 coordinator 自然语言输入

但不建议收窄掉：

- bridge
- orchestrator
- adapter
- sidecar

否则这个 toolset 很快会退化成又一组局部测试，而不是系统级回归基础设施。

## 6. Proposed Toolset Structure

建议后续落地目录：

| Area | Proposed Path | Responsibility |
|---|---|---|
| 独立文档 | `simulation-toolset/docs/` | 本线程设计、实施计划与进度跟踪 |
| simulation 源码 | `simulation-toolset/src/` | harness、runner、trace、assertions |
| simulation 测试 | `simulation-toolset/tests/` | TDD 场景测试与模块测试 |
| scenario 脚本 | `simulation-toolset/scenarios/` | 可复用场景定义与脚本化输入 |
| cloud 运行产物 | `simulation-toolset/reports/` | JSON report、trace artifacts |

建议后续代码模块：

| Module | Responsibility |
|---|---|
| `src/contracts.ts` | trace、scenario、assertion、report 的共享结构 |
| `src/temp-package.ts` | 复制/清理 story package fixture |
| `src/scripted-adapter.ts` | 脚本化 fake adapter |
| `src/author-simulator.ts` | 驱动 `saveSectionDraft()` |
| `src/player-simulator.ts` | 驱动 orchestrator |
| `src/gossipelog-observer.ts` | 包装 `runGossipelogCycle()` 并补 side-effect 观测 |
| `src/recorder.ts` | 记录动作与事件 |
| `src/report-writer.ts` | 输出结构化 JSON report |
| `src/scenario-runner.ts` | 组合 author/player/adapter/agent 跑场景 |

## 7. Trace / Recorder / Assertion Design

第一版 report 应优先支持“人工快速复盘”，而不是堆积原始日志。

建议每个 scenario 输出：

- `scenarioMeta`
  - scenario id
  - package name
  - start / end / duration
  - environment
- `actions`
  - 作者动作
  - 玩家动作
  - 外部脚本动作
- `authoringTrace`
  - request summary
  - result kind
  - blocking issues / warnings
  - changed files
  - reload summary
- `runtimeTrace`
  - round
  - phase / beat
  - player input
  - audit invoked or skipped
  - audit result
  - accepted / forceAccepted
  - state summary
- `adapterTrace`
  - operation
  - outbound summary
  - scripted inbound
  - timeout / malformed / provider error mode
- `agentTrace`
  - update request summary
  - update result summary
  - injection summary
  - fallback source / layer
  - file side effects
- `assertions`
  - assertion name
  - pass / fail
  - evidence event id
- `finalState`
  - reloaded story package summary
  - runtime state summary
  - relationship layer summary

## 8. First-Stage Scenarios

第一阶段至少覆盖三个场景：

| Scenario | Purpose |
|---|---|
| Happy path | 打通作者保存 -> runtime 推进 -> adapter 返回 -> accepted beat -> 记录报告，并显式验证 no-audit 合法分支 |
| Validation failure | 证明非法作者输入会被 `save_blocked`，且不会污染文件 |
| Adapter / sidecar exception | 证明 timeout / malformed / provider error / injection failure 会被记录并走明确 fallback |

如果当前 gossipelog seam 已存在，应优先把第三类场景做成 gossipelog refresh failure / fallback。

## 9. Risks And Tradeoffs

### Highest Priority Risks

- validation failure
- writeback inconsistency
- reload drift
- adapter timeout
- malformed adapter response
- provider error
- duplicated / out-of-order callback behavior
- sidecar fallback correctness
- state desync between authoring and runtime

### Chosen Tradeoff

第一版优先：

- 最小闭环
- 结构化 trace
- 稳定可重复

第一版不优先：

- 全量 UI 回归
- provider 级别的精细网络模拟
- 覆盖所有 future sidecar 类型

## 10. Later Phases And Final Shape

建议后续阶段共 3 个，加上当前设计阶段共 4 个阶段。

| Phase | Goal | Output |
|---|---|---|
| Phase 1 | 设计冻结 | 独立设计与实施计划 |
| Phase 2 | MVP harness 落地 | AuthorSimulator、PlayerSimulator、ScriptedAdapter、Recorder |
| Phase 3 | 场景扩展与 cloud 批跑 | 三类基础场景、批跑入口、JSON report |
| Phase 4 | 长期基础设施化 | 可扩展 scenario 库、sidecar 扩展点、少量 smoke |

最终形态应是：

- 现有模块测试仍留原位
- 新增根目录独立的 simulation workspace
- 支持 cloud 环境批量执行
- 每个场景输出结构化报告
- 未来新增 adapter 行为或 sidecar agent 时，只需新增 scenario script 与 observer，不需要重造一套测试方式

## 11. Centralization Strategy

需要集中，但只集中“共享 simulation 工具层”，不集中“全部现有测试文件”。

建议策略：

1. 新建根目录独立的 simulation workspace
2. 逐步抽取已有分散 helper
3. 保持现有单元测试与边界测试原位
4. 让 simulation layer 消费这些已有 seam，而不是替换它们
