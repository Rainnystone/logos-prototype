# Phase 8: Weaver Agent & Agent Management Simulation Design

Date: 2026-04-08
Status: Draft
Scope: `simulation-toolset Phase 8` — cover Phase 4 product features (weaver text-import sidecar, agent management surface, gossipelog bootstrap, shared reference loading)

## 1. Why Phase 8 Exists

Phase 4 (PR #9) introduced the weaver text-import sidecar, shared reference loading, agent registry, agent management surface, gossipelog bootstrap from weaver summary, and import seed mapping. The simulation-toolset currently has zero coverage for any of these.

Phase 8 exists to close that gap following the toolset's established pattern: contracts first, then mock/observer, then scenarios.

## 2. Product Features In Scope

| Feature | Product Location | Toolset Coverage |
|---------|-----------------|------------------|
| Weaver import cycle | `src/agents/weaver/agent.ts` | Observer + scenario |
| Weaver payload contracts | `src/agents/weaver/contracts.ts` | Trace schema |
| Weaver summary repository | `src/agents/weaver/repository.ts` | Scenario assertion |
| Shared reference loading | `src/agents/reference-loader.ts` | Indirect (via weaver observer) |
| Agent registry | `src/agents/registry.ts` | UI smoke |
| Agent management surface | `src/agents/agent-surface.ts` | UI smoke |
| Gossipelog bootstrap | `src/agents/gossipelog/bootstrap.ts` | Observer + scenario |
| Import seed mapping | `src/story-packages/import-seed.ts` | Route smoke / unit |

## 3. Non-Goals

- No independent reference-loading mock (covered indirectly via weaver boundary)
- No extension-agent system simulation
- No import-into-existing-package simulation
- No import preview step simulation
- No browser automation
- No modification of product code

## 4. Design Principles

### 4.1 Follow Existing Patterns

Every new module mirrors an existing toolset module:
- `weaver-observer.ts` mirrors `gossipelog-observer.ts`
- `weaver-sidecar-trace.ts` mirrors `sidecar-trace.ts`
- `bootstrap-observer.ts` mirrors `session-observer.ts`
- New scenarios follow existing scenario structure

### 4.2 Boundary-First

Priority order for coverage:
1. Contracts and trace schemas (structural correctness)
2. Observer boundary calls (real seam validation)
3. ScriptedAdapter extension (mock-based scenarios)
4. Route/UI smoke (integration validation)

### 4.3 Generalize Before Specializing

The existing `SimulationAgentTraceSchema` is gossipelog-specific. Phase 8 generalizes it first, then adds weaver-specific extensions. This benefits any future sidecar agent.

## 5. Architecture

### 5.1 Contracts Extension

Modify `SimulationAgentTraceSchema` to use a `details` bag:

```ts
const SimulationAgentTraceSchema = z.object({
  agentId: z.string(),
  stage: z.string(),
  outcome: z.string(),
  sideEffectSummary: z.array(z.string()).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
```

Remove gossipelog-specific top-level fields:
- `stableBackgroundText`
- `highlightedDeltasText`
- `usedFallbackSource`
- `usedFallbackLayer`

These migrate into `details` for gossipelog traces. Weaver traces use `details` for:
- `sourceSummary`
- `warningCount`
- `bootstrapStatus`
- `suggestedPackageName`

**Backward compatibility**: bump `SIMULATION_SCHEMA_VERSION` from 1 to 2. Reports with version 1 contain the old shape; version 2 contains the new shape. The toolset does not auto-migrate version 1 reports — old reports retain their schema version.

**Migration requirement**: This change affects ~92 references across 16 test files. The migration must happen atomically in a single slice — the schema change, sidecar-trace update, and all test updates land together. No intermediate state where the schema and tests are out of sync.

### 5.2 New Trace Schemas

```ts
const SimulationWeaverImportTraceSchema = z.object({
  agentId: z.literal('weaver'),
  stage: z.literal('import'),
  outcome: z.enum(['payload-clean', 'payload-has-warnings', 'import-failed']),
  sideEffectSummary: z.array(z.string()).optional(),
  details: z.object({
    sourceSummary: z.string(),
    warningCount: z.number(),
    unresolvedGapCount: z.number(),
    bootstrapStatus: z.string().optional(),
    suggestedPackageName: z.string().optional(),
  }).optional(),
});

const SimulationBootstrapTraceSchema = z.object({
  agentId: z.literal('gossipelog'),
  stage: z.literal('bootstrap'),
  outcome: z.enum(['succeeded', 'fallback-pending', 'failed']),
  sideEffectSummary: z.array(z.string()).optional(),
  details: z.object({
    bootstrapStatus: z.string(),
    errorMessage: z.string().optional(),
    usedFallbackSource: z.boolean().optional(),
  }).optional(),
});
```

### 5.3 Weaver Observer

File: `simulation-toolset/src/weaver-observer.ts`

```ts
export type WeaverObservation = {
  readonly result: RunWeaverImportResult;
  readonly agentTrace: SimulationAgentTrace;
};

export async function observeWeaverImport(
  input: RunWeaverImportInput,
): Promise<WeaverObservation>;
```

Consumes the real weaver boundary (`runWeaverImport`). Returns structured result plus normalized trace. Follows exact pattern of `gossipelog-observer.ts`.

### 5.4 Weaver Sidecar Trace

File: `simulation-toolset/src/weaver-sidecar-trace.ts`

```ts
export function createWeaverAgentTrace(
  result: RunWeaverImportResult,
): SimulationAgentTrace;
```

Maps weaver result to normalized trace:
- outcome: `payload-clean` (no warnings) | `payload-has-warnings` | `import-failed`
- sideEffectSummary: `[import:package-name, import:warning-count:N]`
- details: source summary, warning count, gap count, bootstrap status

### 5.5 Bootstrap Observer

File: `simulation-toolset/src/bootstrap-observer.ts`

```ts
export type BootstrapObservation = {
  readonly ok: boolean;
  readonly bootstrapStatus: WeaverBootstrapStatus;
  readonly errorMessage?: string;
  readonly agentTrace: SimulationAgentTrace;
};

export async function observeGossipelogBootstrap(
  input: BootstrapGossipelogInput,
): Promise<BootstrapObservation>;
```

Consumes the real bootstrap boundary (`bootstrapGossipelogFromWeaverSummary`). Captures success, fallback-pending, and failure outcomes.

### 5.6 ScriptedAdapter Extension

Extend `ScriptedMode` union in `scripted-adapter.ts`:

```ts
| { kind: 'weaver-import'; payload: WeaverImportPayload }
| { kind: 'weaver-import-failure'; error: string }
```

**Prerequisite**: The `ScriptedOperation` type currently only includes `collapse`, `route`, `generate`, `audit`, `gossipelogUpdate`, `gossipelogInjection`. Must add `weaverImport` to the union and implement the mock method on `ScriptedAdapter`. The `LLMAdapter.weaverImport()` method signature is defined in `src/engine/types/adapter-interface.ts`.

The adapter's `weaverImport()` method returns the scripted payload or throws the scripted error. This enables mock-based weaver scenarios without real LLM calls.

### 5.7 Agent Surface Smoke Extension

Extend `ui-smoke.ts` with new checks, rendering `AgentSurfacePanel` from `src/app/edit/sections/AgentSurfacePanel.tsx`:

1. **Agent management page renders built-in sidecars** — verify gossipelog and weaver are listed from the registry
2. **Missing state shows bounded status** — verify that missing agent state files produce a status line, not absence
3. **No disable toggle** — verify that agent management surface does not expose enable/disable controls

These follow the existing lightweight UI smoke pattern (jsdom + Testing Library).

### 5.8 Import Seed Coverage

Covered through a new route smoke or direct unit verification:
- Call `applyTextImportSeed()` with a valid weaver payload
- Assert world base fields populated (setting, hero, coreCast, locations)
- Call with minimal payload (only openingHook)
- Assert scaffold defaults fill missing fields

No new module. Uses existing route smoke infrastructure.

## 6. Scenarios

### S7: Weaver Import Happy Path

Flow:
1. Create temp story package via `createTempStoryPackage`
2. Call weaver observer with valid import input (story-agnostic text)
3. Assert trace outcome is `payload-clean` or `payload-has-warnings`
4. Assert weaver summary written to package
5. Assert package created with world base populated
6. Cleanup temp package

Uses `ScriptedAdapter` with `weaver-import` mode to avoid real LLM calls.

### S8: Weaver Import + Bootstrap Success

Flow:
1. Run S7 happy path
2. Call bootstrap observer with weaver summary
3. Assert bootstrap outcome is `succeeded`
4. Assert gossipelog relationship state is readable (via `inspectCharacterRelationshipsState()` or equivalent repository read)
5. Assert weaver summary bootstrapStatus updated to `succeeded`

### S9: Weaver Import Partial (Warnings)

Flow:
1. Create temp story package
2. Call weaver observer with scripted payload containing warnings and gaps
3. Assert trace outcome is `payload-has-warnings`
4. Assert warning count matches
5. Assert scaffold defaults fill unresolved gaps
6. Cleanup temp package

### S10: Bootstrap Fallback

Flow:
1. Create temp story package with no prior relationship state
2. Simulate bootstrap failure (use `ScriptedAdapter` gossipelog mode returning fallback outcome, or delete relationship state file to make it unreadable)
3. Assert bootstrap outcome is `fallback-pending`
4. Assert weaver summary bootstrapStatus is `fallback_pending`
5. Assert package remains created (bootstrap failure does not destroy package)

## 7. Execution Slices

| Slice | Content | Depends On |
|-------|---------|------------|
| 1 | Generalize `SimulationAgentTraceSchema` (add `details`, remove gossipelog top-level fields), bump schema version, migrate `sidecar-trace.ts`, update all 16 test files — **atomic commit** | None |
| 2 | Implement `weaver-sidecar-trace.ts` | Slice 1 |
| 3 | Implement `weaver-observer.ts` | Slice 2 |
| 4 | Implement `bootstrap-observer.ts` | Slice 1 |
| 5 | Extend `ScriptedAdapter`: add `weaverImport` to `ScriptedOperation`, add weaver modes | Slice 1 |
| 6 | Add import seed route smoke | Slice 1 |
| 7 | Extend UI smoke for agent surface (`AgentSurfacePanel`) | Slice 1 |
| 8 | Implement S7 + S9 (weaver scenarios) | Slice 3, 5 |
| 9 | Implement S8 + S10 (bootstrap scenarios) | Slice 4, 8 |
| 10 | Update manifest, README, three-file docs, run full regression | All |

## 8. Done Criteria

- All 4 new scenarios pass
- Import seed route smoke passes
- Agent surface UI smoke passes
- Existing tests unaffected (backward compatible trace migration)
- `npm run test:simulation` passes
- `npm run type-check:simulation` passes
- Cross-boundary regression passes
- No product code modified
- All scenarios story-agnostic

## 9. Files Changed

### New Files

| File | Purpose |
|------|---------|
| `simulation-toolset/src/weaver-observer.ts` | Weaver import cycle observer |
| `simulation-toolset/src/weaver-sidecar-trace.ts` | Weaver trace normalization |
| `simulation-toolset/src/bootstrap-observer.ts` | Gossipelog bootstrap observer |
| `simulation-toolset/tests/weaver-observer.test.ts` | Weaver observer tests |
| `simulation-toolset/tests/weaver-sidecar-trace.test.ts` | Weaver trace tests |
| `simulation-toolset/tests/bootstrap-observer.test.ts` | Bootstrap observer tests |
| `simulation-toolset/tests/import-seed-smoke.test.ts` | Import seed verification |
| `simulation-toolset/tests/agent-surface-smoke.test.ts` | Agent surface UI smoke |
| `simulation-toolset/scenarios/weaver-import-happy-path.ts` | S7 scenario |
| `simulation-toolset/scenarios/weaver-import-bootstrap.ts` | S8 scenario |
| `simulation-toolset/scenarios/weaver-import-partial.ts` | S9 scenario |
| `simulation-toolset/scenarios/bootstrap-fallback.ts` | S10 scenario |
| `simulation-toolset/tests/weaver-import-happy-path-scenario.test.ts` | S7 test |
| `simulation-toolset/tests/weaver-import-bootstrap-scenario.test.ts` | S8 test |
| `simulation-toolset/tests/weaver-import-partial-scenario.test.ts` | S9 test |
| `simulation-toolset/tests/bootstrap-fallback-scenario.test.ts` | S10 test |

### Modified Files

| File | Change |
|------|--------|
| `simulation-toolset/src/contracts.ts` | Generalize trace schema, bump version |
| `simulation-toolset/src/sidecar-trace.ts` | Migrate gossipelog fields to `details` |
| `simulation-toolset/src/scripted-adapter.ts` | Add weaver import modes |
| `simulation-toolset/src/ui-smoke.ts` | Add agent surface checks |
| `simulation-toolset/README.md` | Document Phase 8 capabilities |

### Documentation Files

| File | Change |
|------|--------|
| `simulation-toolset/docs/task_plan.md` | Add Phase 8 entry |
| `simulation-toolset/docs/findings.md` | Add Phase 8 findings |
| `simulation-toolset/docs/progress.md` | Add Phase 8 progress |

## 10. Thread Rules

- All new files live under `simulation-toolset/`
- No modifications to `src/agents/`, `src/types/`, or any product code
- All scenarios remain story-agnostic
- Documentation maintained in `simulation-toolset/docs/`, never in root or `docs/superpowers/`
- Follow existing toolset patterns before inventing new ones
