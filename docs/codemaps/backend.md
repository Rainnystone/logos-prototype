# Backend Codemap

> Generated: 2026-03-27 | Source: `src/engine/`, `src/authoring/`, `src/app/api/`

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/authoring/packages/[packageName]/sections/[sectionId]` | PATCH | Save section draft (worldbase-cast, scene-phase-authoring, control-modules) |
| `/api/authoring/packages/[packageName]/coordinator` | POST | Coordinator-assisted save with AI repair |
| `/api/authoring/packages/[packageName]/diagnostics` | GET | Package health check and validation |
| `/api/llm/proxy` | POST | Server-side proxy for third-party LLM APIs (CORS bypass) |

## Engine Modules (`src/engine/modules/`)

| Module | Purpose | I/O |
|--------|---------|-----|
| `orchestrator.ts` | Main runtime loop: collapse -> route -> generate -> audit -> settle | StoryPackage + PlayerInput -> StateSnapshot |
| `light-cone-collapse.ts` | Narrow narrative boundary after each phase | PreviousState -> Alpha/Beta boundaries |
| `narrative-router.ts` | Select narrative path for current beat | RouterProfiles + Hint -> SelectedRouter |
| `director-note-layer.ts` | Build beat constraints and option constraints | State + ControlModules -> DirectorNote |
| `prompt-assembler.ts` | Assemble the final PromptObject for LLM | All layers -> PromptObject |
| `auditor.ts` | Parse LLM audit response into pass/fail | AuditResponse -> AuditResult |
| `audit-resolver.ts` | Decide: accept / rewrite / force-accept | AuditResult + RetryCount -> Resolution |
| `phase-gradient.ts` | Convert gradient type to 4-beat volume sequence | GradientType -> VolumeSequence |
| `phase-consequence-settlement.ts` | Process end-of-phase consequences | PhaseState -> PhaseConsequences |
| `memory-placeholder.ts` | Default history-window helper for accepted beats | Returns full history unless an explicit window size is provided |
| `option-generator.ts` | Generate player choice options | BeatContext -> Options[4] |

## API Adapter (`src/engine/api-adapter/`)

| File | Purpose |
|------|---------|
| `adapter.ts` | Factory: creates Provider from AdapterConfig, exposes 5 operations |
| `schema-mapper.ts` | Maps LOGOS operations to provider request format + default params |
| `response-parsers.ts` | Parses JSON responses into typed results |
| `prompt-templates.ts` | System prompts and template strings |
| `providers/provider-interface.ts` | Types: ProviderType, ProviderConfig, AdapterConfig, Provider |
| `providers/anthropic.ts` | Anthropic Messages API provider (with CORS proxy) |
| `providers/openai-compatible.ts` | OpenAI Chat Completions provider (with CORS proxy) |

## Authoring Pipeline (`src/authoring/`)

| File | Purpose |
|------|---------|
| `contracts.ts` | SectionId, SaveRequest, SaveResult types |
| `coordinator/coordinator.ts` | AI-assisted save coordinator logic |
| `coordinator/dispatch.ts` | Coordinator request dispatch and result types |
| `persistence/bridge.ts` | Main save pipeline: normalize -> validate -> extract -> render -> persist -> reload |
| `persistence/repository.ts` | File I/O: read/write/restore YAML files |
| `persistence/reload.ts` | Reload StoryPackage from disk after write |
| `persistence/package-state.ts` | Load initial authoring state for editor |
| `persistence/authoring-status.ts` | Read/write authoring-state.json marker |
| `persistence/save-results.ts` | Factory functions for SaveResult variants |
| `sections/worldbase-cast.ts` | WorldBase draft <-> markdown round-trip |
| `sections/scene-phase-authoring.ts` | ScenePhase draft <-> YAML round-trip |
| `sections/control-modules.ts` | ControlModules draft <-> YAML round-trip |
| `sections/package-diagnostics.ts` | Package health assessment and issue detection |

## Default Operation Parameters

| Operation | Temperature | Max Output Tokens |
|-----------|-------------|-------------------|
| Collapse | 0.5 | 36,864 |
| Route | 0.2 | 4,096 |
| Generate | 1.0 | 36,864 |
| Audit | 0.3 | 4,096 |
| Settlement | 0.1 | 8,192 |

## Test Coverage

| Directory | Test Files | Focus |
|-----------|-----------|-------|
| `src/engine/__tests__/` | 4 | Orchestrator, schema, loader, mock adapter |
| `src/engine/__tests__/e2e/` | 5 | Full phase runs, audit behavior, state transitions |
| `src/engine/api-adapter/__tests__/` | 5 | Adapter, providers, mappers, parsers |
| `src/engine/modules/__tests__/` | 10 | One per module |
| `src/authoring/persistence/__tests__/` | 3 | Bridge, package-state, save-results |
| `src/authoring/sections/__tests__/` | 4 | One per section |
| `src/authoring/coordinator/__tests__/` | 1 | Coordinator |
