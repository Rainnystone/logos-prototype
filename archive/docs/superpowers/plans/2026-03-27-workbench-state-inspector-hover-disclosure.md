# Workbench State Inspector Hover Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hover-to-reveal full-text interaction for the `Alpha` and `Beta` blocks in the workbench state inspector without changing workbench logic or breaking the current neue brutalism layout.

**Architecture:** Keep the change local to the `StateInspector` display layer. The compact cards continue to render in their current footprint, while hover and keyboard focus reveal a positioned full-text layer that sits over the panel instead of reflowing the layout. Verification must prove both the compact resting state and the expanded reveal state.

**Tech Stack:** Next.js, React, TypeScript, Tailwind utility classes, Testing Library, Vitest

---

## Visual Direction

- **Visual thesis:** A restrained black-on-charcoal inspector keeps its rigid brutalist geometry, while the full text appears as a sharper, brighter overlay panel that feels like an inspection drawer rather than a tooltip bubble.
- **Content plan:** Compact `Alpha`/`Beta` summary in resting state, full text on hover/focus, no extra labels or helper copy, no new chrome outside the existing card group.
- **Interaction thesis:** Fast opacity reveal, subtle lift or edge-brightening on the hovered card, and a pinned overlay that opens in place without pushing the surrounding modules.

## Scope Boundaries

- Allowed:
  - `Alpha` and `Beta` display treatment inside the right-side workbench state inspector
  - hover/focus reveal behavior
  - small, local styling additions needed to preserve the current brutalist language
  - tests for the new resting and reveal states
- Not allowed:
  - any change to play/workbench logic, round state, save flow, routing, or story generation
  - reshuffling the inspector layout
  - adding modal-style interaction, click-to-toggle persistence, or mobile/tablet variants

## File Map

- Modify: `src/app/components/StateInspector.tsx`
  - Owns the `Alpha` / `Beta` cards and is the only component that should gain the reveal interaction
- Modify: `src/app/components/__tests__/StateInspector.test.tsx`
  - Add coverage for compact rendering and hover/focus reveal behavior
- Verify only: `src/app/play/PlayWorkbench.tsx`
  - Confirms the inspector is consumed in one place and does not need direct logic changes

## Task 1: Lock The Interaction Contract In Tests

**Files:**
- Modify: `src/app/components/__tests__/StateInspector.test.tsx`
- Verify: `src/app/components/StateInspector.tsx`

- [ ] **Step 1: Write the failing tests for compact state and reveal state**

Add tests that prove:
- `Alpha` and `Beta` still render in the inspector
- resting state stays visually compact
- hover or focus on a card reveals the full text layer
- reveal closes when pointer/focus leaves

- [ ] **Step 2: Run the targeted test file and confirm the new assertions fail for the expected reason**

Run:
```bash
npm test -- src/app/components/__tests__/StateInspector.test.tsx
```

Expected:
- the new reveal-state assertions fail because the UI does not yet expose a hover/focus layer

## Task 2: Implement Local Reveal UI Without Reflow

**Files:**
- Modify: `src/app/components/StateInspector.tsx`
- Verify: `src/app/play/PlayWorkbench.tsx`

- [ ] **Step 1: Add a dedicated local display wrapper for Alpha/Beta**

Refactor only enough to avoid duplicating the reveal markup twice. Keep the cards inside the existing section so spacing, headings, and panel proportions stay stable.

- [ ] **Step 2: Add hover and keyboard-focus reveal behavior**

Implementation rules:
- compact card remains the default state
- full text reveal appears as an absolutely positioned local layer or equivalent in-place overlay
- overlay must not change the inspector column width or push neighboring sections down
- pointer leave and focus leave must return the card to compact state

- [ ] **Step 3: Keep the visual language aligned with current neue brutalism**

Implementation rules:
- black or near-black surface family only
- rigid borders, no soft bubbles, no rounded tooltip styling
- same mono typography rhythm already used in the inspector
- subtle transition only; no floaty animation
- green accent remains limited to the same existing signal color family

- [ ] **Step 4: Run the targeted test file and confirm it passes**

Run:
```bash
npm test -- src/app/components/__tests__/StateInspector.test.tsx
```

Expected:
- all tests in the file pass

## Task 3: Browser Verification For Real Inspector Behavior

**Files:**
- Verify: `src/app/components/StateInspector.tsx`
- Verify: `src/app/play/PlayWorkbench.tsx`

- [ ] **Step 1: Launch the local app in the isolated branch workspace**

Run:
```bash
npm run dev
```

- [ ] **Step 2: Open the workbench page and inspect the resting state**

Manual checks:
- `Alpha` / `Beta` are still aligned with the current inspector stack
- no extra whitespace or panel growth appears before hover
- the inspector keeps the current brutalist look

- [ ] **Step 3: Hover and focus-test the reveal**

Manual checks:
- moving the pointer over `Alpha` reveals the full text
- moving the pointer away collapses it
- same behavior works for `Beta`
- tab focus also reveals the full text, and blur closes it
- expanded text does not push `Phase Gradient` or other inspector sections down

- [ ] **Step 4: Verify desktop widths relevant to this product**

Manual checks:
- at least one smaller desktop width around `1280`
- one wider desktop width around `1440` or `1600`
- no layout break or horizontal overflow

## Task 4: Final Quality Gate

**Files:**
- Modify if needed: `src/app/components/StateInspector.tsx`
- Modify if needed: `src/app/components/__tests__/StateInspector.test.tsx`

- [ ] **Step 1: Run targeted verification**

Run:
```bash
npm test -- src/app/components/__tests__/StateInspector.test.tsx
npm run lint
npm run type-check
```

Expected:
- targeted tests pass
- lint passes
- type-check passes

- [ ] **Step 2: Review against the acceptance checklist**

Acceptance checklist:
- `Alpha` / `Beta` remain compact by default
- full text is available on hover and on focus
- leaving the target collapses the reveal
- inspector layout does not reflow or stretch awkwardly
- current workbench neue brutalism style remains intact
- no logic behavior outside the inspector is changed

- [ ] **Step 3: Commit the isolated branch work**

```bash
git add src/app/components/StateInspector.tsx src/app/components/__tests__/StateInspector.test.tsx
git commit -m "feat: add inspector hover disclosure"
```
