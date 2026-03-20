---
phase: '00'
title: 'Foundation -- Project Scaffold, Types, and Story Loader'
branch: 'phase/00-foundation'
depends_on: []
spec_context_load:
  phase_0:
    - 'LOGOS-SPEC/00_META/agent-guide.md'
    - 'LOGOS-SPEC/00_META/system-map.md'
    - 'LOGOS-SPEC/02_DOMAIN/glossary.md'
    - 'LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md'
  phase_specific:
    - 'LOGOS-SPEC/02_DOMAIN/core-entities.md'
    - 'LOGOS-SPEC/02_DOMAIN/state-model.md'
    - 'LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/phase-plan-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/orchestrator-input-output.md'
    - 'LOGOS-SPEC/06_FIXTURES/sample-scene/scene-overview.md'
    - 'LOGOS-SPEC/06_FIXTURES/sample-scene/phase-plan.yaml'
    - 'LOGOS-SPEC/06_FIXTURES/sample-scene/router-lexicon.yaml'
    - 'LOGOS-SPEC/06_FIXTURES/sample-scene/audit-questions.yaml'
    - 'LOGOS-SPEC/06_FIXTURES/sample-scene/state-snapshots.yaml'
estimated_tokens:
  phase_0: 4500
  phase_specific: 22000
  total: 26500
---

# Phase 00: Foundation

## Objective

Establish the project scaffold for the LOGOS narrative engine. This phase delivers a working Next.js project with TypeScript strict mode, all contract types generated from YAML schemas, a story package loader that can read and validate the sample scene, and the base tooling configuration. Every subsequent phase builds on this foundation.

## Spec Context

| File                                                | Tokens | Purpose                                                                 |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `00_META/agent-guide.md`                            | ~2,800 | Agent routing, session workflow, blocker protocol                       |
| `00_META/system-map.md`                             | ~1,000 | Architecture overview, layer hierarchy                                  |
| `02_DOMAIN/glossary.md`                             | ~1,100 | Canonical terminology lock                                              |
| `05_CONTRACTS/module-dependency-map.md`             | ~900   | Module dependency constraints                                           |
| `02_DOMAIN/core-entities.md`                        | ~1,500 | Entity groups: static, runtime, product, evaluation                     |
| `02_DOMAIN/state-model.md`                          | ~1,400 | Minimum runtime state set                                               |
| `05_CONTRACTS/prompt-object-schema.yaml`            | ~2,500 | PromptObject structure (L1-L4 + generationControl)                      |
| `05_CONTRACTS/state-snapshot-schema.yaml`           | ~3,000 | StateSnapshot: sceneState, roundState, generationState, evaluationState |
| `05_CONTRACTS/audit-packet-schema.yaml`             | ~1,300 | AuditPacket: context, generatedContent, auditQuestions                  |
| `05_CONTRACTS/phase-plan-schema.yaml`               | ~1,100 | PhasePlan: phaseId, gradientType, beatCount (const 4)                   |
| `05_CONTRACTS/collapse-packet-schema.yaml`          | ~1,500 | CollapsePacket request/response bundle                                  |
| `05_CONTRACTS/phase-consequence-packet-schema.yaml` | ~1,800 | PhaseConsequencePacket request/response bundle                          |
| `05_CONTRACTS/audit-question-set-schema.yaml`       | ~1,800 | AuditQuestionSet: global, control, phase-specific questions             |
| `05_CONTRACTS/orchestrator-input-output.md`         | ~1,000 | Module I/O summary table, naming alignment                              |
| `06_FIXTURES/sample-scene/scene-overview.md`        | ~800   | Scene ID, mainAxis, endLine                                             |
| `06_FIXTURES/sample-scene/phase-plan.yaml`          | ~500   | 6 PhasePlan objects for sample scene                                    |
| `06_FIXTURES/sample-scene/router-lexicon.yaml`      | ~400   | RouterProfile definitions for sample scene                              |
| `06_FIXTURES/sample-scene/audit-questions.yaml`     | ~600   | AuditQuestionSet for sample scene                                       |
| `06_FIXTURES/sample-scene/state-snapshots.yaml`     | ~400   | Example StateSnapshot data                                              |

## Deliverables

1. **Next.js App Router project** with TypeScript strict mode, `src/` directory structure
2. **TypeScript types** for all YAML contract schemas:
   - `src/types/prompt-object.ts` -- `PromptObject`, `WorldBase`, `HistoryEntry`, `Narrative`, `DirectorNote`, `GenerationControl`
   - `src/types/state-snapshot.ts` -- `StateSnapshot`, `SceneState`, `RoundState`, `GenerationState`, `EvaluationState`
   - `src/types/audit-packet.ts` -- `AuditPacket`, `AuditContext`, `GeneratedContent`
   - `src/types/phase-plan.ts` -- `PhasePlan`, `GradientType`
   - `src/types/collapse-packet.ts` -- `CollapseRequest`, `CollapseResponse`
   - `src/types/phase-consequence-packet.ts` -- `PhaseConsequenceRequest`, `PhaseConsequenceResponse`
   - `src/types/audit-question-set.ts` -- `AuditQuestionSet`, `AuditQuestion`, `SelectionPolicy`
   - `src/types/index.ts` -- barrel export
3. **Story package loader** (`src/engine/story-loader.ts`): reads a story package directory, validates against schemas, returns typed objects
4. **Sample scene story package** (`src/story-packages/sample-scene/`): YAML files converted from LOGOS-SPEC fixtures
5. **Schema validator** (`src/engine/schema-validator.ts`): validates loaded data against TypeScript types at runtime (using zod or similar)
6. **Tooling config**: ESLint, Prettier, Vitest, tsconfig with strict mode

## Dependencies

None. This is the first phase.

## Acceptance Criteria

- [ ] `npx next dev` starts without errors
- [ ] All TypeScript types compile with `strict: true`
- [ ] Every YAML schema field has a corresponding TypeScript type with matching field name
- [ ] Story package loader successfully loads `sample-scene` and returns typed data
- [ ] Schema validator catches invalid data (test with deliberately broken fixtures)
- [ ] `npm test` passes with >= 80% coverage on new code
- [ ] `npm run lint` and `npm run format:check` pass with zero errors
- [ ] No hardcoded narrative content in any module file
