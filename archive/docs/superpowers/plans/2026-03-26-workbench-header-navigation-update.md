# Workbench Header Navigation Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the workbench header buttons to use the new labels, add a Narrative Editor entry, and shift the button group left without changing any page flow outside those links.

**Architecture:** Keep the change inside the shared app shell so the play workbench header updates in one place. Lock the new labels and destinations with a focused shell test first, then make the smallest navigation and spacing edits needed to satisfy it.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Lock the new header contract with a failing test

**Files:**
- Modify: `src/app/__tests__/layout.test.tsx`
- Test: `src/app/__tests__/layout.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add assertions that the visible header links become `Return to Title`, `Restart Workbench`, and `Narrative Editor`, and that the new editor link opens the `worldbase-cast` editor surface.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- src/app/__tests__/layout.test.tsx`
  Expected: FAIL because the current shell still renders the old two-link header.

### Task 2: Update the shared shell with minimal edits

**Files:**
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/globals.css`
- Test: `src/app/__tests__/layout.test.tsx`

- [ ] **Step 3: Write minimal implementation**
  Update the shell labels, add the new editor link, preserve the current story package when available, and nudge the navigation cluster left by adjusting the shared header alignment.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- src/app/__tests__/layout.test.tsx`
  Expected: PASS

### Task 3: Verify the workbench page at desktop size

**Files:**
- Modify: none

- [ ] **Step 5: Run broader verification**
  Run: `npm run test:ui`
  Run: `npm run lint`
  Run: `npm run type-check`

- [ ] **Step 6: Run live desktop verification**
  Start the dev server, open the workbench page at a 16:9 desktop viewport, and confirm the renamed buttons, new Narrative Editor button, and left-shifted grouping all render correctly.
