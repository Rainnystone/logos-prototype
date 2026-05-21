# Narrative Editor Branch Guide

This document defines the working agreement for `branch/narrative-editor`.

Canonical repo: `https://github.com/Rainnystone/logos-prototype`

## Why This Branch Exists

The completed phase-by-phase rollout got the repository to a stable baseline,
but upcoming work will introduce behavior that is not already described by the
historical spec. On this branch, implementation, tests, and spec evolve
together instead of waiting for an upstream design repo to lead every change.

`branch/narrative-editor` is the only default development branch.
`main` mirrors the same baseline for compatibility and cloning ergonomics, but
it is not the primary working branch.

## Authority Order On This Branch

When sources disagree, resolve them in this order:

1. Direct human instructions for the current branch
2. The intended behavior encoded by the current branch's code and tests
3. The updated snapshot under `archive/vendor/LOGOS-SPEC/`
4. Older branch mirrors and explicitly archived historical material

Only the new repo and `branch/narrative-editor` are canonical for ongoing work.

## Spec Workflow

- `archive/vendor/LOGOS-SPEC/` is editable on this branch
- Any meaningful behavior, contract, or workflow change should update code,
  tests, and spec in the same branch
- If an old spec section no longer matches reality, do not preserve the drift;
  rewrite the spec snapshot to match the intended branch behavior
- Removed historical phase plans and workflow docs from the active repo to
  prevent accidental reuse

## Testing Workflow

Baseline quality gates remain:

- `npm run lint`
- `npm run type-check`
- `npm test`

For faster iteration, use the split suites:

- `npm run test:core`
- `npm run test:ui`
- `npm run test:e2e`

The goal of split suites is to decouple iteration speed from the old phase
layout. Over time, tests should be grouped by responsibility and runtime cost
rather than by phase history.

## Repo Defaults

- `origin` should point to `Rainnystone/logos-prototype`
- `origin/HEAD` should point to `origin/branch/narrative-editor`
- PRs should target `branch/narrative-editor`
- Do not treat old workbench repos or phase branches as defaults
