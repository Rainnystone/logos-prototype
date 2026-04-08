# Coding Agent Guide

这份文件是给第一次接手本仓库的 coding agent 的任务导引目录。目标是承接 [AGENTS.md](AGENTS.md) 之外的目录地图、任务分流和入口文件说明，让 agent 先按任务找到最相关的位置；只有在需要更完整结构图时，再继续引导去 `docs/codemaps/*.md`。

## 第一轮必读

按这个顺序读：

1. [AGENTS.md](AGENTS.md)
2. [coding-agent-guide.md](coding-agent-guide.md)
3. [task_plan.md](task_plan.md)
4. [progress.md](progress.md)
5. [findings.md](findings.md)
6. `docs/codemaps/*.md`

如果任务需要历史背景，再补读：

- [archive/docs/dev-updates/march-dev-update/README.md](archive/docs/dev-updates/march-dev-update/README.md)

如果这里只能回答“先去哪找”，但还不足以解释模块关系，再补读：

- `docs/codemaps/*.md`

## 当前状态

现在不要再把 `March Dev Update Phase 1-4` 当成活跃执行入口。它们都已经完成并整体归档到了：

- `archive/docs/dev-updates/march-dev-update/`

当前根目录三件套已经重置，用于下一轮大更新的仓库级外部追踪。

## 任务分流：不同问题先看哪里

| 任务类型 | 先看哪里 |
|---|---|
| `/play` 行为、checkpoint、session | `src/app/play/`, `src/engine/`, `src/runtime-sessions/` |
| `/edit` 默认入口、页签、页面装配 | `src/app/edit/page.tsx`, `src/app/edit/EditWorkbench.tsx`, `src/app/edit/shared/SectionTabs.tsx` |
| 故事包管理页与 storyline rows | `src/app/edit/sections/StoryPackageManagementSection.tsx`, `StorylineWorkspaceRow.tsx` |
| `blank | text_import` 新建故事包 | `src/story-packages/scaffold.ts`, `src/story-packages/import-seed.ts`, `src/app/api/authoring/packages/route.ts` |
| agent 管理页与 built-in sidecars | `src/app/edit/sections/PackageWiringValidationSection.tsx`, `src/agents/agent-surface.ts`, `src/agents/registry.ts` |
| `weaver` / `gossipelog` sidecar 行为 | `src/agents/weaver/`, `src/agents/gossipelog/` |
| authoring 保存与验证 | `src/authoring/persistence/bridge.ts`, `src/authoring/sections/` |
| 当前类型合同 | `src/types/` |

## 快速文件地图

```text
AGENTS.md                            项目级执行纪律
README.md                            给人看的仓库概览
coding-agent-guide.md                给 agent 的快速导航

task_plan.md / progress.md / findings.md
  当前仓库级外部追踪入口

archive/docs/dev-updates/march-dev-update/
  March Dev Update 的完整封板档案

docs/codemaps/
  architecture.md                    全局架构
  frontend.md                        页面、组件、UI 入口
  backend.md                         API routes、服务端边界
  data.md                            关键类型与文件落点

src/app/
  page.tsx                           Title Page
  play/                              Play Workbench
  edit/                              Narrative Editor
  api/                               Next.js routes

src/authoring/
  persistence/                       bridge、repository、reload、package-state
  sections/                          世界/角色/场景/控制模块的 draft/render

src/agents/
  registry.ts                        built-in sidecar registry
  reference-loader.ts                shared reference loading
  gossipelog/                        关系 sidecar
  weaver/                            文本导入 sidecar

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
  workspace-view.ts                  故事包管理页 DTO

src/story-packages/
  sample-scene/                      样例故事包
  scaffold.ts                        新建 package scaffold
  import-seed.ts                     text-import seed 映射
  package-slug.ts                    跨平台安全包名
```

## 搜索建议

优先用 `rg`，不要从文件树盲翻。

```bash
rg "story-package-management|package-wiring-validation" src
rg "text_import|weaverImport|import-summary" src
rg "gossipelog|bootstrap" src
rg "resolveActiveStorylineContext" src
rg "createStoryPackageScaffold|applyImportSeed" src
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
| sidecar prompt context | reference 先 resolve，再进入统一 prompt assembly |

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

- 先判断任务属于 runtime、authoring、storyline、package scaffold，还是 built-in sidecar。
- 先读 codemap，再读对应入口文件，不要先钻 archive。
- 如果需要历史决策，再回看 `archive/docs/dev-updates/march-dev-update/`。
- 如果文档说“历史上曾这样设计”，但当前代码和测试已经不一样，以当前分支代码与测试为准。
