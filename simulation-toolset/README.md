# Simulation Toolset Workspace

This directory is an isolated workspace for the cloud-friendly simulation toolset.

## Purpose

This toolset enables **cloud Codex** (no internet, no browser) to simulate human behavior for LOGOS regression testing.

- Keep simulation harness work separate from product runtime code and formal planning docs.
- Host the scriptable system-regression layer for authoring, runtime, adapter, and sidecar validation.
- Support future cloud batch execution with structured reports.

## Documentation Discipline

**CRITICAL:** simulation-toolset 严格维护自己独立的文档，完全独立于仓库根目录的规划文件。

- **维护路径：** `simulation-toolset/docs/`
  - `simulation-toolset/docs/task_plan.md` — 多阶段任务路线图
  - `simulation-toolset/docs/findings.md` — 研究发现和架构决策
  - `simulation-toolset/docs/progress.md` — 当前进度和验证记录

- **严禁事项：**
  - ❌ 严禁因 simulation-toolset 工作而修改根目录的 `task_plan.md`、`progress.md`、`findings.md`
  - ❌ 严禁将 simulation-toolset 相关内容写入根目录规划文件
  - ❌ 严禁在根目录文档中引用 simulation-toolset 的阶段或任务

根目录规划文件仅用于追踪主产品线工作，simulation-toolset 是独立的子工作空间，有自己的完整规划体系。

## Design Philosophy

simulation-toolset 的设计宗旨是：**让云端环境的 Codex 可以在不依赖互联网、不依赖浏览器的条件下，mock 人类操作本系统。**

核心设计原则：

1. **End-to-End Coverage** — 覆盖完整的人类操作流程，从作者侧结构化保存到玩家侧 runtime 循环
2. **No External Dependencies** — 不依赖互联网、不依赖浏览器自动化，所有 mock 在内存中完成
3. **No Technical Debt** — 不接受暂时性补丁或增加技术债的临时方案
4. **Boundary-First** — 优先验证正式边界（route、bridge、adapter），而非 UI 层
5. **Story-Agnostic** — 所有测试场景必须是题材无关、故事无关的

所有架构决策必须遵循这些原则。如果某个方案会增加技术债或依赖外部资源（如真实浏览器），则该方案不符合 simulation-toolset 设计目标，必须重新设计。

## Planned Structure

- `docs/`: design, implementation plan, findings, and progress for this thread
- `src/`: simulation harness source
- `tests/`: TDD-driven simulation tests
- `scenarios/`: reusable scenario definitions
- `reports/`: optional persisted JSON reports

## Boundary

- Product code remains under `src/`.
- Existing tests remain in place unless a shared helper is intentionally extracted.
- This workspace consumes formal seams such as `saveSectionDraft()`, `createOrchestrator()`, `LLMAdapter`, and `runGossipelogCycle()`; it does not redefine them.
- Runtime simulation must treat `audit()` as a conditional branch, not a guaranteed step. If a package selects no audit questions, the simulator should accept a no-auditor path as valid behavior.

## Current Capabilities

- Per-fixture temp story package isolation with fixture-owned `cleanup()`
- Author simulator cleanup via `simulator.cleanup()`
- Scripted adapter modes for result, timeout, malformed, provider error, duplicate, delayed, and out-of-order simulation
- Normalized sidecar trace via `agentId`, `stage`, `outcome`, and `sideEffectSummary`
- Batch scenario execution through `runSimulationScenarioBatch(...)`
- Built-in scenario manifest plus batch `run-index.json`
- Report `schemaVersion` for artifact evolution
- Temp package scavenging for list / dry-run / remove cleanup flows
- Programmatic route smoke through:
  - authoring `sections/[sectionId]`
  - scene-phase location selection -> runtime location projection -> prompt location patch
  - authoring `diagnostics`
  - play `gossipelog`
- Lightweight UI smoke through:
  - edit workbench `保存本页 -> shared save route path`
  - play workbench `Start Round -> runtime loop -> sidecar hook`
- Session continuity simulation:
  - Checkpoint persistence after accepted beats
  - Session restore with state/history preservation
  - Reset workbench semantics (new session, old session preserved)
  - Stale refresh protection (reset isolation from pending operations)
  - Relationship finalization (gossipelog -> session/checkpoint binding)
  - Edit continuity bounded view (no raw checkpoint exposure)
- Optional JSON report persistence under `simulation-toolset/reports/` or a caller-provided output directory
- **Storyline Mock Stack** (Phase 3):
  - MockKernel: in-memory state machine with operation tracing and replay
  - SubstrateMock: storyline substrate operations (create, branch, switch, rename, ensure session, runtime commands)
  - RouteMock: HTTP route layer over SubstrateMock
  - MockFixtureBuilder: in-memory fixture construction for storyline state
  - StorylineObserver: state assertions and summary queries
  - StorylineE2ESimulator: complete human workflow simulation
  - Six E2E flow scenarios:
    - `create_from_source_and_continue`: Create new storyline from source and continue
    - `branch_from_checkpoint_flow`: Branch from a reachable checkpoint
    - `switch_and_continue`: Switch to existing storyline
    - `rename_and_verify`: Rename storyline and verify consistency
    - `legacy_bootstrap_flow`: Bootstrap from legacy runtime-sessions
    - `full_storyline_runtime_flow`: Complete runtime flow with checkpoint branching
  - Serialized trace support for record/replay
  - Story-agnostic test fixtures
- **Weaver Agent & Bootstrap Simulation** (Phase 8):
  - WeaverObserver: observe weaver import cycle boundary
  - BootstrapObserver: observe gossipelog bootstrap from weaver summary
  - Normalized weaver trace via `agentId`, `stage`, `outcome`, `details`
  - ScriptedAdapter `weaverImport` mode for mock-based scenarios
  - Import seed mapping smoke verification
  - Agent surface UI smoke (built-in sidecar visibility, no disable toggle)
  - Four new executable scenarios:
    - `weaver-import-happy-path`: Clean text import → package creation
    - `weaver-import-partial`: Import with warnings → scaffold defaults
    - `weaver-import-bootstrap`: Import → gossipelog bootstrap success
    - `bootstrap-fallback`: Bootstrap failure → fallback_pending state
  - Generalized `SimulationAgentTraceSchema` with `details` bag (schema version 2)

## Cloud Usage Direction

The current Phase 3 entry point is programmatic rather than browser-driven:

```ts
import { createHappyPathScenario } from '../scenarios/happy-path';
import { createValidationFailureScenario } from '../scenarios/validation-failure';
import { runSimulationScenarioBatch } from '../src/scenario-runner';

const result = await runSimulationScenarioBatch({
  scenarios: [
    createHappyPathScenario(),
    createValidationFailureScenario(),
  ],
  outputDir: 'simulation-toolset/reports/batch-run',
});
```

This keeps the first cloud-facing version boundary-first:

- no browser automation requirement
- no direct file writes outside the formal authoring bridge
- no story-specific logic baked into the harness

For the cloud Codex run workflow, artifact discipline, debugging protocol, and cleanup expectations, see [agent-guide.md](agent-guide.md).
