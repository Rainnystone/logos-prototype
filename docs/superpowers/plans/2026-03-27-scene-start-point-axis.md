# Scene Start Point Axis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace author-edited scene `mainAxis` input with a scene `startPoint` input while preserving the current page layout and continuing to feed a derived `mainAxis` into the runtime save path.

**Architecture:** Keep the runtime contract stable by deriving `sceneSpec.mainAxis` inside the scene-phase authoring save/render path instead of changing downstream engine or API consumers. Update the authoring draft shape and the scene page UI so the existing `Main Axis` slot becomes `Start Point`, then extend tests to prove the derived axis is built from `startPoint + ordered phase goals + endLine` and that the layout remains unchanged.

**Tech Stack:** Next.js, React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Lock The Derived Axis Contract In Tests

**Files:**
- Modify: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Modify: `src/authoring/persistence/__tests__/bridge.test.ts`

- [ ] **Step 1: Write the failing section-level test**

Add assertions that the authoring draft exposes `startPoint`, that validation requires `startPoint`, and that `renderScenePhaseAuthoring()` derives `sceneSpec.mainAxis` by joining the start point, ordered phase goals, and end line.

- [ ] **Step 2: Run the targeted section test to verify it fails**

Run: `npm exec vitest run src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
Expected: FAIL because `startPoint` does not exist yet and the derived-axis assertion is unmet.

- [ ] **Step 3: Write the failing bridge test**

Update the bridge save-path test so `uiFields.sceneSpec` sends `startPoint` instead of `mainAxis`, then assert the reloaded scene state still contains a composed runtime `mainAxis`.

- [ ] **Step 4: Run the targeted bridge test to verify it fails**

Run: `npm exec vitest run src/authoring/persistence/__tests__/bridge.test.ts`
Expected: FAIL because the extraction/render path still expects `mainAxis`.

### Task 2: Lock The UI Contract In Tests

**Files:**
- Modify: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`

- [ ] **Step 1: Write the failing UI test**

Replace the current `Main Axis` field assertions with `Start Point`, and add one assertion that the scene frame still renders in the same document structure without adding a new derived-axis block.

- [ ] **Step 2: Run the targeted UI test to verify it fails**

Run: `npm exec vitest run src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: FAIL because the form still renders `Main Axis`.

### Task 3: Implement The Authoring Data Shift

**Files:**
- Modify: `src/authoring/sections/scene-phase-authoring.ts`
- Modify: `src/authoring/persistence/bridge.ts`

- [ ] **Step 1: Update the draft model**

Rename the scene draft field from `mainAxis` to `startPoint`, seed it from the current story package in a backward-compatible way, and add a small helper that derives runtime `mainAxis` from `startPoint`, phase goals, and end line.

- [ ] **Step 2: Keep validation aligned with author intent**

Require `startPoint` and `endLine`, continue requiring phase goals, and ensure the renderer emits the derived `sceneSpec.mainAxis` while leaving all downstream contracts unchanged.

- [ ] **Step 3: Update the bridge extraction path**

Teach `extractScenePhaseAuthoringDraft()` to accept `startPoint` from the UI payload and stop requiring an author-supplied `mainAxis` in this section save flow.

- [ ] **Step 4: Run the section and bridge tests to verify they pass**

Run: `npm exec vitest run src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/persistence/__tests__/bridge.test.ts`
Expected: PASS

### Task 4: Implement The Minimal UI Change

**Files:**
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`

- [ ] **Step 1: Replace the field in place**

Keep the existing scene-frame grid and slotting intact, but relabel the current `Main Axis` field as `Start Point` and bind it to `sceneSpec.startPoint`.

- [ ] **Step 2: Avoid accidental layout creep**

Do not add a preview block, helper copy, or any new scene-frame row in this change; preserve the current visual rhythm so the section reads the same as before.

- [ ] **Step 3: Run the targeted UI test to verify it passes**

Run: `npm exec vitest run src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: PASS

### Task 5: Run Focused And Full Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the focused regression suite**

Run: `npm exec vitest run src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: PASS

- [ ] **Step 2: Run type checking**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 3: Run the full test suite required by the repo before calling work complete**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run a browser spot check of the scene-phase page**

Open `/edit?storyPackage=sample-scene&section=scene-phase-authoring` and confirm the previous `Main Axis` slot now reads `Start Point`, that no extra scene-frame block was added, and that the selected phase editor still behaves normally.
