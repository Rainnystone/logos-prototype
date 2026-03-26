# Section Execution Plans

This directory stores implementation plans for individual redesign sections.

## Required Reading Order For Coding Agents

Before implementing any section, read in this order:

1. `archive/docs/narrative-editor-redesign/redesign-design-recorder.md`
2. The matching section draft, for example `archive/docs/narrative-editor-redesign/01-worldbase-and-cast.md`
3. The matching section implementation plan in this directory

Do not implement from the plan alone. The recorder defines global constraints.
The section draft defines page-specific boundaries. The section plan defines the
task breakdown.

## Planning Rules For This Folder

Plans in this directory should be written for Codex-style execution and must:

- use checkbox task tracking
- use exact file paths
- use TDD
- break work into small steps with frequent commits
- include exact commands for tests and verification
- explain where runtime compatibility must be preserved

## What Plan Authors Must Consider

When writing a section plan here, the author must explicitly account for:

- how the section page loads data from local story package files
- how section edits flow back into runtime-compatible files
- how to avoid hardcoded prompt text as a substitute for proper data loading
- how section-owned data preserves the correct story package context and runtime prompt context
- how the page changes affect the current play/workbench runtime
- which existing components and modules still consume the old runtime shapes
- how to migrate data safely without breaking prompt assembly, director note, or loader behavior
- how to discover related files with `rg`
- what tests prove the section is compatible with the existing runtime
- what docs and spec snapshots must be updated if behavior or contracts change

## Approved Architecture Assumptions

Plans in this directory currently assume:

- the app uses the approved local-first `方案 A`
- writes stay inside repo-controlled `src/story-packages/<package>/...`
- browser components never touch raw filesystem APIs directly
- server-side repository/service code owns local file writes
- section pages should prefer structured authoring models plus mappers over prompt hardcoding

## Git Flow Expectations

Plans in this directory should follow the repo's standard workflow:

- branch from `branch/narrative-editor`
- if using a Codex-created feature branch, prefer the `codex/` prefix
- if a feature branch is used, target `branch/narrative-editor`
- keep tasks commit-sized and reviewable
- use the repo commit format: `<type>: <description>`

## Current Plans

- `2026-03-22-worldbase-and-cast-implementation-plan.md`
