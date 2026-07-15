# 01 — Foundation: tokens, reduced-motion, and fine-pointer guards

**What to build:** Establish the shared animation foundation that all later tickets depend on. Introduce CSS custom easing tokens, add global `prefers-reduced-motion` handling, and gate hover-driven movement behind fine-pointer media queries. Add one reduced-motion smoke test so the accessibility behavior is guarded from the start.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Shared easing tokens (`--ease-out`, `--ease-in-out`, `--ease-drawer`) are defined in the global stylesheet.
- [ ] A global `@media (prefers-reduced-motion: reduce)` rule drops transform-based movement while preserving opacity/color transitions.
- [ ] A global `@media (hover: hover) and (pointer: fine)` guard prevents hover transforms on touch devices.
- [ ] One reduced-motion smoke test simulates `prefers-reduced-motion: reduce` for a hover-driven disclosure and asserts that movement is suppressed.
- [ ] `npm run test:ui` and `npm run build` pass.
