---
phase: "05"
title: "API Adapter Lite"
branch: "phase/05-api-adapter"
depends_on: ["04"]
spec_context_load:
  phase_0:
    - "LOGOS-SPEC/00_META/agent-guide.md"
    - "LOGOS-SPEC/00_META/system-map.md"
    - "LOGOS-SPEC/02_DOMAIN/glossary.md"
    - "LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md"
  phase_specific:
    - "LOGOS-SPEC/04_MODULES/api-adapter-lite/overview.md"
    - "LOGOS-SPEC/04_MODULES/api-adapter-lite/interface-contracts.md"
    - "LOGOS-SPEC/04_MODULES/api-adapter-lite/schema-mapper.md"
    - "LOGOS-SPEC/04_MODULES/api-adapter-lite/runtime.md"
    - "LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml"
estimated_tokens:
  phase_0: 4500
  phase_specific: 22000
  total: 26500
---

# Phase 05: API Adapter Lite

## Objective

Implement the API Adapter Lite -- the provider abstraction layer that handles all external LLM calls. This module supports 4 modes (`generate`, `audit`, `settlement`, `collapse`), maps LOGOS-internal schemas to provider-specific formats, and returns unified response objects. Initial provider support: Anthropic (Claude) and OpenAI-compatible APIs. This phase replaces the mock adapter from Phase 02 with the real implementation.

## Spec Context

| File | Tokens | Purpose |
|------|--------|---------|
| `00_META/agent-guide.md` | ~2,800 | Blocker protocol |
| `00_META/system-map.md` | ~1,000 | Architecture |
| `02_DOMAIN/glossary.md` | ~1,100 | API Adapter definition |
| `05_CONTRACTS/module-dependency-map.md` | ~900 | Adapter dependency rules |
| `04_MODULES/api-adapter-lite/overview.md` | ~3,500 | Architecture, 4 modes, file structure |
| `04_MODULES/api-adapter-lite/interface-contracts.md` | ~4,000 | generate/audit/settlement/collapse request/response formats |
| `04_MODULES/api-adapter-lite/schema-mapper.md` | ~3,000 | OpenAI + Gemini format mapping |
| `04_MODULES/api-adapter-lite/runtime.md` | ~3,500 | TokenInspector, provider config, backend proxy |
| `05_CONTRACTS/prompt-object-schema.yaml` | ~2,500 | PromptObject (generate input) |
| `05_CONTRACTS/audit-packet-schema.yaml` | ~1,300 | AuditPacket (audit input) |
| `05_CONTRACTS/phase-consequence-packet-schema.yaml` | ~1,800 | PhaseConsequencePacket (settlement input) |
| `05_CONTRACTS/collapse-packet-schema.yaml` | ~1,500 | CollapsePacket (collapse input) |

## Deliverables

1. **API Adapter main entry** (`src/engine/api-adapter/adapter.ts`)
   - Implements the `LLMAdapter` interface from Phase 02
   - Exports: `createAPIAdapter(config: AdapterConfig): LLMAdapter`
   - 4 methods: `generate()`, `audit()`, `settlement()`, `collapse()`
   - Each method: validate input -> map schema -> call provider -> validate response -> return

2. **Schema Mapper** (`src/engine/api-adapter/schema-mapper.ts`)
   - Exports: `mapForGenerate(prompt: PromptObject, provider: ProviderType): ProviderRequest`
   - Exports: `mapForAudit(packet: AuditPacket, provider: ProviderType): ProviderRequest`
   - Exports: `mapForSettlement(packet: PhaseConsequenceRequest, provider: ProviderType): ProviderRequest`
   - Exports: `mapForCollapse(packet: CollapseRequest, provider: ProviderType): ProviderRequest`
   - Two mapping paths: OpenAI-compatible and Anthropic
   - Maps LOGOS 4-layer PromptObject into provider message array

3. **Provider implementations** (`src/engine/api-adapter/providers/`)
   - `anthropic.ts`: Anthropic Claude API
   - `openai-compatible.ts`: OpenAI-format API (covers OpenAI, MiniMax, Kimi, etc.)
   - Common: `provider-interface.ts` defines shared provider contract

4. **Response types**:
   - `GenerateResult`: `{ beatText: string; options: string[]; usage?: UsageInfo }`
   - `AuditResult`: `{ answers: boolean[]; usage?: UsageInfo }`
   - `PhaseConsequenceResponse`: from existing types
   - `CollapseResponse`: from existing types

5. **Unit tests** with >= 80% coverage (using mock HTTP responses)

## Dependencies

- Phase 00 types: all contract types
- Phase 00 schema validator: all validation functions
- Phase 02 adapter interface: `LLMAdapter`
- Phase 04 PromptObject: assembler output structure

## Acceptance Criteria

- [ ] `createAPIAdapter(config)` returns a fully functional `LLMAdapter`
- [ ] `generate()` accepts a `PromptObject` and returns `GenerateResult` with `beatText` and `options` (4 strings)
- [ ] `audit()` accepts an `AuditPacket` and returns `AuditResult` with boolean `answers[]`
- [ ] `settlement()` accepts `PhaseConsequenceRequest` and returns `PhaseConsequenceResponse` with `phaseConsequences[]`
- [ ] `collapse()` accepts `CollapseRequest` and returns `CollapseResponse` with `alpha`, `beta`, `inferenceTrace`
- [ ] Schema mapper correctly converts PromptObject 4-layer structure into provider message format
- [ ] Anthropic provider sends correct API format (system + messages)
- [ ] OpenAI-compatible provider sends correct API format (messages array)
- [ ] Settlement mode uses temperature 0.2 (per spec)
- [ ] Collapse mode uses temperature 0.5 (per spec)
- [ ] All responses are validated against their respective schemas before returning
- [ ] API keys are read from environment/config, never hardcoded
- [ ] All tests pass, coverage >= 80%
