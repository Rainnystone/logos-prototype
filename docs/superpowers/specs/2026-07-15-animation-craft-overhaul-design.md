# Animation Craft Overhaul — Design Spec

## Problem Statement

The LOGOS UI currently animates interactions with weak built-in CSS easings, non-GPU properties, and no accessibility guards. This produces motion that feels sluggish under load, fires false hover feedback on touch devices, and can be uncomfortable for users with motion sensitivity. The branch drawer uses a non-interruptible keyframe animation, so rapid toggles restart from zero and feel broken.

## Solution

Establish a small, consistent animation system across the LOGOS UI:

1. Introduce shared CSS easing tokens derived from Emil Kowalski's animation standards.
2. Replace built-in `ease` with a strong custom `ease-out` curve on every UI transition.
3. Move all transitions to GPU-only properties (`transform`, `opacity`). Remove `background-color` and `box-shadow` from transition declarations; keep color/shadow changes as instant visual state changes.
4. Replace the keyframe-based branch drawer entry with an interruptible CSS transition using `@starting-style`.
5. Gate every hover-driven transform behind `@media (hover: hover) and (pointer: fine)`.
6. Add global `prefers-reduced-motion` handling that drops transform-based movement while preserving opacity and color transitions that aid comprehension.

All UI transitions stay under 300ms, matching the existing duration budget.

## User Stories

1. As an author using the narrative editor, I want button and card hover feedback to feel snappy, so that the interface feels responsive.
2. As an author on a laptop, I want hover animations to only fire when I use a pointing device, so that touch interactions do not trigger false feedback.
3. As an author with motion sensitivity, I want reduced motion mode to remove movement while keeping helpful opacity and color transitions, so that I can use the editor comfortably.
4. As a player using the play workbench, I want branch drawers and disclosure panels to open smoothly without restarting if I toggle them quickly, so that interactions feel robust.
5. As a developer adding a new UI component, I want shared easing tokens available, so that motion stays consistent without guessing values.
6. As an author navigating lists and selectors, I want hover states to be visually clear, so that I can confidently identify interactive elements.
7. As a player reading runtime output, I want state inspector cards to expand on hover without stutter, so that I can inspect details without distraction.
8. As a maintainer, I want the animation layer to be CSS-only and library-agnostic, so that it adds no runtime dependency or bundle weight.
9. As an author using keyboard navigation, I want focus-visible styles to remain distinct from hover motion, so that keyboard use stays predictable.
10. As a player on a lower-end device, I want transitions to stay on the GPU, so that the workbench does not drop frames during busy generation cycles.
11. As a tester, I want at least one reduced-motion smoke test, so that accessibility behavior is guarded against future regressions.
12. As a designer, I want the motion personality to match LOGOS's brutalist/high-contrast identity — crisp, fast, and intentional — so that the product feels cohesive.

## Implementation Decisions

- **Easing tokens.** Adopt CSS custom properties in the global stylesheet:
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for entering/exiting UI elements and hover feedback.
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement and morphing.
  - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` for anchored overlay motion.
- **No new animation library.** Keep the current CSS-only approach. Do not introduce Framer Motion, Motion, or WAAPI for this overhaul.
- **GPU-only transitions.** Every `transition` declaration should list only `transform` and/or `opacity`. Remove `background-color`, `box-shadow`, `border-color`, and other paint properties from transition lists. Color/shadow changes can still apply instantly on state change.
- **Button and card press feedback.** Add subtle `:active` scale feedback (`transform: scale(0.97)`) with a short `transform` transition where it is missing, gated by the fine-pointer media query.
- **Branch drawer entry.** Replace the existing keyframe animation with a CSS transition paired with `@starting-style` for entry. This keeps the animation interruptible when the user toggles the drawer rapidly.
- **Hover gating.** Wrap all hover-driven transforms in `@media (hover: hover) and (pointer: fine)`. Hover color changes may remain ungated because they are not motion.
- **Reduced motion.** Add a global `@media (prefers-reduced-motion: reduce)` rule that zeroes out transform-based transitions while preserving opacity and color transitions. The goal is gentler motion, not zero motion.
- **Tailwind components.** For components styled with Tailwind utility classes, prefer explicit CSS custom properties (e.g. `transition-transform duration-150` combined with a custom easing class or inline style referencing the token) over Tailwind's default `ease` timing function. If the project later adopts a Tailwind plugin for custom easings, that can be a follow-up.
- **Duration budget.** Keep existing durations (80–150ms) unchanged. The problem is easing and property choice, not speed.
- **State inspector hover disclosure.** Reduce the transition to `transform` and `opacity` only; remove `box-shadow`, `background-color`, and `border-color` from the animated property list. Evaluate whether the hover expansion can be simplified further during implementation.

## Testing Decisions

- **Primary automated seam: existing UI component tests plus build.** Run `npm run test:ui` and `npm run build` after the changes. These tests verify that interactions (clicks, hovers, toggles) still behave correctly and that the app renders without type or build errors.
- **Reduced-motion smoke test.** Add one targeted test for a hover-driven disclosure (e.g. the state inspector constraint card or the branch drawer) that simulates `prefers-reduced-motion: reduce` and asserts that movement is suppressed. The test should verify behavior, not assert exact CSS strings.
- **Manual craft review.** A reviewer must run the app and spot-check hover, active, focus, drawer open/close, and panel expand/collapse interactions against the animation standards checklist. Slow-motion playback in DevTools is recommended.
- **No visual regression testing.** Adding Playwright or a visual diff suite is out of scope for this overhaul.

## Out of Scope

- Adding new animations, delight moments, or onboarding motion.
- Introducing Framer Motion, Motion, React Spring, or any other animation library.
- Building a full visual regression or screenshot-diff suite.
- Changing component behavior, state management, or DOM structure beyond motion properties.
- Adding swipe, drag, or gesture interactions that do not already exist.
- Rewriting the design system or migrating from Tailwind to another styling approach.

## Further Notes

- The animation review found no existing `prefers-reduced-motion` handling and no `@media (hover: hover) and (pointer: fine)` gating anywhere in the app. These are the highest-priority accessibility fixes.
- The current UI uses a brutalist, high-contrast visual identity. The custom `ease-out` curve and GPU-only transitions reinforce that crisp personality; bouncy springs or long durations would feel out of place.
- Because all existing durations are already under 300ms, this work focuses on easing curves, physical correctness, interruptibility, and accessibility rather than on making transitions faster.
