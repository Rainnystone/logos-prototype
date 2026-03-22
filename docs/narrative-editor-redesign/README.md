# Narrative Editor Redesign

This directory is the working area for narrative editor redesign exploration,
architecture decisions, section-by-section drafts, and approved design records
inside the implementation repo.

## Current Working Record

The current primary design recorder is:

- `redesign-design-recorder.md`

This file is the running design source for the redesign discussion. It records:

- agreed information architecture
- approved scope boundaries
- architecture decisions needed before coding plans
- constraints aimed at AI coding agents

## Current Approved Architecture Direction

The redesign currently assumes:

- the webapp will gain controlled local file read/write capability
- this capability will stay inside the existing Next.js app
- first-phase write scope is limited to repo-controlled story package files
- browser components will not directly access the filesystem

This is intentionally a lightweight, maintainable local-first architecture, not a
desktop-shell rewrite and not a freeform file manager.

## Planned Contents For This Folder

This folder is expected to hold:

- the running redesign recorder
- four dedicated markdown drafts for the four redesign sections/pages
- follow-up design notes that are still being iterated before promotion

Current section drafts:

- `01-worldbase-and-cast.md`

Coding agents should treat `redesign-design-recorder.md` as the master index and
then read the matching section draft before implementing that page.

## Promotion Rule

- redesign discussions can be iterated here first
- once a design slice is approved, it should remain readable here as a stable record
- if an approved design changes behavior, contracts, or workflows, the relevant
  `vendor/LOGOS-SPEC/` documents should later be updated in the same branch
