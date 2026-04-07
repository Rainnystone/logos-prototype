# Frontend Codemap

> Updated: 2026-04-07 | merged `Phase 3` baseline

## Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | 标题页；provider setup + Play / Edit 入口 |
| `/play` | `src/app/play/page.tsx` | Play Workbench |
| `/edit` | `src/app/edit/page.tsx` | Narrative Editor；默认进入 `故事包管理` |

## Editor Visible Tabs

| Tab | Query contract | Purpose |
|---|---|---|
| `故事包管理` | `section=story-package-management` | package selector、storyline workspace、新建包、删除 line |
| `世界` | `section=worldbase-cast&surface=world` | 世界、规则、地点 |
| `角色` | `section=worldbase-cast&surface=character` | 角色与关系侧 authoring |
| `场景与阶段` | `section=scene-phase-authoring` | scene / phase / cast / location |
| `控制模块` | `section=control-modules` | router / audit / light cone / beat volume |
| `控制台` | `section=package-wiring-validation` | diagnostics |

## Edit Page Structure

```text
EditPage (server)
  -> listStoryPackageCatalog()
  -> resolveActiveStorylineContext()
  -> loadAuthoringState()
  -> loadStoryPackageManagementWorkspaceView()   [management only]
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
| `StoryPackageCreationPanel.tsx` | inline create state |
| `StorylineWorkspaceRow.tsx` | 单条 storyline row |
| `StorylineDeleteControl.tsx` | 删除确认与禁用态 |

当前 UI 约束：

- 左侧 selector 只显示 package 名称
- `新建故事包` tile 是浅灰底、单层虚线
- beat rail 横向增长、横向滚动，不换行
- phase / beat 标签保留
- 点击 beat 节点展开 `确认 / 取消`

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
| rail nodes | `row.checkpointRail` |

## CSS Areas Worth Knowing

先看：

- `src/app/globals.css`
- `.story-package-management*`
- `.storyline-workspace*`
- `.story-package-selector*`
- `.edit-shell*`
- `.play-*`
