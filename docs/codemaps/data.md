# Data Models Codemap

> Generated: 2026-03-27 | Source: `src/types/`, `src/authoring/`, `src/engine/api-adapter/`

## Core Domain Types (`src/types/`)

| Type | Purpose | Key Fields |
|------|---------|------------|
| `StoryPackage` | Complete story package loaded from disk | sceneSpec, phasePlans, worldBase, routerProfiles, controlModules, auditQuestionSet |
| `SceneSpec` | Scene definition | sceneId, sceneName, mainAxis, endLine, openingSituation, openingHook, samplePurpose |
| `PhasePlan` | Single phase in the scene | phaseId, phaseIndex, phaseName, phaseGoal, phaseEndPoint, gradientType, beatCount, routerHint, notes |
| `WorldBase` | World and character data (markdown) | mainCharacters, npcCharacters, locationPatch |
| `RouterProfile` | Narrative routing profile | routerName, routerSemanticCore, verbLexicon[] |
| `ControlModules` | Control layer config | sceneId, lightConeCustomization, directorNoteAdditions, beatVolumeDefinitions |
| `AuditQuestionSet` | Audit questions and selection policy | sceneId, globalQuestions, controlQuestions, phaseSpecificQuestions, selectionPolicy |
| `AuditQuestion` | Single audit question | id, question, expected, blocking, rationale? |
| `StateSnapshot` | Runtime state at a point in time | sceneState, roundState, generationState |
| `GradientType` | Phase intensity curve | `'Rising' \| 'Falling' \| 'Static High' \| 'U-Shape' \| 'Arch' \| 'Pulse' \| 'Steady'` |
| `UsageInfo` | LLM token usage | promptTokens?, completionTokens?, totalTokens? |

## Authoring Draft Types (`src/authoring/sections/`)

| Draft Type | Section | Key Fields |
|------------|---------|------------|
| `WorldBaseCastDraft` | worldbase-cast | worldBaseSetting, worldRules, toneBaseline, hero, coreCast[], antagonists[], supportingCast, locationPool |
| `WorldBaseCharacterDraft` | worldbase-cast | draftId, name, identityRole, lightNovelTrait, gender, personality, age, occupation, characterSummary, capabilityBoundary, behaviorBoundary, oocRedLine, clothing, propsWeapon, fatalWeakness? |
| `ScenePhaseAuthoringDraft` | scene-phase-authoring | sceneSpec (ScenePhaseSceneDraft), phasePlans (ScenePhasePlanDraft[]) |
| `ControlModulesDraft` | control-modules | controlModules, routerProfiles[], auditQuestionSet |

## Save Pipeline Types (`src/authoring/contracts.ts`)

| Type | Purpose | Key Fields |
|------|---------|------------|
| `SectionId` | Editable section identifier | `'worldbase-cast' \| 'scene-phase-authoring' \| 'control-modules' \| 'package-wiring-validation'` |
| `SaveRequest` | Incoming save request | requestId, packageName, sectionId, source, payload, moduleScope?, dryRun? |
| `SaveResult` | Save outcome (union) | kind + section-specific fields |
| `SaveAppliedResult` | Successful save | reloadedSectionState, runtimeImpactSummary |
| `SaveBlockedResult` | Validation failure | blockingIssues[] |
| `SaveFailedResult` | Runtime error | errorMessage |
| `ModuleScope` | Control module target | `'light-cone' \| 'director-note-additions' \| 'auditor-question-set' \| 'beat-volume-definitions' \| 'router-profile-set'` |

## Provider Types (`src/engine/api-adapter/`)

| Type | Purpose | Key Fields |
|------|---------|------------|
| `ProviderType` | API protocol | `'anthropic' \| 'openai-compatible'` |
| `ProviderConfig` | Connection config | apiKey, baseUrl, model |
| `AdapterConfig` | Full adapter config | provider, providerConfig, routeConfig?, generateConfig?, auditConfig?, settlementConfig?, collapseConfig? |
| `ModeConfig` | Per-operation overrides | temperature?, maxOutputTokens? |
| `ProviderPreset` | UI preset definition | id, label, providerType, baseUrl, models[], defaultModel |
| `PresetId` | Preset identifier | `'anthropic' \| 'minimax' \| 'openai' \| 'custom'` |

## Story Package Files (`story-packages/sample-scene/`)

| File | Format | Contains |
|------|--------|----------|
| `scene.yaml` | YAML | SceneSpec (sceneId, sceneName, mainAxis, endLine, etc.) |
| `phase-plans.yaml` | YAML | PhasePlans array with phaseId, goals, gradients, router hints |
| `world-base.yaml` | YAML | WorldBase (mainCharacters as structured markdown, npcCharacters, locationPatch) |
| `router-lexicon.yaml` | YAML | RouterProfile array (names, semantic cores, verb lexicons) |
| `control-modules.yaml` | YAML | ControlModules (light cone, director notes, beat volumes) |
| `audit-questions.yaml` | YAML | AuditQuestionSet (global, control, phase-specific questions + selection policy) |
| `state-snapshots.yaml` | YAML | Reference state snapshots for testing |
| `authoring-state.json` | JSON | Last save timestamp, edited section, request ID |

## Data Flow

```
YAML files on disk
  → story-loader.ts (parse + validate with Zod)
  → StoryPackage (immutable runtime type)
  → orchestrator.ts (runtime loop)
  → StateSnapshot (beat-level state)

Page draft (UI state)
  → API PATCH request (SaveRequest)
  → bridge.ts extract*Draft() (type-guard + normalize)
  → sections/*.ts render*() (draft → domain type)
  → repository.ts persist*() (write YAML)
  → reload.ts (re-parse from disk)
  → SaveResult.reloadedSectionState (back to UI)
```
