# Architecture Codemap

> Updated: 2026-04-08 | post `March Dev Update` archive reset

## System Overview

当前仓库的代码基线已经完成 `March Dev Update Phase 1-4`，并且相关 phase 文档已整体归档到：

- `archive/docs/dev-updates/march-dev-update/`

现在的系统仍然是双环结构：

- `Runtime Loop`：在 `/play` 中运行故事、管理 runtime session，并在需要时触发 `gossipelog`
- `Authoring Loop`：在 `/edit` 中管理故事包、storyline、authoring 内容，以及 built-in sidecar 状态

```text
Title Page (/)
  ├── Play Workbench (/play)
  │     -> runtime session restore / reset
  │     -> orchestrator
  │     -> prompt assembly
  │     -> adapter
  │     -> gossipelog refresh / bootstrap fallback
  │
  └── Narrative Editor (/edit)
        -> 故事包管理
           -> blank creation / text import creation
           -> storyline substrate
           -> package workspace read model
        -> 世界 / 角色 / 场景与阶段 / 控制模块
           -> deterministic bridge
        -> agent 管理
           -> built-in sidecar surface
           -> weaver / Gossipe Log status
```

## Core Boundaries

| Boundary | Rule |
|---|---|
| `checkpoint` | package-scoped immutable node |
| `storyline` | author-facing workline; points into checkpoints |
| `authoring variant` | materialized workspace; storyline-bound |
| `session` | storyline-bound runtime state |
| package creation | server-owned scaffold; `blank | text_import` share one creation seam |
| authoring save | must go through deterministic bridge |
| sidecar prompt context | references are resolved before prompt assembly; assembly remains the single outward prompt boundary |

## Main Layers

| Layer | Key files | Responsibility |
|---|---|---|
| Title / shell | `src/app/page.tsx`, `src/app/AppShell.tsx` | entry and shared shell |
| Play runtime | `src/app/play/`, `src/engine/`, `src/runtime-sessions/` | runtime loop, continuity, gossipelog lifecycle |
| Editor runtime | `src/app/edit/`, `src/authoring/` | authoring surfaces and deterministic save pipeline |
| Storyline substrate | `src/storylines/` | active storyline resolution, create / branch / switch / delete |
| Story package scaffold | `src/story-packages/scaffold.ts`, `src/story-packages/import-seed.ts` | blank creation and text-import seeding |
| Sidecar agents | `src/agents/` | built-in sidecar definitions, shared reference loading, surface summaries |
| Shared contracts | `src/types/` | Zod + TS source of truth |

## Persistence Topology

| File / Dir | Role |
|---|---|
| package-root YAMLs | baseline authored definition |
| `storyline-repository.json` | storyline metadata + activeStorylineId + variant binding |
| `runtime-sessions.json` | runtime sessions + checkpoints |
| `variants/<variantId>/...` | storyline-specific authored workspace |
| `agents/weaver/config.yaml` | built-in weaver config presence |
| `agents/weaver/import-summary.yaml` | text-import summary, warnings, bootstrap state |
| `agents/gossipelog/config.yaml` | built-in gossipelog config presence |
| `agents/gossipelog/character-relationships.yaml` | persisted relationship state |

## Best Reading Order

1. `AGENTS.md`
2. root `task_plan.md` / `progress.md` / `findings.md`
3. `docs/codemaps/*.md`
4. task-specific entry files in `src/`
5. if historical context is needed, `archive/docs/dev-updates/march-dev-update/README.md`
