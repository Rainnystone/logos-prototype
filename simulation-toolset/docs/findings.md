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

## 2026-04-02 Phase 1 Location Projection Alignment

- 今天 Phase 1 引入的关键边界不是”世界页新增了地点对象”，而是”场景里显式选中的地点才应进入本轮 runtime prompt projection”。
- 因此旧版 `simulation-toolset` 即使全绿，也不足以证明今天这条新边界安全，因为它还没有把 scene-phase 地点选择一路追到 generate request。
- 当前最合适的 toolset 覆盖点不是重 UI 回归，而是 route smoke：
  - 先通过正式 `sections/[sectionId]` route 保存地点选择
  - 再通过 `loadRuntimeStoryPackage()` 观察 runtime world projection
  - 最后以 `generate` request 中的 `worldBase.locationPatch` 作为 prompt assembler 侧的最终证据
- 对这条边界，至少要稳定覆盖两种状态：
  - 选中子集时，只有被选中的地点进入 prompt
  - 清空选择后，prompt 中不再保留地点文本

## 2026-04-04 Phase 5 Session Continuity Gap Analysis

- Phase 2 引入的 `runtime-sessions.json` 是重要的运行时连续性基底，但当前 simulation-toolset 完全没有覆盖。
- 关键差距：
  - Checkpoint 持久化验证缺失
  - Session restore 行为验证缺失
  - Reset workbench 语义验证缺失
  - Stale refresh 保护验证缺失
  - Edit continuity bounded view 验证缺失
- 设计决策：
  - 采用独立模块方案（与 GossipelogObserver 风格一致）
  - SessionObserver 专注读 session 状态，不混合写入职责
  - SessionSimulator 协调 restore/reset 流程
  - EditContinuityObserver 验证 bounded projection 不暴露 raw data
- 架构原则：
  - 消费正式 seam：`runtime-sessions/repository.ts`、`runtime-sessions/views.ts`
  - 不修改产品代码
  - 所有场景通过 temp package 隔离
- Stale refresh 场景需要特殊处理：
  - 使用 ScriptedAdapter 的 delay 模式模拟异步
  - 在 pending refresh 期间触发 reset
  - 验证最终结果符合 sessionId/checkpointId 绑定语义

## 2026-04-06 Phase 6 Storyline Mock Findings

- 产品侧已经有可消费的正式 seam，不需要在 simulation-toolset 里再发明一套 storyline 写回模型：
  - `src/storylines/substrate.ts`
  - `src/storylines/workspace-view.ts`
  - `src/storylines/repository.ts`
  - `src/storylines/workspaces.ts`
  - `src/types/storyline-management.ts`
- simulation-toolset 现有的 session / adapter / runner 结构可以继续扩展，不需要推倒重做：
  - `session-simulator.ts`
  - `temp-package.ts`
  - `scripted-adapter.ts`
  - `scenario-runner.ts`
- Phase 6 的核心复用策略应是：
  - 一个 `MockKernel` 作为单一状态核心
  - 现有工具向它绑定，而不是平行再建一套模拟层
  - 先写 trace / schema / replay 约束，再补流转逻辑
- 这次“卡住”的根因是流程门槛，而不是代码或测试失败：
  - brainstorming 的“设计批准后再进入 implementation plan”这条门槛，被带进了已经 approved 的 spec 之后
  - 这会让流程看起来像在等待用户，其实只是应该切换到 writing-plans
  - 修正方式不是改代码，而是明确把 Phase 6 直接纳入 implementation-plan 阶段

## 2026-04-06 Phase 6 Storyline Mock Architecture Decision

- Phase 3 Part 1/2 引入了新的对象模型（Storyline、Variant Workspace、Storyline Repository），现有 toolset 完全没有覆盖。
- 关键差距：
  - 无法验证 storyline 创建/分支/切换操作
  - 无法验证 variant workspace 物化和复制
  - 无法验证 session 绑定到 storyline
  - 无法验证 workspace view 投影
- 架构决策：
  - 采用统一 MockKernel 方案，而非渐进打补丁
  - MockKernel 作为内存状态机，支持 Record/Replay
  - SubstrateMock 封装 storyline 操作，RouteMock 模拟 HTTP API
  - E2ESimulator 支持完整人类操作流程模拟
- 设计原则：
  1. 模拟人类行为（代码形式，不依赖浏览器）
  2. Systematic-debugging 思路（完整 trace，根因追踪）
  3. 扩展现有工具优先于新建
- Mock vs 真实文件系统：
  - Mock 工具应该是内存中的 API mock
  - 不依赖文件系统（不稳定且难以 replay）
  - 现有 temp-package 继续用于需要真实文件系统的场景（route smoke）
- 现有工具重构：
  - SessionSimulator 重构绑定 MockKernel
  - TempPackage 扩展支持 Phase 3 结构
  - ScriptedAdapter 扩展接入 trace 系统
  - ScenarioRunner 扩展支持 record/replay

## 2026-04-08 Phase 7 统一 Mock 时钟

### 问题根因

`rename-and-verify-scenario.test.ts` 间歇性失败：
- 非测试隔离问题，非 ID 冲突
- 时间戳精度问题：`buildStoryline()` 和 `updateStorylineDisplayName()` 在同一毫秒内执行时生成相同时间戳
- 断言 `updatedAt !== initialUpdatedAt` 在快速执行时失败

### 解决方案

1. **短期修复**: 修改断言检查 updatedAt 是有效 ISO 时间戳
2. **根本解决**: 引入 `MockClock` 使测试完全确定性

### MockClock 设计

```typescript
type MockClockMode = 'frozen' | 'controlled' | 'real';

interface MockClock {
  now(): string;           // ISO 时间戳
  nowAsDate(): Date;       // Date 对象
  nowMs(): number;         // 毫秒数
  advance(ms: number): void;  // 推进时间 (controlled mode)
  set(date: Date): void;   // 设置时间 (controlled mode)
  getMode(): MockClockMode;
}
```

### 集成点

- `MockKernel` 持有 clock 实例，通过 `MockKernelOptions.clock` 注入
- `MockFixtureBuilder` 使用 `kernel.clock.now()`
- `SubstrateMock` 使用 `kernel.clock.now()`

### 最佳实践

- 测试应使用 `frozen` 或 `controlled` 模式确保确定性
- 生产代码默认使用 `real` 模式（向后兼容）
- 时间推进测试（超时、延迟）可使用 `controlled` 模式
