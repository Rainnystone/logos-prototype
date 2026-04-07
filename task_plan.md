# Task Plan

## Goal

维护本仓库跨 phase 的总控索引，并把当前主工作流稳定指向 `Phase 3` 的专属规划文件。

- 根目录 `task_plan.md`、`findings.md`、`progress.md` 继续作为跨 phase 恢复入口。
- `Phase 3` 的详细规划、发现与执行日志以 `docs/superpowers/phase-3/` 下的专属文档为准。
- 正式 design spec 与 implementation plan 仍然写在 `docs/superpowers/specs/` 与 `docs/superpowers/plans/`。

## Current Active Track

- `Phase 1` 已完成并验证。
- `Phase 2` 已完成实现、验证与手验，当前作为已冻结基础层保留。
- 当前活跃主线切换为 `Phase 3: Package & Storyline Layer`。
- `Phase 3 Part 1` 已完成实现、验证、浏览器手验与 PR 提交。
- `Phase 3 Part 2` 已完成实现、验证、独立 review、commit、push 与 PR 提交。
- `Phase 3 Part 3` spec 与 implementation plan 都已完成独立 review，当前等待执行方式选择。
- `Phase 3` 总 design spec 已同步吸收 `Part 2` 的最终 UI / UX 口径，避免后续 `Part 3` 再沿用旧的 workspace 语义。
- `Phase 3` 主工作记忆入口：
  - [docs/superpowers/phase-3/README.md](docs/superpowers/phase-3/README.md)
  - [docs/superpowers/phase-3/task_plan.md](docs/superpowers/phase-3/task_plan.md)
  - [docs/superpowers/phase-3/findings.md](docs/superpowers/phase-3/findings.md)
  - [docs/superpowers/phase-3/progress.md](docs/superpowers/phase-3/progress.md)

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
| 9 | complete | 已完成 `Phase 1` 的地点收尾回修：样例地点已从旧长文彻底转译为正式地点，场景地点选择器已与场景阵容对齐，并且 `locationIds` 已真实进入运行时组装链。 |
| 10 | complete | 已冻结 `Phase 2` 的 runtime continuity substrate、checkpoint 边界与后续 `Phase 3` 可承接的落点，并完成正式 spec 与 implementation plan 的独立 review loop。 |
| 11 | complete | 已完成 `Phase 2` 实现、验证、手验与 reopen fix 收口；该阶段当前作为 `Phase 3` 的冻结底座保留。 |
| 12 | complete | 已完成 `Phase 3 Part 1` 的总 spec、part spec、implementation plan、代码实现、最终验证与 PR 提交。 |
| 13 | complete | `Phase 3 Part 2` 已完成实现、验证、mock 验收与独立 review。 |
| 14 | complete | `Phase 3 Part 3` spec 已完成、通过独立 review，并进入正式基线。 |
| 15 | complete | `Phase 3 Part 3` implementation plan 已完成并通过独立 plan review。 |

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

### C-3. Phase 2 Runtime Continuity Substrate

- `LOGOS` 继续保持故事内容与系统机制解耦。
- `story package definition` 仍然是作者定义态与 canonical baseline；`Phase 2` 的连续会话数据属于独立的 mutable runtime state。
- 这类 runtime state 物理上放在 story package 目录内，逻辑上不属于 `StoryPackage` 定义本体。
- 当前推荐独立使用 JSON 文件承接 package-scoped runtime sessions / checkpoints，而不是并入 story definition YAML。
- `Phase 2` 不把 continuity 塞进 `authoring-state.json`、`gossipelog` 关系文件或 `StoryPackage` 定义本体。
- `Phase 2` 的自然接入点在 `play runtime / orchestrator` 的 accepted beat 提交流程，而不是 authoring bridge。
- `PromptObject` 与 `BeatHistory` 都是可派生层：
  - `PromptObject` 是 generation 入口的派生物，不是事实源。
  - `BeatHistory` 是展示层读模型，不是持久真相。
- accepted transcript 以 full text 保存：
  - 至少保留 accepted player input 全文
  - 以及 accepted beat 正文全文
  - 以便继续兼容当前 `prompt assembler -> precedingBeats/historyWindow -> memory placeholder` 的运行链路
- checkpoint 主键使用稳定的 opaque id，不把 storyline 序号、UI 标签或人类可读路径编码进主键。
- `Phase 3` 的 storyline 应作为“指向 checkpoint 的 ref / pointer”，而不是复制整段历史。
- `Phase 2` 虽然不要求先交付完整 rollback / fallback UI，但交付后的 substrate 必须已经支持：
  - 从某个已接受 beat 的 checkpoint 重新组装那一轮 generation 入口
  - 为后续 `Phase 3` 的分支创建提供稳定锚点
- 当前规划默认至少按“页面刷新后仍可恢复”来设计 durability，同时保持数据模型可扩展到更长期的恢复，而不重做底层。
- `Phase 2` 的 session 模型采用：
  - schema-level plural
  - behavior-level singular
  - 即 package 仓储层允许 `sessions + activeSessionId`，但本阶段产品行为只承认 1 条默认 active session
- `Phase 2` 的 checkpoint 写入策略采用：
  - 每个 accepted beat 写 full checkpoint
  - 本阶段不引入 event/delta 回放模型
- `Phase 2` 默认保留旧 session 与旧 checkpoint：
  - 不做自动滚动删除
  - 不在 reset 时 destructive clear 历史
- `Reset Workbench` 的产品语义采用：
  - 当前线回到 opening hook 起点
  - reset 后回到尚未点击 `Start Round` 的初始等待态
  - reset 不等于回到任意 checkpoint
  - 回到特定 checkpoint / beat 属于后续 checkpoint-driven 能力

### D. Storyline v1 范围

- 第一版功能集合完整包含：
  - 新建分支线
  - 切换
  - 删除
  - 重命名
- `Part 2` 最终收口后，这组范围已进一步收窄：
  - `重命名` 已在 `Part 2` 提前落地
  - `复制` 的主要作者价值已由 `create from source` 覆盖
  - `归档` 因缺少明确作者价值，当前已从 `Phase 3` 主线移出
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

- 独立于 package definition 的 runtime session / checkpoint substrate
- play ↔ edit 切换不清零
- 页面刷新后仍可恢复当前可续跑 session
- 显式 `Reset Workbench`
- 从上次离开处继续
- 为每个 accepted beat 建立正式 checkpoint
- checkpoint 至少保存恢复续跑所需的最小 runtime 事实，而不是整份 package 拷贝
- 为下一阶段的“从某个 checkpoint 重新开跑 / 分叉故事线”提供正式底座

不包含：

- storyline 名称、归档、复制、切换等管理 UI
- 以人类可读标签为中心的 checkpoint 命名体系
- 把 continuity 做成浏览器内存或展示层专用缓存

### Phase 3: Package & Storyline Layer

目标：把检查点组织成真正可管理的故事线分支体系。

前置基础层：

- 在故事包管理 UI 之前，先冻结 `Storage / Repository Substrate`
- 先把 `package definition` 与 `mutable state` 分开
- 先明确 `package root / repository seam`
- 先明确 storyline / checkpoint / session / agent state 的落点
- 直接复用 `Phase 2` 已交付的 package-scoped checkpoint node substrate，而不是重造第二套历史模型

包含：

- 用“故事包管理”正式替换当前“控制台”页
- 故事包管理页正式接入故事线工作区
- 一个故事包内多条故事线 / 多份进展
- 从某个检查点创建分支线
- 切换、删除、重命名
- session 与 storyline 绑定

推荐实现心智：

- checkpoint 是 package-scoped immutable node
- storyline 是指向 checkpoint 的 ref / pointer layer
- 一个 checkpoint 可以作为多条 storyline 的共同祖先
- 创建分支线优先表现为“新建一个指向既有 checkpoint 的 storyline ref”，而不是复制整段历史
- storyline 的人类可读名称、归档状态、复制语义属于管理层，不属于 checkpoint 主键设计
- 经过 `Part 2` 收口后，`归档` 已从当前 `Phase 3` 主线移出，`复制` 也不再作为独立目标保留；当前 `Part 3` 主线收敛为 `safe delete + local new story package scaffolding + destructive UX + final verification`

优先顺序：

- 先冻结 storyline / checkpoint / session 三者的对象边界
- 再补 story package 内多 storyline 的 mutable state 仓储模型
- 再接 story package 管理页与 storyline 工作区 UI
- 最后再补完整的管理动作与更丰富的展示信息

### Phase 4: New Agents

目标：在已有容器和落点清晰后，再接入新的导入 agent。

包含：

- 外部前序故事导入 agent
- agent 管理窗口升级为真正管理面
- 导入结果落到现有故事包 / 故事线，而不是污染主样例包

## Current Phase 2 Planning Target

- 先写出 `Phase 2` 正式 design spec，而不是直接实现。
- spec 需要先冻结以下对象边界：
  - runtime session 文件的落点与 JSON 结构
  - checkpoint 的最小字段集合
  - accepted beat 与 checkpoint 的映射关系
  - accepted transcript 的全文持久化语义
  - `Reset Workbench` 的精确定义
  - continuity-backed 关系区如何读取当前 session 状态
  - sessions / activeSessionId 的仓储结构
- spec 的写作顺序当前也已补充冻结：
  - 先写对象模型与文件合同
  - 再写执行时写入点、恢复语义与 `Reset Workbench` 语义
- 这里的“先 / 再”只是文档展开顺序，不代表重要性排序：
  - 对象模型与文件合同
  - 执行时写入点、恢复语义与 `Reset Workbench` 语义
  - 两部分同等重要，缺一不可
- implementation plan 需要明确：
  - 运行时写入点
  - 页面恢复与显式重置入口
  - 测试与验证路径
  - 与 `Phase 3` storyline ref 模型的前后兼容关系

## Frozen Phase 2 Spec Decisions

- runtime session 文件当前冻结为 package root 下独立的 `runtime-sessions.json`
- `runtime-sessions.json` 采用带 `version` 的 JSON 顶层结构
- 物理落点上，`runtime-sessions.json` 与 `authoring-state.json`、`agents/` 并列放在 story package root；逻辑上不属于 `StoryPackage` 定义本体
- package 级仓储结构采用：
  - `activeSessionId`
  - `sessionsById`
- session 内部采用：
  - `checkpointsById`
  - `orderedCheckpointIds`
  - 以及当前 head / active checkpoint 指针
- gossipelog 相关状态当前只保存 `lastStableRelationshipLayer`，不额外引入 refresh status 字段
- post-accept gossipelog refresh 的结果必须绑定到发起它的 `sessionId + checkpointId`
- 该结果可以定向 finalize 它绑定的 checkpoint `lastStableRelationshipLayer`
- 但只有当绑定目标仍是当前 active session 的 active/head checkpoint 时，才允许同步覆盖 session-level `lastStableRelationshipLayer` mirror
- reset 的底层机制冻结为：
  - 保留旧 session 历史
  - 创建新的 active session 实例
  - 但产品语义仍然是“当前线 reset”
- continuity-backed 关系区通过服务端聚合出的 section-safe view 读取当前 active session
- `/play` 与 `/edit` 默认永远优先当前 active session，不在本阶段引入 query 覆盖
- `Phase 2` 不新增面向作者的 active session / checkpoint diagnostics UI
- active session 恢复时，relationship layer 恢复优先级冻结为：
  - 先读 session-level `lastStableRelationshipLayer`
  - 否则回退到 active checkpoint 内的 `lastStableRelationshipLayer`
  - 再否则回退到 empty relationship layer

## Phase 2 Spec Status

- 正式 spec 已写出：
  - `docs/superpowers/specs/2026-04-03-phase-2-session-continuity-design.md`
- 已完成多轮 spec review loop，当前状态：
  - `Approved`
- 正式 implementation plan 已写出：
  - `docs/superpowers/plans/2026-04-03-phase-2-session-continuity-implementation.md`
- 已完成多轮 implementation plan review loop，当前状态：
  - `Approved`
- 当前下一步应进入：
  - 在隔离 worktree 中按已批准 plan 完成实现
  - 完成最终验证与人工确认后的后续集成动作
- 当前执行分支最新状态：
  - 已在 `codex/phase2-session-continuity` worktree 中开始实施
  - `Task 1` 到 `Task 7` 已全部完成
  - config-save continuity reopen fix 链已收口，reviewer 最终结论为 `Approved`
  - fresh 最终验证已完成：
    - `npm run lint`
    - `npm run type-check`
    - `npm test`
    - `npm run build`
    - `/play -> refresh restore -> /edit continuity -> reset -> /edit empty state` 手验
  - `Phase 2` 当前阶段状态：
    - 代码实现完成
    - 验证完成
    - 等待人工确认后决定后续集成方式

## Current Phase 3 Recommendation

- `Phase 3` 不建议从 UI 先行，而建议从对象层与仓储层先行。
- 下一阶段最关键的 first-class objects 应明确为：
  - `checkpoint`：包内不可变节点
  - `storyline`：指向 checkpoint 的可移动 ref
  - `session`：当前活动工作线，与 storyline head 发生绑定
- 还要补上一个下一阶段必须正面定义的对象边界：
  - 当前 authoring 保存仍然是 `story package` 级全局定义
  - 如果要支持“比较不同设置下的故事走向”，`worldbase / cast / scene-phase / control modules` 不能永远只跟唯一 package baseline 走
  - 下一阶段需要引入 `storyline` 可绑定的 authoring variant / revision 语义
- `checkpointId` 继续保持 package-scoped opaque id，不把 `storylineId` 编入主键。
- 多 storyline 的区分度来自独立的 `storylineId` 与它的 `headCheckpointId`，而不是来自 checkpoint 主键字符串。
- 这里的推荐绑定粒度明确为：
  - 不绑定到 `beat`
  - 不继续停留在“只绑定整个 story package”
  - 而是绑定到 `storyline`
- `Phase 3` 的 branching 推荐按以下顺序落地：
  - 先支持从既有 checkpoint 创建 storyline ref
  - 再支持 storyline 级 authoring variant / revision 绑定
  - 再支持切换 storyline head
  - 再支持重命名、归档、复制、删除等管理动作
- 非目标也应提前冻结：
  - 不把完整 authoring 定义快照直接塞进每个 checkpoint
  - checkpoint 继续保存 runtime continuity truth
  - authoring variant 作为 storyline 侧另一层引用或 overlay 管理
- `Phase 3` 的 UI 应消费前面已经冻结好的 substrate，而不是反过来驱动对象边界。

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

## 2026-04-03 Phase 2 Execution

### Task 1: Runtime session repository substrate

- Status: completed
- Final commit:
  - `3064f70` `fix: harden runtime session repository writes`
- Gate result:
  - spec compliance review passed
  - code quality review passed

### Task 2: Bounded continuity views for `/play` and `/edit`

- Status: completed
- Final commit:
  - `18352e2` `feat: add bounded runtime session views`
- Scope landed:
  - `loadPlayRuntimeSessionView()` 与 `loadEditRuntimeContinuityView()`
  - `loadAuthoringState(..., { includeRuntimeContinuity: true })`
  - `/play` 与 `/edit` server-page continuity loader 接入
  - bounded continuity test coverage
- Gate result:
  - spec compliance review passed
  - code quality review after reassessment confirmed the two initial findings were non-blocking because:
    - play restore wiring is owned by implementation plan `Task 5`
    - current `views.ts` restore composition matches formal spec section 9.2

### Task 3: Runtime-session browser/server bridge

- Status: completed
- Final commits:
  - `e6b3a91` `feat: add runtime session browser bridge`
  - `59ced62` `fix: classify runtime session bridge errors`
- Scope landed:
  - 新增 `/api/play/packages/[packageName]/runtime-session` route 与对应测试
  - 新增 browser runtime-session client，统一 accepted-beat / finalization / reset 的 fetch envelope
  - route 按错误类型区分 `404` / `409` / `500`
  - client / route 都会拒绝 `payload.packageName` mismatch
- Gate result:
  - spec compliance review passed
  - code quality review passed after one次定点回修

### Task 4: Orchestrator checkpoint persistence and hydration

- Status: completed
- Final commits:
  - `057b61e` `feat: persist and hydrate runtime checkpoints`
  - `6d428e6` `fix: preserve restored runtime bindings`
- Scope landed:
  - `orchestrator` 写 accepted-beat full checkpoint
  - `hydrateScene()` 恢复 `currentState` / `acceptedHistory` / relationship truth / complete state
  - delayed finalization 绑定到 `sessionId + checkpointId`
  - restore 时可带回 `sessionId / checkpointId` 绑定，避免 silently rebind
  - timeout 后晚到成功仍会 finalize 绑定 checkpoint，但不覆盖当前内存 live truth
- Gate result:
  - spec compliance review passed
  - code quality review passed after one次定点回修

### Task 5: Play restore and Reset Workbench semantics

- Status: completed
- Final commits:
  - `b73992c` `feat: hydrate play runtime from active session`
  - `1bd3e49` `fix: clear play history after reset`
- Scope landed:
  - `/play` 页面把 `initialRuntimeSession` 传给 `PlayWorkbench`
  - `PlayWorkbench` 已接入 continuity restore / reset 流程
  - accepted-beat / reset 写入失败有显式反馈且不再伪装成功
  - reset 成功后新 session 的本地 history 不再混入旧 session
- Gate result:
  - spec compliance review passed
  - code quality review passed after one次定点回修

### Build blocker: runtime-session route typing

- Status: completed
- Resolution:
  - 主线程顺着构建链清掉了 `route.ts`、`PlayWorkbench.tsx`、`runtime.ts`、`package-state.ts`、`orchestrator.ts`、`views.ts` 中暴露出来的类型收窄 / `exactOptionalPropertyTypes` 问题
  - 修补提交：
    - `f23a8a6` `fix: resolve continuity build typing issues`
- Verification:
  - `npm run build` passed
  - `npm test` passed (`75` files, `551` tests)

### Task 6: Edit continuity surface

- Status: completed
- Final commits:
  - `0e5c242` `feat: show continuity-backed edit relationship state`
  - `57f9b73` `fix: sanitize edit continuity unavailable state`
  - `5e2e990` `fix: tighten continuity empty-state semantics`
- Scope landed:
  - `/edit` 仅在 `section=worldbase-cast` 时请求 continuity-backed runtime relationship view
  - `EditWorkbench -> WorldBaseCastSection -> CharacterSection` 已接通 bounded continuity projection
  - `CharacterSection` 现在区分三类真实状态：
    - 没有 active continuity
    - active continuity 且带 relationship summary
    - runtime continuity unavailable / unreadable
  - reopened 回修后，`/edit` unavailable 状态已收敛成安全文案，不再直出底层 runtime/schema/repository 错误
  - `exactOptionalPropertyTypes` 下的 continuity prop 传递与 `orchestrator` test mock 类型也已收敛到可通过全仓 `type-check`
- Gate result:
  - spec compliance review passed
  - code quality review passed after one次 reopened fix
  - final implementation review 暴露的 2 个 blocker 已收口：
    - bootstrap / reset 后仅有 active session 但无关系层时，`/edit` 现已回到 empty state
    - `/play` unavailable continuity 已收敛为固定安全文案

### Task 7: Final verification and planning sync

- Status: in_progress
- Next execution slice:
  - 跑完整验证，包括 `npm run build`、`npm test` 与计划要求的定向覆盖
  - 同步 `progress.md` / `task_plan.md` 收尾记录
  - 做最终 code review / handoff 准备
