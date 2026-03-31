# Memory Placeholder Full History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the default five-entry history cap so the current placeholder memory reads the full accepted history window, while keeping the implementation minimal and the surrounding behavior unchanged.

**Architecture:** Keep the existing `getHistoryWindow()` entry point and its call sites. Change only the default window behavior so the placeholder returns the entire accepted history when no explicit window size is supplied. Update tests and notes to match the new default, but do not introduce new configuration, new modules, or any wrapper logic.

**Tech Stack:** TypeScript, Vitest, Next.js app code, existing engine orchestrator.

---

### Task 1: Change the default history window behavior

**Files:**
- Modify: `src/engine/modules/memory-placeholder.ts`

- [ ] **Step 1: Write the failing test**

Add or adjust a focused test in `src/engine/modules/__tests__/memory-placeholder.test.ts` so the default call returns the full accepted history, not the last five entries.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/engine/modules/__tests__/memory-placeholder.test.ts`

Expected: the default-window assertion fails against the current implementation.

- [ ] **Step 3: Write the minimal implementation**

Change the default behavior in `getHistoryWindow()` so omitting `windowSize` returns `acceptedHistory.slice(0)` or the equivalent full copy of the input history, while preserving the explicit `windowSize` path and immutability.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/engine/modules/__tests__/memory-placeholder.test.ts`

Expected: the memory placeholder suite passes.

### Task 2: Align orchestrator and higher-level expectations

**Files:**
- Modify: `src/engine/__tests__/e2e/full-phase-run.test.ts`
- Modify: `src/engine/__tests__/e2e/validation-report.md`

- [ ] **Step 1: Write the failing test**

Adjust the E2E expectation that currently assumes the history window tops out at five entries so it asserts the full accepted history for the sample run.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/engine/__tests__/e2e/full-phase-run.test.ts`

Expected: the old length assertion fails until the implementation is updated.

- [ ] **Step 3: Update the note**

Rewrite the validation note so it no longer describes the five-entry cap as the current behavior.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/engine/__tests__/e2e/full-phase-run.test.ts src/engine/modules/__tests__/memory-placeholder.test.ts`

Expected: both suites pass.

### Task 3: Verify the full affected engine path

**Files:**
- No new files

- [ ] **Step 1: Run the targeted engine suites**

Run: `npm test -- src/engine/modules/__tests__/memory-placeholder.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/e2e/full-phase-run.test.ts`

- [ ] **Step 2: Confirm there is no accidental expansion of scope**

Check that the change stayed confined to the placeholder window behavior, its tests, and the small validation note update. No new config flags, no new memory abstraction, and no extra orchestration layer should be added.

