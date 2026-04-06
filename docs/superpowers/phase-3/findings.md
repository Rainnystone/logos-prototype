# Phase 3 Findings

## 2026-04-06 Part 2 入口判断

- `Part 2` 的目标不是重新设计 `storyline` / `checkpoint` / `session` / `variant` 这些对象边界；这些边界已经在总 spec 和 `Part 1` 中冻结。
- `Part 2` 应只消费 `Part 1` 已存在的正式 substrate primitive：
  - resolve active storyline
  - create storyline from source
  - branch storyline from checkpoint
  - switch active storyline
  - storyline-aware `/edit` 与 `/play` 默认解析链
- 当前最稳的 `Part 2` 目标是把“故事包管理”做成真正的作者工作区：
  - package selector
  - list-first storyline workspace
  - current storyline state read views
  - create / branch / switch / continue 这几条核心工作流
- 当前明确不应混入 `Part 2` 的管理动作：
  - archive
  - duplicate
  - delete
- 但随着用户确认 UI 需求，`storyline` 的显示名称编辑已不再适合拖到 `Part 3`：
  - `Part 2` 现在应承担 inline display-name editing
  - 代码层 id 继续 opaque，不与显示名绑定
- `新建 story package` 仍维持 companion-slice 判断：
  - 如果 backend seam 够稳，可以在 `Part 2` 里一起规划
  - 但它不应阻塞 `Part 2` 主体 workspace 的 spec

## 2026-04-06 Part 2 fallback / checkpoint 继续语义

- 用户在看完草图后又把这条产品语义进一步收紧：
  - 点击某个 beat 小点后，不再是“在当前 storyline 上原地 fallback”
  - 而是以该 checkpoint 为锚点，创建一条新的 storyline
  - 用户在展开的确认层点确认后，系统完成 `branch + switch`
- 这意味着 `Part 2` 当前更准确的产品动作是：
  - `checkpoint-driven branch-and-switch`
  - 而不是 `same-storyline restart`
- 对应的系统语义应写成：
  - 选中的 accepted-beat checkpoint 作为新 storyline 的 continuation anchor
  - 新 storyline 复制 source storyline 当前绑定的 variant workspace
  - 新 storyline 绑定新的 runtime session
  - 原 storyline 保持不变，继续作为可比较的旧线保留
- 这个决定比“原地回退”更符合 `Phase 3` 把 storyline 作为比较边界的初衷：
  - 旧线不被污染
  - 新线天然进入横向比较集合
  - 用户无需自己先手动执行 duplicate 再 branch

## 2026-04-06 new story package 边界判断

- 按当前仓库架构，`new story package` 在本地仓库模式下是可实现的：
  - package root 已固定为 `src/story-packages/<packageName>/`
  - server-side Node `fs/promises` 已经在 authoring / runtime persistence 链路里实际使用
- 这项能力的主要复杂度不在 macOS / Windows 是否能写文件，而在：
  - package name 的跨平台合法性约束
  - 最小模板 YAML 是否可被 loader 立即加载
  - 当前把 package 写进 repo 内 `src/story-packages/` 是否只是本地开发形态
- 因而目前最稳的定位仍然是：
  - `new story package` 可以作为 `Part 2` companion slice 规划
  - 但不应阻塞 `Part 2` 主体 workspace spec
  - 如果后续要面向打包后的桌面应用，再单独考虑把 package root 抽成用户目录

## 2026-04-06 浏览器手验补充判断

- `Part 1` 浏览器手验里，`/play` 的“纯读不物化”需要区分两层：
  - SSR / no-JS 纯读路径不应物化
  - 正常开启 JS 后，`/play` 页面会进入运行时初始化链，因此不再是“纯读”语义
- 这个判断不改变 `Part 1` 结论，但后续如果 `Part 2` spec 要描述页面级非物化语义，必须把 SSR 纯读与 hydrate 后 runtime 初始化分开写清楚，避免把正常运行副作用误判成 substrate 漏洞。

## 2026-04-06 Part 2 workspace sketch / UIUX 收口

- 用户已提供 `Part 2` 的结构布局草图和当前 editor shell 截图，当前 UI 方向已足够冻结到 spec。
- UI / UX 文档现应直接引用相对路径草图，作为可追溯的结构基准：
  - `../phase-3/结构布局示意图.png`
- 页面正式命名为：
  - `故事包管理`
- 当前更准确的页面定位不是“删除控制台”，而是：
  - 新增一个 package/storyline workspace 页签
  - 它取代 `控制台` 作为 editor 默认入口
  - `控制台` 继续保留为 diagnostics surface
- 页面主结构已冻结为：
  - 左侧 `story package` 选择区
  - 右侧当前 package 的 storyline workspace
  - storyline 列表纵向滚动
  - 单条 storyline 的 beat rail 横向滚动
- 左侧 selector 对 ready package 只显示包名，不显示额外简介或摘要。
- 右侧 workspace 只保留 package headline 与 restrained storyline rows，不额外展示 provenance / head summary / package summary 这类大块事实面板。
- checkpoint 交互也已冻结：
  - 每个 beat 用一个小点表示
  - 点击后在该点位下方向下“劈开”展开确认层
  - 展开层里只承接本次 branch-and-switch 的确认 / 取消动作
- rail 必须根据 checkpoint history 动态增长，并同时显示 phase label 与对应 beat label。
- 当前视觉约束已冻结：
  - 严格延续现有 editor shell 的 neue brutalism 语言
  - 继续使用仓库当前字体栈与硬边框 / 黑投影 / 直角面板
  - 不引入圆角 SaaS 风组件或新的默认字体

## 2026-04-06 Part 2 spec review blockers 收口

- 第一轮 `Part 2` 独立 spec review 收敛出 4 个真实 blocker，当前已按最小改动原则回写 spec：
  - 清除 `Part 1` 里残留的 same-storyline restart 旧语义
  - 补出 inline `storyline.name` editing 的 metadata-only mutation contract
  - 补出故事包管理页的 bounded workspace read model contract
  - 补清 `continue` 与 `create from source` 的 row-local 用户流语义
- 这些补丁都没有改变用户已经拍板的产品方向：
  - 仍然是 beat-dot click -> confirm drawer -> branch-and-switch
  - 仍然保持 `storylineId` opaque、显示名可编辑
  - 仍然保持 `控制台` 保留、`故事包管理` 成为默认入口

## 2026-04-06 Part 2 implementation plan review 吸收

- `Part 2` implementation plan 当前已形成正式执行输入：
  - `docs/superpowers/plans/2026-04-06-phase-3-part-2-package-storyline-workspace-implementation.md`
- 多轮独立 plan review 后，当前已冻结的执行约束包括：
  - `故事包管理` 页的读模型必须通过 bounded workspace view 提供，页面不能自己拼 raw repository / runtime JSON
  - `SaveSectionId` 与 `EditorSectionId` 必须继续拆开，防止把新 section id 意外带进 authoring save route
  - legacy package 在没有 `storyline-repository.json` 时，管理页仍必须可读且不得触发物化
  - `create storyline from source` 与 `branch from checkpoint` 的 route 合同都以“成功后自动 switch active storyline”为正式语义
  - row-level `switch storyline` 必须是独立动作，不能借 `continue` 或 beat-dot confirm drawer 代替
  - UI 验收不仅看交互，还必须覆盖 package selector、package headline、row-local actions、dynamic phase/beat rail 与 confirm drawer
  - 最终验证必须包含 `npm run type-check:simulation` 与 `npm run test:simulation`
- 最后一轮 reviewer 已明确确认：
  - 当前 plan 没有剩余阻塞性执行缺口
  - 可以进入执行方式选择

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
  - 新增“故事包管理”作为 editor 默认第一页，并保留“控制台”作为 diagnostics 页
  - 接入 storyline workspace 的读取、展示与核心 workflow
- 这部分应严格消费 `Part 1` 已冻结的 substrate，而不是自己定义底层边界。

### Part 3

- 核心任务：
  - 补齐 storyline 管理动作
  - 完成归档、复制、删除的正式交付
  - 做该阶段的 UX 收口与验证

## 当前尚未冻结的关键问题

- `storyline-scoped authoring variant` 到底是：
  - 新建、duplicate、从 checkpoint 分叉时到底如何创建与复制 variant workspace

## 2026-04-06 Part 1 已冻结决定

- `Part 1` 不是纯 substrate-only，它要把 `/play` 与 `/edit` 的默认 storyline 解析链一并接通。
- `storyline-repository.json` 作为首版 package-level storyline 仓储文件。
- `authoring variant` 的物理模型冻结为：
  - `variants/<variantId>/...` 下的 materialized workspace
- package-root baseline YAML 的职责冻结为：
  - baseline
  - scaffold source
  - import/export anchor
  - 不再作为 storyline-aware 常规写目标
- `session` 与 `storyline` 的绑定事实源冻结在：
  - `storyline-repository.json`
- 兼容迁移方式冻结为：
  - lazy bootstrap migration
- “从 checkpoint 继续”的作者可见入口延后到 `Part 2`，但 `Part 1` 必须把底层能力做成正式地基，而不是临时方案。
- `Part 1` 不承担完整 storyline 管理动作；这些继续留给 `Part 2 / Part 3`。
- `variant workspace` 的创建规则也已冻结：
  - 新建 storyline：复制来源 storyline 当前 variant workspace
  - duplicate storyline：复制被 duplicate 的 storyline 当前 variant workspace
  - 从 checkpoint 分叉：仍复制来源 storyline 当前 variant workspace，只改变 checkpoint 锚点
- 当前明确不采用：
  - overlay inheritance
  - deferred first-write materialization

## 2026-04-06 Part 1 spec review 补充冻结结论

第一轮 `Part 1` spec review 继续收敛出 3 个必须前置冻结的硬边界；这些结论已经回写到 `Part 1` spec。

### 双文件一致性

- `storyline-repository.json` 是以下字段的 canonical source:
  - `activeStorylineId`
  - `storyline.variantId`
  - `storyline.activeSessionId`
- `runtime-sessions.json` 是以下字段的 canonical source:
  - `sessionsById`
  - checkpoint graph
  - `session.activeCheckpointId`
  - `session.headCheckpointId`
- `runtime-sessions.json.activeSessionId` 只作为 active storyline 的 compatibility mirror。
- `storyline.headCheckpointId` 只作为 storyline-facing mirror，不再被视为独立 runtime truth。

### 双文件写入顺序与 repair 方向

- mutating runtime/storyline 操作统一采用：
  - 先确保 explicit storyline substrate 已存在
  - 先写 `runtime-sessions.json`
  - 再写 `storyline-repository.json`
- 如果 runtime 写失败，则 storyline repo 不能前进。
- 如果 runtime 写成功但 storyline repo 写失败，则：
  - 当前命令必须失败
  - runtime continuity 继续作为 canonical truth
  - 下一次 storyline-aware load / write preflight 必须先做 narrow repair
- repair 方向冻结为：
  - 用 storyline repo 修 `runtime-sessions.json.activeSessionId`
  - 用 runtime session 的 checkpoint pointer 修 `storyline.headCheckpointId`
- 如果遇到 structural mismatch，而不是 mirror drift，则必须直接报错，不能猜测修复。

### lazy bootstrap trigger

- 只读 `/edit`、`/play`、diagnostics、validation 不物化新文件。
- 只有 storyline-aware write 才会把旧 package 物化成显式 `Phase 3` package。
- 首批 trigger 已冻结为：
  - 第一次 deterministic bridge save
  - 第一次 mutating runtime-session command
  - 后续 restart / branch 等 storyline-aware write

### variant workspace 物理合同

- `variantId` package 内唯一，创建后不可变。
- `workspaceRoot` 必须严格等于相对路径 `variants/<variantId>`。
- bridge / loader 的 managed authored contract 只覆盖 6 个 YAML 文件。
- workspace 下允许额外文件或目录存在，但 `Part 1` 只把它们当 opaque package-local assets。
- baseline bootstrap 只复制 managed YAML family。
- variant 复制必须递归复制整个 workspace 目录，避免丢失 opaque adjunct files。

### bootstrap session 语义与 Part 1 primitive 边界

- `Part 1` 与总 spec 现已重新对齐：
  - 如果旧 package 首次物化时没有现成 active session，bootstrap 必须立刻通过 runtime session layer 创建一个 storyline-bound `awaiting_start` session，并绑定给默认 storyline。
- 这样做的原因：
  - 显式 `Phase 3` package 一旦物化，就不再保留“有 storyline 但没有 activeSessionId”的半成品状态。
  - `/play` 与 `/edit` 的默认 storyline 解析链可以始终依赖正式绑定，而不是额外再做一次 placeholder 推断。
- `Part 1` 的职责也已进一步冻结：
  - 不只交付数据模型
  - 还要交付无 UI 的 substrate primitives，至少包括：
    - resolve active storyline
    - bootstrap default storyline substrate
    - switch active storyline
    - create storyline from source storyline
    - branch storyline from checkpoint
- `Part 2` 只负责把这些 primitives 接成作者工作区，而不是再回头定义底层动作边界。
- `duplicate storyline` 的产品动作仍留在 `Part 3`，但 `Part 1` 需要把底层 workspace-clone contract 做成可复用能力。

### `create_storyline_from_source` 与三资源写入顺序

- `create_storyline_from_source` 现已冻结为“从 source storyline 当前 head 分叉”的 substrate primitive：
  - source storyline 必须已有非空 `headCheckpointId`
  - 新 storyline 的 `sourceCheckpointId` 与 `headCheckpointId` 都等于 source 当前 head
  - 新 storyline 获得自己的 `variantId` 和自己的新 session
  - 创建动作本身不自动切换 package `activeStorylineId`
- `branch_storyline_from_checkpoint` 则是显式历史锚点版本：
  - 选中的 checkpoint 必须能在 package checkpoint graph 里 resolve
  - 新 storyline 的 `sourceCheckpointId` / `headCheckpointId` 都等于选中 checkpoint
  - 同样不自动切换 active storyline
- `switch_active_storyline` 被正式冻结为独立 primitive：
  - 只切换 package `activeStorylineId`
  - 同步更新 `runtime-sessions.json.activeSessionId` mirror
  - 不创建 storyline / variant / session

对于 bootstrap / create / branch 这三类会同时碰 variant workspace、runtime session、storyline repo 的操作，当前写入顺序已冻结为：

1. 先在 staging 路径准备 variant workspace
2. 先写 `runtime-sessions.json`
3. 再把 workspace promote 到正式 `variants/<variantId>`
4. 最后写 `storyline-repository.json`

对应的 partial failure 规则也已冻结：

- staging workspace 若未 promote 即失败，必须清理
- 已 promote 但 repo 未成功登记的 workspace 可以作为 orphan 保留；正常解析必须忽略未登记目录
- repo 写失败后未绑定的新 session 可以留在 `runtime-sessions.json` 中；正常解析必须忽略未绑定 session
- 正确性不能依赖 cleanup 一定成功；cleanup 只作为 best effort

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
