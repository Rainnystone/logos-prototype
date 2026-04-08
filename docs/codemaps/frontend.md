# Frontend Codemap

> Updated: 2026-04-08 | post `March Dev Update` archive reset

## Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | 标题页；provider setup + Play / Edit 入口 |
| `/play` | `src/app/play/page.tsx` | Play Workbench |
| `/edit` | `src/app/edit/page.tsx` | Narrative Editor；默认进入 `故事包管理` |

## Editor Visible Tabs

| Tab | Query contract | Purpose |
|---|---|---|
| `故事包管理` | `section=story-package-management` | package selector、storyline workspace、空白创建、文本导入创建 |
| `世界` | `section=worldbase-cast&surface=world` | 世界、规则、地点、NPC |
| `角色` | `section=worldbase-cast&surface=character` | 主角、核心角色、反派与关系区 |
| `场景与阶段` | `section=scene-phase-authoring` | scene / phase / cast / location |
| `控制模块` | `section=control-modules` | router / audit / light cone / beat volume |
| `agent 管理` | `section=package-wiring-validation` | built-in sidecar 状态、技能说明、轻量提示 |

## Edit Page Structure

```text
EditPage (server)
  -> listStoryPackageCatalog()
  -> resolveActiveStorylineContext()
  -> loadAuthoringState()
  -> loadStoryPackageManagementWorkspaceView()      [management only]
  -> EditWorkbench (client)

EditWorkbench
  -> SectionTabs
  -> PageActionBar
  -> active section
```

## Story Package Management UI

| Component | Responsibility |
|---|---|
| `StoryPackageManagementSection.tsx` | 主容器 |
| `StoryPackageSelector.tsx` | 左侧 package selector |
| `StoryPackageCreationPanel.tsx` | `blank | text_import` 创建分流与表单 |
| `StorylineWorkspaceRow.tsx` | 单条 storyline row |
| `StorylineDeleteControl.tsx` | 删除确认与禁用态 |

当前 UI 约束：

- 左侧 selector 只显示 package 名称
- `新建故事包` tile 使用浅灰底、单层虚线
- beat rail 横向增长、横向滚动，不换行
- `text_import` 成功后回到新 package 的 `故事包管理`

## Agent Management UI

| Component | Responsibility |
|---|---|
| `PackageWiringValidationSection.tsx` | 当前 `agent 管理` 页主容器 |
| `AgentSurfacePanel.tsx` | built-in sidecar 卡片列表 |

当前 UI 约束：

- 只展示 built-in sidecar
- 目前会显示 `Weaver` 和 `Gossipe Log`
- built-in sidecar 不提供关闭 checkbox
- 页面右上角只保留轻量状态提示，不再承担旧 diagnostics 整页语义

## Play Workbench UI

| Component | Responsibility |
|---|---|
| `PlayWorkbench.tsx` | 客户端主容器 |
| `AuthorControlPanel.tsx` | scene / phase / meta 信息 |
| `BeatDisplay.tsx` | 当前 beat 输出 |
| `PlayerInput.tsx` | 选项与自由输入 |
| `PromptStatusPanel.tsx` | prompt / context 状态 |
| `StateInspector.tsx` | runtime state 与边界可视化 |
| `BeatHistory.tsx` | accepted beat 历史 |

## Important Frontend State

| State | Source of truth |
|---|---|
| runtime config | localStorage |
| editor draft state | `EditWorkbench` client state + server reload result |
| package list | `listStoryPackageCatalog()` |
| active storyline | `resolveActiveStorylineContext()` |
| management workspace view | `loadStoryPackageManagementWorkspaceView()` |
| sidecar cards | `loadAgentSurfaceItems()` through package-state loading |

## CSS Areas Worth Knowing

先看：

- `src/app/globals.css`
- `.story-package-management*`
- `.storyline-workspace*`
- `.story-package-selector*`
- `.edit-shell*`
- `.play-*`
