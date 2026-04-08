# Data Codemap

> Updated: 2026-04-08 | post `March Dev Update` archive reset

## Core Package Files

| File / Dir | Format | Responsibility |
|---|---|---|
| `world-base.yaml` | YAML | baseline world / cast / locations |
| `scene.yaml` | YAML | scene definition |
| `phase-plans.yaml` | YAML | phase / beat planning |
| `router-lexicon.yaml` | YAML | router profiles |
| `audit-questions.yaml` | YAML | audit question set |
| `control-modules.yaml` | YAML | control modules |
| `storyline-repository.json` | JSON | storyline metadata + activeStorylineId + variant binding |
| `runtime-sessions.json` | JSON | runtime sessions + checkpoints |
| `variants/<variantId>/...` | YAML mirror set | storyline-specific authored workspace |
| `agents/weaver/config.yaml` | YAML | built-in weaver config presence |
| `agents/weaver/import-summary.yaml` | YAML | import summary, warnings, bootstrap state |
| `agents/gossipelog/config.yaml` | YAML | built-in gossipelog config presence |
| `agents/gossipelog/character-relationships.yaml` | YAML | persisted relationship state |

## Main Type Families

### Authoring / Package Types

| Type | Purpose |
|---|---|
| `StoryPackage` | 完整加载后的 package |
| `SceneSpec` | scene contract |
| `PhasePlan` / `PhasePlansFile` | phase / beat plans |
| `WorldBase` | 世界、角色、地点基线 |
| `RouterProfile` / `RouterLexiconFile` | router 配置 |
| `ControlModules` | 控制模块 |
| `AuditQuestionSet` | 审核问题集合 |

### Runtime Continuity Types

| Type | Purpose |
|---|---|
| `RuntimeSessionsFile` | continuity root file |
| `RuntimeSession` | 单条 runtime session |
| `RuntimeCheckpoint` | accepted-beat checkpoint |

### Storyline Types

| Type | Purpose |
|---|---|
| `StorylineRepositoryFile` | storyline repository 根结构 |
| `StorylineRecord` | 单条 storyline metadata |
| `StorylineVariant` | variant workspace metadata |

### Package Creation / Weaver Types

| Type | Purpose |
|---|---|
| `StoryPackageCreationRequest` | discriminated `blank | text_import` create request |
| `StoryPackageCreationResponse` | package create response with bounded warnings |
| `WeaverImportRequest` | `weaverImport` adapter request |
| `WeaverImportPayload` | validated structured import payload |
| `WeaverImportSummary` | persisted import summary and bootstrap status |

### Agent Surface Types

| Type | Purpose |
|---|---|
| `AgentSurfaceItem` | built-in sidecar card view |
| `AgentOperationalHint` | `ready | warning | pending_bootstrap` |

## Repository Shapes

### `storyline-repository.json`

```text
version
activeStorylineId
storylinesById
variantsById
```

### `runtime-sessions.json`

```text
version
activeSessionId
sessionsById
```

### `agents/weaver/import-summary.yaml`

```text
sourceKind
sourceSummary
importSummary
warningCount
unresolvedGapCount
bootstrapStatus
```

## Important Data Rules

| Rule | Meaning |
|---|---|
| `checkpoint` stays package-scoped | checkpoints are never storyline-owned |
| `storyline.variantId` is stable | existing storyline is not rebound to another variant in the current baseline |
| `runtime-sessions.json` owns checkpoint truth | storyline repo must not own runtime transcript history |
| package-root YAML is baseline | storyline-aware reads resolve to variant workspace when present |
| `weaver` summary is bounded | raw pasted source text is not duplicated into sidecar summary state |
| agent hints are derived | `operationalHint` / `latestStateLine` come from shared surface loading, not handwritten UI state |
