# 02 — Globals.css transitions: buttons, tabs, cards, and navigation

**What to build:** Refactor every transition defined in the global stylesheet to use the shared easing tokens and GPU-only properties. Remove `background-color`, `box-shadow`, and other paint properties from transition declarations. Gate hover transforms behind the fine-pointer media query. This covers app navigation, title-page actions, primary/secondary buttons, edit tabs, option cards, story-package selectors, and other globally-styled interactive surfaces.

**Blocked by:** 01 — Foundation: tokens, reduced-motion, and fine-pointer guards.

**Status:** ready-for-agent

- [ ] All `transition` declarations in the global stylesheet list only `transform` and/or `opacity`.
- [ ] Built-in `ease` is replaced with the shared custom easing tokens.
- [ ] Hover-driven transforms are gated behind `@media (hover: hover) and (pointer: fine)`.
- [ ] Buttons and pressable surfaces include subtle `:active` scale feedback where missing.
- [ ] `npm run test:ui` and `npm run build` pass.
