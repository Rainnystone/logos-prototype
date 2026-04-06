# Phase 3 Findings

## 文档治理结论

- `Phase 3` 采用“双层文档”：
  - 根目录三件套保留为跨 phase 总控索引与自动恢复入口
  - 本目录三件套作为 `Phase 3` 的主工作记忆
- 这样做的原因不是偏好，而是当前 `planning-with-files-zh` 的恢复机制默认仍以根目录三件套为入口；如果完全把主索引移走，自动恢复会变弱。
- 正式 spec 与 implementation plan 仍放在既有 canonical location：
  - `docs/superpowers/specs/`
  - `docs/superpowers/plans/`
- 本目录不保存第二份正式 spec / plan，而是作为：
  - 当前状态入口
  - 研究结论沉淀
  - review / 验证日志容器

## 当前对总设计与分 part 的结论

- `Phase 3` 需要一份总 design spec。
- 当前不需要一份总 implementation plan。
- 原因是总 spec 的职责是冻结：
  - 对象边界
  - 文件落点
  - 非目标
  - part 顺序与依赖
- 真正可执行的任务颗粒度，应由各个 part 自己的 implementation plan 承担。

## 为什么不建议把 Phase 3 当成一张大 plan

- 当前 runtime continuity substrate 已经存在，并且 `checkpoint` 已经有正式持久化语义。
- 当前 authoring 保存仍然直接写 package root 下的 YAML，本质上还是 package-global baseline。
- 当前编辑器“控制台”页只是 diagnostics / read-only surface，不是真正的 package & storyline workspace。
- 这说明 `Phase 3` 的主要风险不在按钮数量，而在以下边界会不会漂：
  - runtime truth
  - authoring truth
  - storyline ref / pointer truth
  - UI 消费边界
- 如果先写一张覆盖一切的大 implementation plan，几乎一定会在 `Part 1` 还没真正冻结前就把 `Part 2` 和 `Part 3` 过度写死。

## 当前推荐的 Part 切法

### Part 1

- 核心任务：
  - 冻结 `checkpoint / storyline / session / authoring variant` 对象合同
  - 引入 package-level repository seam
  - 明确 mutable state 与 package definition 的分层
- 这是 `Phase 3` 最重、也最基础的一段。

### Part 2

- 核心任务：
  - 用“故事包管理”替换当前“控制台”页
  - 接入 storyline workspace 的读取、展示与核心 workflow
- 这部分应严格消费 `Part 1` 已冻结的 substrate，而不是自己定义底层边界。

### Part 3

- 核心任务：
  - 补齐 storyline 管理动作
  - 完成切换、重命名、归档、复制、删除的正式交付
  - 做该阶段的 UX 收口与验证

## 当前尚未冻结的关键问题

- `storyline-scoped authoring variant` 到底是：
  - 独立 workspace / revision 指向
  - 还是 overlay / delta / revision layer
- package-level repository seam 的首版物理组织方式如何落盘。
- `Part 2` 的“第一批可运行切片”到底要不要同时带一部分管理动作。

## 代码现状对 Phase 3 的直接约束

- `src/runtime-sessions/` 已经把 `Phase 2` 的 runtime continuity substrate 落成 package-local JSON。
- `src/authoring/persistence/repository.ts` 仍然按 package-global 文件直接读写：
  - `world-base.yaml`
  - `scene.yaml`
  - `phase-plans.yaml`
  - `router-lexicon.yaml`
  - `audit-questions.yaml`
  - `control-modules.yaml`
- `src/app/edit/sections/PackageWiringValidationSection.tsx` 仍然是 diagnostics-first surface，不是 package/storyline 管理页。
- 这几条意味着 `Part 1` 不能只是补一个数据类型文件，而必须先把 repository seam 和 authoring variant 的绑定语义讲清楚。

## 2026-04-06 外部参考检索结论

本轮只读研究重点参考了以下开源系统：

- [Git](https://github.com/git/git)
- [Jujutsu](https://github.com/jj-vcs/jj)
- [Dolt](https://github.com/dolthub/dolt)
- [lakeFS](https://github.com/treeverse/lakeFS)
- [Fossil](https://www.fossil-scm.org/home/doc/trunk/www/tech_overview.wiki)

这几套系统里，对本仓库 `Phase 3` 最有借鉴价值的不是具体命令，而是对象分层。

### 值得吸收的共同模式

- immutable node 与 movable ref 分层：
  - `checkpoint` 不应等于 `storyline`
  - `storyline` 应是指向 checkpoint 的可移动引用
- branch/workline 都需要自己的局部工作区语义：
  - 共享历史节点
  - 当前工作线自己的可变 working set / variant / session
- repository seam 应把“持久仓库层”和“工作区层”分开：
  - 持久层保存 immutable history 与 ref
  - 工作区层保存当前编辑态、恢复点和派生状态

### 对本仓库最直接的结构建议

1. `package` 继续作为容器与命名空间边界，不把每条 `storyline` 做成一个独立故事包目录。
2. `checkpoint` 继续保持 package-scoped immutable node；`storyline` 通过 ref 指向它，而不是拥有它。
3. `authoring variant` 与 `session` 应绑定到 `storyline`，而不是继续停留在 package-global，也不细化到单个 beat。

### 明确不照搬的点

- 不把 Git / Jujutsu 的 staging、history rewrite、复杂 VCS UX 直接带进作者界面。
- 不把 Dolt / lakeFS 的数据库或对象存储语义照搬进 narrative editor。
- 不把 Fossil 的一体化产品边界照搬到本仓库；只借鉴其 repository seam 与 checkout 分离思路。
