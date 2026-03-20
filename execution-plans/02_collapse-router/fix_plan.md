# Phase 02 Fix Plan

## Pre-flight

### 1. Branch Setup

- [ ] Verify Phase 00 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/02-collapse-router`

### 2. Dependency Verification

- [ ] Verify `src/types/index.ts` exports `CollapseRequest`, `CollapseResponse`, `CollapseContext`
- [ ] Verify `src/types/index.ts` exports `StateSnapshot`, `SceneState`
- [ ] Verify `src/engine/schema-validator.ts` exports `validateCollapseRequest`, `validateCollapseResponse`
- [ ] Verify story loader exports `SceneSpec` and `RouterProfile` types
- [ ] Run `npm test` -- all Phase 00 tests pass

### 3. Spec Context Load

- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~16,000 tokens): light-cone-collapse.md, narrative-router.md, control-primitives.md, state-model.md, collapse-packet-schema.yaml, phase-consequence-packet-schema.yaml, state-snapshot-schema.yaml, scene-phase-beat-lifecycle.md, sample router-lexicon.yaml
- [ ] Confirm total ~20,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: LLM Adapter Interface + Mock

#### 1.1 RED -- Write Tests

- Create `src/engine/__tests__/mock-adapter.test.ts`
- Test: mock adapter `collapse()` returns a valid `CollapseResponse` with `alpha`, `beta`, `inferenceTrace`
- Test: mock adapter `collapse()` returns deterministic results for the same input
- Test: mock adapter response passes `validateCollapseResponse()` schema validation
- Expected: tests FAIL

#### 1.2 GREEN -- Implement

- Create `src/engine/types/adapter-interface.ts`:

  ```typescript
  export interface LLMAdapter {
    collapse(request: CollapseRequest): Promise<CollapseResponse>;
    generate?(request: PromptObject): Promise<GenerateResult>;
    audit?(request: AuditPacket): Promise<AuditResult>;
    settlement?(request: PhaseConsequenceRequest): Promise<PhaseConsequenceResponse>;
  }
  ```

  - Only `collapse` is required for Phase 02. Other methods are optional (implemented in Phase 05+).
  - Define `GenerateResult` and `AuditResult` placeholder types for future use.

- Create `src/engine/__mocks__/mock-adapter.ts`:
  ```typescript
  export function createMockAdapter(): LLMAdapter {
    return {
      async collapse(request: CollapseRequest): Promise<CollapseResponse> {
        // Return deterministic fake response based on input
        return {
          alpha: `[Mock] Aggressive boundary after: ${request.phaseConsequences?.[0] ?? 'init'}`,
          beta: `[Mock] Conservative boundary after: ${request.phaseConsequences?.[0] ?? 'init'}`,
          inferenceTrace: `[Mock] Inferred from ${request.phaseConsequences?.length ?? 0} consequences`,
        };
      },
    };
  }
  ```

#### 1.3 IMPROVE

- Add JSDoc explaining this is the dependency injection seam for LLM calls
- Verify the interface matches what `api-adapter-lite/interface-contracts.md` will implement

---

### Task 2: Light Cone Collapse

#### 2.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/light-cone-collapse.test.ts`

**Scene Initialization tests:**

- Test: `inferInitialBoundaries` with a valid SceneSpec returns a `CollapseResponse`
- Test: returned response has non-empty `alpha`, `beta`, and `inferenceTrace`
- Test: the adapter's `collapse` method is called exactly once
- Test: the collapse request sent to adapter contains `context.mainAxis`, `context.endLine`
- Test: the collapse request has an empty or absent `phaseConsequences` (initial inference)
- Test: `inferInitialBoundaries` with missing `mainAxis` throws a validation error

**Phase-end re-inference tests:**

- Test: `reInferBoundaries` with valid `CollapseRequest` returns updated boundaries
- Test: the request must contain `phaseConsequences` with at least 1 item
- Test: `reInferBoundaries` with empty `phaseConsequences` array throws
- Test: the request `context` includes `currentAlpha`, `currentBeta`, `mainAxis`, `endLine`
- Test: the adapter's `collapse` method is called with the full `CollapseRequest`
- Test: returned `CollapseResponse` passes schema validation

**Immutability tests:**

- Test: input `SceneSpec` is not mutated by `inferInitialBoundaries`
- Test: input `CollapseRequest` is not mutated by `reInferBoundaries`

- Expected: all tests FAIL

#### 2.2 GREEN -- Implement

- Create `src/engine/modules/light-cone-collapse.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/light-cone-collapse.md`
- Implementation:

  ```typescript
  import { LLMAdapter } from '@/engine/types/adapter-interface';
  import { SceneSpec } from '@/engine/story-loader';
  import { CollapseRequest, CollapseResponse } from '@/types';
  import { validateCollapseResponse } from '@/engine/schema-validator';

  export function createLightConeCollapse(adapter: LLMAdapter) {
    return {
      async inferInitialBoundaries(sceneSpec: SceneSpec): Promise<CollapseResponse> {
        // Build initial collapse request from SceneSpec
        // mainAxis, endLine from sceneSpec
        // No phaseConsequences for initial inference
        // Call adapter.collapse() and validate response
      },

      async reInferBoundaries(request: CollapseRequest): Promise<CollapseResponse> {
        // Validate request has phaseConsequences with length >= 1
        // Call adapter.collapse() with full request
        // Validate response against schema
        // Return immutable CollapseResponse
      },
    };
  }
  ```

- Key design decisions:
  - Uses factory function pattern (`createLightConeCollapse(adapter)`) for dependency injection
  - Adapter is injected, not imported directly -- enables mock in tests, real adapter in Phase 05
  - All responses are validated against `CollapseResponse` schema before returning
  - Initial inference builds the request internally from SceneSpec fields
  - Phase-end re-inference accepts the fully formed `CollapseRequest` from Orchestrator

#### 2.3 IMPROVE

- Add JSDoc referencing `LOGOS-SPEC/04_MODULES/light-cone-collapse.md`
- Verify `CollapseRequest.context` field names match `collapse-packet-schema.yaml` exactly:
  - `mainAxis`, `endLine`, `currentAlpha`, `currentBeta`, optional `sceneProgress`, optional `completedPhaseGoal`
- Verify `phaseConsequences` validation: array of strings, minItems 1 (for re-inference)
- Extract request construction into a pure helper function

---

### Task 3: Narrative Router

#### 3.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/narrative-router.test.ts`

**selectRouter tests:**

- Test: with hint matching a profile, returns that profile's selection
- Test: with no hint, returns the first profile
- Test: with hint not matching any profile, returns the first profile (fallback)
- Test: with empty profiles array, throws descriptive error
- Test: returned `RouterSelection` has `routerName`, `routerSemanticCore`, `verbLexicon`
- Test: returned `verbLexicon` has at least 1 entry

**getVerbLexicon tests:**

- Test: with valid routerName, returns the corresponding verb array
- Test: with routerName "悬疑/探案", returns lexicon from that profile
- Test: with unknown routerName, throws descriptive error
- Test: returned array is a new copy (not a reference to the profile's internal array)

**Immutability tests:**

- Test: input RouterProfile array is not mutated
- Test: returned verbLexicon is readonly

**Integration with sample data:**

- Test: load sample-scene router-lexicon.yaml, pass to selectRouter, get valid result
- Expected: all tests FAIL

#### 3.2 GREEN -- Implement

- Create `src/engine/modules/narrative-router.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/narrative-router.md`
- Implementation:

  ```typescript
  import { RouterProfile } from '@/engine/story-loader';

  export interface RouterSelection {
    readonly routerName: string;
    readonly routerSemanticCore: string;
    readonly verbLexicon: readonly string[];
  }

  export function selectRouter(
    routerProfiles: readonly RouterProfile[],
    routerHint?: string,
  ): RouterSelection {
    // If profiles is empty, throw
    // If routerHint matches a profile's routerName, select that profile
    // Otherwise, fall back to first profile
    // Return RouterSelection with copied verbLexicon array
  }

  export function getVerbLexicon(
    routerProfiles: readonly RouterProfile[],
    routerName: string,
  ): readonly string[] {
    // Find the profile matching routerName
    // If not found, throw descriptive error
    // Return a copy of the verbLexicon array
  }
  ```

- Key design decisions:
  - Router selection is deterministic based on hint matching
  - In Sample version, Orchestrator may pass `PhasePlan.routerHint` as the hint
  - Verb lexicon is always copied to prevent downstream mutation of stored profiles
  - The 6 base router types (Action/Combat, Mystery/Investigation, Romance/Intimacy, Political/Negotiation, Horror/Survival, Slice of Life) are defined in story packages, not hardcoded

#### 3.3 IMPROVE

- Add JSDoc referencing `LOGOS-SPEC/04_MODULES/narrative-router.md`
- Consider adding a `findRouterProfile` utility for shared lookup logic
- Verify that routerName matching is case-sensitive (per spec, names are canonical)

---

## Post-flight

### 1. Quality Gate

- [ ] `npm test` -- all tests pass (including Phase 00 tests)
- [ ] `npm run test:coverage` -- >= 80% coverage on light-cone-collapse.ts, narrative-router.ts, mock-adapter.ts
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR

- [ ] Stage: `src/engine/modules/light-cone-collapse.ts`, `src/engine/modules/narrative-router.ts`, `src/engine/types/adapter-interface.ts`, `src/engine/__mocks__/mock-adapter.ts`, test files
- [ ] `git commit -m "feat: add LightConeCollapse (boundary inference) and NarrativeRouter (verb lexicon selection)"`
- [ ] `git push -u origin phase/02-collapse-router`
- [ ] Create PR against `main` with title: "Phase 02: Light Cone Collapse + Narrative Router"

### 3. STOP

Do not proceed to Phase 03 until both Phase 01 and Phase 02 PRs are merged.
