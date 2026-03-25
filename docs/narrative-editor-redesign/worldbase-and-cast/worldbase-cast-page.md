# WorldBase & Cast Page

## Document Status

- Date: 2026-03-23
- Status: active
- Scope: first refreshed section page under the coordinator-first redesign
- Global section map: [../section-map.md](../section-map.md)
- Related skill: [worldbase-cast-skill.md](worldbase-cast-skill.md)
- Related bridge doc: [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
- UIUX reference: [worlbase and cast UIUX参考图.png](worlbase%20and%20cast%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

## 1. Purpose

This document defines the approved page surface for the `WorldBase & Cast`
section.

This page is not the architectural starting point of the redesign.
It is a downstream authoring surface that must fit:

- the `coordinator`
- the deterministic bridge
- the approved direct write path into [`world-base.yaml`](../../../src/story-packages/sample-scene/world-base.yaml)

This page should help the author do two things well:

1. browse and organize world and cast inputs
2. edit one selected character in detail without losing page context

## 2. Approved Content Scope

This page currently includes:

- world base setting
- world rules / prohibitions / anomalous properties
- genre tone and prose baseline
- one hero / player character
- core cast
- antagonists
- ordinary supporting cast
- location pool / scene elements

This page does not currently reintroduce:

- relationship graph editing
- scene routing controls
- control module editing
- wiring and validation editing

## 3. Approved Input Pattern

The page uses the approved mixed pattern.

### 3.1 Large Text Blocks

These remain freeform textareas:

- world base setting
- world rules / prohibitions / anomalous properties
- genre tone and prose baseline
- ordinary supporting cast
- location pool / scene elements

### 3.2 Structured Character Editing

These are character-driven:

- hero
- core cast
- antagonists

The page must not present those as one big text dump.

They must be editable through summary cards plus a detailed editor.

## 4. Approved UX Layout

The approved page shape is now stable enough for coding-agent guidance.

### 4.1 Overall Layout

The page should use:

- a soft, light main editing surface
- a separate right-side detail area
- a lower right technical assistance block

The page should feel consistent with the current workbench direction shown in
[`docs/assets/example.png`](../../assets/example.png):

- light, quiet primary editing space
- dark technical assist blocks used only where system feedback belongs
- no full-page dark control-console treatment

### 4.2 Left Side: Main Authoring Surface

The full left side is the main authoring surface.

It must include its own independent vertical scroll area.

The author should be able to scroll the page-level world and cast inputs on the
left without forcing the entire browser view to move through the right-side
panels.

The left surface contains, top to bottom:

1. world text blocks
2. hero summary card
3. core-cast horizontal card rail
4. antagonist horizontal card rail
5. ordinary supporting cast textarea
6. location pool / scene elements textarea

### 4.3 Right Side: Two Stacked Panels

The right side is split vertically into two stacked panels.

Top:

- selected character editor

Bottom:

- technical assist block

This split is now an approved layout rule.

Do not place the technical assist block above the selected character editor.

### 4.4 Page-Level Actions

The page needs clear primary and secondary actions.

At minimum, include:

- a primary submit / save button
- a secondary reset / clear pending changes button

Recommended placement:

- in the right-side column, aligned with the selected editor and technical assist
- visible without forcing the user to search inside the left rail areas

V1 recommendation:

- place the action row below the technical assist block or as a sticky footer in the right column

Do not hide primary actions inside the left-side character rails.

## 5. Approved Character Browsing Pattern

### 5.1 Hero

The hero is unique.

So the page should show:

- one hero summary card on the left
- no add button for hero

Selecting the hero summary card loads the full hero editor into the right-side
selected character editor.

The hero card on the left is still only a summary card.

Even though there is only one hero, the full detailed editing surface still
belongs on the right.

### 5.2 Core Cast

Core cast should use a horizontal card rail modeled after the current phase-plan
reading pattern.

Each core-cast card should be:

- narrow
- summary-only
- horizontally scrollable inside the rail

The rail should include:

- one card slot per character
- one explicit `add` card or button
- a visible horizontal scroll affordance / slider

### 5.3 Antagonists

Antagonists follow the same pattern as core cast:

- narrow summary cards
- horizontal rail
- add slot
- horizontal slider / scroll affordance

### 5.4 Summary Card Content

Left-side character cards should remain summary-level only.

They should show only these concise fields:

- name
- gender
- personality

They should not expand into the full detailed editor on the left.

The full edit surface belongs in the right-side selected character editor.

## 6. Approved Detailed Editor Pattern

The right-side top panel is the full editor for the currently selected character.

It should show the full card for:

- hero
- one selected core-cast character
- one selected antagonist

Only one character should be actively open in the detailed editor at a time.

The detailed editor should not try to show multiple full cards at once.

This keeps the page readable and preserves the "browse left, edit right" model.

## 7. Approved Character Card Fields

The current approved detailed card fields are:

- character name
- identity / narrative role
- light-novel trait
- gender
- personality
- age
- occupation
- character summary
- capability boundary
- behavior boundary
- OOC red line
- clothing
- props / weapon

Additional antagonist-only field remains allowed:

- fatal weakness

Summary cards on the left do not need to display all of these.

## 8. Technical Assist Block

The lower right block is the technical assist area.

It should stay visually distinct and more technical than the main page surface.

Recommended contents:

- coordinator assistance trigger / summary
- missing-field or conflict feedback
- save result and latest update state
- compact page snapshot if useful

This block is for system help and confidence-building.

It should also be treated as the default place for handling and explaining most
issues raised by the author's current edits on this page.

That includes:

- field gaps
- local conflicts
- save-state changes
- current-page summary and guidance

It is not the place for the full character editor.

## 9. Sample Wireframe Guidance

Coding agents should treat the following as the approved sample skeleton:

```text
WorldBase & Cast Page

Left Column (independent vertical scroll)
  World Base textarea
  World Rules textarea
  Tone textarea
  Hero summary card
  Core Cast horizontal rail
    [Character Card] [Character Card] [Add]
  Antagonists horizontal rail
    [Character Card] [Character Card] [Add]
  Ordinary Supporting Cast textarea
  Location Pool textarea

Right Column
  Selected Character Editor
    Full character card fields
  Technical Assist Block
    Coordinator assist
    Validation / conflict notices
    Save feedback
  Action Row
    [Submit]
    [Reset]
```

This wireframe is intentionally structural.

Do not hardcode story-specific names or prose from sample packages into the
actual page implementation.

## 10. Mapping To Existing Webapp Patterns

### 10.1 Existing Visual Reference

The current app already has a strong structural reference in
[`docs/assets/example.png`](../../assets/example.png).

The current section-specific visual anchor is:

- [worlbase and cast UIUX参考图.png](worlbase%20and%20cast%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

This page should follow that general visual language:

- pale editing surfaces
- restrained borders
- dark, technical side blocks only where helpful

### 10.2 Existing Horizontal Card Reference

The closest existing UI reference for the left-side character rails is
[`src/app/components/AuthorControlPanel.tsx`](../../../src/app/components/AuthorControlPanel.tsx).

Coding agents should borrow from that component's established ideas:

- horizontal overflow handling
- narrow card sizing
- one-card-per-slot mental model
- explicit visual distinction between cards and section wrapper

This does not mean reusing the phase card text or exact copy.
It means reusing the interaction grammar.

### 10.3 Existing Technical Side Reference

For the lower right technical assist block, the closest references are:

- [`src/app/components/StateInspector.tsx`](../../../src/app/components/StateInspector.tsx)
- [`src/app/components/PromptStatusPanel.tsx`](../../../src/app/components/PromptStatusPanel.tsx)

Those references are useful for visual tone and panel hierarchy, not for copying
runtime-specific content into this page.

### 10.4 Existing WorldBase Read-Only Reference

The current read-only world base reference is
[`src/app/components/FixtureReferencePanel.tsx`](../../../src/app/components/FixtureReferencePanel.tsx).

This matters because the current runtime still consumes coarse `world-base`
content.

The new page must not directly edit that read-only display contract.

Instead:

- the page edits structured section input
- the bridge later renders runtime-compatible `world-base.yaml` output

## 11. Coding Agent Build Rules

When building this page, coding agents should follow these rules:

1. keep the page lightweight and authoring-focused
2. do not turn the page into a generic admin dashboard
3. do not replace the left summary rails with fully expanded multi-card editors
4. do not place the technical assist block above the selected character editor
5. do not remove the independent left-side scroll area
6. do not hide page-level save/reset actions
7. do not hardcode sample story text in the UI
8. do not make the page depend on direct browser filesystem access
9. do not bypass the coordinator + bridge architecture

## 12. Relation To The Skill

This page and the skill must be designed as a pair.

The page is responsible for:

- visible structure
- character selection
- rail navigation
- add/remove interactions
- textarea editing
- local unsaved page state

The skill is responsible for:

- interpreting author intent
- normalizing free text
- filling or repairing structured character data
- returning structured patch candidates

The page must not expect the skill to replace its UI structure.

## 13. Current Non-Goals

This page does not aim to do these things right now:

- show multiple full character editors at once
- become a dark full-console workbench
- expose direct YAML editing
- replace the play workbench
- let the coordinator drive the DOM as a browser robot
