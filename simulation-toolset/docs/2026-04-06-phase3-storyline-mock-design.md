# Phase 3 Storyline Simulation Mock Design

Date: 2026-04-06
Status: Draft
Scope: `simulation-toolset Phase 6 - Storyline Mock & E2E Flow`

## 1. Why This Design Exists

Phase 3 Part 1/2 引入了新的对象模型和操作：
- **Storyline** - author-facing workline，比较和延续的单位
- **Variant Workspace** - 物化的 authoring 变体目录
- **Storyline Repository** - storyline/variant 元数据存储

现有的 simulation toolset 完全没有覆盖这些新能力。Cloud Codex 无法验证：
- Storyline 创建/分支/切换是否正确
- Variant workspace 是否正确物化和复制
- Session 是否正确绑定到 storyline
- Workspace view 是否正确投影

本设计的目标是为 toolset 添加 Phase 3 模拟能力，使 Cloud Codex 能够：
1. 模拟人类在 Story Package Management Workspace 的完整操作
2. 使用 systematic-debugging 思路记录完整 trace
3. 支持 record/replay 进行回归验证

## 2. Design Principles

### 2.1 三个核心原则

1. **模拟人类行为** - 通过代码形式模拟人类操作，不依赖浏览器（不稳定）
2. **Systematic-Debugging 思路** - 完整 trace 记录，支持根因追踪
3. **扩展优先于新建** - 修改现有工具，新功能才新建

### 2.2 Mock vs Real File System

**关键设计决策：Mock 工具应该是内存中的 API mock，不依赖文件系统。**

原因：
- Cloud Codex 不能访问网络
- 文件系统操作不稳定且难以 replay
- 内存 mock 可以精确控制状态和 scripted modes

**例外：** 现有的 `createTempStoryPackage` 继续用于需要真实文件系统的场景（如 route smoke），但新的 storyline mock 应优先使用 MockKernel。

## 3. MockKernel Architecture

### 3.1 Core Concept

MockKernel 作为统一的状态管理核心，提供：
- **内存状态机** - 维护 storyline/repository/session/checkpoint 的完整状态
- **Record/Replay** - 统一记录操作 trace，支持回放验证
- **Scripted Control** - 支持预设响应/错误/延迟

### 3.2 Data Structures

```typescript
interface MockKernelState {
  packageName: string;

  // Storyline layer
  storylineRepository: StorylineRepositoryFile | null;
  variantsById: Map<string, VariantWorkspaceState>;

  // Runtime layer
  runtimeSessions: RuntimeSessionsFile;

  // Tracing
  operationLog: OperationTraceEntry[];
  stateSnapshots: StateSnapshot[];
}

interface VariantWorkspaceState {
  variantId: string;
  worldBase: WorldBaseYaml | null;
  scene: SceneYaml | null;
  phasePlans: PhasePlansYaml | null;
  routerLexicon: RouterLexiconYaml | null;
  auditQuestions: AuditQuestionsYaml | null;
  controlModules: ControlModulesYaml | null;
}

interface OperationTraceEntry {
  sequenceId: number;
  timestamp: string;
  layer: 'substrate' | 'route' | 'runtime';
  operation: string;
  input: unknown;
  output: unknown;
  stateBefore: StateSnapshotRef;
  stateAfter: StateSnapshotRef;
  mode?: ScriptedMode;
  error?: string;
}

type ScriptedMode =
  | { kind: 'success' }
  | { kind: 'failure'; reason: string }
  | { kind: 'error'; message: string }
  | { kind: 'validation_error'; fields: string[] }
  | { kind: 'conflict'; details: string }
  | { kind: 'stale_state'; expectedVersion: number }
  | { kind: 'timeout'; delayMs: number }
  | { kind: 'delayed'; delayMs: number };
```

### 3.3 MockKernel API

```typescript
interface MockKernel {
  // State query
  getState(): MockKernelState;
  getStorylineContext(): ActiveStorylineContext;

  // Operation execution (auto-trace)
  execute<T>(operation: MockOperation<T>): Promise<T>;

  // Scripted control
  scriptNext(mode: ScriptedMode): void;
  scriptSequence(modes: ScriptedMode[]): void;

  // Record/Replay
  getTrace(): OperationTraceEntry[];
  exportTrace(): SerializedTrace;
  importTrace(trace: SerializedTrace): void;
  replay(trace?: SerializedTrace): Promise<ReplayResult>;

  // State snapshot
  snapshot(): StateSnapshotRef;
  restore(ref: StateSnapshotRef): void;

  // Lifecycle
  reset(): void;
  cleanup(): Promise<void>;
}
```

### 3.4 Layer Relationships

```
MockKernel (unified core)
    │
    ├── SubstrateMock
    │       └── Wraps storyline/variant/session operations
    │
    ├── RouteMock
    │       └── Simulates HTTP API, calls SubstrateMock internally
    │
    ├── SessionSimulator (refactored)
    │       └── Now based on MockKernel
    │
    ├── ScriptedAdapter (extended)
    │       └── Plugs into MockKernel trace system
    │
    └── ScenarioRunner (extended)
            └── Supports MockKernel record/replay
```

## 4. SubstrateMock Operations

### 4.1 Covered Operations

```typescript
type SubstrateOperation =
  // Context resolution
  | { kind: 'resolve_active_storyline_context'; input: { packageName: string; forWrite: boolean } }

  // Storyline management
  | { kind: 'switch_active_storyline'; input: { packageName: string; storylineId: string } }
  | { kind: 'create_storyline_from_source'; input: CreateStorylineFromSourceInput }
  | { kind: 'branch_storyline_from_checkpoint'; input: BranchStorylineFromCheckpointInput }
  | { kind: 'update_storyline_display_name'; input: { packageName: string; storylineId: string; nextDisplayName: string } }

  // Session commands
  | { kind: 'ensure_storyline_aware_active_session'; input: { packageName: string } }
  | { kind: 'execute_storyline_runtime_session_command'; input: { packageName: string; command: RuntimeSessionCommand } };
```

### 4.2 Execution Flow

```
execute(operation)
    │
    ├── 1. Check scripted mode
    │       └── Return preset result or throw preset error
    │
    ├── 2. Record stateBefore snapshot
    │
    ├── 3. Execute operation logic (in-memory state machine)
    │       ├── Update storylineRepository
    │       ├── Update runtimeSessions
    │       └── Update variantWorkspace (if needed)
    │
    ├── 4. Record stateAfter snapshot
    │
    └── 5. Write OperationTraceEntry
            └── Return result
```

### 4.3 State Transition Rules

**switch_active_storyline:**
```
Input: { storylineId }
Precondition: storylineId exists in storylinesById
State changes:
  - repository.activeStorylineId → storylineId
  - runtimeSessions.activeSessionId → targetStoryline.activeSessionId
Output: StorylineMutationResult
```

**create_storyline_from_source:**
```
Input: { sourceStorylineId, name }
Precondition: sourceStoryline exists and has headCheckpointId
State changes:
  - Generate new storylineId, variantId
  - Create new VariantWorkspace (copy source variant)
  - Create new Session (based on source.headCheckpointId)
  - Append to storylinesById, variantsById, sessionsById
Output: StorylineMutationResult (new storyline)
```

**branch_storyline_from_checkpoint:**
```
Input: { sourceStorylineId, checkpointId, name }
Precondition: checkpointId belongs to sourceStoryline's session
State changes:
  - Generate new storylineId, variantId
  - Create new VariantWorkspace (copy source variant)
  - Create new Session (starting from checkpointId)
  - New storyline.sourceCheckpointId → checkpointId
Output: StorylineMutationResult (new storyline)
```

**execute_storyline_runtime_session_command (record_accepted_beat):**
```
Input: { command: { kind: 'record_accepted_beat', payload } }
Precondition: Current active storyline has activeSession
State changes:
  - Create new checkpoint
  - Append to session.orderedCheckpointIds
  - session.activeCheckpointId → new checkpointId
  - storyline.headCheckpointId → new checkpointId
Output: { activeSessionId, activeCheckpointId }
```

### 4.4 Legacy Compatibility Path

```typescript
// When storylineRepository is null
resolve_active_storyline_context(forWrite: false):
  - Return synthesized legacy context
  - Do not create storyline-repository.json

resolve_active_storyline_context(forWrite: true):
  - Trigger bootstrapDefaultStorylineSubstrate
  - Create default storyline structure in memory
  - Subsequent operations proceed normally
```

## 5. RouteMock Layer

### 5.1 Covered Operations

```typescript
type RouteOperation =
  | { kind: 'switch_active_storyline'; storylineId: string }
  | { kind: 'create_from_source'; sourceStorylineId: string }
  | { kind: 'branch_from_checkpoint'; sourceStorylineId: string; checkpointId: string }
  | { kind: 'rename_display_name'; storylineId: string; nextDisplayName: string };
```

### 5.2 Route-Substrate Relationship

```
RouteMock
    │
    ├── Holds MockKernel instance internally
    │
    └── For each route operation:
          1. Parse HTTP request body
          2. Call corresponding SubstrateMock operation
          3. Format as HTTP response
          4. Record route-level trace
```

### 5.3 Route Mock API

```typescript
interface RouteMock {
  // Execute route operation
  postAction(request: Request): Promise<Response>;

  // Scripted control (inherited from MockKernel)
  scriptNext(mode: ScriptedMode): void;

  // Trace access
  getRouteTrace(): RouteTraceEntry[];

  // Bind to MockKernel
  bindKernel(kernel: MockKernel): void;
}
```

## 6. E2E Flow Simulator

### 6.1 E2E Flow Definitions

```typescript
type E2EFlow =
  | 'create_from_source_and_continue'
  | 'branch_from_checkpoint_flow'
  | 'switch_and_continue'
  | 'rename_and_verify'
  | 'legacy_bootstrap_flow'
  | 'full_storyline_runtime_flow';
```

### 6.2 Flow Details

**Flow 1: create_from_source_and_continue**
```
1. loadWorkspaceView() - Get initial state
2. createStorylineFromSource() - Derive from current line
3. switchActiveStoryline() - Switch to new line
4. loadWorkspaceView() - Verify new line is active
5. continueStoryline() - Enter runtime
```

**Flow 2: branch_from_checkpoint_flow**
```
1. loadWorkspaceView() - Get checkpoint rail
2. branchStorylineFromCheckpoint(checkpointId) - Branch from specified beat
3. Verify new storyline.sourceCheckpointId === checkpointId
4. Verify new session correctly bound
5. verifyCheckpointRail() - Verify new line's rail starts from that point
```

**Flow 3: switch_and_continue**
```
1. loadWorkspaceView() - Get all storylines
2. switchActiveStoryline(targetId) - Switch to target line
3. loadWorkspaceView() - Verify activeStorylineId changed
4. verifyVariantWorkspace() - Verify authoring variant switched
5. verifyRuntimeSession() - Verify session binding correct
```

**Flow 4: rename_and_verify**
```
1. updateStorylineDisplayName() - Rename
2. loadWorkspaceView() - Verify displayName updated
3. verifyNoRuntimeSideEffects() - Verify no impact on runtime-sessions.json
```

**Flow 5: legacy_bootstrap_flow**
```
1. Create fixture without storyline-repository.json
2. resolveActiveStorylineContext(forWrite: false) - Verify returns legacy context
3. resolveActiveStorylineContext(forWrite: true) - Trigger bootstrap
4. verifyBootstrapStructure() - Verify generated default storyline/variant/session
5. loadWorkspaceView() - Verify loads correctly
```

**Flow 6: full_storyline_runtime_flow**
```
1. createStorylineFromSource()
2. ensureStorylineAwareActiveSession()
3. runBeat() - Advance runtime
4. recordAcceptedBeat() - Record checkpoint
5. verifyStorylineHeadCheckpoint() - Verify head updated
6. branchFromCheckpoint() - Branch from accepted beat
7. verifyBranchHasCopiedVariant()
8. verifyBranchSessionFromCheckpoint()
```

### 6.3 E2E Simulator API

```typescript
interface StorylineE2ESimulator {
  // Flow execution
  runFlow(flow: E2EFlow): Promise<FlowResult>;

  // Record/Replay
  recordFlow(flow: E2EFlow): Promise<SerializedFlowTrace>;
  replayFlow(trace: SerializedFlowTrace): Promise<ReplayResult>;

  // State verification
  verifyState(assertion: StateAssertion): boolean;

  // Lifecycle
  setup(): Promise<void>;
  teardown(): Promise<void>;
}
```

## 7. Existing Tool Refactoring

### 7.1 SessionSimulator Refactoring

**Current issues:**
- Assumes package-global session
- Directly reads runtime-sessions.json, ignores storyline binding

**Refactoring approach:**
```typescript
interface SessionSimulator {
  // Bind to MockKernel
  bindKernel(kernel: MockKernel): void;

  // Original API unchanged, internally gets storyline-bound session via kernel
  attemptRestore(): Promise<RestoreResult>;
  reset(): Promise<ResetResult>;
  verifyStaleRefreshProtection(input: VerifyStaleRefreshProtectionInput): Promise<VerifyStaleRefreshProtectionResult>;

  // New: storyline-aware operations
  resolveStorylineSession(storylineId: string): Promise<SessionObservation>;
}
```

### 7.2 TempPackage Fixture Extension

**Current issues:**
- Only copies files, doesn't handle storyline-repository.json and variants/

**Extension approach:**
```typescript
interface TempStoryPackageFixture {
  readonly sourcePackageName: string;
  readonly packageName: string;
  readonly packagePath: string;

  // New: Phase 3 structure awareness
  readonly hasStorylineRepository: boolean;
  readonly variantIds: readonly string[];

  // New: Construct Phase 3 fixture
  withStorylineRepository(config: StorylineRepositoryConfig): TempStoryPackageFixture;
  withVariantWorkspace(variantId: string, files: VariantFiles): TempStoryPackageFixture;

  cleanup(): Promise<void>;
}
```

### 7.3 ScriptedAdapter Extension

**Extension approach:** Plug into MockKernel's unified trace system

```typescript
interface ScriptedAdapter {
  // Original API unchanged

  // New: Bind to MockKernel trace
  bindKernel(kernel: MockKernel): void;

  // Internal: All operations auto-record to kernel.trace
}
```

### 7.4 ScenarioRunner Extension

**Extension approach:** Support MockKernel record/replay

```typescript
interface ScenarioRunner {
  // Original API unchanged

  // New: MockKernel-based scenarios
  runWithKernel(scenario: KernelBasedScenario): Promise<SimulationReport>;

  // New: Replay support
  replayScenario(trace: SerializedTrace): Promise<ReplayResult>;
}
```

## 8. File Structure

### 8.1 New Files

```
simulation-toolset/
├── src/
│   ├── mock-kernel.ts              # MockKernel core
│   ├── substrate-mock.ts           # Substrate operations mock
│   ├── route-mock.ts               # Route layer mock
│   ├── storyline-e2e-simulator.ts  # E2E Flow simulator
│   ├── storyline-observer.ts       # Storyline state observation
│   ├── mock-fixture-builder.ts     # In-memory fixture builder
│   └── serialized-trace.ts         # Trace serialization/deserialization
├── tests/
│   ├── mock-kernel.test.ts
│   ├── substrate-mock.test.ts
│   ├── route-mock.test.ts
│   └── storyline-e2e-simulator.test.ts
├── scenarios/
│   ├── storyline-flows/
│   │   ├── create-from-source-flow.ts
│   │   ├── branch-from-checkpoint-flow.ts
│   │   ├── switch-and-continue-flow.ts
│   │   ├── legacy-bootstrap-flow.ts
│   │   └── full-runtime-flow.ts
│   └── storyline-scenario-manifest.ts
└── docs/
    ├── 2026-04-06-phase3-storyline-mock-design.md
    └── 2026-04-06-phase3-storyline-mock-implementation.md
```

### 8.2 Modified Files

```
simulation-toolset/
├── src/
│   ├── session-simulator.ts        # Refactor: Bind MockKernel
│   ├── temp-package.ts             # Extend: Phase 3 structure support
│   ├── scripted-adapter.ts         # Extend: Plug into trace
│   ├── scenario-runner.ts          # Extend: Replay support
│   ├── contracts.ts                # Extend: New trace/report schema
│   └── scenario-manifest.ts        # Extend: Register new scenarios
├── README.md                        # Update: New capabilities
└── agent-guide.md                   # Update: New operation guidance
```

## 9. Verification Criteria

### 9.1 Phase 0: Existing Tool Compatibility

```bash
npm run test:simulation
# Expected: All existing tests pass (may need fixes)
```

### 9.2 Phase 1: MockKernel Basic Verification

```bash
npm run test:simulation -- simulation-toolset/tests/mock-kernel.test.ts
# Expected: state machine, record, replay all pass
```

### 9.3 Phase 2: SubstrateMock Verification

```bash
npm run test:simulation -- simulation-toolset/tests/substrate-mock.test.ts
# Expected: All substrate operations execute correctly and record trace
```

### 9.4 Phase 3: RouteMock Verification

```bash
npm run test:simulation -- simulation-toolset/tests/route-mock.test.ts
# Expected: All route operations forward correctly and record
```

### 9.5 Phase 4: E2E Flow Verification

```bash
npm run test:simulation -- simulation-toolset/tests/storyline-e2e-simulator.test.ts
# Expected: All 6 flows pass
```

### 9.6 Full Regression

```bash
npm run type-check:simulation
npm run test:simulation
npm test -- src/storylines/__tests__/ src/runtime-sessions/__tests__/
# Expected: All pass
```

## 10. Non-Goals

- Browser automation for storyline workspace UI
- Real file system operations in mock layer
- Story-specific content in test fixtures
- Replacing existing product tests
- Modifying product code for simulation convenience

## 11. Forward Compatibility

When product layer introduces `Storage / Repository Substrate`:
- MockKernel should migrate to consume the formal seam
- VariantWorkspaceState should be replaced by formal repository model
- Trace structure should extend to support `repositoryRoot` targeting

## 12. References

- Phase 3 Master Design: `docs/superpowers/specs/2026-04-06-phase-3-master-design.md`
- Storyline Substrate: `src/storylines/substrate.ts`
- Workspace View: `src/storylines/workspace-view.ts`
- Systematic Debugging: `superpowers:systematic-debugging` skill
- Agent Guide: `simulation-toolset/agent-guide.md`