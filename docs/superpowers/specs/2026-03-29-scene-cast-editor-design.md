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

- Clicking a pool card toggles selected / unselected
- Clicking a selected summary chip removes that character immediately
- Hover feedback is subtle
- Primary interaction is click/tap, not hover-dependent

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

- `cast: string[]`

This field stores only shared non-hero `characterId` values.

### Candidate Source

The selector reads available candidates directly from the current package's shared character library:

- `worldBase.coreCast`
- `worldBase.antagonists`

No duplicated Scene-local character registry is introduced.

## Save Behavior

### Write Path

Saving the `场景与阶段` page writes `sceneSpec.cast` directly to `scene.yaml.cast`.

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

## Compatibility / Preservation Rules

### samplePurpose

`samplePurpose` is removed from this page's editing surface in this change.

To avoid widening scope:

- Do not move it to a new editor surface now
- Preserve existing `sceneSpec.samplePurpose` on save if present in current data
- Do not make it part of the new Scene cast workflow

### Existing Scene Files

If a Scene already has `cast`, load and display it.

If a Scene does not yet have `cast`, initialize the editor draft as an empty selection rather than inventing one from heuristics.

## Validation Rules

- Every stored `cast` entry must correspond to an existing `characterId` in shared `coreCast` or `antagonists`
- Invalid / dangling IDs must not survive a save round
- Hero must never be duplicated into `cast`
- Duplicate IDs must be collapsed to one entry in the saved result

## Error Handling

- If a referenced character disappears from `worldBase`, the editor should simply stop showing it as selectable
- On save, stale IDs should be dropped rather than preserved invisibly
- The UI should remain usable even when the selected set becomes empty

## Test Expectations

The change should be covered at three levels:

### Editor UI

- Summary strip reflects selected Scene cast
- Clicking summary chip removes selection
- Clicking pool card toggles selection
- Selected state is visually distinct
- Hero does not appear in the selector

### Authoring / Save Path

- Draft includes Scene `cast`
- Save writes `scene.yaml.cast` directly
- Empty selection persists as `cast: []`
- Saved IDs are normalized to shared library order

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
- `scene.yaml.cast` is written directly from editor state
- Hero is implicit and hidden
- No priority semantics are introduced
- Empty non-hero selection is valid
- The engine remains responsible for Beat-level character emergence
