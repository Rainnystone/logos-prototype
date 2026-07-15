# 04 — Dynamic disclosures: branch drawer, state inspector, and collapsible panels

**What to build:** Make the app's dynamic disclosures interruptible and GPU-only. Replace the branch drawer's keyframe entry animation with an interruptible CSS transition using `@starting-style`. Reduce the state inspector hover disclosure to animate only `transform`/`opacity`. Polish the collapsible panel chevron rotation with the shared easing token.

**Blocked by:** 01 — Foundation: tokens, reduced-motion, and fine-pointer guards.

**Status:** ready-for-agent

- [ ] The branch drawer opens and closes with a CSS transition and `@starting-style` instead of a keyframe.
- [ ] Rapidly toggling the branch drawer does not restart the animation from zero.
- [ ] The state inspector hover disclosure only animates `transform` and `opacity`.
- [ ] The collapsible panel chevron rotates with the shared easing token.
- [ ] `npm run test:ui` and `npm run build` pass.
