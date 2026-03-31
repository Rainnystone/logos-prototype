# Authoring Story Sync Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent author-entered story content from silently fighting with stale narrative or control text that still remains elsewhere in the package.

**Architecture:** Keep story editing deterministic instead of trying to infer semantic equivalence in code. Fix the save path so authors can truly clear optional scene text, and add persisted cross-section review flags that block package health when story-facing sections change but dependent sections have not been re-saved.

**Tech Stack:** Next.js, TypeScript, Vitest, YAML-backed story packages

---

### Task 1: Persist dependency review state for authoring packages

**Files:**
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/persistence/__tests__/package-state.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests proving authoring state can store and reload pending cross-section review flags.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/authoring/persistence/__tests__/package-state.test.ts`

Expected: FAIL because pending review flags are not part of the schema.

- [ ] **Step 3: Write minimal implementation**

Extend authoring state with a persisted structure for pending dependent-section reviews.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/authoring/persistence/__tests__/package-state.test.ts`

Expected: PASS

### Task 2: Mark dependent sections stale after story-layer saves

**Files:**
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/persistence/__tests__/bridge.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests proving:
- a `worldbase-cast` save marks `scene-phase-authoring` and `control-modules` as pending review
- a `scene-phase-authoring` save marks `control-modules` as pending review
- a `control-modules` save clears its own pending review flag

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts`

Expected: FAIL because save operations do not update pending review state.

- [ ] **Step 3: Write minimal implementation**

Update the save bridge to persist review dependencies in `authoring-state.json` whenever a save successfully changes a story-facing section.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts`

Expected: PASS

### Task 3: Let authors truly clear optional scene text

**Files:**
- Modify: `src/authoring/sections/scene-phase-authoring.ts`
- Modify: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests proving that clearing `openingSituation`, `openingHook`, and `samplePurpose` removes them from the saved scene spec instead of keeping stale previous values.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/authoring/sections/__tests__/scene-phase-authoring.test.ts`

Expected: FAIL because cleared optional scene fields currently survive through the spread from the old scene spec.

- [ ] **Step 3: Write minimal implementation**

Render scene spec from the draft in a way that removes cleared optional fields rather than silently preserving stale text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/authoring/sections/__tests__/scene-phase-authoring.test.ts`

Expected: PASS

### Task 4: Surface pending review conflicts in package diagnostics

**Files:**
- Modify: `src/authoring/sections/package-diagnostics.ts`
- Modify: `src/authoring/sections/__tests__/package-diagnostics.test.ts`
- Modify: `src/app/edit/EditWorkbench.tsx`

- [ ] **Step 1: Write the failing test**

Add tests proving package diagnostics becomes blocked when pending review dependencies exist after story-layer edits, and that the blocking issue points authors to the section that must be re-saved.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/authoring/sections/__tests__/package-diagnostics.test.ts`

Expected: FAIL because diagnostics currently ignore cross-section stale-review state.

- [ ] **Step 3: Write minimal implementation**

Read authoring review flags into diagnostics and expose a blocking package issue whenever dependent sections still need review.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/authoring/sections/__tests__/package-diagnostics.test.ts`

Expected: PASS

### Task 5: End-to-end regression for story-save conflict prevention

**Files:**
- Modify: `src/authoring/persistence/__tests__/bridge.test.ts`
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx` (if needed)

- [ ] **Step 1: Write the failing test**

Add a regression proving that after a world or scene save, package health reflects the newly required dependent review instead of reporting a clean state too early.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because review dependencies are not yet enforced end to end.

- [ ] **Step 3: Write minimal implementation**

Make the existing edit workbench reload path respect the new authoring review state without changing the page control model.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS

### Task 6: Full verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run targeted UI and persistence suites**

Run: `npm run test:ui -- src/app/edit src/authoring`

- [ ] **Step 2: Run full repository checks**

Run:
- `npm run lint`
- `npm run type-check`
- `npm test`

- [ ] **Step 3: Launch the app and manually verify the authoring flow**

Run: `npm run dev`

Verify:
- clearing optional scene text actually removes old values
- after changing world/story text, diagnostics blocks the package until dependent sections are re-saved
- after re-saving dependent sections, the block disappears
