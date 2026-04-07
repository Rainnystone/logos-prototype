# Data Codemap

> Updated: 2026-04-07 | merged `Phase 3` baseline

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

### Management View / Action Types

| Type | Purpose |
|---|---|
| `StoryPackageManagementWorkspaceView` | `故事包管理` 页 DTO |
| `StoryPackageManagementStorylineRowView` | 单条 row 视图 |
| `StoryPackageManagementCheckpointNode` | beat rail 节点 DTO |
| `StorylineAction` | storyline actions union |
| `StoryPackageCreationRequest` | package creation request |
| `StoryPackageCreationResponse` | package creation response |

## Repository Shapes

### `storyline-repository.json`

```text
version
activeStorylineId
storylinesById
variantsById
```

每条 `StorylineRecord` 至少包含：

- `storylineId`
- `name`
- `status`
- `sourceCheckpointId`
- `headCheckpointId`
- `variantId`
- `activeSessionId`

### `runtime-sessions.json`

```text
version
activeSessionId
sessionsById
```

每条 `RuntimeSession` 至少包含：

- `lifecycle`
- `headCheckpointId`
- `activeCheckpointId`
- `orderedCheckpointIds`
- `checkpointsById`

## Important Data Rules

| Rule | Meaning |
|---|---|
| `checkpoint` stays package-scoped | checkpoints are never storyline-owned |
| `storyline.variantId` is stable | existing storyline is not rebound to another variant in Phase 3 |
| `activeStorylineId` must resolve | explicit repository cannot exist without a concrete active storyline |
| `runtime-sessions.json` owns checkpoint truth | storyline repo must not own runtime transcript history |
| package-root YAML is baseline | storyline-aware reads resolve to variant workspace when present |

## New Package Scaffold Guarantees

创建新 package 时，默认会生成显式 `Phase 3` scaffold，包括：

- baseline YAML files
- `storyline-repository.json`
- `runtime-sessions.json`
- `variants/variant_main/...`
- 默认 `storyline_main`
- 默认 `variant_main`
- 默认 `awaiting_start` session
