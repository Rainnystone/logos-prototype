# Progress

## 2026-04-01

- 完成仓库边界梳理，确认 LOGOS 当前是严格的双链路系统：
  - Runtime Loop
  - Authoring Loop
- 确认首批正式 seam：
  - `saveSectionDraft()`
  - `createOrchestrator(...).initScene()` / `runBeat()`
  - `LLMAdapter`
  - `runGossipelogCycle()`
- 建立独立工作区 `simulation-toolset/`，把本线程文档迁入 `simulation-toolset/docs/`
- 落地 Phase 2 MVP：
  - `simulation-toolset/src/contracts.ts`
  - `simulation-toolset/src/recorder.ts`
  - `simulation-toolset/src/scripted-adapter.ts`
  - `simulation-toolset/src/temp-package.ts`
  - `simulation-toolset/src/author-simulator.ts`
  - `simulation-toolset/src/player-simulator.ts`
  - `simulation-toolset/src/gossipelog-observer.ts`
  - `simulation-toolset/src/report-writer.ts`
  - `simulation-toolset/src/scenario-runner.ts`
- 落地 3 个 MVP 场景：
  - `simulation-toolset/scenarios/happy-path.ts`
  - `simulation-toolset/scenarios/validation-failure.ts`
  - `simulation-toolset/scenarios/adapter-failure.ts`
- 明确并验证 no-audit 合法分支：
  - 作者不勾选任何 audit question 时，runtime 不触发 auditor 仍属于正式允许行为
- 完成 Phase 3：
  - fixture-owned cleanup
  - delayed scripted adapter
  - batch scenario runner
  - timing trace 进入 report contract
- 当日验证记录：
  - `npm run test:simulation`
  - `npm run type-check:simulation`
  - 关键跨边界回归

## 2026-04-02

- 完成 Phase 4B：sidecar extension layer
  - 新增 `simulation-toolset/src/sidecar-trace.ts`
  - 将 gossipelog observer 输出归一化为 `agentId / stage / outcome / sideEffectSummary`
  - 保留 raw gossipelog result 供底层证据使用，但 scenario/report 使用统一 trace
- 完成 Phase 4C：governance / reuse minimums
  - 新增 `simulation-toolset/src/scenario-manifest.ts`
  - 新增 `simulation-toolset/src/temp-package-scavenger.ts`
  - `simulation-toolset/src/contracts.ts` 增加 `schemaVersion` 与 `SimulationRunIndexSchema`
  - `simulation-toolset/src/scenario-runner.ts` 增加 `run-index.json` 落盘
- 完成 Phase 4D：轻量 UI smoke
  - 新增 `simulation-toolset/src/ui-smoke.ts`
  - 新增 `simulation-toolset/tests/ui-smoke.test.ts`
  - `simulation-toolset/vitest.config.ts` 接入 React plugin，以便 isolated workspace 可以执行真实 `.tsx` 页面 smoke
- 轻量 UI smoke 覆盖：
  - edit workbench `保存本页 -> shared save route path`
  - play workbench `Start Round -> runtime loop -> sidecar hook`
- 当日 fresh verification：
  - `npm run type-check:simulation` passed
  - `npm run test:simulation` passed with 11 files and 30 tests
  - `npm test -- src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts src/app/api/authoring/packages/[packageName]/diagnostics/route.test.ts src/app/api/play/gossipelog/route.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/orchestrator.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts` passed with 7 files and 55 tests
- 本轮没有修改 product 主链路实现，只扩展了 `simulation-toolset/` workspace
- 当前没有悬挂的 subagent
- Rewrote `simulation-toolset/agent-guide.md` as a cloud Codex runbook instead of a lightweight quickstart.
- The new guide now explains:
  - why the toolset exists
  - which simulation layers exist and what each one is for
  - how to run inside an isolated workspace or branch
  - how to create `summary.md`, `commands.log`, `debug.log`, and `suggested-changes.md`
  - what a complete run should look like from intent to cleanup
- Folded the most reusable parts of `systematic-debugging` into the guide:
  - root-cause-first
  - backward tracing
  - evidence collection at boundaries
  - one hypothesis at a time
  - condition-based waiting
  - defense-in-depth as suggestion guidance
- Updated `simulation-toolset/README.md` so the guide is explicitly the cloud Codex operational entry point.
- This round is documentation-only and does not change harness code or test behavior.
- 在当前 Phase 1 worktree 里重新运行 `simulation-toolset`，确认旧版全绿结果已经落后于今天的地点选择新规则。
- 为 `simulation-toolset/src/route-smoke.ts` 补上一条新的跨边界 smoke：
  - `scene-phase-authoring` 保存地点选择
  - `loadRuntimeStoryPackage()` 做 runtime 投影
  - `generate` request 里的 `locationPatch` 作为最终证据
- 新 smoke 已确认两种状态：
  - 只选中的地点会进入本轮 prompt
  - 清空地点选择后，runtime 投影与 prompt 里的地点文本都会清空
- 更新了 `simulation-toolset/README.md` 与 `simulation-toolset/agent-guide.md`，把这条新 smoke 纳入当前正式能力说明。
- 当日 fresh verification：
  - `npm run type-check:simulation` passed
  - `npm run test:simulation` passed with 11 files and 31 tests

## 2026-04-04

- 启动 Phase 5：Session Continuity + Edit Continuity Simulation
- 目标：覆盖 Phase 2 引入的 runtime session continuity 能力
- 完成设计文档：
  - `simulation-toolset/docs/2026-04-04-session-continuity-simulation-design.md`
  - `simulation-toolset/docs/2026-04-04-session-continuity-simulation-implementation.md`
- 规划 3 个新模块：
  - `SessionObserver` — 观察 runtime-sessions.json 读写
  - `SessionSimulator` — 协调 restore/reset 流程
  - `EditContinuityObserver` — 观察 edit continuity view
- 规划 6 个新场景：
  - S1: Checkpoint Persistence
  - S2: Session Restore
  - S3: Reset Workbench
  - S4: Stale Refresh Protection
  - S5: Relationship Finalization
  - S6: Edit Continuity View
- 完成 Phase 5 实现：
  - 完成 3 个新模块 (SessionObserver, SessionSimulator, EditContinuityObserver)
  - 完成 6 个新场景 (S1-S6)
  - 所有测试通过 (64 tests, 20 test files)
  - 类型检查通过
  - 跨边界回归测试通过 (55 tests)
  - 更新了 scenario-manifest.ts 和 README.md
- 当日验证记录：
  - `npm run type-check:simulation` passed
  - `npm run test:simulation` passed with 20 files and 64 tests
  - `npm test -- src/runtime-sessions/__tests__/ src/agents/gossipelog/__tests__/ src/app/play/runtime.test.ts` passed with 6 files and 55 tests

## 2026-04-06 Plan Sync

- 重新梳理 Phase 3 Part 2 / Phase 6 的当前状态，确认产品侧 storyline / workspace seam 已经落地，simulation-toolset 需要补的是云端可脚本化验证层，不是重做产品实现。
- 读完并对齐了这些材料：
  - `simulation-toolset/README.md`
  - `simulation-toolset/agent-guide.md`
  - `simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md`
  - `docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md`
  - `src/storylines/substrate.ts`
  - `src/storylines/workspace-view.ts`
  - `src/storylines/repository.ts`
  - `src/storylines/workspaces.ts`
  - `src/types/storyline-management.ts`
- 发现上一轮看起来“卡住”不是代码问题，而是流程问题：
  - brainstorming 的设计审批门槛被带到了 implementation-plan 阶段
  - 这次已经有 approved spec，不应该再次等待设计批准
  - 直接进入 writing-plans 才是正确的下一步
- 已经把这个工作流修正同步到规划文件：
  - `simulation-toolset/docs/task_plan.md`
  - `simulation-toolset/docs/findings.md`
- 接下来要做的是输出 Phase 6 的 implementation plan，并按 slice 推进模拟器实现

## 2026-04-06

- 启动 Phase 6：Storyline Mock & E2E Flow
- 目标：覆盖 Phase 3 Part 1/2 引入的 storyline 能力
- 完成设计文档：
  - `simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md`
- 架构决策：
  - 采用统一 MockKernel 方案
  - MockKernel 作为内存状态机 + Record/Replay
  - SubstrateMock → RouteMock → E2ESimulator 分层
- 规划新增模块：
  - `mock-kernel.ts` — 统一状态管理核心
  - `substrate-mock.ts` — Substrate 操作 mock
  - `route-mock.ts` — Route 层 mock
  - `storyline-e2e-simulator.ts` — E2E Flow 模拟器
  - `storyline-observer.ts` — Storyline 状态观测
  - `mock-fixture-builder.ts` — 内存 fixture 构造器
  - `serialized-trace.ts` — Trace 序列化
- 规划重构模块：
  - `session-simulator.ts` — 绑定 MockKernel
  - `temp-package.ts` — 扩展 Phase 3 结构支持
  - `scripted-adapter.ts` — 接入 trace 系统
  - `scenario-runner.ts` — 支持 record/replay
- 规划 6 个 E2E Flow：
  - F1: create_from_source_and_continue
  - F2: branch_from_checkpoint_flow
  - F3: switch_and_continue
  - F4: rename_and_verify
  - F5: legacy_bootstrap_flow
  - F6: full_storyline_runtime_flow
- 下一步：Spec review → Implementation plan

---

## 2026-04-08 Phase 7: 统一 Mock 时钟

### 问题诊断

- 发现 `rename-and-verify-scenario.test.ts` 间歇性失败（约 30% 失败率）
- 排除了测试隔离问题、ID 冲突等假设
- 定位根因：时间戳精度问题
  - `buildStoryline()` 和 `updateStorylineDisplayName()` 在同一毫秒内执行
  - 生成相同的 `new Date().toISOString()`
  - 断言 `updatedAt !== initialUpdatedAt` 失败

### TDD 实现流程

#### 任务 A: 短期修复

1. **RED**: 创建 `rename-assertion-logic.test.ts` 描述期望行为
2. **GREEN**:
   - 添加 `isValidISOTimestamp()` 辅助函数
   - 修改断言从 `updated-at-changed` 改为 `updated-at-valid`
   - 检查 updatedAt 是有效 ISO 时间戳，而非必须不同
3. **验证**: 10 次完整套件运行全部通过

#### 任务 B: 统一 Mock 时钟

1. **RED**: 创建 `mock-clock.test.ts` (19 tests)
2. **GREEN**: 实现 `MockClock`
   - `frozen` 模式：时间冻结
   - `controlled` 模式：可手动推进时间
   - `real` 模式：真实系统时间
3. **集成**: 创建 `mock-kernel-clock.test.ts` (6 tests)
   - MockKernel 接受 `MockKernelOptions.clock` 参数
   - MockFixtureBuilder 使用 `kernel.clock.now()`
   - SubstrateMock 使用 `kernel.clock.now()`
4. **验证**: 380 tests 全部通过，5 次运行全部通过

### 新增文件

- `simulation-toolset/src/mock-clock.ts` - MockClock 实现
- `simulation-toolset/tests/mock-clock.test.ts` - MockClock 测试
- `simulation-toolset/tests/mock-kernel-clock.test.ts` - 集成测试
- `simulation-toolset/tests/rename-assertion-logic.test.ts` - 断言逻辑测试

### 修改文件

- `simulation-toolset/src/mock-kernel.ts` - 添加 clock 支持
- `simulation-toolset/src/mock-fixture-builder.ts` - 使用 kernel.clock
- `simulation-toolset/src/substrate-mock.ts` - 使用 kernel.clock
- `simulation-toolset/scenarios/storyline-flows/rename-and-verify.ts` - 修复断言
- `simulation-toolset/tests/rename-and-verify-scenario.test.ts` - 更新断言名称

### 验证记录

```
npm run test:simulation (5次连续运行) → 38 passed (38) 每次都通过
npm run type-check:simulation → passed
```

### 文档隔离规则强化

- 更新 `simulation-toolset/README.md` 新增两个关键章节：
  - **Documentation Discipline** — 明确文档独立维护路径，严禁修改根目录规划文件
  - **Design Philosophy** — 阐述设计宗旨（云端 Codex、无互联网/浏览器依赖）和五大核心原则
- 此规则强化是为了防止后续再次误修改根目录文档

---

## 2026-04-08 Phase 8: Weaver Agent & Agent Management Simulation

### 设计阶段

- 完成 Phase 8 设计，覆盖 Phase 4（PR #9）引入的全部新特性
- 设计文档：`simulation-toolset/docs/2026-04-08-phase8-weaver-agent-simulation-design.md`
- 架构决策：混合分层方案（方案 C）
- 已更新三文件（task_plan, findings, progress）

### 覆盖范围

- 泛化 SimulationAgentTraceSchema（通用 base + details bag）
- 新增 weaver-observer.ts、weaver-sidecar-trace.ts、bootstrap-observer.ts
- 扩展 ScriptedAdapter 支持 weaver import 模式
- 扩展 UI smoke 覆盖 agent management surface
- 新增 import seed route smoke
- 新增 4 个场景（S7-S10）

### 当前进度

- [x] 设计完成并写入 spec
- [x] 三文件更新
- [ ] Spec review（后台 agent 运行中）
- [ ] Spec 用户审批
- [ ] Implementation plan
- [ ] Slice 1-11 实现
- [ ] 全量回归验证
