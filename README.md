# LOGOS Narrative Editor

LOGOS Narrative Editor 是一个面向互动小说、文字冒险和文字 RPG 创作的叙事编辑与运行原型。它把世界设定、角色、场景阶段、控制模块、运行时连续性、故事线分支和故事包管理拆成可编辑、可验证、可运行的结构，而不是把整个创作过程压成一段大 Prompt。

当前仓库已经完成 `Phase 1` 到 `Phase 3` 的主线交付。现在的产品形态可以简单理解成三部分：

- `Title Page`：统一入口和运行配置
- `Play Workbench`：运行叙事引擎
- `Narrative Editor`：管理故事包、故事线和作者侧的结构化内容

## 页面一览

### 顶层页面

| 路由 | 页面 | 作用 |
|---|---|---|
| `/` | Title Page | 配置 provider，并进入 `Play Workbench` 或 `Narrative Editor` |
| `/play` | Play Workbench | 按当前 story package 和 storyline 运行故事 |
| `/edit` | Narrative Editor | 作者工作区；默认进入 `故事包管理` |

### Narrative Editor 可见页签

| 页签 | 作用 |
|---|---|
| `故事包管理` | 默认第一页；选择 story package、管理 storyline、新建包、删除 storyline |
| `世界` | 编辑世界基底、规则、地点等 authoring 内容 |
| `角色` | 编辑角色与关系相关的作者内容 |
| `场景与阶段` | 编辑 scene、phase、出场角色与地点引用 |
| `控制模块` | 编辑 router、audit、light cone、beat volume 等控制层 |
| `控制台` | diagnostics 与 wiring validation |

## 安装

### 环境要求

- Node.js 18+
- npm
- 可选：任一受支持模型供应商的 API Key

### 启动

```bash
npm install
npm run dev
```

默认地址：

- Title Page：`http://localhost:3000`
- Play Workbench：`http://localhost:3000/play`
- Narrative Editor：`http://localhost:3000/edit`

### 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm test
npm run test:core
npm run test:ui
npm run test:e2e
npm run type-check:simulation
npm run test:simulation
```

## 怎么用

### 1. 从标题页开始

打开首页后，先在 `Provider Setup` 中配置运行时 provider。保存后，这份配置会被标题页和 `Play Workbench` 共用。

然后可以直接进入：

- `Play Workbench`
- `Narrative Editor`

### 2. 在故事包管理里工作

`Narrative Editor` 默认进入 `故事包管理`。这里是 `Phase 3` 之后的主工作区：

- 左侧选择 story package
- 右侧查看和管理该包下的 storyline
- 从当前线派生新线
- 从 beat rail 上的 checkpoint 创建新 storyline
- 安全删除 storyline
- 直接新建本地 story package

story package 当前就是 `src/story-packages/<packageName>/` 下的一套目录与文件。新建时系统会直接创建显式 `Phase 3` scaffold，包括 baseline YAML、`storyline-repository.json`、`runtime-sessions.json` 和默认 variant workspace。

### 3. 编辑 authoring 内容

`世界`、`角色`、`场景与阶段`、`控制模块` 四块 authoring 内容都通过结构化保存链路落盘：

`Page Draft -> Save Request -> Bridge -> Validation -> Writeback -> Reload`

页面不会直接写 YAML，真正的文件写入由 deterministic bridge 负责。

### 4. 用 Play Workbench 跑故事

`Play Workbench` 会沿当前 package 和 active storyline 运行。它负责：

- 推进 Scene / Phase / Beat
- 组装 prompt 并调用 adapter
- 保存 accepted beat checkpoints
- 维护 runtime continuity
- 在 accepted beat 之后刷新关系层

编辑器和运行台现在已经通过 storyline / checkpoint / session 这一层接起来了。

## 文件结构

```text
src/
  app/                    Next.js 页面、组件和 API routes
  authoring/              编辑器保存、验证、bridge、section 逻辑
  engine/                 运行时引擎与模块链
  runtime-sessions/       checkpoint / session continuity substrate
  storylines/             storyline repository、workspace view、substrate
  story-packages/         本地 story package、scaffold、fixtures
  types/                  共享 Zod schema 与 TypeScript 合同

docs/
  codemaps/               当前代码地图
  superpowers/specs/      当前正式设计规格
  superpowers/plans/      当前正式 implementation plans
  superpowers/phase-3/    Phase 3 工作记忆与恢复入口

simulation-toolset/       cloud-friendly simulation / verification workspace
archive/                  历史规格与归档记录
```

## 进一步阅读

- 根目录状态索引：
  - [task_plan.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/task_plan.md)
  - [progress.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/progress.md)
  - [findings.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/findings.md)
- 代码地图：
  - [architecture.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/codemaps/architecture.md)
  - [frontend.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/codemaps/frontend.md)
  - [backend.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/codemaps/backend.md)
  - [data.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/codemaps/data.md)

## 给 Coding Agent

如果你是第一次接手这个仓库，不要直接从代码里盲搜开始。先看 [coding-agent-guide.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/coding-agent-guide.md)。那里会告诉你应该先读哪些文件、不同任务该加载哪一层上下文、当前项目处于什么进度，以及怎样最快找到 runtime、authoring、storyline substrate 和 story package scaffold 的关键入口。
