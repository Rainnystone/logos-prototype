# WorldBase and Cast Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first redesign authoring page for WorldBase and Cast as a structured editor that writes section-owned authoring data, regenerates runtime-compatible `world-base.yaml`, and does not rely on hardcoded prompt text.

**Architecture:** Keep the runtime `WorldBase` contract compatible for the existing prompt chain while introducing a structured authoring source for this section. The page reads and writes through the approved local file access layer, then uses a mapper/serializer to regenerate the current flat runtime `WorldBase` fields consumed by loader, prompt assembly, and play/workbench.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod, YAML, Vitest.

---

## File Structure

**New authoring source of truth**

- Create: `src/story-packages/sample-scene/worldbase-and-cast.yaml`
  Purpose: structured authoring data for the WorldBase and Cast page

**Types and mappers**

- Create: `src/types/worldbase-and-cast-authoring.ts`
  Purpose: Zod schema and types for the section's structured authoring model
- Create: `src/types/__tests__/worldbase-and-cast-authoring.test.ts`
  Purpose: schema conformance tests for required fields and grouping rules
- Create: `src/server/story-package/worldbase-and-cast-mapper.ts`
  Purpose: convert structured authoring data into runtime-compatible `WorldBase`
- Create: `src/server/story-package/__tests__/worldbase-and-cast-mapper.test.ts`
  Purpose: verify mapping and text generation preserve critical control content

**Local file access**

- Create: `src/server/story-package/worldbase-and-cast-repository.ts`
  Purpose: load/save `worldbase-and-cast.yaml` and regenerate `world-base.yaml`
- Create: `src/server/story-package/__tests__/worldbase-and-cast-repository.test.ts`
  Purpose: verify repo-scoped reads/writes, whitelist behavior, and regeneration

**Server entry**

- Create: `src/app/api/story-packages/[packageName]/worldbase-and-cast/route.ts`
  Purpose: section-specific GET/PATCH entrypoint for page data
- Create: `src/app/api/story-packages/[packageName]/worldbase-and-cast/route.test.ts`
  Purpose: verify successful read/write and rejection of invalid payloads

**Page UI**

- Create: `src/app/worldbase-and-cast/page.tsx`
  Purpose: top-level route for the section page, using `searchParams.storyPackage`
- Create: `src/app/worldbase-and-cast/WorldbaseAndCastPage.tsx`
  Purpose: server/client boundary and page composition
- Create: `src/app/worldbase-and-cast/components/WorldbaseAndCastForm.tsx`
  Purpose: main editor form
- Create: `src/app/worldbase-and-cast/components/CharacterCardEditor.tsx`
  Purpose: reusable editor for complete and lite character cards
- Create: `src/app/worldbase-and-cast/components/WorldTextAreas.tsx`
  Purpose: editor blocks for world rules, tone/style, and location pool
- Create: `src/app/worldbase-and-cast/__tests__/page.test.tsx`
  Purpose: render/save behavior tests for the page

**Compatibility docs/tests**

- Modify: `src/story-packages/story-package.schema.md`
  Purpose: document the new section-owned authoring file alongside runtime files
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`
  Purpose: verify both the structured authoring file and regenerated runtime world base remain valid
- Modify: `src/engine/__tests__/story-loader.test.ts`
  Purpose: verify runtime loader still works after regeneration
- Modify: `docs/narrative-editor-redesign/01-worldbase-and-cast.md`
  Purpose: keep the section draft aligned if implementation requires clarifications

## Execution Notes

- Do not replace runtime `WorldBaseSchema` with a nested object in this plan.
- Do not hardcode prompt strings in page components or route handlers.
- Do not edit play/workbench into an authoring page.
- Treat `worldbase-and-cast.yaml` as authoring input and `world-base.yaml` as runtime-compatible output.
- Preserve `storyPackage` context end-to-end; page load, save, and regeneration must all stay scoped to the selected package.
- Preserve runtime prompt context; regenerated `world-base.yaml` must continue to feed the existing prompt chain with meaningful character and location content.
- Keep commits small and use `feat:` / `refactor:` / `test:` / `docs:` prefixes.
- Work from `branch/narrative-editor`; if you create a feature branch in Codex, prefer `codex/worldbase-and-cast-page` and target `branch/narrative-editor`.

---

### Task 1: Add the Structured Authoring Schema

**Files:**
- Create: `src/types/worldbase-and-cast-authoring.ts`
- Test: `src/types/__tests__/worldbase-and-cast-authoring.test.ts`
- Create: `src/story-packages/sample-scene/worldbase-and-cast.yaml`

- [ ] **Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from 'vitest';
import { WorldbaseAndCastAuthoringSchema } from '@/types/worldbase-and-cast-authoring';

describe('WorldbaseAndCastAuthoringSchema', () => {
  it('accepts full cards for main cast and lite cards for supporting cast', () => {
    const parsed = WorldbaseAndCastAuthoringSchema.parse({
      worldFoundation: '...',
      worldRules: '...',
      toneAndStyle: '...',
      playerCharacter: {
        name: 'Nagi Kirima',
        roleIdentity: '唯一主动破局者',
        gender: '女',
        personality: '冷峻',
        age: '17',
        occupation: '学生',
        summary: '...',
        abilityBoundary: '...',
        behaviorBoundary: '...',
        oocRedLines: '...',
        outfit: '...',
        toolsAndWeapons: '...',
      },
      coreCharacters: [],
      antagonists: [],
      keySupportingCharacters: [],
      supportingCharacters: [],
      locationPool: '...',
    });

    expect(parsed.playerCharacter.roleIdentity).toBe('唯一主动破局者');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:core -- src/types/__tests__/worldbase-and-cast-authoring.test.ts`
Expected: FAIL with module-not-found or schema-not-defined error

- [ ] **Step 3: Write the minimal schema**

```ts
import { z } from 'zod';

const FullCharacterCardSchema = z.object({
  name: z.string().min(1),
  roleIdentity: z.string().min(1),
  gender: z.string().min(1),
  personality: z.string().min(1),
  age: z.string().min(1),
  occupation: z.string().min(1),
  summary: z.string().min(1),
  abilityBoundary: z.string().min(1),
  behaviorBoundary: z.string().min(1),
  oocRedLines: z.string().min(1),
  outfit: z.string().min(1),
  toolsAndWeapons: z.string().min(1),
});
```

- [ ] **Step 4: Add a first sample authoring file**

Create `src/story-packages/sample-scene/worldbase-and-cast.yaml` with the same source meaning as the current runtime `world-base.yaml`, but in structured form.

- [ ] **Step 5: Run the schema test again**

Run: `npm run test:core -- src/types/__tests__/worldbase-and-cast-authoring.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/worldbase-and-cast-authoring.ts src/types/__tests__/worldbase-and-cast-authoring.test.ts src/story-packages/sample-scene/worldbase-and-cast.yaml
git commit -m "feat: add worldbase and cast authoring schema"
```

---

### Task 2: Map Structured Authoring Data to Runtime WorldBase

**Files:**
- Create: `src/server/story-package/worldbase-and-cast-mapper.ts`
- Test: `src/server/story-package/__tests__/worldbase-and-cast-mapper.test.ts`

- [ ] **Step 1: Write the failing mapper test**

```ts
import { describe, expect, it } from 'vitest';
import { buildRuntimeWorldBase } from '@/server/story-package/worldbase-and-cast-mapper';

describe('buildRuntimeWorldBase', () => {
  it('keeps main cast control fields inside mainCharacters', () => {
    const runtime = buildRuntimeWorldBase(authoringFixture);
    expect(runtime.mainCharacters).toContain('OOC 红线');
    expect(runtime.locationPatch).toContain('地点词池');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:core -- src/server/story-package/__tests__/worldbase-and-cast-mapper.test.ts`
Expected: FAIL with function-not-found error

- [ ] **Step 3: Implement the mapper**

```ts
export function buildRuntimeWorldBase(authoring: WorldbaseAndCastAuthoring): WorldBase {
  return {
    mainCharacters: renderMainCharacters(authoring),
    npcCharacters: renderSupportingCharacters(authoring),
    locationPatch: renderLocationPool(authoring),
  };
}
```

- [ ] **Step 4: Make the test assert semantic preservation**

Add assertions that `roleIdentity`, `abilityBoundary`, `behaviorBoundary`, and `oocRedLines` survive the mapping into runtime strings.

- [ ] **Step 5: Run the mapper test again**

Run: `npm run test:core -- src/server/story-package/__tests__/worldbase-and-cast-mapper.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/story-package/worldbase-and-cast-mapper.ts src/server/story-package/__tests__/worldbase-and-cast-mapper.test.ts
git commit -m "feat: map worldbase authoring data to runtime world base"
```

---

### Task 3: Add the Repo-Scoped Persistence Layer

**Files:**
- Create: `src/server/story-package/worldbase-and-cast-repository.ts`
- Test: `src/server/story-package/__tests__/worldbase-and-cast-repository.test.ts`
- Modify: `src/story-packages/story-package.schema.md`

- [ ] **Step 1: Write the failing repository test**

```ts
it('writes worldbase-and-cast authoring data and regenerates world-base.yaml', async () => {
  await repository.save('sample-scene', authoringFixture);
  const runtime = await loadStoryPackage('sample-scene');
  expect(runtime.worldBase.mainCharacters).toContain('雾间凪');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:core -- src/server/story-package/__tests__/worldbase-and-cast-repository.test.ts`
Expected: FAIL because repository does not exist

- [ ] **Step 3: Implement the repository**

Key requirements:

- read `worldbase-and-cast.yaml`
- validate it with `WorldbaseAndCastAuthoringSchema`
- regenerate runtime `world-base.yaml` using the mapper
- only allow package paths under `src/story-packages/<package>/`
- use atomic write semantics

- [ ] **Step 4: Document the new authoring file**

Update `src/story-packages/story-package.schema.md` to say `worldbase-and-cast.yaml` is a section-owned authoring source, while `world-base.yaml` remains runtime-compatible input for the current engine.

- [ ] **Step 5: Run repository tests**

Run: `npm run test:core -- src/server/story-package/__tests__/worldbase-and-cast-repository.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/story-package/worldbase-and-cast-repository.ts src/server/story-package/__tests__/worldbase-and-cast-repository.test.ts src/story-packages/story-package.schema.md
git commit -m "feat: add worldbase and cast repository persistence"
```

---

### Task 4: Expose a Section-Specific Server Entry

**Files:**
- Create: `src/app/api/story-packages/[packageName]/worldbase-and-cast/route.ts`
- Test: `src/app/api/story-packages/[packageName]/worldbase-and-cast/route.test.ts`

- [ ] **Step 1: Write the failing route test**

```ts
it('returns authoring data for a package', async () => {
  const response = await GET(new Request('http://localhost/api/...'), { params: { packageName: 'sample-scene' } });
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ui -- src/app/api/story-packages/[packageName]/worldbase-and-cast/route.test.ts`
Expected: FAIL because route file does not exist

- [ ] **Step 3: Implement GET and PATCH**

Requirements:

- `GET` returns the structured authoring model
- `PATCH` validates the payload and persists through the repository
- route never writes files directly; it always delegates to repository/service code

- [ ] **Step 4: Re-run the route test**

Run: `npm run test:ui -- src/app/api/story-packages/[packageName]/worldbase-and-cast/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/story-packages/[packageName]/worldbase-and-cast/route.ts src/app/api/story-packages/[packageName]/worldbase-and-cast/route.test.ts
git commit -m "feat: add worldbase and cast api route"
```

---

### Task 5: Build the Section Page UI

**Files:**
- Create: `src/app/worldbase-and-cast/page.tsx`
- Create: `src/app/worldbase-and-cast/WorldbaseAndCastPage.tsx`
- Create: `src/app/worldbase-and-cast/components/WorldbaseAndCastForm.tsx`
- Create: `src/app/worldbase-and-cast/components/CharacterCardEditor.tsx`
- Create: `src/app/worldbase-and-cast/components/WorldTextAreas.tsx`
- Test: `src/app/worldbase-and-cast/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing page test**

```ts
it('renders the structured player card and world text areas', async () => {
  render(<WorldbaseAndCastPage initialData={fixture} storyPackage="sample-scene" />);
  expect(screen.getByLabelText('人物姓名')).toBeInTheDocument();
  expect(screen.getByLabelText('世界规则 / 世界禁令 / 异常性质')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ui -- src/app/worldbase-and-cast/__tests__/page.test.tsx`
Expected: FAIL because page components do not exist

- [ ] **Step 3: Implement the minimal page shell**

Requirements:

- load the selected `storyPackage` from `searchParams.storyPackage`
- fetch the structured authoring payload through the server entry
- render textarea blocks for world rules, tone/style, and location pool
- render full card editors for player/core/antagonist/key supporting roles
- render lite card editors for supporting roles

- [ ] **Step 4: Re-run the page test**

Run: `npm run test:ui -- src/app/worldbase-and-cast/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/worldbase-and-cast/page.tsx src/app/worldbase-and-cast/WorldbaseAndCastPage.tsx src/app/worldbase-and-cast/components/WorldbaseAndCastForm.tsx src/app/worldbase-and-cast/components/CharacterCardEditor.tsx src/app/worldbase-and-cast/components/WorldTextAreas.tsx src/app/worldbase-and-cast/__tests__/page.test.tsx
git commit -m "feat: add worldbase and cast authoring page"
```

---

### Task 6: Wire Save Flow and Prove Runtime Compatibility

**Files:**
- Modify: `src/app/worldbase-and-cast/WorldbaseAndCastPage.tsx`
- Modify: `src/app/worldbase-and-cast/components/WorldbaseAndCastForm.tsx`
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`
- Modify: `src/engine/__tests__/story-loader.test.ts`

- [ ] **Step 1: Write the failing compatibility tests**

Add two failing assertions:

- saving authoring data regenerates a loadable `world-base.yaml`
- `loadStoryPackage('sample-scene')` still returns a valid `storyPackage.worldBase`

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:core -- src/story-packages/__tests__/sample-scene.test.ts src/engine/__tests__/story-loader.test.ts`
Expected: FAIL because the new save flow is not wired through yet

- [ ] **Step 3: Implement the save path**

Requirements:

- form submit calls the section route
- successful save re-fetches or revalidates the authoring payload
- regenerated runtime `world-base.yaml` remains valid for current loader and prompt chain

- [ ] **Step 4: Run focused tests**

Run: `npm run test:ui -- src/app/worldbase-and-cast/__tests__/page.test.tsx`
Expected: PASS

Run: `npm run test:core -- src/story-packages/__tests__/sample-scene.test.ts src/engine/__tests__/story-loader.test.ts`
Expected: PASS

- [ ] **Step 5: Run final verification**

Run: `npm run type-check`
Expected: PASS

Run: `npm run test:ui`
Expected: PASS

Run: `npm run test:core`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/worldbase-and-cast/WorldbaseAndCastPage.tsx src/app/worldbase-and-cast/components/WorldbaseAndCastForm.tsx src/story-packages/__tests__/sample-scene.test.ts src/engine/__tests__/story-loader.test.ts
git commit -m "feat: persist worldbase and cast authoring to runtime world base"
```

---

## Search Checklist For Workers

Before editing, run these searches to find consumers and avoid hidden breakage:

```bash
rg -n "worldBase|mainCharacters|npcCharacters|locationPatch|WorldBaseSchema|world-base" src
rg -n "FixtureReferencePanel|PlayWorkbench" src
rg -n "buildDirectorNote|assemblePromptObject|buildGenerateSystemPrompt" src
```

## Definition of Done

The section is only complete when all of the following are true:

- a structured `worldbase-and-cast.yaml` exists and validates
- the page can read and write that file through the approved local file access layer
- `world-base.yaml` is regenerated instead of manually hardcoded in page code
- the existing runtime loader still accepts the generated `world-base.yaml`
- prompt assembly and director note code still receive meaningful `worldBase` content
- `npm run type-check`, `npm run test:ui`, and `npm run test:core` all pass
