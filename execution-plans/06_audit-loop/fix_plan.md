# Phase 06 Fix Plan

## Pre-flight

### 1. Branch Setup

- [ ] Verify Phase 05 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/06-audit-loop`

### 2. Dependency Verification

- [ ] Verify `src/engine/api-adapter/adapter.ts` exports `createAPIAdapter`
- [ ] Verify `LLMAdapter` interface has all 4 methods: `generate`, `audit`, `settlement`, `collapse`
- [ ] Verify all prior modules exist and export correctly:
  - `getHistoryWindow`, `getCurrentVolume`, `buildVolumeSequence`
  - `createLightConeCollapse`, `selectRouter`, `getVerbLexicon`
  - `buildDirectorNote`
  - `assemblePromptObject`, `assembleRewritePromptObject`
- [ ] Verify all types and validators exist
- [ ] Run `npm test` -- all Phase 00-05 tests pass

### 3. Spec Context Load

- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~21,000 tokens): 4 module specs + 2 orchestration docs + 5 schema files + orchestrator-input-output.md
- [ ] Confirm total ~25,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Auditor

#### 1.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/auditor.test.ts`

**buildAuditPacket tests:**

- Test: creates valid AuditPacket with `context.precedingBeats`, `generatedContent.beatText`, `generatedContent.options` (4 items), `auditQuestions`
- Test: precedingBeats from history window are correctly placed in context
- Test: beatText and options from generation result are correctly placed
- Test: auditQuestions are string array of selected question texts
- Test: output passes `validateAuditPacket` schema check

**Question selection tests:**

- Test: `selectAuditQuestions(questionSet, currentPhaseId)` returns default questions
- Test: with phaseOverride.append, returned questions include appended phase-specific questions
- Test: question selection returns question text strings (not IDs)

**parseAuditResult tests:**

- Test: with all-true answers matching all-true expected -> all pass
- Test: with one false answer where expected is true and blocking -> that question is a failure
- Test: answers array length matches questions length
- Test: returns structured `ParsedAuditResult` with question ID, answer, expected, matches, blocking

- Expected: all tests FAIL

#### 1.2 GREEN -- Implement

- Create `src/engine/modules/auditor.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/auditor.md`
- Implementation:

  ```typescript
  export function selectAuditQuestions(
    questionSet: AuditQuestionSet,
    currentPhaseId: string,
  ): { selectedQuestions: AuditQuestion[]; selectedIds: string[] } {
    // Start with default selection policy IDs
    // If phaseOverrides exist for currentPhaseId, append those IDs
    // Look up each ID in globalQuestions, controlQuestions, phaseSpecificQuestions
    // Return the matched AuditQuestion objects and their IDs
  }

  export function buildAuditPacket(
    precedingBeats: readonly HistoryEntry[],
    beatText: string,
    options: readonly string[],
    selectedQuestions: readonly AuditQuestion[],
  ): AuditPacket {
    // Assemble AuditPacket matching audit-packet-schema.yaml
    return {
      context: { precedingBeats: [...precedingBeats] },
      generatedContent: { beatText, options: [...options] },
      auditQuestions: selectedQuestions.map((q) => q.question),
    };
  }

  export interface ParsedAuditAnswer {
    readonly questionId: string;
    readonly question: string;
    readonly answer: boolean;
    readonly expected: boolean;
    readonly matches: boolean;
    readonly blocking: boolean;
  }

  export interface ParsedAuditResult {
    readonly answers: readonly ParsedAuditAnswer[];
  }

  export function parseAuditResult(
    auditResult: AuditResult,
    selectedQuestions: readonly AuditQuestion[],
  ): ParsedAuditResult {
    // Zip answers with questions, compare against expected, mark blocking
  }
  ```

#### 1.3 IMPROVE

- Validate that answers length matches questions length (throw if mismatch)
- Add JSDoc with spec references

---

### Task 2: Audit Resolver

#### 2.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/audit-resolver.test.ts`

**Rule 1: Compare answers to expected:**

- Test: answer matches expected -> not a failure
- Test: answer does not match expected -> failure

**Rule 2: Blocking check:**

- Test: mismatch + blocking=true -> blocking failure
- Test: mismatch + blocking=false -> non-blocking (pass allowed)

**Rule 3: Blocking failure + retryCount < 3 -> fail:**

- Test: 1 blocking failure + retryCount 0 -> { pass: false, rewriteFeedback != null }
- Test: 2 blocking failures + retryCount 2 -> { pass: false, rewriteFeedback != null }

**Rule 4: retryCount >= 3 -> force accept:**

- Test: blocking failure + retryCount 3 -> { pass: true, forceAccepted: true }
- Test: blocking failure + retryCount 5 -> { pass: true, forceAccepted: true }

**Rule 5: No blocking failures -> pass:**

- Test: all answers match expected -> { pass: true }
- Test: non-blocking failures only -> { pass: true }
- Test: no questions at all -> { pass: true }

**RewriteFeedback content tests:**

- Test: rewriteFeedback contains the blocking question text
- Test: rewriteFeedback contains the expected answer
- Test: multiple blocking failures -> feedback lists all of them

- Expected: all tests FAIL

#### 2.2 GREEN -- Implement

- Create `src/engine/modules/audit-resolver.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/audit-resolver.md`
- Implementation:

  ```typescript
  export interface AuditResolverResult {
    readonly pass: boolean;
    readonly blockingFailures: readonly string[];
    readonly rewriteFeedback: string | null;
    readonly forceAccepted: boolean;
  }

  export function resolveAudit(
    parsedResult: ParsedAuditResult,
    retryCount: number,
  ): AuditResolverResult {
    // 1. Identify blocking failures: answers where !matches && blocking
    const blockingFailures = parsedResult.answers
      .filter((a) => !a.matches && a.blocking)
      .map((a) => a.question);

    // 2. If no blocking failures -> pass
    if (blockingFailures.length === 0) {
      return { pass: true, blockingFailures: [], rewriteFeedback: null, forceAccepted: false };
    }

    // 3. If retryCount >= 3 -> force accept
    if (retryCount >= 3) {
      return { pass: true, blockingFailures, rewriteFeedback: null, forceAccepted: true };
    }

    // 4. Blocking failures exist and retryCount < 3 -> fail with feedback
    const feedback = buildRewriteFeedback(
      parsedResult.answers.filter((a) => !a.matches && a.blocking),
    );
    return { pass: false, blockingFailures, rewriteFeedback: feedback, forceAccepted: false };
  }

  function buildRewriteFeedback(failures: readonly ParsedAuditAnswer[]): string {
    // List each blocking failure with question text and expected answer
    // Per spec: "List all blocking failure items' question text and expected answer"
  }
  ```

- Pure code module -- NO LLM calls

#### 2.3 IMPROVE

- Verify the 5 rules match `audit-resolver.md` exactly
- Add JSDoc with spec reference
- Ensure `resolveAudit` is a pure function (no side effects)

---

### Task 3: Phase Consequence Settlement

#### 3.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/phase-consequence-settlement.test.ts`

**Request assembly tests:**

- Test: builds `PhaseConsequenceRequest` with `context.mainAxis`, `context.endLine`, `context.phaseGoal`
- Test: `phaseTranscript` contains only user/assistant entries (no system)
- Test: `phaseTranscript` is in chronological order

**Settlement call tests (with mock adapter):**

- Test: calls `adapter.settlement()` with valid PhaseConsequenceRequest
- Test: returns `PhaseConsequenceResponse` with `phaseConsequences` (1-6 items)
- Test: returns `settlementTrace` string
- Test: response passes `validatePhaseConsequenceResponse` schema check

**Validation tests:**

- Test: rejects response with 0 phaseConsequences
- Test: rejects response with 7+ phaseConsequences
- Test: rejects response missing settlementTrace

- Expected: all tests FAIL

#### 3.2 GREEN -- Implement

- Create `src/engine/modules/phase-consequence-settlement.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/phase-consequence-settlement.md`
- Implementation:

  ```typescript
  export function buildPhaseConsequenceRequest(
    mainAxis: string,
    endLine: string,
    phaseGoal: string,
    phaseTranscript: readonly TranscriptEntry[],
    sceneProgress?: string,
    currentPhaseIndex?: number,
  ): PhaseConsequenceRequest {
    return {
      context: { mainAxis, endLine, phaseGoal, sceneProgress, currentPhaseIndex },
      phaseTranscript: [...phaseTranscript],
    };
  }

  export async function settlePhaseConsequences(
    request: PhaseConsequenceRequest,
    adapter: LLMAdapter,
  ): Promise<PhaseConsequenceResponse> {
    const response = await adapter.settlement(request);
    return validatePhaseConsequenceResponse(response);
  }
  ```

#### 3.3 IMPROVE

- Verify phaseTranscript contains ONLY accepted history (no failed drafts)
- Add JSDoc with spec reference
- Log settlement trace for debugging

---

### Task 4: Orchestrator Control Hub

#### 4.1 RED -- Write Tests

- Create `src/engine/__tests__/orchestrator.test.ts`

**Scene initialization tests:**

- Test: `orchestrator.initScene(storyPackage)` loads scene spec and infers initial boundaries
- Test: after init, `orchestrator.getState().sceneState.alpha` is non-empty
- Test: after init, `orchestrator.getState().sceneState.beta` is non-empty

**Beat generation cycle tests:**

- Test: `orchestrator.runBeat(playerInput)` returns a `BeatResult` with `beatText` and `options`
- Test: `runBeat` calls modules in correct order: gradient -> router -> director -> assemble -> generate -> audit
- Test: on audit pass, Beat is accepted and written to history
- Test: state after accepted Beat: `currentBeatIndexInPhase` incremented

**Rewrite loop tests:**

- Test: audit fail -> rewrite with feedback -> re-generate -> audit again
- Test: retryCount increments on each rewrite
- Test: after 3 failures, force-accept with warning
- Test: rewrite calls `assembleRewritePromptObject` with generationControl

**Phase end tests:**

- Test: after 4th Beat accepted, Phase end processing triggers
- Test: Phase end calls settlement -> gets phaseConsequences
- Test: Phase end calls collapse -> gets new alpha/beta
- Test: new Phase starts with updated boundaries
- Test: `currentPhaseIndex` increments after Phase end

**Scene end tests:**

- Test: after all Phases complete, Scene ends
- Test: no more Beats can be generated after Scene end

**State immutability tests:**

- Test: each `runBeat` call returns a new state object (different reference)
- Test: previous state is not modified by subsequent operations

**Use mock adapter for all tests (no real API calls)**

- Expected: all tests FAIL

#### 4.2 GREEN -- Implement

- Create `src/engine/orchestrator.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/orchestrator-control-hub.md` + `LOGOS-SPEC/03_ORCHESTRATION/runtime-loop.md`
- Implementation outline:

  ```typescript
  export interface OrchestratorConfig {
    readonly adapter: LLMAdapter;
    readonly storyPackage: StoryPackage;
  }

  export interface BeatResult {
    readonly beatText: string;
    readonly options: readonly string[];
    readonly auditPassed: boolean;
    readonly forceAccepted: boolean;
    readonly retryCount: number;
  }

  export interface Orchestrator {
    initScene(): Promise<StateSnapshot>;
    runBeat(playerInput: string): Promise<{ beatResult: BeatResult; state: StateSnapshot }>;
    getState(): StateSnapshot;
    isSceneComplete(): boolean;
  }

  export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
    let currentState: StateSnapshot = createInitialState(config.storyPackage);
    const lightCone = createLightConeCollapse(config.adapter);
    const acceptedHistory: HistoryEntry[] = [];
    const phaseTranscript: TranscriptEntry[] = [];

    return {
      async initScene(): Promise<StateSnapshot> {
        // 1. Load SceneSpec from story package
        // 2. Infer initial Alpha/Beta via lightCone.inferInitialBoundaries
        // 3. Build initial state with Phase 1 gradient
        // Return immutable state
      },

      async runBeat(playerInput: string): Promise<...> {
        // 1. Add playerInput to history
        // 2. Get current volume from gradient
        // 3. Select router
        // 4. Build director note
        // 5. Assemble PromptObject
        // 6. Call adapter.generate()
        // 7. Build audit packet and call adapter.audit()
        // 8. Resolve audit
        // 9. If fail and retryCount < 3: loop with rewrite
        // 10. Accept or force-accept
        // 11. Update state (new StateSnapshot)
        // 12. Check Phase end -> settlement + collapse if needed
        // Return BeatResult + new state
      },

      getState() { return currentState; },
      isSceneComplete() { /* Check if all Phases done */ },
    };
  }
  ```

#### 4.3 IMPROVE

- Extract Phase-end processing into a separate function for clarity
- Extract Beat generation cycle into a separate function
- Verify the 7-step collaboration sequence matches `orchestrator-control-hub.md`
- Verify all 9 decision points from `control-flow-and-decision-points.md` are handled
- Ensure Orchestrator never exceeds 400 lines (extract helpers if needed)

---

## Post-flight

### 1. Quality Gate

- [ ] `npm test` -- all tests pass (Phase 00-06)
- [ ] `npm run test:coverage` -- >= 80% coverage on auditor.ts, audit-resolver.ts, phase-consequence-settlement.ts, orchestrator.ts
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR

- [ ] Stage: `src/engine/modules/auditor.ts`, `src/engine/modules/audit-resolver.ts`, `src/engine/modules/phase-consequence-settlement.ts`, `src/engine/orchestrator.ts`, all test files
- [ ] `git commit -m "feat: add Auditor, AuditResolver, PhaseConsequenceSettlement, and OrchestratorControlHub - closes engine loop"`
- [ ] `git push -u origin phase/06-audit-loop`
- [ ] Create PR against `main` with title: "Phase 06: Audit Loop + Orchestrator Control Hub"

### 3. STOP -- HUMAN REVIEW CHECKPOINT (M4)

This is a critical milestone. The entire engine loop must be verified before E2E testing.
Do not proceed to Phase 07 until this PR is reviewed and merged.
