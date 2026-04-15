# Coding Agent Guide

这份文件是给第一次接手本仓库的 coding agent 的任务导引目录。目标是承接 [AGENTS.md](AGENTS.md) 之外的目录地图、任务分流、implementation packet 路由和入口文件说明，让 manager thread 和 subagent 都能先按任务找到最相关的位置；只有在需要更完整结构图时，再继续引导去 `docs/codemaps/*.md`。

## 第一轮必读

按这个顺序读：

1. [AGENTS.md](AGENTS.md)
2. [coding-agent-guide.md](coding-agent-guide.md)
3. [documentation-governance.md](documentation-governance.md)
4. [task_plan.md](task_plan.md)
5. [progress.md](progress.md)
6. [findings.md](findings.md)
7. `docs/codemaps/*.md`

如果任务需要历史背景，再补读：

- [archive/docs/dev-updates/march-dev-update/README.md](archive/docs/dev-updates/march-dev-update/README.md)

如果这里只能回答“先去哪找”，但还不足以解释模块关系，再补读：

- `docs/codemaps/*.md`

## 当前状态

- 归档相关的当前状态与边界，以 `documentation-governance.md` 为唯一入口，不在本文件维护归档清单。
- 当前根目录三件套已重置，作为下一轮活跃工作流的追踪入口。

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

## 高频任务路由：首个 packet 先落哪里

| 症状 / 目标 | 首个 packet 优先拥有的文件 | 默认验证 | 并行提示 |
|---|---|---|---|
| `/play` 页面跳动、ready 文案回退、输入锁、重复点击 | `src/app/play/PlayWorkbench.tsx`, `src/app/components/PlayerInput.tsx`, `src/app/__tests__/play.test.tsx` | `npm test -- src/app/__tests__/play.test.tsx` | 高概率共享同一主文件和测试文件，默认串行实现 |
| runtime continuity、reload/remount、checkpoint/session 视图不一致 | `src/runtime-sessions/views.ts`, `src/runtime-sessions/repository.ts`, `src/app/play/runtime.ts` | `npm test -- src/runtime-sessions/__tests__/views.test.ts` | 可与纯 `/play` UI packet 分开，但先确认是否会反向影响 play runtime tests |
| `/edit` 保存后 reload 不一致、authoring 状态丢失、bridge 写回异常 | `src/authoring/persistence/bridge.ts`, `src/authoring/persistence/package-state.ts`, `src/authoring/sections/` | `npm test -- src/authoring/persistence/__tests__/bridge.test.ts` | 与 `/play` packet 通常可并行；同属 bridge / package-state 的 packet 默认串行 |
| 故事包管理页、storyline rows、active storyline DTO | `src/app/edit/sections/StoryPackageManagementSection.tsx`, `src/app/edit/sections/StorylineWorkspaceRow.tsx`, `src/storylines/workspace-view.ts` | `npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx` | UI row packet 与 repository packet 可拆开，但共享 DTO 时先串行 |
| `blank | text_import` 新建故事包、seed 映射、package scaffold | `src/story-packages/scaffold.ts`, `src/story-packages/import-seed.ts`, `src/app/api/authoring/packages/route.ts` | `npm test -- src/app/api/authoring/packages/route.test.ts` | 可与 `/play`、`/edit` UI packet 并行 |
| `weaver` / `gossipelog` sidecar 逻辑、bootstrap、route | `src/agents/weaver/`, `src/agents/gossipelog/`, `src/app/api/play/gossipelog/`, `src/app/api/play/gossipelog/bootstrap/` | 对应 sidecar / route tests | 先区分 sidecar packet 和 UI packet；不要把 sidecar 行为与 workbench UX 混成一个 packet |

## Implementation Packet Checklist

在写 implementation plan 或 dispatch subagent 前，先把 packet 压到能独立闭环的粒度。一个合格 packet 默认应写清：

- `Packet Goal`：用用户结果描述，而不是用文件名描述。
- `Owned Files`：明确主写文件、配套测试文件，以及默认不该碰的范围。
- `Verification`：至少给出一个 targeted test 命令；如果连 targeted test 都说不清，先不要 dispatch。
- `Parallel?`：显式写 `yes / no`，并说明是否与其他 packet 共享主生产文件或主测试文件。
- `Reviewer Focus`：告诉 reviewer 这轮主要看行为回归、竞态、还是测试缺口。

如果两个 packet 共享同一个主生产文件，或共享同一个主测试文件，默认把它们排成串行 packet，而不是伪并行。

如果一个 packet 无法在自己的 owned files 内完成一轮 TDD 和 review/fix/re-review，先继续拆分，不要直接派 worker。

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

按高频任务可以先用这些 targeted suites 起步：

```bash
npm test -- src/app/__tests__/play.test.tsx
npm test -- src/runtime-sessions/__tests__/views.test.ts
npm test -- src/authoring/persistence/__tests__/bridge.test.ts
npm test -- src/authoring/persistence/__tests__/package-state.test.ts
```

## 少走弯路的建议

- 先判断任务属于 runtime、authoring、storyline、package scaffold，还是 built-in sidecar。
- 先决定首个 implementation packet 属于 UI、runtime continuity、authoring bridge、storyline，还是 sidecar；不要一开始就把多个面混成一个 packet。
- 先读 codemap，再读对应入口文件，不要先钻 archive。
- 如果问题描述是“用户感觉 / UX / 页面跳动 / 交互时机”，优先先落 UI packet，再确认是否真的需要扩到 engine 或 sidecar packet。
- 如果问题描述是“reload / remount / session / continuity”，优先先落 runtime-session 或 package-state packet，不要先改 UI。
- 如果需要历史决策，再回看 `archive/docs/dev-updates/march-dev-update/`。
- 如果文档说“历史上曾这样设计”，但当前代码和测试已经不一样，以当前分支代码与测试为准。
