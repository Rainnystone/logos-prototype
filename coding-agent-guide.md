# Coding Agent Guide

这份文件是给第一次接手本仓库的 coding agent 的快速导航。目标是先看对文件，再动手。

## 第一轮必读

按这个顺序读：

1. [AGENTS.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/AGENTS.md)
2. [task_plan.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/task_plan.md)
3. [progress.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/progress.md)
4. [findings.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/findings.md)
5. [docs/superpowers/specs/2026-04-06-phase-3-master-design.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/specs/2026-04-06-phase-3-master-design.md)
6. `docs/codemaps/*.md`

如果任务明确落在 `Phase 3`，再补读：

- [docs/superpowers/phase-3/task_plan.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/phase-3/task_plan.md)
- [docs/superpowers/phase-3/progress.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/phase-3/progress.md)
- [docs/superpowers/phase-3/findings.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/phase-3/findings.md)

## 当前状态

现在不要再把 `Phase 3` 当成“待实现 spec”。`branch/narrative-editor` 已经包含：

- `Part 1`：storyline substrate
- `Part 2`：`故事包管理` 工作区
- `Part 3`：safe delete storyline + local new story package

也就是说，当前主线已经有：

- `storyline-repository.json`
- `runtime-sessions.json`
- `variants/<variantId>/...`
- `故事包管理` 默认入口
- package creation scaffold

## 任务分流：不同问题先看哪里

| 任务类型 | 先看哪里 |
|---|---|
| `/play` 行为、checkpoint、session | `src/app/play/`, `src/engine/`, `src/runtime-sessions/` |
| `/edit` 默认入口、页签、页面装配 | `src/app/edit/page.tsx`, `src/app/edit/EditWorkbench.tsx`, `src/app/edit/shared/SectionTabs.tsx` |
| 故事包管理页与 storyline rows | `src/app/edit/sections/StoryPackageManagementSection.tsx`, `StorylineWorkspaceRow.tsx` |
| create / branch / switch / delete storyline | `src/storylines/substrate.ts`, `src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts` |
| 新建 story package | `src/story-packages/scaffold.ts`, `src/story-packages/package-slug.ts`, `src/app/api/authoring/packages/route.ts` |
| authoring 保存与验证 | `src/authoring/persistence/bridge.ts`, `src/authoring/sections/` |
| 当前类型合同 | `src/types/` |

## 快速文件地图

```text
AGENTS.md                            项目级执行纪律
README.md                            给人看的仓库概览
coding-agent-guide.md                给 agent 的快速导航

task_plan.md / progress.md / findings.md
  仓库级恢复入口

docs/codemaps/
  architecture.md                    全局架构
  frontend.md                        页面、组件、UI 入口
  backend.md                         API routes、服务端边界
  data.md                            关键类型与文件落点

docs/superpowers/specs/
  2026-04-06-phase-3-master-design.md
  ...part-1...
  ...part-2...
  ...part-3...

src/app/
  page.tsx                           Title Page
  play/                              Play Workbench
  edit/                              Narrative Editor
  api/                               Next.js routes

src/authoring/
  persistence/                       bridge、repository、reload、package-state
  sections/                          世界/角色/场景/控制模块的 draft/render

src/engine/
  orchestrator.ts                    runtime 主循环
  modules/                           router、audit、prompt assembler 等模块
  api-adapter/                       provider 适配

src/runtime-sessions/
  repository.ts                      runtime-sessions.json 真相层
  views.ts                           bounded continuity DTO

src/storylines/
  substrate.ts                       storyline server primitives
  repository.ts                      storyline-repository.json
  workspace-view.ts                  `故事包管理` 页 DTO

src/story-packages/
  sample-scene/                      样例故事包
  scaffold.ts                        新建 package scaffold
  package-slug.ts                    跨平台安全包名
```

## 搜索建议

优先用 `rg`，不要从文件树盲翻。

```bash
rg "story-package-management" src
rg "create_from_source|branch_from_checkpoint|delete_storyline" src
rg "resolveActiveStorylineContext" src
rg "createStoryPackageScaffold|buildStoryPackageSlug" src
rg "runtime-sessions.json|storyline-repository.json" src
```

## 关键架构边界

| 边界 | 规则 |
|---|---|
| 故事内容 vs 系统逻辑 | 故事文本与设定留在 `story-packages/`，不要写进 `.ts` |
| UI vs file write | UI 不能直接写 YAML；authoring 保存必须走 bridge |
| `checkpoint` | package-scoped immutable node |
| `storyline` | 作者工作线，不拥有 checkpoint |
| `variant` | materialized workspace，不是 overlay |
| package creation | server-owned scaffold，不是浏览器写文件 |

## 默认验证

如果改的是 package / storyline / UI 主链，默认至少跑：

```bash
npm test
npm run build
```

如果碰到 simulation 或 continuity 边界，再补：

```bash
npm run type-check:simulation
npm run test:simulation
```

## 少走弯路的建议

- 先判断任务属于 runtime、authoring、storyline、还是 package scaffold。
- 只加载和任务直接相关的 spec、codemap 和入口文件。
- 先看测试，再改实现，尤其是：
  - `src/storylines/__tests__/`
  - `src/story-packages/__tests__/`
  - `src/app/edit/**/__tests__/`
- 如果文档说“待实现”但代码和测试已经存在，先以主线代码和根目录 `progress.md` 为准，再修正文档。
