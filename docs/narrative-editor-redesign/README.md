# Narrative Editor Redesign

This directory holds the active redesign record for the LOGOS Narrative Editor.

## Active Entry Point

The only active master index is:

- `master-record.md`

Coding agents should begin there before reading any follow-up redesign document.

## Current Active Direction

The redesign is now `coordinator-first`, not `page-first`.

This means the current design priority is:

- define the `router-controller` coordinator agent
- define the section skill inventory around that coordinator
- define the validation, repair, writeback, and reload flow
- only then revisit section pages as downstream surfaces

## What Coding Agents Should Read

Start with:

- `master-record.md`

Current active follow-up documents:

- `coordinator-agent.md`
- `TODO.zh-CN.md`

Do not treat archived section drafts or archived plans as active implementation guidance.

## Archive

Historical page-first drafts and early plans have been moved to:

- `archive/`

Those files are preserved only as historical discussion context. They are not the
current approved architecture path.

Read:

- `archive/README.md`

if you need the archive policy.

## Promotion Rule

- active redesign decisions should stay readable in this folder
- once a behavior, contract, or workflow is approved for implementation, the
  corresponding `vendor/LOGOS-SPEC/` documents should later be updated in the
  same branch
