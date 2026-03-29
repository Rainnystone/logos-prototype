# WorldBase Character Separation Design

**Date**: 2026-03-29
**Branch**: `branch/narrative-editor`
**Status**: Design — pending implementation plan

## Motivation

The current `WorldBase` runtime type packs all characters and world settings
into a single `mainCharacters` string. The editor layer already has a structured
`WorldBaseCastDraft` type, but every save round-trips through parse → edit →
render-to-string, which is fragile and expensive.

The next major version introduces a memory system that:

1. Uses **character ID** as the primary recall key for far-memory wake-up
2. Supports **multi-Scene** packages where each Scene declares its own cast
3. May evolve toward **character-focused narrative stream control**

This refactor separates characters into independently addressable, structured
YAML objects with stable IDs — laying the foundation without building the memory
system itself.

## Design Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separation scope | Full split — characters AND world-setting text | Clean separation; `mainCharacters` field is eliminated |
| YAML structure | Single file `world-base.yaml`, expanded fields | Minimal loader/persistence change |
| Character storage | Structured YAML objects (not markdown strings) | Editor reads/writes directly; memory system can reference fields |
| Character ID | Auto-generated short ID (`chr_` prefix + 6 hex chars) | Stable across renames; memory wake-up key |
| Scene cast filter | `scene.yaml` declares `cast: string[]` of character IDs | Runtime only loads declared characters |
| Prompt layer | Assembler renders structured characters → text for LLM | `prompt-templates.ts` unchanged; LLM prompt format stable |
| Legacy compat | Loader auto-detects old format and migrates in-memory | Existing packages work without manual migration |

## New YAML Schema: `world-base.yaml`

```yaml
# ── World Setting (top-level text fields) ──────────────────────
worldBaseSetting: "不吉波普不笑世界观..."
worldRules: "严格禁止一切不符合不吉波普不笑世界观的存在..."
toneBaseline: "日式轻小说本格风格"

# ── Hero (exactly one) ─────────────────────────────────────────
hero:
  characterId: chr_a1b2c3
  name: 雾间凪
  identityRole: "炎之魔女 / 孤高的异常猎手 / 本次危机的唯一主动破局者"
  lightNovelTrait: "冷峻、充满压迫感的物理派美少女..."
  gender: ""
  personality: ""
  age: ""
  occupation: ""
  characterSummary: ""
  capabilityBoundary: |
    绝对禁止使用任何魔法、法术或超自然异能。
    战斗全部基于极高的人类身体机能...
  behaviorBoundary: |
    面对不可名状的恐怖时，她的第一反应永远是"寻找物理弱点并予以破坏"...
  oocRedLine: "绝对不会哭泣、求饶、犹豫不决..."
  clothing: ""
  propsWeapon: ""

# ── Core Cast (0..N) ───────────────────────────────────────────
coreCast:
  - characterId: chr_d4e5f6
    name: 宫下藤花
    identityRole: "绝对的日常锚点 / 异常绝缘体"
    # ... all character fields ...
  - characterId: chr_g7h8i9
    name: 不吉波普
    identityRole: "机械降神 (Deus Ex Machina)"
    # ...

# ── Antagonists (0..N) ─────────────────────────────────────────
antagonists:
  - characterId: chr_j0k1l2
    name: 灰谷烈
    identityRole: "异能犯罪者 / 隐藏在校园里的神秘学高人气主播"
    fatalWeakness: "社会性死亡..."
    # ... all character fields ...

# ── Supporting Cast & Locations (unchanged text fields) ────────
npcCharacters: |
  竹田启司：稳重的男友
  末真和子：敏锐的线索人
  新刻敬：正义感强

locationPatch: |
  # Location Pool: 场景地点与交互物件池
  ...
```

### Character field set

Every character object (hero, coreCast item, antagonist item) has:

| Field | Type | Notes |
|-------|------|-------|
| `characterId` | `string` | Auto-generated `chr_` + 6 hex. Immutable after creation. |
| `name` | `string` | Display name. Mutable (rename does not break references). |
| `identityRole` | `string` | Narrative role description. |
| `lightNovelTrait` | `string` | Visual/personality trait summary. |
| `gender` | `string` | |
| `personality` | `string` | |
| `age` | `string` | |
| `occupation` | `string` | |
| `characterSummary` | `string` | |
| `capabilityBoundary` | `string` | What the character CAN and CANNOT do. |
| `behaviorBoundary` | `string` | Behavioral rules. |
| `oocRedLine` | `string` | Hard constraints against OOC behavior. |
| `clothing` | `string` | |
| `propsWeapon` | `string` | |
| `fatalWeakness` | `string?` | Antagonists only. Optional for others. |

Empty strings are valid — fields are not required to be filled.

## Scene Cast Declaration

`scene.yaml` gains a new optional `cast` field:

```yaml
sceneId: sample-yanshang-live-room
sceneName: 炎上
cast:
  - chr_a1b2c3  # 雾间凪
  - chr_d4e5f6  # 宫下藤花
  - chr_g7h8i9  # 不吉波普
  - chr_j0k1l2  # 灰谷烈
mainAxis: ...
endLine: ...
```

**Behavior**:
- If `cast` is present: loader filters `coreCast` and `antagonists` to only
  include characters whose `characterId` is in the list. Hero is always included
  regardless (the player character cannot be filtered out).
- If `cast` is absent: all characters are loaded (backward-compatible default).

## Type System Changes

### `src/types/prompt-object.ts` — new schemas

```typescript
export const CharacterProfileSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  identityRole: z.string(),
  lightNovelTrait: z.string(),
  gender: z.string(),
  personality: z.string(),
  age: z.string(),
  occupation: z.string(),
  characterSummary: z.string(),
  capabilityBoundary: z.string(),
  behaviorBoundary: z.string(),
  oocRedLine: z.string(),
  clothing: z.string(),
  propsWeapon: z.string(),
  fatalWeakness: z.string().optional(),
}).strict();
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

export const WorldBaseSchema = z.object({
  worldBaseSetting: z.string().default(''),
  worldRules: z.string().default(''),
  toneBaseline: z.string().default(''),
  hero: CharacterProfileSchema,
  coreCast: z.array(CharacterProfileSchema).default([]),
  antagonists: z.array(CharacterProfileSchema).default([]),
  npcCharacters: z.string().default(''),
  locationPatch: z.string(),
}).strict();
export type WorldBase = z.infer<typeof WorldBaseSchema>;
```

The old `mainCharacters` field is gone from the runtime type.

### `src/types/story-package.ts` — SceneSpec gains `cast`

```typescript
export const SceneSpecSchema = z.object({
  sceneId: z.string(),
  sceneName: z.string(),
  cast: z.array(z.string()).optional(),   // ← NEW
  // ... existing fields unchanged ...
}).strict();
```

## Loader Changes: `src/engine/story-loader.ts`

### Legacy detection and migration

```
function isLegacyWorldBase(data):
  return typeof data.mainCharacters === 'string'

function migrateLegacyWorldBase(data) → new WorldBase:
  1. Parse mainCharacters using existing structured/legacy parsers
  2. Generate characterId for each character via generateCharacterId()
  3. Map parsed draft fields → CharacterProfile objects
  4. Return new WorldBase structure
```

The existing `parseLegacyWorldBase()` and `parseStructuredCharacterSection()`
logic in `worldbase-cast.ts` will be extracted into a shared migration utility
that both the loader and the editor can use.

### Cast filtering

After loading WorldBase and SceneSpec:

```
if sceneSpec.cast is defined:
  worldBase.coreCast = worldBase.coreCast.filter(c => cast.includes(c.characterId))
  worldBase.antagonists = worldBase.antagonists.filter(c => cast.includes(c.characterId))
  // hero is always included
```

## Character ID Generation

```typescript
import { randomBytes } from 'node:crypto';

function generateCharacterId(): string {
  return `chr_${randomBytes(3).toString('hex')}`;
}
```

- 6 hex chars = 16.7M combinations, sufficient for story package scope
- Uses `node:crypto.randomBytes` (available in Next.js server context and tests)
- Prefix `chr_` makes IDs visually distinguishable from other identifiers
- Generated once at creation time, stored in YAML, never regenerated
- Migration from legacy format also generates IDs (these are stable per
  migration run but will differ between runs — acceptable since legacy
  packages have no existing ID references)

## Prompt Assembly: Structured → Text

### `src/engine/modules/prompt-assembler.ts`

A new `renderWorldBaseForPrompt(worldBase: WorldBase): PromptWorldBase` function
converts the structured WorldBase back to the three-string format that
`PromptObject` and `prompt-templates.ts` expect.

```typescript
interface PromptWorldBase {
  mainCharacters: string;
  npcCharacters: string;
  locationPatch: string;
}
```

The render function concatenates:

1. World setting blocks (worldBaseSetting, worldRules, toneBaseline)
2. Hero character block
3. Core cast character blocks
4. Antagonist character blocks

Each character block renders as labeled fields (same format currently produced by
`renderCharacterBlock` in `worldbase-cast.ts`).

**PromptObject type stays unchanged** — it still has `worldBase: { mainCharacters,
npcCharacters, locationPatch }`. The structured WorldBase is a storage/editing
concern; the prompt layer sees the rendered text. This means `prompt-templates.ts`
and `schema-mapper.ts` require **zero changes**.

### `src/engine/modules/director-note-layer.ts`

`buildDirectorNote()` currently receives `worldBase.mainCharacters` (string) and
passes it to `buildOptionConstraints()` as the Anti-OOC character profile.

After refactor:
- `buildDirectorNote()` still receives `WorldBase` but now calls
  `renderCharacterProfileForOOC(worldBase)` to produce the Anti-OOC profile
  string from structured hero data.
- The rendered string contains the same content as before, just sourced from
  structured fields instead of a blob.

## Editor Simplification

### What gets deleted

The following functions in `src/authoring/sections/worldbase-cast.ts` become
unnecessary and should be removed:

- `parseLegacyWorldBase()` — moved to shared migration utility
- `parseLegacyCharacterBlock()`
- `extractStructuredSection()`
- `parseStructuredCharacterSection()`
- `parseStructuredFieldBlock()`
- `renderWorldBase()`
- `renderCharacterBlock()`
- `renderCharacterGroup()`
- `renderWorldHeaderBlocks()`
- `renderFieldLines()`
- `extractHeadingName()`
- `stripFormatting()`

These functions exist solely for the markdown-string ↔ structured-draft
round-trip that this refactor eliminates.

### What remains / changes

- `WorldBaseCharacterDraft` → replaced by `CharacterProfile` from types layer
- `WorldBaseCastDraft` → replaced by `WorldBase` from types layer (the editor
  draft IS the runtime type, since both are now structured)
- `createEmptyWorldBaseCharacterDraft()` → becomes `createEmptyCharacterProfile(kind)`
- `normalizeCharacterDraft()` → becomes `normalizeCharacterProfile()`
- `renderSupportingCast()` → stays (npcCharacters is still a text field)
- Character field definitions, labels, heading constants → stay

### `WorldBaseCastSection.tsx`

- Props change from `WorldBaseCastDraft` to `WorldBase`
- Field reads/writes go directly against `CharacterProfile` fields
- Add/remove character in coreCast/antagonists = array splice with
  `generateCharacterId()` for new entries
- No more draft → runtime conversion on save

### Persistence layer (`bridge.ts`, `repository.ts`)

- `persistWorldBaseDraft()` writes structured YAML directly (no render step)
- `extractWorldBaseCastDraft()` renamed to `extractWorldBase()` — validates
  incoming `CharacterProfile` objects directly
- Save path simplifies: UI fields → validate → write YAML

## Migration Strategy

### In-memory auto-migration (loader)

When `story-loader.ts` detects `mainCharacters` is a string:

1. Parse the string into structured characters (reusing existing parse logic)
2. Generate `characterId` for each character
3. Return the new `WorldBase` structure
4. **Do not write back to disk** — the old file works until the author edits and
   saves, at which point the new structured format is persisted

### Editor-triggered migration (persistence)

When the author opens a legacy package in the editor and saves:

1. The editor receives the migrated structured `WorldBase` from the loader
2. Author edits as normal (structured fields)
3. Save writes the new YAML format to disk
4. Legacy format is replaced — one-way migration

### Sample package

`src/story-packages/sample-scene/world-base.yaml` is migrated to the new format
as part of this work. This is the only existing package and serves as the
canonical example + test fixture.

## Test Impact

| Test file | Change |
|-----------|--------|
| `src/types/__tests__/type-conformance.test.ts` | Update `WorldBase` and `PromptObject.worldBase` test data |
| `src/story-packages/__tests__/sample-scene.test.ts` | Update WorldBase assertions for structured format |
| `src/engine/__tests__/story-loader.test.ts` | Add legacy migration test + structured load test |
| `src/engine/modules/__tests__/prompt-assembler.test.ts` | Update WorldBase input to structured type |
| `src/engine/modules/__tests__/director-note-layer.test.ts` | Update WorldBase input to structured type |
| `src/engine/__tests__/orchestrator.test.ts` | Update mock storyPackage.worldBase |
| `src/engine/__tests__/e2e/*.test.ts` | Update WorldBase fixtures |
| `src/engine/__mocks__/*.ts` | Update mock WorldBase data |
| `src/authoring/sections/__tests__/worldbase-cast.test.ts` | Rewrite for new direct-edit model |
| `src/authoring/persistence/__tests__/*.test.ts` | Update save/load assertions |
| `src/app/edit/__tests__/WorldBaseCastSection.test.tsx` | Update component props and assertions |
| `src/app/__tests__/fixtures.ts` | Update WorldBase fixture data |
| `src/app/components/__tests__/StateInspector.test.tsx` | Update if it references WorldBase fields |

## Invariants

1. **LLM prompt format is stable** — `prompt-templates.ts` output does not
   change. No re-tuning needed.
2. **All state remains immutable** — `deepFreeze` applied to loaded WorldBase.
3. **Genre-agnostic** — no story content in `.ts` files; character fields are
   string containers with no hardcoded values.
4. **Existing product works** — after migration, `npm run dev` serves the same
   Play Workbench and Edit Workbench with no regressions.
5. **Tests pass** — full `npm test` green before calling work complete.

## Out of Scope

- Memory system implementation (future work)
- Phase-level cast filtering (Scene-level only for now)
- Multi-Scene package loader (future work — this refactor adds `cast` as the
  integration point)
- Character relationship graph (future memory system concern)
- NPC structured separation (npcCharacters stays as text for now)
