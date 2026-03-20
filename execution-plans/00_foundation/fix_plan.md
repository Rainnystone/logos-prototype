# Phase 00 Fix Plan

## Pre-flight

### 1. Branch Setup

- [ ] This is the first phase; no prior PR to verify
- [ ] `git checkout -b phase/00-foundation`

### 2. Dependency Verification

- [ ] N/A -- no prior phases

### 3. Spec Context Load

- [ ] Load Phase 0 context (~4,500 tokens): agent-guide.md, system-map.md, glossary.md, module-dependency-map.md
- [ ] Load phase-specific context (~22,000 tokens): all 7 contract schemas + core-entities.md + state-model.md + orchestrator-input-output.md + sample-scene fixtures
- [ ] Confirm total ~26,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Next.js Project Scaffold

#### 1.1 RED -- Write Tests

- Create `src/__tests__/project-setup.test.ts`
- Test case: TypeScript strict mode is enabled (verify tsconfig.json `strict: true`)
- Test case: Project has `src/engine/`, `src/types/`, `src/story-packages/` directories
- Expected: tests FAIL (project not yet scaffolded)

#### 1.2 GREEN -- Scaffold

- Initialize Next.js project with App Router:
  ```
  npx create-next-app@latest . --typescript --app --src-dir --eslint
  ```
- Configure `tsconfig.json`:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true` (if compatible)
  - Path aliases: `@/` -> `src/`
- Create directory structure:
  ```
  src/
  ├── app/                    # Next.js App Router
  ├── engine/
  │   ├── modules/            # Phase 01-06 modules go here
  │   │   └── __tests__/
  │   └── __tests__/
  ├── types/                  # TypeScript types from schemas
  ├── story-packages/
  │   └── sample-scene/       # Converted YAML fixtures
  └── __tests__/
  ```
- Install dev dependencies: `vitest`, `@testing-library/react`, `zod`
- Configure Vitest in `vitest.config.ts`:
  - Coverage provider: v8
  - Coverage thresholds: 80% branches, 80% functions, 80% lines, 80% statements
  - Include: `src/**/*.ts`
  - Exclude: `src/types/**`, `src/app/**`
- Configure ESLint: extend Next.js defaults, add TypeScript strict rules
- Configure Prettier: standard config (printWidth 100, singleQuote true, semi true)

#### 1.3 IMPROVE

- Add npm scripts: `test`, `test:coverage`, `lint`, `format`, `format:check`
- Verify `npm run build` succeeds with zero errors

---

### Task 2: TypeScript Types from Contract Schemas

#### 2.1 RED -- Write Tests

- Create `src/types/__tests__/type-conformance.test.ts`
- Test case: `PromptObject` has required fields `worldBase`, `history`, `narrative`, `directorNote`
- Test case: `PromptObject.directorNote` has required fields `volume`, `router`, `verbLexicon`, `beatConstraints`, `optionConstraints`
- Test case: `PromptObject.directorNote.volume` is one of `"Low" | "Med" | "High"`
- Test case: `PromptObject.generationControl` is optional and has `isRewrite`, `retryCount`, `rewriteFeedback`, `previousDraft`
- Test case: `StateSnapshot` has required fields `sceneState`, `roundState`, `generationState`, `evaluationState`
- Test case: `PhasePlan.gradientType` is one of the 7 enum values
- Test case: `PhasePlan.beatCount` is always 4
- Test case: `AuditPacket` has `context.precedingBeats`, `generatedContent.beatText`, `generatedContent.options`, `auditQuestions`
- Test case: `CollapseRequest` has `context` (with mainAxis, endLine, currentAlpha, currentBeta) and `phaseConsequences`
- Test case: `CollapseResponse` has `alpha`, `beta`, `inferenceTrace`
- Test case: `PhaseConsequenceRequest` has `context` (mainAxis, endLine, phaseGoal) and `phaseTranscript`
- Test case: `PhaseConsequenceResponse` has `phaseConsequences` (array 1-6) and `settlementTrace`
- Test case: `AuditQuestionSet` has `sceneId`, `globalQuestions`, `controlQuestions`, `selectionPolicy`
- Test case: `AuditQuestion` has `id`, `question`, `expected` (boolean), `blocking` (boolean)
- Expected: all tests FAIL (types not yet defined)

#### 2.2 GREEN -- Implement Types

- **`src/types/prompt-object.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml`
  - Types: `PromptObject`, `WorldBase`, `HistoryEntry`, `Narrative`, `DirectorNote`, `GenerationControl`, `PreviousDraft`
  - `Volume = "Low" | "Med" | "High"`
  - `HistoryEntry.role = "system" | "user" | "assistant"`
  - `GenerationControl` is optional on `PromptObject` (only present on rewrite path)

- **`src/types/state-snapshot.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml`
  - Types: `StateSnapshot`, `SceneState`, `RoundState`, `GenerationState`, `EvaluationState`
  - `SceneState` required: `sceneId`, `currentPhaseIndex` (min 1), `currentBeatIndexInPhase` (min 1), `mainAxis`, `endLine`, `alpha`, `beta`
  - `SceneState` optional: `sceneProgress`, `phaseConsequences` (string[])
  - `RoundState` required: `phaseGoal`, `currentVolume` (Volume), `currentRouter`, `verbLexicon` (string[], min 1), `historyWindow` (HistoryEntry[])
  - `RoundState` optional: `directorConstraints`
  - `EvaluationState` required: `auditAnswers` (boolean[]), `blockingFailures` (string[]), `retryCount` (int >= 0), `rewriteFeedback` (string | null)

- **`src/types/audit-packet.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml`
  - Types: `AuditPacket`, `AuditContext`, `GeneratedContent`
  - `GeneratedContent.options`: exactly 4 strings
  - `auditQuestions`: string[] with min 1

- **`src/types/phase-plan.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/phase-plan-schema.yaml`
  - Types: `PhasePlan`, `GradientType`
  - `GradientType = "Rising" | "Falling" | "Static High" | "U-Shape" | "Arch" | "Pulse" | "Steady"`
  - `beatCount` is always 4 (const)
  - Optional: `routerHint`, `notes`

- **`src/types/collapse-packet.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml`
  - Types: `CollapseRequest`, `CollapseResponse`, `CollapseContext`, `UsageInfo`
  - `CollapseResponse` required: `alpha`, `beta`, `inferenceTrace`

- **`src/types/phase-consequence-packet.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml`
  - Types: `PhaseConsequenceRequest`, `PhaseConsequenceResponse`, `PhaseConsequenceContext`, `TranscriptEntry`
  - `TranscriptEntry.role = "user" | "assistant"` (no "system" -- only accepted history)
  - `phaseConsequences`: 1-6 strings
  - `settlementTrace`: string

- **`src/types/audit-question-set.ts`**
  - Spec: `LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml`
  - Types: `AuditQuestionSet`, `AuditQuestion`, `SelectionPolicy`, `PhaseOverride`
  - `AuditQuestion` required: `id`, `question`, `expected` (boolean), `blocking` (boolean)
  - Optional: `rationale`
  - `selectionPolicy.default`: string[] (question IDs)
  - `selectionPolicy.phaseOverrides`: Record<string, { append: string[] }>

- **`src/types/index.ts`**
  - Barrel export of all types

#### 2.3 IMPROVE

- Add JSDoc comments referencing the source YAML schema for each type
- Add Zod schemas alongside types for runtime validation (see Task 4)
- Verify every field name matches the YAML schema exactly (camelCase)

---

### Task 3: Sample Scene Story Package

#### 3.1 RED -- Write Tests

- Create `src/story-packages/__tests__/sample-scene.test.ts`
- Test case: `sample-scene/scene.yaml` is valid and contains `sceneId: "sample-yanshang-live-room"`
- Test case: `sample-scene/phase-plans.yaml` contains 6 PhasePlan objects with valid gradientType values
- Test case: `sample-scene/router-lexicon.yaml` contains RouterProfile objects with verbLexicon arrays
- Test case: `sample-scene/audit-questions.yaml` is a valid AuditQuestionSet
- Test case: `sample-scene/world-base.yaml` contains `mainCharacters` and `locationPatch`
- Expected: tests FAIL (story package not yet created)

#### 3.2 GREEN -- Convert Fixtures

- Convert from `LOGOS-SPEC/06_FIXTURES/sample-scene/` into `src/story-packages/sample-scene/`:
  - **`scene.yaml`**: SceneSpec with sceneId, sceneName, mainAxis, endLine from `scene-overview.md`
  - **`phase-plans.yaml`**: Array of 6 PhasePlan objects from `phase-plan.yaml`
  - **`router-lexicon.yaml`**: RouterProfile objects from `router-lexicon.yaml`
  - **`audit-questions.yaml`**: AuditQuestionSet from `audit-questions.yaml`
  - **`world-base.yaml`**: WorldBase with mainCharacters, npcCharacters, locationPatch from `story-source/characters.md` + `story-source/location-pool.md`
  - **`state-snapshots.yaml`**: Example StateSnapshot data from `state-snapshots.yaml`
- All YAML files must be machine-parseable and match TypeScript type definitions

#### 3.3 IMPROVE

- Add a `story-package.schema.md` documenting the expected directory structure of a story package
- Verify no raw narrative content leaked into engine code (all narrative stays in story-packages/)

---

### Task 4: Schema Validator

#### 4.1 RED -- Write Tests

- Create `src/engine/__tests__/schema-validator.test.ts`
- Test case: `validatePromptObject()` accepts a valid PromptObject
- Test case: `validatePromptObject()` rejects an object missing `directorNote`
- Test case: `validatePromptObject()` rejects `volume: "Invalid"` (must be Low/Med/High)
- Test case: `validateStateSnapshot()` accepts a valid StateSnapshot
- Test case: `validateStateSnapshot()` rejects `currentPhaseIndex: 0` (min 1)
- Test case: `validatePhasePlan()` accepts a valid PhasePlan
- Test case: `validatePhasePlan()` rejects `beatCount: 5` (must be 4)
- Test case: `validateAuditPacket()` rejects options array with 3 items (must be exactly 4)
- Test case: `validateCollapseRequest()` rejects missing `phaseConsequences`
- Expected: tests FAIL

#### 4.2 GREEN -- Implement

- Create `src/engine/schema-validator.ts`
- Define Zod schemas that mirror every TypeScript type:
  - `PromptObjectSchema`, `StateSnapshotSchema`, `PhasePlanSchema`, `AuditPacketSchema`
  - `CollapseRequestSchema`, `CollapseResponseSchema`
  - `PhaseConsequenceRequestSchema`, `PhaseConsequenceResponseSchema`
  - `AuditQuestionSetSchema`
- Export validation functions:
  - `validatePromptObject(data: unknown): PromptObject`
  - `validateStateSnapshot(data: unknown): StateSnapshot`
  - `validatePhasePlan(data: unknown): PhasePlan`
  - `validateAuditPacket(data: unknown): AuditPacket`
  - `validateCollapseRequest(data: unknown): CollapseRequest`
  - `validateCollapseResponse(data: unknown): CollapseResponse`
  - `validatePhaseConsequenceRequest(data: unknown): PhaseConsequenceRequest`
  - `validatePhaseConsequenceResponse(data: unknown): PhaseConsequenceResponse`
  - `validateAuditQuestionSet(data: unknown): AuditQuestionSet`
- Each function: parse with Zod, return typed result on success, throw descriptive error on failure

#### 4.3 IMPROVE

- Add error messages that reference the schema field path (e.g., "directorNote.volume must be Low|Med|High")
- Ensure all Zod schemas stay in sync with TypeScript types (shared source of truth)

---

### Task 5: Story Package Loader

#### 5.1 RED -- Write Tests

- Create `src/engine/__tests__/story-loader.test.ts`
- Test case: `loadStoryPackage("sample-scene")` returns a typed `StoryPackage` object
- Test case: Returned `StoryPackage.sceneSpec.sceneId` equals `"sample-yanshang-live-room"`
- Test case: Returned `StoryPackage.phasePlans` has length 6
- Test case: Returned `StoryPackage.phasePlans[0].gradientType` is a valid GradientType
- Test case: `loadStoryPackage("nonexistent")` throws a descriptive error
- Test case: A story package with an invalid `phase-plans.yaml` throws a validation error
- Expected: tests FAIL

#### 5.2 GREEN -- Implement

- Create `src/engine/story-loader.ts`
- Define `StoryPackage` type:
  ```typescript
  interface StoryPackage {
    readonly sceneSpec: SceneSpec;
    readonly phasePlans: readonly PhasePlan[];
    readonly routerProfiles: readonly RouterProfile[];
    readonly auditQuestionSet: AuditQuestionSet;
    readonly worldBase: WorldBase;
  }
  ```
- Define `SceneSpec` type (from scene.yaml):
  ```typescript
  interface SceneSpec {
    readonly sceneId: string;
    readonly sceneName: string;
    readonly mainAxis: string;
    readonly endLine: string;
  }
  ```
- Define `RouterProfile` type:
  ```typescript
  interface RouterProfile {
    readonly routerName: string;
    readonly routerSemanticCore: string;
    readonly verbLexicon: readonly string[];
  }
  ```
- Implement `loadStoryPackage(packageName: string): Promise<StoryPackage>`:
  1. Resolve package directory path
  2. Read each YAML file using a YAML parser (install `yaml` package)
  3. Validate each file with corresponding Zod schema
  4. Return immutable `StoryPackage` object
- All returned objects must be deeply frozen (readonly types + Object.freeze)

#### 5.3 IMPROVE

- Extract YAML parsing into a utility function
- Add error wrapping that includes the file path in validation error messages
- Verify the loader works with the sample-scene package end-to-end

---

## Post-flight

### 1. Quality Gate

- [ ] `npm test` -- all tests pass
- [ ] `npm run test:coverage` -- >= 80% on new code
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues
- [ ] `npm run build` -- compiles successfully

### 2. Commit and PR

- [ ] Stage all new files: `src/types/`, `src/engine/schema-validator.ts`, `src/engine/story-loader.ts`, `src/story-packages/sample-scene/`, config files, tests
- [ ] `git commit -m "feat: scaffold project with contract types, story loader, and sample scene"`
- [ ] `git push -u origin phase/00-foundation`
- [ ] Create PR against `main` with title: "Phase 00: Foundation -- Project Scaffold, Types, and Story Loader"

### 3. STOP

Do not proceed to Phase 01 or Phase 02 until this PR is reviewed and merged.
