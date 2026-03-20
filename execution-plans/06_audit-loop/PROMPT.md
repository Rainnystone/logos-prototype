---
phase: "06"
title: "Audit Loop + Orchestrator Control Hub"
branch: "phase/06-audit-loop"
depends_on: ["05"]
spec_context_load:
  phase_0:
    - "LOGOS-SPEC/00_META/agent-guide.md"
    - "LOGOS-SPEC/00_META/system-map.md"
    - "LOGOS-SPEC/02_DOMAIN/glossary.md"
    - "LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md"
  phase_specific:
    - "LOGOS-SPEC/04_MODULES/auditor.md"
    - "LOGOS-SPEC/04_MODULES/audit-resolver.md"
    - "LOGOS-SPEC/04_MODULES/phase-consequence-settlement.md"
    - "LOGOS-SPEC/04_MODULES/orchestrator-control-hub.md"
    - "LOGOS-SPEC/03_ORCHESTRATION/runtime-loop.md"
    - "LOGOS-SPEC/03_ORCHESTRATION/control-flow-and-decision-points.md"
    - "LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/orchestrator-input-output.md"
estimated_tokens:
  phase_0: 4500
  phase_specific: 21000
  total: 25500
---

# Phase 06: Audit Loop + Orchestrator Control Hub

## Objective

Implement the four modules that close the entire engine loop: Auditor (boolean audit against question set), Audit Resolver (flow decision: pass/rewrite/force-accept), Phase Consequence Settlement (phase-end consequence extraction), and Orchestrator Control Hub (full runtime loop assembly). After this phase, the engine can run a complete Beat generation cycle including audit, rewrite, and Phase-end processing.

## Spec Context

| File | Tokens | Purpose |
|------|--------|---------|
| `00_META/agent-guide.md` | ~2,800 | Blocker protocol |
| `00_META/system-map.md` | ~1,000 | Architecture |
| `02_DOMAIN/glossary.md` | ~1,100 | Auditor, Resolver, Settlement, Orchestrator terms |
| `05_CONTRACTS/module-dependency-map.md` | ~900 | Orchestrator depends on all modules |
| `04_MODULES/auditor.md` | ~1,300 | Boolean audit, no final ruling |
| `04_MODULES/audit-resolver.md` | ~1,200 | 5 resolution rules, RewriteFeedback generation |
| `04_MODULES/phase-consequence-settlement.md` | ~1,700 | Fact extraction, LLM settlement call |
| `04_MODULES/orchestrator-control-hub.md` | ~1,400 | 7-step collaboration sequence |
| `03_ORCHESTRATION/runtime-loop.md` | ~2,500 | Full loop: init -> generate -> audit -> rewrite -> phase-end |
| `03_ORCHESTRATION/control-flow-and-decision-points.md` | ~1,500 | 9 decision points, code vs LLM ownership |
| `05_CONTRACTS/audit-packet-schema.yaml` | ~1,300 | AuditPacket structure |
| `05_CONTRACTS/audit-question-set-schema.yaml` | ~1,800 | AuditQuestionSet, selectionPolicy |
| `05_CONTRACTS/phase-consequence-packet-schema.yaml` | ~1,800 | PhaseConsequencePacket req/res |
| `05_CONTRACTS/collapse-packet-schema.yaml` | ~1,500 | CollapsePacket req/res |
| `05_CONTRACTS/state-snapshot-schema.yaml` | ~3,000 | Full StateSnapshot |
| `05_CONTRACTS/orchestrator-input-output.md` | ~1,000 | Module I/O summary |

## Deliverables

1. **Auditor module** (`src/engine/modules/auditor.ts`)
   - Exports: `buildAuditPacket(...)`: assembles AuditPacket from generation results + context
   - Exports: `parseAuditResult(result: AuditResult, questions: string[]): ParsedAuditResult`
   - Calls `adapter.audit()` with properly formed AuditPacket
   - Returns boolean answers aligned with question order

2. **Audit Resolver module** (`src/engine/modules/audit-resolver.ts`)
   - Exports: `resolveAudit(auditResult: ParsedAuditResult, questionSet: AuditQuestionSet, selectedIds: string[], retryCount: number): AuditResolverResult`
   - Pure code logic (no LLM calls)
   - Implements 5 resolution rules per spec
   - Returns: `{ pass: boolean; blockingFailures: string[]; rewriteFeedback: string | null; forceAccepted: boolean }`

3. **Phase Consequence Settlement module** (`src/engine/modules/phase-consequence-settlement.ts`)
   - Exports: `settlePhaseConsequences(request: PhaseConsequenceRequest, adapter: LLMAdapter): Promise<PhaseConsequenceResponse>`
   - Calls `adapter.settlement()` with PhaseConsequencePacket
   - Validates response: `phaseConsequences` (1-6 items), `settlementTrace`

4. **Orchestrator Control Hub** (`src/engine/orchestrator.ts`)
   - Exports: `createOrchestrator(config: OrchestratorConfig): Orchestrator`
   - Full runtime loop: Scene init -> Phase start -> Beat generation -> Audit -> Rewrite/Accept -> Phase end -> Scene end
   - Maintains immutable state transitions
   - Coordinates all modules in correct order

5. **Integration tests** for the complete loop

## Dependencies

- All Phase 00 types and validators
- Phase 01: `getHistoryWindow`, `getCurrentVolume`, `buildVolumeSequence`
- Phase 02: `createLightConeCollapse`, `selectRouter`, `getVerbLexicon`
- Phase 03: `buildDirectorNote`
- Phase 04: `assemblePromptObject`, `assembleRewritePromptObject`
- Phase 05: `createAPIAdapter` (full `LLMAdapter` implementation)

## Acceptance Criteria

- [ ] Auditor: `buildAuditPacket` produces valid AuditPacket matching schema
- [ ] Auditor: calls adapter.audit() and returns parsed boolean answers
- [ ] Resolver: implements all 5 rules from audit-resolver.md
- [ ] Resolver: blocking failure + retryCount < 3 -> fail with RewriteFeedback
- [ ] Resolver: retryCount >= 3 -> force accept with warning
- [ ] Resolver: no blocking failures -> pass (even with non-blocking failures)
- [ ] Settlement: calls adapter.settlement() and validates response
- [ ] Settlement: phaseConsequences has 1-6 string items
- [ ] Orchestrator: runs Scene init (loads story package, infers initial boundaries)
- [ ] Orchestrator: runs Beat generation cycle (collect state -> route -> direct -> assemble -> generate -> audit)
- [ ] Orchestrator: handles rewrite loop (up to 3 retries)
- [ ] Orchestrator: handles Phase end (settlement -> collapse -> next Phase)
- [ ] Orchestrator: handles Scene end (after last Phase)
- [ ] State transitions produce new StateSnapshot objects (immutable)
- [ ] All tests pass, coverage >= 80%
