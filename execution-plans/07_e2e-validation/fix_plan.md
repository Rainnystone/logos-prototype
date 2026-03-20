# Phase 07 Fix Plan

## Pre-flight

### 1. Branch Setup
- [ ] Verify Phase 06 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/07-e2e-validation`

### 2. Dependency Verification
- [ ] Verify `src/engine/orchestrator.ts` exports `createOrchestrator`, `Orchestrator`
- [ ] Verify all modules are integrated and exported
- [ ] Verify `src/story-packages/sample-scene/` contains all required YAML files
- [ ] Run `npm test` -- all Phase 00-06 tests pass
- [ ] Verify story loader can load sample-scene package successfully

### 3. Spec Context Load
- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~17,000 tokens): runtime-loop.md, lifecycle.md, decision-points.md, sample-scene fixtures, orchestrator-control-hub.md, state-snapshot-schema.yaml
- [ ] Confirm total ~21,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Enhanced Mock Adapter

#### 1.1 RED -- Write Tests
- Create `src/engine/__tests__/e2e/mock-adapter-e2e.test.ts`
- Test: enhanced mock adapter supports all 4 modes (generate, audit, settlement, collapse)
- Test: `generate()` returns realistic `GenerateResult` with beatText + 4 options
- Test: `audit()` returns configurable boolean answers (allows simulating pass/fail)
- Test: `settlement()` returns valid phaseConsequences and settlementTrace
- Test: `collapse()` returns updated alpha/beta with inferenceTrace
- Expected: tests FAIL

#### 1.2 GREEN -- Implement
- Create `src/engine/__tests__/e2e/helpers/e2e-mock-adapter.ts`:
  ```typescript
  interface MockAdapterConfig {
    generateResponses?: GenerateResult[];     // Queue of responses
    auditBehavior?: "pass" | "fail-once" | "fail-always";
    settlementResponse?: PhaseConsequenceResponse;
    collapseResponse?: CollapseResponse;
  }

  export function createE2EMockAdapter(config: MockAdapterConfig): LLMAdapter {
    let generateCallCount = 0;
    let auditCallCount = 0;

    return {
      async generate(prompt: PromptObject): Promise<GenerateResult> {
        // Return from queue or default
        return config.generateResponses?.[generateCallCount++] ?? defaultGenerateResult();
      },
      async audit(packet: AuditPacket): Promise<AuditResult> {
        // "pass" -> all true; "fail-once" -> first call fails, rest pass; "fail-always" -> always fail
        auditCallCount++;
        return buildAuditResult(config.auditBehavior, auditCallCount, packet);
      },
      async settlement(req: PhaseConsequenceRequest): Promise<PhaseConsequenceResponse> {
        return config.settlementResponse ?? defaultSettlementResponse();
      },
      async collapse(req: CollapseRequest): Promise<CollapseResponse> {
        return config.collapseResponse ?? defaultCollapseResponse();
      },
    };
  }
  ```
- Default responses use generic placeholder text, not scene-specific narrative

#### 1.3 IMPROVE
- Add call tracking for verification (which methods were called and how many times)
- Add assertion helpers: `expectGenerateCalled(times)`, `expectAuditCalled(times)`

---

### Task 2: Full Phase Run (E2E Happy Path)

#### 2.1 RED -- Write Tests
- Create `src/engine/__tests__/e2e/full-phase-run.test.ts`

**Scene initialization:**
- Test: `orchestrator.initScene()` returns state with `sceneState.sceneId === "sample-yanshang-live-room"`
- Test: initial state has non-empty `alpha` and `beta`
- Test: initial state has `currentPhaseIndex === 1`, `currentBeatIndexInPhase === 1`

**Beat 1:**
- Test: `orchestrator.runBeat("Player action 1")` returns `BeatResult` with beatText and 4 options
- Test: after Beat 1, state `currentBeatIndexInPhase === 2`
- Test: history window has 1 user entry + 1 assistant entry

**Beat 2:**
- Test: `orchestrator.runBeat("Player action 2")` succeeds
- Test: volume for Beat 2 matches gradient sequence position 1
- Test: history window has 2 pairs

**Beat 3 and Beat 4:**
- Test: Beats 3 and 4 complete successfully
- Test: volume for each Beat matches gradient sequence

**Phase end:**
- Test: after Beat 4, Phase end processing is triggered automatically
- Test: settlement is called -> phaseConsequences populated in state
- Test: collapse is called -> new alpha/beta in state
- Test: state `currentPhaseIndex === 2` after Phase end
- Test: state `currentBeatIndexInPhase === 1` (reset for new Phase)

- Expected: all tests FAIL (or some may pass if orchestrator is correct from Phase 06)

#### 2.2 GREEN -- Implement/Fix
- Run the tests against the existing orchestrator
- Fix any integration bugs discovered
- Ensure the orchestrator correctly:
  - Tracks beat index within Phase (1-based per schema: `minimum: 1`)
  - Resets beat index when entering new Phase
  - Calls settlement then collapse in correct order at Phase end
  - Updates phaseConsequences in sceneState

#### 2.3 IMPROVE
- Add detailed logging/tracing for each step of the loop (for debugging)
- Verify call counts: generate=4, audit=4, settlement=1, collapse=1 for a clean Phase

---

### Task 3: Audit Behavior Scenarios

#### 3.1 RED -- Write Tests
- Create `src/engine/__tests__/e2e/audit-behavior.test.ts`

**Pass scenario:**
- Test: with audit "pass" mock, Beat is accepted on first try
- Test: retryCount in result is 0

**Fail-and-rewrite scenario:**
- Test: with audit "fail-once" mock, first attempt fails, rewrite succeeds
- Test: retryCount in result is 1
- Test: generate is called twice (initial + rewrite)
- Test: rewrite call includes `generationControl` with `isRewrite: true`

**Force-accept scenario:**
- Test: with audit "fail-always" mock, after 3 retries, Beat is force-accepted
- Test: `BeatResult.forceAccepted === true`
- Test: `BeatResult.retryCount === 3`
- Test: generate is called 3 times total (initial + 2 rewrites, then force on 3rd audit fail)
- Test: Beat still enters history despite force-accept

- Expected: all tests FAIL

#### 3.2 GREEN -- Implement/Fix
- Verify the orchestrator's rewrite loop handles all three scenarios
- Fix any issues with:
  - `generationControl` assembly on rewrite path
  - `retryCount` tracking
  - Force-accept logic (retryCount >= 3)
  - History write after force-accept

#### 3.3 IMPROVE
- Verify that force-accepted Beats are distinguishable in state (consider a `warnings` field)

---

### Task 4: Phase-End Processing

#### 4.1 RED -- Write Tests
- Create `src/engine/__tests__/e2e/phase-end-processing.test.ts`

**Settlement verification:**
- Test: settlement is called with correct phaseTranscript (only accepted content, chronological)
- Test: settlement request includes mainAxis, endLine, and phaseGoal from story package
- Test: settlement response phaseConsequences has 1-6 items

**Collapse verification:**
- Test: collapse is called AFTER settlement (sequence matters)
- Test: collapse request includes phaseConsequences from settlement response
- Test: collapse request includes current alpha/beta as `currentAlpha/currentBeta`
- Test: collapse response provides new alpha/beta
- Test: new alpha/beta are written to sceneState for next Phase

**State transition verification:**
- Test: phaseConsequences are stored in state after settlement
- Test: alpha/beta in state are updated after collapse
- Test: currentPhaseIndex increments
- Test: gradient is rebuilt for new Phase's gradientType

- Expected: all tests FAIL

#### 4.2 GREEN -- Implement/Fix
- Fix any ordering or data flow issues in Phase-end processing
- Ensure the settlement -> collapse chain uses the correct data at each step

#### 4.3 IMPROVE
- Add state snapshot comparison utilities for debugging

---

### Task 5: State Transition Verification

#### 5.1 RED -- Write Tests
- Create `src/engine/__tests__/e2e/state-transitions.test.ts`

**Immutability:**
- Test: state object reference changes after each `runBeat`
- Test: previous state object is not modified by subsequent calls
- Test: sceneState fields are updated correctly (not carried over from stale state)

**Schema conformance:**
- Test: state after each Beat passes `validateStateSnapshot`
- Test: all Volume values in roundState are valid ("Low" | "Med" | "High")
- Test: historyWindow entries have valid role ("user" | "assistant")

**Progress tracking:**
- Test: after 4 Beats, `currentBeatIndexInPhase` cycles back to 1
- Test: `currentPhaseIndex` increments by 1 at Phase boundary
- Test: after all Phases, `isSceneComplete()` returns true

- Expected: some tests may pass, others may reveal issues

#### 5.2 GREEN -- Fix
- Address any state transition bugs
- Ensure all state snapshots conform to `state-snapshot-schema.yaml`

#### 5.3 IMPROVE
- Create a state diff utility for readable test failure messages
- Document any spec drift found and how it was resolved

---

## Post-flight

### 1. Quality Gate
- [ ] `npm test` -- all tests pass (Phase 00-07, including E2E)
- [ ] `npm run test:coverage` -- overall coverage >= 80%
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues
- [ ] E2E tests run end-to-end with mock adapter

### 2. Commit and PR
- [ ] Stage: `src/engine/__tests__/e2e/` (all test files and helpers)
- [ ] `git commit -m "test: add E2E validation suite for full engine loop with sample-scene"`
- [ ] `git push -u origin phase/07-e2e-validation`
- [ ] Create PR against `main` with title: "Phase 07: E2E Validation"

### 3. STOP
Do not proceed to Phase 08 until this PR is reviewed and merged.
