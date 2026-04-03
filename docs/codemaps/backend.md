# Backend Codemap

> Updated: 2026-04-04 | Source: `src/engine/`, `src/authoring/`, `src/runtime-sessions/`, `src/app/api/`

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/authoring/packages/[packageName]/sections/[sectionId]` | PATCH | Save section draft (worldbase-cast, scene-phase-authoring, control-modules) |
| `/api/authoring/packages/[packageName]/coordinator` | POST | Coordinator-assisted save with AI repair |
| `/api/authoring/packages/[packageName]/diagnostics` | GET | Package health check and validation |
| `/api/llm/proxy` | POST | Server-side proxy for third-party LLM APIs (CORS bypass) |
| `/api/play/gossipelog` | POST | Server-owned gossipelog bridge for relationship update + injection cycles |
| `/api/play/packages/[packageName]/runtime-session` | POST | Runtime continuity bridge for ensure / record accepted beat / finalize relationship / reset |

## Runtime Engine

| File | Purpose | I/O |
|------|---------|-----|
| `src/engine/orchestrator.ts` | Main runtime loop: collapse -> route -> generate -> audit -> settle -> checkpoint-ready continuation | StoryPackage + PlayerInput -> StateSnapshot + accepted beat side effects |
| `src/engine/modules/light-cone-collapse.ts` | Narrow narrative boundary after each phase | PreviousState -> Alpha/Beta boundaries |
| `src/engine/modules/narrative-router.ts` | Select narrative path for current beat | RouterProfiles + Hint -> SelectedRouter |
| `src/engine/modules/director-note-layer.ts` | Build beat constraints and option constraints | State + ControlModules -> DirectorNote |
| `src/engine/modules/prompt-assembler.ts` | Assemble the final PromptObject for LLM | All layers -> PromptObject |
| `src/engine/modules/world-base-prompt-render.ts` | Render structured world base content into prompt-safe text | WorldBase -> Prompt fragments |
| `src/engine/modules/auditor.ts` | Parse LLM audit response into pass/fail | AuditResponse -> AuditResult |
| `src/engine/modules/audit-resolver.ts` | Decide: accept / rewrite / force-accept | AuditResult + RetryCount -> Resolution |
| `src/engine/modules/phase-gradient.ts` | Convert gradient type to 4-beat volume sequence | GradientType -> VolumeSequence |
| `src/engine/modules/phase-consequence-settlement.ts` | Process end-of-phase consequences | PhaseState -> PhaseConsequences |
| `src/engine/modules/memory-placeholder.ts` | Default history-window helper for accepted beats | Returns full history unless an explicit window size is provided |

## API Adapter (`src/engine/api-adapter/`)

| File | Purpose |
|------|---------|
| `adapter.ts` | Factory: creates Provider from AdapterConfig, exposes route/generate/audit/settlement/collapse plus gossipelog update/injection |
| `schema-mapper.ts` | Maps LOGOS operations to provider request format + default params |
| `response-parsers.ts` | Parses JSON responses into typed results |
| `prompt-templates.ts` | System prompts and template strings |
| `providers/provider-interface.ts` | Types: ProviderType, ProviderConfig, AdapterConfig, Provider |
| `providers/anthropic.ts` | Anthropic Messages API provider (with CORS proxy) |
| `providers/openai-compatible.ts` | OpenAI Chat Completions provider (with CORS proxy) |

## Runtime Session Substrate (`src/runtime-sessions/`)

| File | Purpose |
|------|---------|
| `repository.ts` | Server-owned JSON repository for `runtime-sessions.json`, including queued writes and semantic validation |
| `views.ts` | Builds bounded `/play` and `/edit` continuity DTOs from repository state |
| `copy.ts` | Client-safe user-facing copy for continuity error / unavailable states |

## Authoring Pipeline (`src/authoring/`)

| File | Purpose |
|------|---------|
| `contracts.ts` | SectionId, SaveRequest, SaveResult types |
| `coordinator/coordinator.ts` | AI-assisted save coordinator logic |
| `coordinator/dispatch.ts` | Coordinator request dispatch and result types |
| `persistence/bridge.ts` | Main save pipeline: normalize -> validate -> extract -> render -> persist -> reload |
| `persistence/repository.ts` | File I/O: read/write/restore YAML files |
| `persistence/reload.ts` | Reload StoryPackage from disk after write |
| `persistence/package-state.ts` | Load initial authoring state for editor, optionally including bounded runtime continuity for worldbase-cast |
| `persistence/authoring-status.ts` | Read/write authoring-state.json marker |
| `persistence/save-results.ts` | Factory functions for SaveResult variants |
| `sections/worldbase-cast.ts` | WorldBase draft <-> markdown round-trip |
| `sections/world-locations.ts` | Structured location draft hydration, normalization, and patch projection |
| `sections/scene-cast.ts` | Scene cast normalization shared by scene/phase authoring |
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

## Continuity Notes

- `runtime-sessions.json` is package-scoped runtime state, parallel to `authoring-state.json` and `agents/`, but not part of the `StoryPackage` YAML definition itself.
- Accepted beats are persisted as full checkpoints after the orchestrator produces continuation-ready state.
- Delayed gossipelog finalization is bound by `sessionId + checkpointId`, so stale refresh results can finalize their own checkpoint without polluting a newer active session.
- `/play` restores from the active session by default; `/edit` only consumes a bounded continuity summary and never reads raw checkpoint maps or transcripts.
- `ensure_active_session`, `record_accepted_beat`, `finalize_relationship_layer`, and `reset_workbench` all run through the same package-scoped queued write path, so write ordering is serialized per story package.

## Test Coverage Landmarks

- Runtime continuity route coverage sits in `src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`.
- Gossipelog bridge coverage sits in `src/app/api/play/gossipelog/route.test.ts`.
- Repository and DTO projection coverage sits in `src/runtime-sessions/__tests__/repository.test.ts` and `src/runtime-sessions/__tests__/views.test.ts`.
- Browser-level continuity observer coverage extends into `simulation-toolset/tests/gossipelog-observer.test.ts`.
