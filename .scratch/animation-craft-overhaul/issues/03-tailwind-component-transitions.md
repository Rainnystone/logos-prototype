# 03 — Tailwind component transitions: editor and workbench

**What to build:** Refactor Tailwind utility-class transitions across the editor sections and play workbench components to use the shared easing tokens and GPU-only properties. Replace default Tailwind `transition-colors` / `transition` / `transition-transform` classes with explicit durations and custom easing references. Ensure hover transforms are gated and reduced-motion behavior is inherited from the global foundation.

**Blocked by:** 01 — Foundation: tokens, reduced-motion, and fine-pointer guards.

**Status:** ready-for-agent

- [ ] Editor section components use the shared easing tokens and GPU-only transitions.
- [ ] Play workbench and runtime config components use the shared easing tokens and GPU-only transitions.
- [ ] No component-level transition animates `background-color`, `box-shadow`, or other paint properties.
- [ ] Hover-driven transforms are gated behind the fine-pointer media query.
- [ ] `npm run test:ui` and `npm run build` pass.
