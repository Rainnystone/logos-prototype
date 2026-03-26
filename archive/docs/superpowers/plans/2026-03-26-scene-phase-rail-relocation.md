# Scene Phase Rail Relocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Scene & Phase Authoring phase rail above the scene frame so it no longer sits inside the left-side vertical scroll area.

**Architecture:** Keep the current page behavior intact and only change layout composition inside the Scene & Phase Authoring section. Add a targeted test that proves the phase rail renders in its own top region before the scene frame, then implement the minimal JSX reshuffle needed to satisfy that contract.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

### Task 1: Lock the new layout with a failing test

**Files:**
- Modify: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
- Test: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add assertions that the phase rail renders inside its own named region, that the scene frame is a separate named region, and that the phase rail region appears before the scene frame region in document order.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
  Expected: FAIL because the current markup does not expose the new top rail structure.

### Task 2: Move the phase rail block without changing behavior

**Files:**
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Test: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`

- [ ] **Step 3: Write minimal implementation**
  Move the phase rail card block above the workspace grid, give the phase rail and scene frame stable accessible region labels, and keep the existing horizontal rail slider wiring untouched.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
  Expected: PASS

### Task 3: Verify the page at desktop size

**Files:**
- Modify: none

- [ ] **Step 5: Run broader verification**
  Run: `npm run test:ui`
  Run: `npm run lint`
  Run: `npm run type-check`

- [ ] **Step 6: Run live desktop verification**
  Start the dev server, open the Scene & Phase Authoring page at a 16:9 desktop viewport, and confirm the phase rail now sits between the subtitle and the scene frame while its horizontal slider still works.
