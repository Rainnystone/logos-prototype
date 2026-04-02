# Task Plan

## Goal

把当前这轮 roadmap 讨论收敛成项目根目录可恢复的持久记录，明确：

- 哪些产品判断已经冻结
- 四个阶段的推荐顺序
- 每个阶段解决什么问题
- 第一阶段先拆成哪些更小的交付节点

这样后续无论是继续 brainstorm、写 spec、写 implementation plan，还是换一个线程继续，都能直接接上，不需要重新讨论大的方向。

## Active Phases

| 阶段 | 状态 | 内容 |
|------|------|------|
| 1 | complete | 恢复现有规划文件与历史上下文 |
| 2 | complete | 纠正核心术语，明确 `coordinator` 不属于 sidecar agent 体系 |
| 3 | complete | 吸收用户提出的 7 个方向并整理成问题空间 |
| 4 | complete | 冻结高层顺序：先模型与表面，再连续性，再故事线层，最后新 agent |
| 5 | complete | 把已批准的路线正式写回规划文件，并拆出第一阶段的交付节点 |
| 6 | complete | 已写出 `Phase 1` implementation plan，并完成独立 plan review loop，当前计划已进入可执行状态 |
| 7 | complete | 已按 task 拆给 subagent 执行并全部收口；`Task 1` 到 `Task 8` 均已完成主线程复核，其中 `Task 7` 额外完成了 sidecar 配置可见性、刷新失败回退、按需加载与 simulation toolset 对齐等质量回修。 |
| 8 | complete | 已完成 `Phase 1` 全量验证、桌面端 UI / UX 复核与规划文件同步；当前仓库已可在此基础上进入下一阶段讨论。 |

## Frozen Product Decisions

### A. 术语边界

- `coordinator-first` 描述的是作者链路架构。
- `coordinator` 是窄协调角色 / 状态机，不算真正 agent。
- 当前仓库里第一个真正落地的 sidecar agent 是 `gossipelog agent`。

### B. 编辑器壳子重组

- 长期方向仍是用“故事包管理”替换当前“控制台”页。
- 但该替换不再强行放进 `Phase 1`，允许与真正的故事包 / 故事线层一起进入后续阶段。
- 诊断与阻塞信息改成贴近当前页面顶部的局部提示，同时辅助区保留对应提示。

### C. Phase 2 / Phase 3 关系

- `Phase 2` 负责建立连续会话、检查点与从某个 beat 重新开跑。
- `Phase 3` 负责把这些检查点组织成像 branch 一样可管理的故事线。
- beat 级检查点既是 continuity 的一部分，也是未来故事线管理的基础。

### C-1. 每阶段 UI/UX 复核

- 每个阶段在收口时，都需要单独复核一次是否需要调整 UI / UX。
- UI / UX 复核不是附属工作，而是每个阶段的正式检查项。
- 如果某个阶段引入了新的对象边界、操作路径或页面职责变化，应默认重新审视对应页面结构与交互。

### C-2. Storage / Repository Substrate 责任边界

- 当后续正式进入故事包 / 故事线 / 多进展管理时，应先补一层很薄的 `Storage / Repository Substrate`。
- 这一层至少负责三件事：
  - 明确 `package definition` 与 `mutable state` 的分层
  - 抽出 `package root / repository seam`
  - 明确 storyline / checkpoint / session / agent state 的仓储模型
- 这属于产品层能力，不应伪装成 simulation toolset 的临时补丁。
- 原因是 simulation 当前只是消费正式 seam 做 cloud-friendly 验证；它不是定义长期存储边界的地方。
- 相关背景与当前 toolset 边界可参考 [simulation-toolset/README.md](simulation-toolset/README.md)。

### D. Storyline v1 范围

- 第一版功能集合完整包含：
  - 新建分支线
  - 切换
  - 删除
  - 重命名
  - 归档
  - 复制
- 这些能力可以分批交付，但不再被当成“以后再说”的附加项。

### E. 故事包管理页心智

- 左侧点选故事包。
- 右侧显示并管理该故事包内部的故事线。
- 右侧默认先展示故事线列表，而不是某一条故事线的详情页。
- 故事线列表条目可依次展开，并通过下拉式动作组进行管理。
- 列表里直接展示：
  - 故事线名
  - 分叉来源
  - 最近更新时间
  - 当前 `phase / beat` 位置
- 当前桌面端优先，不为手机端压缩信息密度。

## Approved Roadmap

### Phase 1: Model & Surface

目标：先把后续所有工作都会依赖的对象边界与页面外壳定稳。

补充边界：

- 这一阶段不强行引入“故事包管理”页面替换。
- 不在这一阶段接入完整故事线管理、检查点绑定或分支操作。

包含：

- `世界` / `角色` 拆页
- 地点结构化与稳定 ID
- scene 可调用地点
- 角色页显示当前关系状态
- agent 管理先做只读外壳
- 页面内诊断提示位置调整

### Phase 2: Session Continuity

目标：让当前故事进度能够被稳定接住，而不是切页就清零。

包含：

- play ↔ edit 切换不清零
- 显式 `Reset Workbench`
- 从上次离开处继续
- 为已接受 beat 建立检查点
- 从某个 beat 检查点重新开跑

### Phase 3: Package & Storyline Layer

目标：把检查点组织成真正可管理的故事线分支体系。

前置基础层：

- 在故事包管理 UI 之前，先冻结 `Storage / Repository Substrate`
- 先把 `package definition` 与 `mutable state` 分开
- 先明确 `package root / repository seam`
- 先明确 storyline / checkpoint / session / agent state 的落点

包含：

- 用“故事包管理”正式替换当前“控制台”页
- 故事包管理页正式接入故事线工作区
- 一个故事包内多条故事线 / 多份进展
- 从某个检查点创建分支线
- 切换、删除、重命名、归档、复制
- session 与 storyline 绑定

### Phase 4: New Agents

目标：在已有容器和落点清晰后，再接入新的导入 agent。

包含：

- 外部前序故事导入 agent
- agent 管理窗口升级为真正管理面
- 导入结果落到现有故事包 / 故事线，而不是污染主样例包

## Phase 1 Delivery Slices

### Slice 1: Editor Shell Reframe

- 把当前混合的“世界与角色”拆成独立页面入口
- 诊断信息从独立页面思路下沉到当前页面顶部，同时辅助区保留对应提示
- 为后续地点对象与角色关系展示预留页面结构

### Slice 2: World Model Upgrade

- 把地点从整块文本提升为结构化对象
- 给地点稳定 ID
- scene 改为引用地点 ID
- NPC / supporting cast 继续留在世界页

### Slice 3: Character Page Split

- 角色从当前混合页拆出独立页面
- 角色页保留关系区的位置与布局
- 第一阶段关系区允许为空态且不报错，等待 `Phase 2` 连续会话接入后再显示非空内容

### Slice 4: Read-only Agent Surface

- 先把 agent 管理做成只读外壳
- 至少能看见当前 agent、其状态文件与相关 skills
- 不在这一阶段引入新 agent 的创建能力

## Phase 1 Question List

### 必须先冻结

1. `世界页` 与 `角色页` 的职责边界
   - 状态：已冻结。
   - 世界页保留：世界文本、规则、文风、地点、NPC / 配角。
   - 角色页承接：主角、核心角色、反派。

2. 地点对象的最小结构
   - 状态：已冻结。
   - `locationId` 由系统自动生成，方式参考角色 ID。
   - 第一版地点明细包含：名称、说明、环境外观描述、氛围描述、人文描述。
   - 交互方式参考当前核心角色：左侧条目，右侧明细编辑。

3. scene 如何引用地点
   - 状态：已冻结。
   - 场景挂载地点的方式参考当前场景挂载角色。
   - 作者可以自行选择是否挂载地点。
   - 如果未挂载地点，不报错，允许叙事引擎根据上下文和其它设定自行发挥。

4. 角色关系在第一阶段的展示深度
   - 状态：已冻结。
   - 展示位置已冻结：角色页沿用当前角色区的布局和构建方式，关系显示落在角色页。
   - 第一阶段正常保留该区域，但允许为空态，不报错。
   - 不为第一阶段补额外桥接、缓存或临时关系读取方案。
   - `Phase 2` 完成后，这个区域应开始显示连续会话带来的关系状态。

5. 只读 agent 外壳的最小可见信息
   - 状态：已冻结方向。
   - 第一版至少显示：agent 名称、职责说明、技能、状态文件、最近状态。

### 可以先带推荐默认值

6. “故事包管理”壳子的第一阶段显示密度
   - 状态：已冻结为暂不进入 `Phase 1`，与真正的故事包阶段一起处理。

7. 页面内诊断提示的落点
   - 状态：已冻结。
   - 当前页顶部显示阻塞和错误。
   - 右侧辅助区保留对应提示。

8. 第一阶段 UI/UX 复核的检查口径
   - 状态：已冻结。
   - 每个切片结束时，固定检查页面职责、操作路径、信息密度、局部提示是否需要调整。

## Preserved Context

- `gossipelog agent` 的 Phase 1 已经完成并合入主线。
- 它会在 accepted beat 之后刷新关系状态，并把动态关系层送入下一轮生成。
- 这次 roadmap 讨论是在 `gossipelog agent` 已经存在的前提上继续扩展，不是假设系统从零开始。

## 2026-04-02 CI Rollout

### Step 1: Main CI

- Status: deferred
- Workflow rollout is intentionally postponed from this release
- Scope:
  - `npm ci`
  - `npm run lint`
  - `npm run type-check`
  - `npm run type-check:simulation`
  - `npm run test:core`
  - `npm run test:ui`
  - `npm run test:simulation`
- Note:
  - `npm run format:check` is intentionally excluded from the first required CI layer because the current repository still has large pre-existing formatting drift.
  - Formatting can return later as a required check after the repository-wide debt is cleaned up, but it should not block adoption when CI is reintroduced.

### Step 2: Simulation Batch Workflow

- Status: pending
- Add a separate GitHub Actions workflow for simulation batch execution
- Trigger recommendation:
  - `workflow_dispatch`
- Artifact recommendation:
  - `run-index.json`
  - scenario JSON reports
  - summary/debug artifacts when present

### Step 3: Scheduled Simulation Runs

- Status: pending
- After the batch workflow becomes stable, add nightly scheduled runs
- Goal:
  - catch long-flow regressions without slowing every PR

### Step 4: Repository-Seam Upgrade

- Status: pending
- Revisit CI targets after product work formally enters `Storage / Repository Substrate`
- Important:
  - repository seam is product-layer work
  - CI should consume that seam after it exists
  - CI should not invent a simulation-only repository model ahead of product architecture

## 2026-04-02 Release Wrap-up

### Scope

- Status: in_progress
- Release target:
  - root `README.md` refresh for GitHub readers
  - `simulation-toolset/` documentation hardening
  - phase 4 simulation infrastructure already implemented in the workspace
- Planned release version:
  - `v1.3.2`

### Verification Gate

- Required before release:
  - `npm run lint`
  - `npm run type-check`
  - `npm run type-check:simulation`
  - `npm test`
  - `npm run test:simulation`
  - `npm run build`

### Workspace Hygiene Note

- Temporary `.tmp-simulation-*` directories under `src/story-packages/` are run artifacts and must stay out of the release commit.
- If local cleanup is blocked by shell policy, the release can still proceed by staging only intended files and excluding those temporary directories.
