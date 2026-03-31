# WorldBase Character Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the runtime `mainCharacters` text blob with structured world and character data, add stable character IDs plus Scene cast declarations, keep the LLM-facing prompt text stable, and preserve full-package editing while the play runtime consumes the Scene-filtered cast view.

**Architecture:** Keep `world-base.yaml` as the single source file, but change its shape from three coarse strings into structured world fields plus character objects. Introduce one shared compatibility layer for legacy parsing, character ID generation, and Scene cast filtering; the editor keeps loading the full package-level character library while the play runtime uses a cast-filtered projection. Preserve the current prompt format by rendering structured WorldBase data back into the existing three-string prompt shape inside the engine layer instead of changing the adapter prompt contract.

**Tech Stack:** Next.js, React 19, TypeScript, Zod, YAML, Vitest, Testing Library

---

## File Map

- `src/lib/character-id.ts`
  Generate short stable `chr_` IDs in a way that works in browser, server, and tests.
- `src/story-packages/world-base-compat.ts`
  Hold legacy `world-base.yaml` detection, legacy-to-structured migration, and Scene-cast filtering helpers.
- `src/types/prompt-object.ts`
  Define `CharacterProfileSchema`, the structured runtime `WorldBaseSchema`, and a separate prompt-only `PromptWorldBaseSchema` so `PromptObject` keeps its three-string shape.
- `src/types/story-package.ts`
  Add optional `sceneSpec.cast` and keep `StoryPackage` aligned with the new `WorldBase`.
- `src/engine/story-loader.ts`
  Load structured WorldBase, migrate legacy files in memory, and expose separate full-package vs runtime-projected load paths.
- `src/engine/modules/world-base-prompt-render.ts`
  Render structured WorldBase back into prompt-safe text plus the anti-OOC profile string used by director-note logic.
- `src/engine/modules/prompt-assembler.ts`
  Swap direct `worldBase.mainCharacters` access for the structured-to-text renderer while keeping `PromptObject` stable.
- `src/engine/modules/director-note-layer.ts`
  Build anti-OOC option constraints from structured hero data instead of the old text blob.
- `src/authoring/sections/worldbase-cast.ts`
  Simplify the section model to direct structured editing and remove markdown round-trip helpers.
- `src/authoring/persistence/bridge.ts`
  Validate structured WorldBase payloads and stop rendering text blobs before save.
- `src/authoring/persistence/repository.ts`
  Write structured `world-base.yaml` directly.
- `src/app/edit/sections/WorldBaseCastSection.tsx`
  Edit structured character profiles directly and assign character IDs when adding characters.
- `src/app/edit/EditWorkbench.tsx`
  Treat the editor draft as the same structured shape loaded from disk.
- `src/app/components/FixtureReferencePanel.tsx`
  Show structured world and cast data without assuming `mainCharacters` exists.
- `src/story-packages/sample-scene/world-base.yaml`
  Migrate the sample fixture to the new structured shape.
- `src/story-packages/sample-scene/scene.yaml`
  Add the initial `cast` list that references the migrated character IDs.

### Task 1: Lock The New Contracts In Tests

**Files:**
- Modify: `src/types/__tests__/type-conformance.test.ts`
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`
- Modify: `src/engine/__tests__/story-loader.test.ts`

- [ ] **Step 1: Write the failing type-conformance assertions**

Add coverage for `CharacterProfile`, the new structured runtime `WorldBase`, the prompt-only `PromptWorldBase` string shape, and optional `sceneSpec.cast`.

- [ ] **Step 2: Run the type test to verify it fails**

Run: `npm exec vitest run src/types/__tests__/type-conformance.test.ts`
Expected: FAIL because the current schemas still require `mainCharacters`.

- [ ] **Step 3: Write the failing story-package fixture assertions**

Update the sample package test to assert that `world-base.yaml` now parses as structured YAML with `hero`, `coreCast`, `antagonists`, and `scene.yaml.cast`, instead of checking `mainCharacters`.

- [ ] **Step 4: Run the package fixture test to verify it fails**

Run: `npm exec vitest run src/story-packages/__tests__/sample-scene.test.ts`
Expected: FAIL because the sample fixture is still in the old text-blob format.

- [ ] **Step 5: Write the failing loader assertions**

Extend the story-loader test file to cover three behaviors: structured packages load successfully, legacy `world-base.yaml` content migrates in memory, and the runtime load path filters cast members while the full-package load path does not.

- [ ] **Step 6: Run the loader test to verify it fails**

Run: `npm exec vitest run src/engine/__tests__/story-loader.test.ts`
Expected: FAIL because the loader only understands one WorldBase shape and has no split full/runtime load path.

### Task 2: Add Shared Character ID And WorldBase Compatibility Helpers

**Files:**
- Create: `src/lib/character-id.ts`
- Create: `src/lib/__tests__/character-id.test.ts`
- Create: `src/story-packages/world-base-compat.ts`
- Create: `src/story-packages/__tests__/world-base-compat.test.ts`

- [ ] **Step 1: Write the failing character ID helper test**

Add tests that `generateCharacterId()` returns `chr_` plus six lowercase hex characters and produces distinct IDs across repeated calls.

- [ ] **Step 2: Run the character ID helper test to verify it fails**

Run: `npm exec vitest run src/lib/__tests__/character-id.test.ts`
Expected: FAIL because the helper file does not exist yet.

- [ ] **Step 3: Write the failing WorldBase compatibility tests**

Add tests for `isLegacyWorldBase()`, `migrateLegacyWorldBase()`, and `filterWorldBaseForSceneCast()`, including one case where hero is preserved even when absent from `sceneSpec.cast`.

- [ ] **Step 4: Run the compatibility test to verify it fails**

Run: `npm exec vitest run src/story-packages/__tests__/world-base-compat.test.ts`
Expected: FAIL because the compatibility layer does not exist yet.

- [ ] **Step 5: Implement the shared helpers**

Create an isomorphic character ID helper that is safe in browser and test environments, then implement the legacy parser bridge, migration mapper, and Scene-cast filter in `world-base-compat.ts`.

- [ ] **Step 6: Run the helper tests to verify they pass**

Run: `npm exec vitest run src/lib/__tests__/character-id.test.ts src/story-packages/__tests__/world-base-compat.test.ts`
Expected: PASS

- [ ] **Step 7: Commit the shared foundation**

```bash
git add src/lib/character-id.ts src/lib/__tests__/character-id.test.ts src/story-packages/world-base-compat.ts src/story-packages/__tests__/world-base-compat.test.ts
git commit -m "feat: add structured world base compatibility helpers"
```

### Task 3: Implement Structured WorldBase Loading And Runtime Projection

**Files:**
- Modify: `src/types/prompt-object.ts`
- Modify: `src/types/story-package.ts`
- Modify: `src/engine/story-loader.ts`
- Modify: `src/app/play/page.tsx`
- Modify: `src/engine/__tests__/story-loader.test.ts`
- Modify: `src/types/__tests__/type-conformance.test.ts`

- [ ] **Step 1: Update the shared schemas**

Split the contracts cleanly: keep a prompt-only three-string `PromptWorldBaseSchema` for `PromptObject`, add `CharacterProfileSchema`, replace the runtime `WorldBaseSchema` with the structured shape, and add optional `sceneSpec.cast` without changing other Scene fields.

- [ ] **Step 2: Keep editor and runtime reads intentionally separate**

Teach `story-loader.ts` to return the full structured package by default, then add a dedicated runtime-projected load path for play usage that applies Scene cast filtering after legacy migration and schema validation.

- [ ] **Step 3: Route the play page through the runtime-projected loader**

Update `src/app/play/page.tsx` to use the cast-aware runtime load path while leaving editor-side loads on the full-package path.

- [ ] **Step 4: Run the contract and loader tests to verify they pass**

Run: `npm exec vitest run src/types/__tests__/type-conformance.test.ts src/engine/__tests__/story-loader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the loader contract shift**

```bash
git add src/types/prompt-object.ts src/types/story-package.ts src/engine/story-loader.ts src/app/play/page.tsx src/engine/__tests__/story-loader.test.ts src/types/__tests__/type-conformance.test.ts
git commit -m "feat: load structured world base with runtime cast projection"
```

### Task 4: Rebuild Prompt And Director Note Projection On Top Of Structured WorldBase

**Files:**
- Create: `src/engine/modules/world-base-prompt-render.ts`
- Create: `src/engine/modules/__tests__/world-base-prompt-render.test.ts`
- Modify: `src/engine/modules/prompt-assembler.ts`
- Modify: `src/engine/modules/director-note-layer.ts`
- Modify: `src/engine/modules/__tests__/prompt-assembler.test.ts`
- Modify: `src/engine/modules/__tests__/director-note-layer.test.ts`
- Modify: `src/engine/api-adapter/__tests__/fixtures.ts`
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Modify: `src/engine/__tests__/schema-validator.test.ts`
- Modify: `src/engine/__tests__/orchestrator.test.ts`

- [ ] **Step 1: Write the failing renderer test**

Add a focused test file that proves structured WorldBase data renders back into the current prompt-compatible `mainCharacters`, `npcCharacters`, and `locationPatch` strings, and that the anti-OOC profile string is derived from structured hero fields.

- [ ] **Step 2: Run the renderer test to verify it fails**

Run: `npm exec vitest run src/engine/modules/__tests__/world-base-prompt-render.test.ts`
Expected: FAIL because the renderer file does not exist yet.

- [ ] **Step 3: Update the existing prompt and director-note tests to the new inputs**

Replace old structured-world fixtures wherever they feed prompt assembly, then update schema-validator, schema-mapper, and orchestrator-adjacent tests so they still prove `PromptObject.worldBase` stays in the old three-string format after rendering.

- [ ] **Step 4: Implement the renderer and wire it in**

Add `world-base-prompt-render.ts`, call it from `prompt-assembler.ts`, and update `director-note-layer.ts` to source anti-OOC text from structured hero data without changing `prompt-templates.ts`.

- [ ] **Step 5: Run the engine module tests to verify they pass**

Run: `npm exec vitest run src/engine/modules/__tests__/world-base-prompt-render.test.ts src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/modules/__tests__/director-note-layer.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/__tests__/schema-validator.test.ts src/engine/__tests__/orchestrator.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the runtime projection layer**

```bash
git add src/engine/modules/world-base-prompt-render.ts src/engine/modules/__tests__/world-base-prompt-render.test.ts src/engine/modules/prompt-assembler.ts src/engine/modules/director-note-layer.ts src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/modules/__tests__/director-note-layer.test.ts src/engine/api-adapter/__tests__/fixtures.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/__tests__/schema-validator.test.ts src/engine/__tests__/orchestrator.test.ts
git commit -m "refactor: project structured world base into prompt text"
```

### Task 5: Simplify WorldBase Authoring And Persistence Around The Structured Shape

**Files:**
- Modify: `src/authoring/sections/worldbase-cast.ts`
- Modify: `src/authoring/sections/__tests__/worldbase-cast.test.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/persistence/repository.ts`
- Modify: `src/authoring/persistence/__tests__/bridge.test.ts`

- [ ] **Step 1: Rewrite the failing section-level tests**

Replace the current parse-and-render round-trip tests with direct structured-model tests for empty character creation, profile normalization, supporting-cast normalization, and stable character ID preservation.

- [ ] **Step 2: Run the section test to verify it fails**

Run: `npm exec vitest run src/authoring/sections/__tests__/worldbase-cast.test.ts`
Expected: FAIL because the section helpers still revolve around `mainCharacters` parsing and rendering.

- [ ] **Step 3: Update the failing bridge tests**

Rewrite the worldbase save-path expectations so they send structured character objects, assert that `world-base.yaml` is written in structured YAML, and verify that reloading after save does not lose untouched characters.

- [ ] **Step 4: Run the bridge test to verify it fails**

Run: `npm exec vitest run src/authoring/persistence/__tests__/bridge.test.ts`
Expected: FAIL because the bridge still renders back through the text-blob path.

- [ ] **Step 5: Implement the direct structured save path**

Remove markdown-string round-trip helpers from `worldbase-cast.ts`, keep only direct structured authoring helpers plus supporting-cast normalization, update the bridge extraction logic to validate structured profiles, and write structured YAML directly from `repository.ts`.

- [ ] **Step 6: Run the authoring tests to verify they pass**

Run: `npm exec vitest run src/authoring/sections/__tests__/worldbase-cast.test.ts src/authoring/persistence/__tests__/bridge.test.ts`
Expected: PASS

- [ ] **Step 7: Commit the authoring simplification**

```bash
git add src/authoring/sections/worldbase-cast.ts src/authoring/sections/__tests__/worldbase-cast.test.ts src/authoring/persistence/bridge.ts src/authoring/persistence/repository.ts src/authoring/persistence/__tests__/bridge.test.ts
git commit -m "refactor: persist structured world base authoring data"
```

### Task 6: Update Editor, Read-Only Surfaces, Sample Fixtures, And UI Tests

**Files:**
- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/components/FixtureReferencePanel.tsx`
- Modify: `src/app/components/__tests__/FixtureReferencePanel.test.tsx`
- Modify: `src/app/__tests__/fixtures.ts`
- Modify: `src/app/__tests__/play.test.tsx`
- Modify: `src/engine/__tests__/fixtures/audit-loop-fixtures.ts`
- Modify: `src/engine/__mocks__/workbench-demo-adapter.ts`
- Modify: `src/story-packages/sample-scene/world-base.yaml`
- Modify: `src/story-packages/sample-scene/scene.yaml`
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`

- [ ] **Step 1: Update the failing editor component tests**

Move the worldbase editor tests to structured props, assert that add-character actions assign `characterId`, and keep the current UI copy expectations intact.

- [ ] **Step 2: Run the editor component tests to verify they fail**

Run: `npm exec vitest run src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`
Expected: FAIL because the editor still expects `WorldBaseCastDraft` and `draftId`-based saves.

- [ ] **Step 3: Update the failing read-only surface tests**

Replace `FixtureReferencePanel` and play-fixture assertions that still expect `worldBase.mainCharacters`, and migrate shared test fixtures and demo adapter world-base data to the structured shape.

- [ ] **Step 4: Run the UI fixture tests to verify they fail**

Run: `npm exec vitest run src/app/components/__tests__/FixtureReferencePanel.test.tsx src/app/__tests__/play.test.tsx`
Expected: FAIL because the read-only surfaces and shared fixtures still assume the old WorldBase shape.

- [ ] **Step 5: Implement the UI and fixture migration**

Update the editor to edit structured WorldBase directly, switch selection and add-character flows to `characterId`, render structured world/cast data in the fixture drawer, and migrate the sample story package plus shared test fixtures to the new YAML format.

- [ ] **Step 6: Run the editor and UI tests to verify they pass**

Run: `npm exec vitest run src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/components/__tests__/FixtureReferencePanel.test.tsx src/app/__tests__/play.test.tsx src/story-packages/__tests__/sample-scene.test.ts`
Expected: PASS

- [ ] **Step 7: Commit the surface migration**

```bash
git add src/app/edit/sections/WorldBaseCastSection.tsx src/app/edit/EditWorkbench.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/components/FixtureReferencePanel.tsx src/app/components/__tests__/FixtureReferencePanel.test.tsx src/app/__tests__/fixtures.ts src/app/__tests__/play.test.tsx src/engine/__tests__/fixtures/audit-loop-fixtures.ts src/engine/__mocks__/workbench-demo-adapter.ts src/story-packages/sample-scene/world-base.yaml src/story-packages/sample-scene/scene.yaml src/story-packages/__tests__/sample-scene.test.ts
git commit -m "feat: adopt structured world base across editor and workbench"
```

### Task 7: Run Focused Regression, Full Validation, And Manual Checks

**Files:**
- Verify only

- [ ] **Step 1: Run the focused regression suite**

Run: `npm exec vitest run src/lib/__tests__/character-id.test.ts src/story-packages/__tests__/world-base-compat.test.ts src/engine/__tests__/story-loader.test.ts src/engine/modules/__tests__/world-base-prompt-render.test.ts src/engine/modules/__tests__/prompt-assembler.test.ts src/engine/modules/__tests__/director-note-layer.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts src/engine/__tests__/schema-validator.test.ts src/engine/__tests__/orchestrator.test.ts src/authoring/sections/__tests__/worldbase-cast.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/components/__tests__/FixtureReferencePanel.test.tsx src/app/__tests__/play.test.tsx src/story-packages/__tests__/sample-scene.test.ts src/types/__tests__/type-conformance.test.ts`
Expected: PASS

- [ ] **Step 2: Run type checking**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 3: Run the full repository test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run the required lint pass**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Spot-check the editor with a structured sample package**

Open `/edit?storyPackage=sample-scene&section=worldbase-cast` and confirm the page still shows the full shared character set, newly added characters receive a stable `characterId`, save/reset still work, and reloading the page preserves all character records.

- [ ] **Step 6: Spot-check the play runtime cast view**

Open `/play?storyPackage=sample-scene`, open the fixture reference drawer, and confirm the runtime still boots normally, the displayed world/cast data reflects the structured source, and the play load path remains functional with `scene.yaml.cast` present.
