# Scene Cast Editor Design

## Summary

Add a dedicated `Scene Cast` authoring component to the Narrative Editor's `场景与阶段` page so authors can declare which shared characters enter a Scene runtime view. The component replaces the current `示例用途` editing block inside the `场景框架` area.

This is a Scene-level boundary, not a Beat-level scheduler. Authors decide who is available in the Scene. The narrative engine still decides, from context, which characters are actually active in any given Beat.

## Goals

- Give authors a first-class editor control for `scene.yaml.cast`
- Keep `world-base.yaml` as the only shared character library
- Let Scene config reference shared characters by stable `characterId`
- Preserve the current Narrative Editor visual language and neue brutalism aesthetic
- Avoid introducing weight, ordering, or Beat-level role scheduling semantics

## Non-Goals

- No Beat-level character routing or weighting
- No engine-side rule that explicitly says which Beat must use which character
- No new metadata layer for importance, probability, or priority
- No relocation of `samplePurpose` into another UI surface in this change
- No YAML-first workflow; authors should not be expected to hand-edit `scene.yaml`

## Product Decision

### Component Placement

The new component lives in `ScenePhaseAuthoringSection`, inside the `场景框架` region, replacing the current `示例用途` editor block.

The reading order becomes:

1. Scene name
2. Start point
3. End line
4. Opening situation / opening hook
5. Scene cast

This keeps the component close to Scene framing, where it belongs semantically.

### Authoring Semantics

- Hero is always implicitly included
- Hero does not appear in the selector UI
- Authors only select from `coreCast` and `antagonists`
- `scene.yaml.cast` stores only non-hero `characterId` values
- The set may be empty
- Empty `cast: []` is valid and means "no extra shared characters beyond the hero"

### Engine Contract

`scene.yaml.cast` remains a Scene-level availability boundary only.

Meaning:

- The Scene declares which shared characters are allowed into runtime context
- The engine still infers from context which characters become active in each Beat
- `cast` must not be treated as ranking, priority, or narration order

## UI / UX Direction

### Chosen Direction

Use **Approach A: 摘要条 + 分组卡池**.

Structure:

- Top summary strip for currently selected characters
- Expandable body below the summary
- Two grouped pools inside the expanded body:
  - `核心角色`
  - `反派`

Interaction:

- Summary strip is always visible
- Component is collapsed by default on first page load
- Clicking the summary strip header or chevron toggles expand / collapse
- Clicking a pool card toggles selected / unselected
- Clicking a selected summary chip removes that character immediately
- Hover feedback is subtle
- Primary interaction is click/tap, not hover-dependent

Summary content rules:

- If the Scene is in legacy unset state, the summary strip shows a neutral placeholder:
  - `当前沿用默认场景范围（尚未单独设置出场角色）`
- If the Scene is explicit and no non-hero role is selected, the summary strip shows:
  - `除主角外，当前没有额外出场角色`
- If explicit selections exist, the summary strip shows selected character chips

### Visual Rules

The component must stay consistent with the existing neue brutalism system:

- Hard black borders
- Zero radius corners
- White / light gray blocks
- Hard shadow only where current editor already uses it
- High-contrast selected state: black background, white text
- No soft pills, no glassmorphism, no floating UI language
- Minimal motion only for expand / collapse and state switching

### Why This Direction

- Strong visual continuity with the current editor and workbench
- Clear selected vs unselected state without adding explanatory noise
- More expressive than a checkbox list
- Less "admin panel" than a dual-list transfer control
- Easier to scan than a collapsed textual list

## Data Model Changes

### Scene Draft Shape

Extend the scene-phase authoring draft so Scene-level draft data includes:

- `cast?: string[]`
- `castMode: 'unset' | 'explicit'`

`cast` stores only shared non-hero `characterId` values.

`castMode` is editor-only state used to preserve the semantic difference between:

- Scene has never authored a dedicated cast yet (`unset`)
- Scene has explicitly authored a cast, including an explicit empty set (`explicit`)

### Candidate Source

The selector reads available candidates directly from the current package's shared character library:

- `worldBase.coreCast`
- `worldBase.antagonists`

No duplicated Scene-local character registry is introduced.

## Save Behavior

### Write Path

Saving the `场景与阶段` page writes Scene cast to `scene.yaml` by mode:

- If `castMode === 'unset'`, do not write a `cast` field and preserve an absent `scene.yaml.cast`
- If `castMode === 'explicit'`, write normalized `sceneSpec.cast` directly to `scene.yaml.cast`

### Ordering Rule

Although `cast` is stored as a YAML list, the list must be treated as an unordered set semantically.

To avoid fake priority meaning and unstable diffs, persisted order should be normalized before write:

1. Follow the shared `worldBase.coreCast` order
2. Then follow the shared `worldBase.antagonists` order

Never use click order as saved meaning.

### Empty State

If nothing is selected, save:

```yaml
cast: []
```

Do not omit the field when the author has explicitly saved an empty selection. Omitting the field would blur the distinction between:

- "no Scene cast was authored yet"
- "the author intentionally selected nobody beyond the hero"

### Legacy Unset Behavior

Existing scenes that do not yet have `scene.yaml.cast` must load into the editor as:

- `castMode: 'unset'`
- `cast: undefined`

This avoids silently converting old Scene meaning from:

- "no dedicated Scene cast was authored"

into:

- "the author explicitly selected nobody beyond the hero"

If the author opens the page and saves without interacting with Scene cast, the file must remain without `cast`.

The Scene only transitions from `unset` to `explicit` when the author directly interacts with the Scene cast control.

## Compatibility / Preservation Rules

### samplePurpose

`samplePurpose` is removed from this page's editing surface in this change.

To avoid widening scope:

- Do not move it to a new editor surface now
- Preserve existing `sceneSpec.samplePurpose` on save if present in current data
- Do not make it part of the new Scene cast workflow

### Existing Scene Files

If a Scene already has `cast`, load and display it.

If a Scene does not yet have `cast`, load it into the editor as legacy unset state rather than inventing an empty selection.

The component must not infer or preselect all available characters in this case. It should instead show the neutral legacy placeholder until the author makes an explicit Scene cast choice.

## Validation Rules

- Every stored `cast` entry must correspond to an existing `characterId` in shared `coreCast` or `antagonists`
- Invalid / dangling IDs must not survive a save round
- Hero must never be duplicated into `cast`
- Duplicate IDs must be collapsed to one entry in the saved result
- `cast: []` is valid only when the Scene is in explicit mode

## Error Handling

- If a referenced character disappears from `worldBase`, it must not appear in the selectable pool
- If explicit `cast` contains stale IDs, the summary strip should still surface them as disabled warning chips until save
- A short inline warning should explain that these characters are no longer available and will be removed on next save
- On save, stale IDs should be dropped rather than preserved invisibly
- The UI should remain usable even when the selected set becomes empty

This avoids silent data loss between load and save while still keeping persisted Scene cast clean.

## Test Expectations

The change should be covered at three levels:

### Editor UI

- Summary strip reflects selected Scene cast
- Clicking summary chip removes selection
- Clicking pool card toggles selection
- Selected state is visually distinct
- Hero does not appear in the selector
- Component defaults to collapsed
- Legacy unset Scene shows neutral placeholder instead of empty-selection copy
- Explicit empty Scene shows the explicit empty-selection copy
- Stale IDs surface as disabled warning chips before save

### Authoring / Save Path

- Draft includes Scene `cast`
- Draft preserves `unset` vs `explicit` Scene cast state
- Save writes `scene.yaml.cast` directly
- Empty selection persists as `cast: []`
- Saved IDs are normalized to shared library order
- Saving an untouched legacy Scene does not create `cast`
- Saving an explicit Scene with stale IDs drops them

### Fixture / Runtime

- Sample package uses structured `cast`
- `cast` IDs must resolve to real shared characters
- Runtime Scene filtering remains Scene-level only

## Recommended Implementation Boundary

Keep the change focused to:

- `ScenePhaseAuthoringSection` UI
- scene-phase draft / render helpers
- Scene save path
- sample package fixture
- tests and read-only displays that surface Scene cast

Do not expand this change into Beat-level character control or memory-driven scheduling.

## Acceptance Criteria

This design is complete when:

- Authors can edit Scene cast without touching YAML
- The component visually matches the current brutalist editor
- `scene.yaml.cast` is written directly from explicit editor state
- Hero is implicit and hidden
- No priority semantics are introduced
- Empty non-hero selection is valid
- The engine remains responsible for Beat-level character emergence
- Legacy scenes without `cast` do not silently change meaning after a no-op save
