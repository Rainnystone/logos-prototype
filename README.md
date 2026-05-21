# LOGOS Narrative Editor

LOGOS Narrative Editor 是一个面向互动小说、文字冒险和文字 RPG 创作的叙事编辑与运行环境。它把故事创作拆成可编辑、可验证、可运行的结构化层，而不是把世界观、角色、剧情推进和运行状态全部压成一段大 Prompt。

当前仓库的产品形态可以概括成三部分：

- `Title Page`：统一入口和 provider 配置
- `Play Workbench`：运行叙事引擎与连续性状态
- `Narrative Editor`：管理故事包、storyline、authoring 内容和 built-in agents

如果你想先理解当前代码结构，再决定从哪里动手，建议补读：

- [coding-agent-guide.md](coding-agent-guide.md)
- `docs/codemaps/*.md`

## 安装

### 获取项目

你可以用两种方式拿到这个项目：

1. 直接从 GitHub 克隆仓库
2. 到 [Releases](https://github.com/Rainnystone/logos-prototype/releases) 页面下载源码包或发布包

### 环境要求

- Node.js 18+
- npm
- 可选：任一受支持模型供应商的 API Key

### 本地启动

```bash
git clone https://github.com/Rainnystone/logos-prototype.git
cd logos-prototype
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

## 核心功能

### 1. Story Package 与 Storyline 管理

- 在 `故事包管理` 中选择和切换 story package
- 在同一个 package 里管理多条 storyline
- 从当前线继续派生、从 checkpoint 分叉、以及安全删除 storyline
- 以 `blank` 或 `text import` 两种方式创建新 story package

### 2. 结构化 Authoring

- `世界`：编辑世界基底、规则、地点、NPC 等内容
- `角色`：编辑主角、核心角色、反派与关系相关作者内容
- `场景与阶段`：编辑 scene、phase、出场角色与地点引用
- `控制模块`：编辑 router、audit、light cone、beat volume 等控制层

所有 authoring 写入都走结构化保存链路：

`Page Draft -> Save Request -> Bridge -> Validation -> Writeback -> Reload`

页面不会直接写 YAML，真正的文件写入由 deterministic bridge 负责。

### 3. Play Workbench

- 按当前 package 和 active storyline 运行故事
- 推进 Scene / Phase / Beat
- 组装 prompt 并调用 adapter
- 保存 accepted beat checkpoints
- 维护 runtime continuity
- 在需要时刷新或补齐 sidecar 状态

### 4. Built-in Agents

当前编辑器已经有 built-in sidecar agent 层：

- `Weaver`：把作者粘贴的文本整理成可导入的新故事包
- `Gossipe Log`：维护和追踪角色关系状态

在 `agent 管理` 页面里，你可以看到这些 built-in agents 的职责、技能说明和当前状态。它们不是可插拔 extension；当前产品里它们是 built-in、always-on 的一部分。

## 怎么用

### 1. 先从标题页配置 provider

打开首页后，先在 `Provider Setup` 中配置运行时 provider。保存后，这份配置会被标题页、文本导入流程和 `Play Workbench` 共用。

然后可以继续进入：

- `Play Workbench`
- `Narrative Editor`

### 2. 在故事包管理里开始工作

`Narrative Editor` 默认进入 `故事包管理`。这里是当前作者主工作区：

- 左侧选择 story package
- 右侧查看和管理该包下的 storyline
- 创建空白故事包
- 通过文本导入创建新故事包
- 从当前线或某个 checkpoint 继续分叉
- 安全删除 storyline

story package 当前对应 `src/story-packages/<packageName>/` 下的一套目录与文件。新建时系统会创建显式 scaffold，包括 baseline YAML、`storyline-repository.json`、`runtime-sessions.json`、variant workspace，以及 built-in sidecar 的基础状态文件。

### 3. 用文本导入创建故事包

如果你已经有一段作者文本，不想从空白包开始：

1. 进入 `故事包管理`
2. 选择 `文本导入`
3. 粘贴原始文本
4. 提交后由 `Weaver` 解析、建包并补齐导入摘要

这条流程不会让浏览器直接写文件，真正的落盘仍然复用服务端 package creation scaffold。

### 4. 编辑结构化内容

当 story package 创建完成后，可以继续进入：

- `世界`
- `角色`
- `场景与阶段`
- `控制模块`

这些页面都基于当前 active storyline 读取和保存，并通过 bridge 做验证与写回。

### 5. 运行故事

进入 `Play Workbench` 后，系统会沿当前 package 和 active storyline 运行。你可以：

- 查看当前 Scene / Phase / Beat
- 输入玩家动作
- 查看 accepted beat 历史
- 使用 continuity 恢复和继续当前工作线

## 项目结构

```text
src/
  app/                    Next.js 页面、组件和 API routes
  agents/                 built-in sidecars、registry、reference loading
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

archive/
  docs/dev-updates/       已封板的大更新档案
  docs/narrative-editor-redesign/
                          editor 架构重构主记录
  vendor/LOGOS-SPEC/      历史规格快照

simulation-toolset/       cloud-friendly simulation / verification workspace
```

## 进一步阅读

- 当前外部追踪入口：
  - [task_plan.md](task_plan.md)
  - [progress.md](progress.md)
  - [findings.md](findings.md)
- 代码地图：
  - [architecture.md](docs/codemaps/architecture.md)
  - [frontend.md](docs/codemaps/frontend.md)
  - [backend.md](docs/codemaps/backend.md)
  - [data.md](docs/codemaps/data.md)
- 历史封板档案：
  - [archive/docs/dev-updates/march-dev-update/README.md](archive/docs/dev-updates/march-dev-update/README.md)

## 给 Coding Agent

如果你是第一次接手这个仓库，不要直接从代码里盲搜开始。

推荐顺序是：

1. [AGENTS.md](AGENTS.md)
2. [coding-agent-guide.md](coding-agent-guide.md)
3. [task_plan.md](task_plan.md)
4. [progress.md](progress.md)
5. [findings.md](findings.md)
6. `docs/codemaps/*.md`

[coding-agent-guide.md](coding-agent-guide.md) 现在是“任务导引目录”：

- 它先告诉你不同任务该去哪里找入口
- 当 guide 只能回答“先去哪找”但还不够解释模块关系时，再去读 `docs/codemaps/*.md`
- 如果任务需要历史背景，再进入 `archive/docs/dev-updates/march-dev-update/`
