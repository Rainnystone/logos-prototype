# Backend Codemap

> Updated: 2026-04-08 | post `March Dev Update` archive reset

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/authoring/packages` | `POST` | 创建 story package；支持 `blank` 与 `text_import` |
| `/api/authoring/packages/[packageName]/storylines/actions` | `POST` | storyline actions：rename / create-from-source / branch / switch / delete |
| `/api/authoring/packages/[packageName]/sections/[sectionId]` | `PATCH` | 保存 authoring section |
| `/api/authoring/packages/[packageName]/coordinator` | `POST` | coordinator-assisted save repair |
| `/api/authoring/packages/[packageName]/diagnostics` | `GET` | package wiring / agent surface 读取 |
| `/api/play/packages/[packageName]/runtime-session` | `POST` | runtime continuity operations |
| `/api/play/gossipelog` | `POST` | relationship refresh / injection bridge |
| `/api/play/gossipelog/bootstrap` | `POST` | create-time / first-play bootstrap and fallback |
| `/api/llm/proxy` | `POST` | provider proxy |

## Main Backend Subsystems

| Area | Key files | Responsibility |
|---|---|---|
| Runtime engine | `src/engine/orchestrator.ts`, `src/engine/modules/` | runtime beat loop |
| Runtime continuity | `src/runtime-sessions/repository.ts`, `views.ts` | `runtime-sessions.json` truth + bounded DTOs |
| Storylines | `src/storylines/repository.ts`, `substrate.ts`, `workspace-view.ts` | active storyline context, actions, workspace read model |
| Package scaffold | `src/story-packages/scaffold.ts`, `import-seed.ts`, `package-slug.ts` | blank creation, text-import staging, package naming |
| Authoring save | `src/authoring/persistence/bridge.ts`, `repository.ts` | validate -> render -> persist -> reload |
| Sidecar agents | `src/agents/registry.ts`, `src/agents/reference-loader.ts`, `src/agents/agent-surface.ts` | registry, reference loading, read-only surface assembly |
| Weaver | `src/agents/weaver/` | import request validation, payload shaping, summary persistence |
| Gossipelog | `src/agents/gossipelog/` | relationship refresh, bootstrap, first-play fallback |
| Shared adapter config | `src/app/api/shared/adapter-config.ts` | parse browser runtime config for server routes |

## Error Mapping Rules Worth Knowing

| Context | Rule |
|---|---|
| package creation | invalid display name / import input -> `400`, duplicate -> `409`, write failure -> `500` |
| storyline actions | missing package / storyline -> `404`, invalid action input -> `400`, structural mismatch -> `409` |
| bootstrap route | invalid adapter config or invalid package context -> bounded `400` |
| save pipeline | validation failures should stay bounded, not generic server failures |

## Backend Entry Points

| If you need to inspect... | Start here |
|---|---|
| how `/edit` loads a storyline and section | `src/app/edit/page.tsx` |
| how `blank | text_import` package creation works | `src/app/api/authoring/packages/route.ts` and `src/story-packages/scaffold.ts` |
| how active storyline is resolved | `src/storylines/substrate.ts` |
| how built-in sidecar cards are assembled | `src/agents/agent-surface.ts` |
| how references are injected before prompt assembly | `src/agents/reference-loader.ts` and `src/engine/api-adapter/adapter.ts` |
| how bootstrap/fallback works | `src/app/api/play/gossipelog/bootstrap/route.ts` and `src/agents/gossipelog/bootstrap.ts` |
