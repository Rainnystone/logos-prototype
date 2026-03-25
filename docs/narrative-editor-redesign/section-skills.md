# Section Skills

## Document Status

- Date: 2026-03-23
- Status: active
- Scope: `branch/narrative-editor`

## Purpose

This file is the active index for section skill documents.

It exists to give coding agents a stable place to find:

- the currently approved section skill docs
- which skill docs are already detailed
- which ones are still pending

Read this file after:

- [master-record.md](master-record.md)
- [coordinator-agent.md](coordinator-agent.md)
- [authoring-runtime-bridge.md](authoring-runtime-bridge.md)
- [section-map.md](section-map.md)

## Active Section Skill Docs

Current active detailed section skill documents are:

1. [worldbase-and-cast/worldbase-cast-skill.md](worldbase-and-cast/worldbase-cast-skill.md)
2. [scene-phase-authoring/scene-phase-authoring-skill.md](scene-phase-authoring/scene-phase-authoring-skill.md)
3. [control-modules/control-modules-skill.md](control-modules/control-modules-skill.md)
4. [control-modules/light-cone-customization-skill.md](control-modules/light-cone-customization-skill.md)
5. [control-modules/director-note-additions-skill.md](control-modules/director-note-additions-skill.md)
6. [control-modules/auditor-question-set-skill.md](control-modules/auditor-question-set-skill.md)
7. [control-modules/beat-volume-definition-skill.md](control-modules/beat-volume-definition-skill.md)
8. [control-modules/router-profile-skill.md](control-modules/router-profile-skill.md)
9. [package-wiring-validation/package-wiring-validation-skill.md](package-wiring-validation/package-wiring-validation-skill.md)

Important current rule:

- `control-modules` is now a section-local skill family
- coding agents should not collapse it back into one oversized control skill

## Pending Detailed Section Skill Docs

These still need dedicated active docs:

1. `legacy-migration-skill`

Additional current rule:

- cross-section reconciliation no longer exists as a separate skill
- it is now part of the coordinator contract

## Coding Agent Rule

Do not treat this file as a substitute for the detailed skill docs.

This file is only an index.

When implementing a section:

1. start from [master-record.md](master-record.md)
2. read [authoring-runtime-bridge.md](authoring-runtime-bridge.md)
3. read [section-map.md](section-map.md)
4. read the section page doc
5. read the matching section skill doc
