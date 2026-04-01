# Narrative Editor Redesign

This directory holds the active redesign record for the LOGOS Narrative Editor.

## Active Entry Point

The only active master index is:

- `master-record.md`

Coding agents should begin there before reading any follow-up redesign document.

## Current Active Direction

The redesign is now `coordinator-first`, not `page-first`.

This means the current design priority is:

- define the `coordinator` role and contract
- define the section skill inventory around that coordinator
- define the validation, repair, writeback, and reload flow
- only then revisit section pages as downstream surfaces

Important terminology note:

- `coordinator-first` does **not** mean `coordinator` is part of the product's sidecar agent roster
- in code and architecture, `coordinator` is a narrow authoring coordinator role
- the first true sidecar agent currently in the repo is `gossipelog agent`

## What Coding Agents Should Read

Start with:

- `master-record.md`

Current active follow-up documents:

- `coordinator-agent.md`
- `authoring-runtime-bridge.md`
- `section-skills.md`
- `section-map.md`
- `worldbase-and-cast/worldbase-cast-page.md`
- `worldbase-and-cast/worldbase-cast-skill.md`
- `scene-phase-authoring/scene-phase-authoring-page.md`
- `scene-phase-authoring/scene-phase-authoring-skill.md`
- `control-modules/control-modules-runtime-adaptation.md`
- `control-modules/control-modules-page.md`
- `control-modules/control-modules-skill.md`
- `control-modules/light-cone-customization-skill.md`
- `control-modules/director-note-additions-skill.md`
- `control-modules/auditor-question-set-skill.md`
- `control-modules/beat-volume-definition-skill.md`
- `control-modules/router-profile-skill.md`
- `package-wiring-validation/package-wiring-validation-page.md`
- `package-wiring-validation/package-wiring-validation-skill.md`
- `acceptance-patch-todo.md`
- `TODO.zh-CN.md`

Do not treat archived section drafts or archived plans as active implementation guidance.

## Section Folder Rule

Each section should now have its own folder.

That folder should contain:

- the page doc
- the matching skill doc
- any approved section-specific reference images or notes

Adopted section folders are:

- `worldbase-and-cast/`
- `scene-phase-authoring/`
- `control-modules/`
- `package-wiring-validation/`

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
  corresponding `archive/vendor/LOGOS-SPEC/` documents should later be updated in the
  same branch
