# Architecture Codemap

> Updated: 2026-04-07 | merged `Phase 3` baseline

## System Overview

LOGOS 现在是一个双环系统：

- `Runtime Loop`：在 `/play` 里运行故事
- `Authoring Loop`：在 `/edit` 里编辑故事包、故事线和 authoring 内容

`Phase 3` 合并后，编辑器默认先进入 `故事包管理`，通过 package / storyline workspace 驱动后续 authoring 与 play 解析。

```text
Title Page (/)
  ├── Play Workbench (/play)
  │     -> Runtime Loop
  │        player input
  │        -> orchestrator
  │        -> runtime session / checkpoint store
  │        -> adapter
  │        -> gossipelog refresh
  │
  └── Narrative Editor (/edit)
        -> Authoring Loop
           story package management
             -> storyline substrate
             -> workspace read model
             -> package creation / storyline delete
           world / character / scene / modules
             -> bridge
             -> validation
             -> writeback
```

## Core Boundaries

| Boundary | Rule |
|---|---|
| `checkpoint` | package-scoped immutable node |
| `storyline` | author-facing workline; points into checkpoints |
| `authoring variant` | materialized workspace; storyline-bound |
| `session` | storyline-bound runtime state |
| package creation | server-owned scaffold |
| authoring save | must go through deterministic bridge |

## Main Layers

| Layer | Key files | Responsibility |
|---|---|---|
| Title / shell | `src/app/page.tsx`, `src/app/AppShell.tsx` | entry and shared shell |
| Play runtime | `src/app/play/`, `src/engine/`, `src/runtime-sessions/` | runtime loop, continuity, gossipelog |
| Editor runtime | `src/app/edit/`, `src/authoring/` | authoring surfaces and save pipeline |
| Storyline substrate | `src/storylines/` | active storyline resolution, create / branch / switch / delete |
| Story package scaffold | `src/story-packages/scaffold.ts` | create explicit `Phase 3` package |
| Shared contracts | `src/types/` | Zod + TS source of truth |

## Persistence Topology

| File / Dir | Role |
|---|---|
| package-root YAMLs | baseline authored definition |
| `storyline-repository.json` | storyline metadata + activeStorylineId + variant binding |
| `runtime-sessions.json` | runtime sessions + checkpoints |
| `variants/<variantId>/...` | storyline-specific authored files |

## Best Reading Order

1. `AGENTS.md`
2. root `task_plan.md` / `progress.md` / `findings.md`
3. `docs/superpowers/specs/2026-04-06-phase-3-master-design.md`
4. this codemap + `frontend.md` + `backend.md` + `data.md`
5. task-specific entry files
