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
| 6 | pending | 基于当前 roadmap，为第一阶段写正式 spec / plan |

## Frozen Product Decisions

### A. 术语边界

- `coordinator-first` 描述的是作者链路架构。
- `coordinator` 是窄协调角色 / 状态机，不算真正 agent。
- 当前仓库里第一个真正落地的 sidecar agent 是 `gossipelog agent`。

### B. 编辑器壳子重组

- 当前“控制台”页不再保留为正式页面。
- 诊断与阻塞信息改成贴近当前页面的局部提示。
- 原来的“控制台”位置改成“故事包管理”。

### C. Phase 2 / Phase 3 关系

- `Phase 2` 负责建立连续会话、检查点与从某个 beat 重新开跑。
- `Phase 3` 负责把这些检查点组织成像 branch 一样可管理的故事线。
- beat 级检查点既是 continuity 的一部分，也是未来故事线管理的基础。

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

包含：

- `世界` / `角色` 拆页
- 地点结构化与稳定 ID
- scene 可调用地点
- 角色页显示当前关系状态
- agent 管理先做只读外壳
- 编辑器壳子把“控制台”替换为“故事包管理”

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

包含：

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

- 把“控制台”改成“故事包管理”壳子
- 诊断信息从独立页面下沉到当前页面附近
- 为后续 `世界` / `角色` 拆页预留壳子结构

### Slice 2: World Model Upgrade

- 把地点从整块文本提升为结构化对象
- 给地点稳定 ID
- scene 改为引用地点 ID
- NPC / supporting cast 继续留在世界页

### Slice 3: Character Page Split

- 角色从当前混合页拆出独立页面
- 角色页读取并展示当前关系状态
- 关系展示先基于已有持久化数据，不要求连续会话

### Slice 4: Read-only Agent Surface

- 先把 agent 管理做成只读外壳
- 至少能看见当前 agent、其状态文件与相关 skills
- 不在这一阶段引入新 agent 的创建能力

## Preserved Context

- `gossipelog agent` 的 Phase 1 已经完成并合入主线。
- 它会在 accepted beat 之后刷新关系状态，并把动态关系层送入下一轮生成。
- 这次 roadmap 讨论是在 `gossipelog agent` 已经存在的前提上继续扩展，不是假设系统从零开始。
