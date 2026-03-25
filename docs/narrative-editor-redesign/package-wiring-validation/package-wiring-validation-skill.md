# Package Wiring Validation Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: fourth detailed section skill under the coordinator-first redesign
- Global section map: [../section-map.md](../section-map.md)
- Related page: [package-wiring-validation-page.md](package-wiring-validation-page.md)
- Related bridge doc: [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)

## 1. Purpose

This document defines the approved boundary for
`package-wiring-validation-skill`.

This skill is responsible for turning backend assembly and validation results
into display-ready dashboard state for the `组装与校验 (Package Wiring &
Validation)` section.

It is not responsible for:

- running backend validation itself
- writing files
- repairing package data directly
- replacing section-local coordinators
- deciding final save success state

## 2. Section Role

This section is not a fourth content-authoring page.

It is a dashboard-first section that exists to show:

- whole-package health
- section health
- assembly flow state
- unresolved issues that were not silently solved by section-local coordinators
- actionable repair routing back to the correct section

That means this skill should be treated as a diagnostics interpretation skill,
not as a prose-generation skill and not as a content-editing skill.

## 3. Approved Responsibilities

The skill may do the following:

1. interpret backend package health results for dashboard display
2. summarize whole-package state into stable left-panel status blocks
3. organize unresolved issues by severity, scope, and repair destination
4. prepare selected-item detail content for the right-top detail panel
5. prepare global diagnostic guidance for the lower-right coordinator block
6. preserve the distinction between section-local issues and cross-section or backend-level issues

## 4. Skill Must Not Do

The skill must not:

1. re-run validation on its own
2. fabricate health results that did not come from deterministic backend checks
3. rewrite author content from other sections
4. bypass section-local coordinators
5. turn this page into a repair console
6. silently convert unresolved system issues into false success states
7. expose low-level implementation details as the primary user-facing message

## 5. Approved Input Areas

The skill should expect inputs related to these dashboard surfaces:

- overall package status
- section health summaries
- assembly flow node state
- unresolved issue list
- selected issue / node / section
- latest global coordinator context

It should also be able to consume:

- backend round-trip reload result
- per-section coordinator result summaries
- bridge status summaries
- validation repair payloads that remain unresolved after local handling

## 6. Approved Output Shape

The first legal skill output is a structured dashboard-state candidate.

That output should be shaped for the coordinator + page pipeline, not for direct
filesystem write.

The output should, in substance, be able to describe:

- overall status block content
- section health card content
- assembly flow node content
- unresolved issue queue content
- selected detail panel content
- global coordinator summary and repair-order guidance

### 6.1 Approved V1 Output Families

The skill should organize its output into these groups:

- `overallStatusView`
- `sectionHealthViews`
- `assemblyFlowViews`
- `unresolvedIssueViews`
- `selectedDetailView`
- `globalCoordinatorView`

The skill should not collapse all dashboard output into one undifferentiated blob.

## 7. Relation To The Page

The page and the skill have different jobs.

### 7.1 Page Responsibilities

The page is responsible for:

- rendering dashboard surfaces
- selecting the active issue, node, or section
- presenting navigation back to source sections
- exposing actions such as re-check
- keeping display state visible

### 7.2 Skill Responsibilities

The skill is responsible for:

- interpreting backend result bundles
- converting backend results into readable dashboard state
- highlighting what remains unresolved
- routing repair attention back to the correct section

### 7.3 Important Boundary

Section-local coordinators remain the default place for handling and explaining
most issues tied to current-page editing.

This skill should only surface:

- cross-section issues
- unresolved issues that local coordinators did not silently solve
- package-level health information

## 8. Approved V1 Behavior By Result Type

### 8.1 Overall Package Status

The skill should summarize:

- whether the package is healthy
- whether blocking issues remain
- whether warnings remain

This summary should stay short and stable.

It should not become a dump of every backend check line.

### 8.2 Section Health

For:

- `世界与角色`
- `故事结构`
- `控制模块`

the skill should show:

- current state
- one-line summary
- whether the section currently blocks whole-package health
- whether the issue set was already handled locally or still needs human action

### 8.3 Assembly Flow

The skill should present the assembly path in a readable way:

- section outputs
- bridge handling
- package reload
- runtime health

It should help the page show where unresolved issues are breaking the chain,
without requiring the reader to understand backend internals.

### 8.4 Unresolved Issue Queue

The issue queue should focus on unresolved items.

The skill should:

- separate blocking issues from warnings
- avoid over-emphasizing issues already auto-resolved
- map each issue to an actionable repair destination when possible

### 8.5 Selected Detail View

The selected detail view should explain:

- what the problem is
- where it came from
- what it affects
- why it was not silently solved
- where the user should go to fix it

This is explanation, not editing.

### 8.6 Global Coordinator Guidance

The lower-right coordinator on this page should not behave like a field helper.

The skill should prepare content that focuses on:

- current highest-priority unresolved problem
- suggested repair order
- current whole-package confidence
- what can be ignored for now versus what blocks progress

## 9. Coding Agent Build Rules

Future coding agents implementing this skill should follow these rules:

1. treat this skill as a diagnostics interpreter, not a repair bot
2. do not let this skill mutate package content
3. keep backend validation deterministic and outside this skill
4. keep the page focused on unresolved or global issues, not routine local noise
5. prefer clear repair routing back to the source section over technical explanations
6. do not expose internal chain details unless they help the user decide what to fix next

## 10. Relation To Backend Assembly And Validation

This skill depends on backend assembly and validation outputs.

It does not replace:

- bridge validation
- round-trip reload checks
- deterministic section save handling

Instead, it sits after those steps and prepares their results for dashboard use.
