# Narrative Editor Branch Guide

This document defines the working agreement for `branch/narrative-editor`.

## Why This Branch Exists

The completed phase-by-phase rollout got the repository to a stable baseline,
but upcoming work will introduce behavior that is not already described by the
historical spec. On this branch, implementation, tests, and spec must evolve
together instead of waiting for an upstream design repo to lead every change.

## Authority Order On This Branch

When sources disagree, resolve them in this order:

1. Direct human instructions for the current branch
2. The intended behavior encoded by the current branch's code and tests
3. The updated snapshot under `vendor/LOGOS-SPEC/`
4. Legacy phase plans and historical workflow docs

Old phase-era documents remain useful context, but they are no longer blocking
authority for narrative-editor work.

## Spec Workflow

- `vendor/LOGOS-SPEC/` is editable on this branch
- Any meaningful behavior, contract, or workflow change should update code,
  tests, and spec in the same branch
- If an old spec section no longer matches reality, do not preserve the drift;
  rewrite the spec snapshot to match the intended branch behavior
- Treat `execution-plans/` as historical implementation records unless a task
  explicitly decides to reuse them

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

## Legacy Material

The following areas are still valuable, but should be read as migration-era
context unless the current task explicitly revives them:

- `execution-plans/`
- `docs/claude-code-guide/`
- old branch naming rules tied to `feature/XX-phase-name`
- spec language that assumes `vendor/LOGOS-SPEC/` is read-only
