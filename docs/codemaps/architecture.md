# Architecture Codemap

> Updated: 2026-04-04 | includes Phase 2 runtime session continuity

## System Overview

```
                          ┌─────────────────┐
                          │   Title Page    │
                          │   (page.tsx)    │
                          └────────┬────────┘
                    ┌──────────────┼──────────────┐
                    ▼                              ▼
          ┌─────────────────┐            ┌─────────────────┐
          │ Play Workbench  │            │ Narrative Editor │
          │ (/play)         │            │ (/edit)          │
          └────────┬────────┘            └────────┬────────┘
                   │                              │
          Runtime Chain                  Authoring Chain
                   │                              │
    ┌──────────────┴──────────────┐    ┌──────────┴──────────┐
    │                             │    │                      │
    ▼                             │    ▼                      │
┌────────┐  ┌──────────────┐     │  ┌──────────┐  ┌────────┐│
│Orchestr│→ │RuntimeSession│     │  │Bridge    │→ │Reposit ││
│ator    │  │Repository    │     │  │(validate)│  │ory     ││
└────────┘  └──────┬───────┘     │  └──────────┘  │(file IO)│
    │              │             │       │         └────────┘│
    │        runtime-sessions    │       ▼                   │
    │            JSON            │  ┌──────────┐             │
    ▼              │             │  │Coordinator│             │
┌──────────┐  ┌────▼─────┐       │  │(AI repair)│             │
│API       │→ │Views /   │→ UI   │  └──────────┘             │
│Adapter   │  │bounded DTO│      │                           │
└────┬─────┘  └──────────┘       │               ┌───────────┴───────────┐
     │                           │               │   Story Package       │
     ▼                           │               │   (YAML files on disk)│
┌───────────────┐                │               └───────────────────────┘
│ Gossipelog    │                │
│ refresh chain │                │
└────┬──────────┘                │
     ▼                           │
┌────────────────────┐           │
│ Runtime modules +  │           │
│ prompt/render layer│           │
└────────────────────┘           │
```

## Two Chains

### Runtime Chain (Play)
`PlayerInput → Orchestrator → [Collapse → Route → DirectorNote → Assemble → Generate → Audit → Resolve] → Output`

Phase 2 adds a package-scoped runtime continuity substrate:
`/play page → loadRuntimeStoryPackage() + loadPlayRuntimeSessionView() → PlayWorkbench → runtime-session route/client → runtime-sessions.json`

The continuity loop is wider than the checkpoint store itself:
`PlayWorkbench/runtime.ts → /api/play/gossipelog → src/agents/gossipelog/* → runtime-session finalize → bounded continuity views`

### Authoring Chain (Edit)
`PageDraft → API PATCH → Bridge(normalize → validate → extract → render → persist → reload) → SaveResult`

For `section=worldbase-cast`, `/edit` can now additionally load a bounded runtime continuity projection:
`loadAuthoringState(includeRuntimeContinuity=true) → loadEditRuntimeContinuityView() → CharacterSection`

## Module Dependency Map

```
src/types/              ← shared by everything (zero deps)
src/engine/modules/     ← depends on src/types/
src/engine/orchestrator.ts ← depends on modules + types + runtime session store seam
src/engine/api-adapter/ ← depends on types + provider-interface
src/runtime-sessions/   ← depends on types + gossipelog-skill-packets + authoring package root helpers
src/authoring/          ← depends on types + sections + optional runtime continuity view
src/app/                ← depends on everything above
```

## Key Patterns

| Pattern | Where | How |
|---------|-------|-----|
| Immutable state | Everywhere | `{ ...old, field: new }`, `deepFreeze()` |
| Provider preset | `runtime-config.ts` | Dropdown auto-fills baseUrl + model list |
| CORS proxy | `api/llm/proxy/` | Server-side forward for non-standard LLM APIs |
| Runtime continuity | `runtime-sessions/` | `runtime-sessions.json` stores active session + full checkpoints |
| Relationship refresh | `app/play/runtime.ts` + `api/play/gossipelog` + `agents/gossipelog/` | Browser requests relationship update/injection; stale results finalize by `sessionId + checkpointId` |
| Collapsible UI | `CollapsiblePanel.tsx` | Consistent expand/collapse for sidebar panels |
| Section save | `persistence/bridge.ts` | normalize → validate → persist → reload pipeline |
| Draft round-trip | `sections/*.ts` | File ↔ Draft ↔ Rendered ↔ File cycle |
| Coordinator assist | `coordinator/` | AI-powered save repair when validation fails |

## Provider Architecture

```
AdapterConfig
  ├── provider: 'anthropic' | 'openai-compatible'
  ├── providerConfig: { apiKey, baseUrl, model }
  └── *Config?: { temperature?, maxOutputTokens? }  ← per-operation overrides

Presets: Anthropic | MiniMax | OpenAI | Custom
  └── Each defines: providerType, baseUrl, models[], defaultModel

CORS handling:
  Browser → [non-standard domain?] → /api/llm/proxy → External API
  Browser → [Anthropic/OpenAI?] → Direct fetch → External API
```
