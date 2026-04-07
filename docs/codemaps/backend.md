# Backend Codemap

> Updated: 2026-04-07 | merged `Phase 3` baseline

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/authoring/packages` | `POST` | 创建本地 story package scaffold |
| `/api/authoring/packages/[packageName]/storylines/actions` | `POST` | storyline actions：rename / create-from-source / branch / switch / delete |
| `/api/authoring/packages/[packageName]/sections/[sectionId]` | `PATCH` | 保存 authoring section |
| `/api/authoring/packages/[packageName]/coordinator` | `POST` | coordinator-assisted save repair |
| `/api/authoring/packages/[packageName]/diagnostics` | `GET` | package wiring / diagnostics |
| `/api/play/packages/[packageName]/runtime-session` | `POST` | runtime continuity operations |
| `/api/play/gossipelog` | `POST` | relationship refresh / injection bridge |
| `/api/llm/proxy` | `POST` | provider proxy |

## Main Backend Subsystems

| Area | Key files | Responsibility |
|---|---|---|
| Runtime engine | `src/engine/orchestrator.ts`, `src/engine/modules/` | runtime beat loop |
| Runtime continuity | `src/runtime-sessions/repository.ts`, `views.ts` | `runtime-sessions.json` truth + bounded DTOs |
| Storylines | `src/storylines/repository.ts`, `substrate.ts`, `workspace-view.ts` | active storyline context, actions, workspace read model |
| Package scaffold | `src/story-packages/scaffold.ts`, `package-slug.ts` | safe local package creation |
| Authoring save | `src/authoring/persistence/bridge.ts`, `repository.ts` | validate -> render -> persist -> reload |

## Error Mapping Rules Worth Knowing

| Context | Rule |
|---|---|
| package creation | invalid display name -> `400`, duplicate -> `409`, write failure -> `500` |
| storyline actions | missing package / storyline -> `404`, invalid action input -> `400`, structural mismatch -> `409` |
| save pipeline | validation failures should stay bounded, not generic server failures |

## Backend Entry Points

| If you need to inspect... | Start here |
|---|---|
| why `/edit` loads a storyline | `src/app/edit/page.tsx` |
| why a storyline action failed | `src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts` |
| how a new package is created | `src/app/api/authoring/packages/route.ts` and `src/story-packages/scaffold.ts` |
| how active storyline is resolved | `src/storylines/substrate.ts` |
