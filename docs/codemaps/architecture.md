# Architecture Codemap

> Generated: 2026-03-27 | 56 test files, 318 tests passing

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
┌────────┐  ┌─────────┐          │  ┌──────────┐  ┌────────┐│
│Orchestr│→ │API      │→ LLM    │  │Bridge    │→ │Reposit ││
│ator    │  │Adapter  │  Provider│  │(validate)│  │ory     ││
└────────┘  └─────────┘          │  └──────────┘  │(file IO)│
    │            │               │       │         └────────┘│
    ▼            ▼               │       ▼                   │
┌────────────────────┐          │  ┌──────────┐             │
│ Engine Modules     │          │  │Coordinator│             │
│ (10 modules)       │          │  │(AI repair)│             │
└────────────────────┘          │  └──────────┘             │
                                │                           │
                    ┌───────────┴───────────┐               │
                    │   Story Package       │◄──────────────┘
                    │   (YAML files on disk) │
                    └───────────────────────┘
```

## Two Chains

### Runtime Chain (Play)
`PlayerInput → Orchestrator → [Collapse → Route → DirectorNote → Assemble → Generate → Audit → Resolve] → Output`

### Authoring Chain (Edit)
`PageDraft → API PATCH → Bridge(normalize → validate → extract → render → persist → reload) → SaveResult`

## Module Dependency Map

```
src/types/          ← shared by everything (zero deps)
src/engine/modules/ ← depends on src/types/
src/engine/orchestrator.ts ← depends on modules + types
src/engine/api-adapter/ ← depends on types + provider-interface
src/authoring/      ← depends on types + sections
src/app/            ← depends on everything above
```

## Key Patterns

| Pattern | Where | How |
|---------|-------|-----|
| Immutable state | Everywhere | `{ ...old, field: new }`, `deepFreeze()` |
| Provider preset | `runtime-config.ts` | Dropdown auto-fills baseUrl + model list |
| CORS proxy | `api/llm/proxy/` | Server-side forward for non-standard LLM APIs |
| Collapsible UI | `CollapsiblePanel.tsx` | Consistent expand/collapse for sidebar panels |
| Section save | `persistence/bridge.ts` | normalize → validate → persist → reload pipeline |
| Draft round-trip | `sections/*.ts` | File ↔ Draft ↔ Rendered ↔ File cycle |
| Coordinator assist | `coordinator/` | AI-powered save repair when validation fails |

## File Count by Area

| Area | Source Files | Test Files |
|------|-------------|------------|
| `src/app/` (pages, components, API) | 27 | 10 |
| `src/engine/` (orchestrator, modules, adapter) | 19 | 20 |
| `src/authoring/` (contracts, persistence, sections) | 12 | 8 |
| `src/types/` | 3 | 2 |
| **Total** | **61** | **40** |

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
