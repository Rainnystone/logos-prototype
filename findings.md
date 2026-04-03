# Findings

## planning-with-files-zh 是否适合这次场景

- 适合。
- 原因不是这次任务本身复杂到必须用它才能完成，而是后续会发生“删本地仓库、重新 clone、关闭当前线程、未来继续扩展”的上下文切断。
- 这类情况下，把重要状态写进项目根目录的三个持久文件，比只依赖归档 spec 或聊天记录更稳。

## 这次 gossipelog agent 已完成的核心结果

- 已实现 accepted beat → 关系更新 → 写入 story package → 下一轮 prompt 注入 的闭环。
- 浏览器路径已经通过服务端桥接来执行 gossipelog 刷新，避免把文件读写逻辑带进页面环境。
- 本地 demo 路径已经修正，不会再错误地产生“主角对外”的持久关系边。
- no-op、等待后台刷新、失败回退、超时回退这些关键行为都已有测试覆盖。
- 页面级验证已经补过，真实驱动两轮工作台后，关系文件会发生更新，验证结束后已恢复样例文件原状。

## 这次完成后文档的落点

- 活动中的 superpowers 文档目录现在应该只放尚未完成的工作。
- 已完成的 gossipelog 文档已归档到：
  - `archive/docs/superpowers/plans/2026-03-31-gossipelog-agent.md`
  - `archive/docs/superpowers/specs/2026-03-31-gossipelog-agent-design.md`
  - `archive/docs/superpowers/specs/2026-03-31-gossipelog-agent-log.md`
  - `archive/docs/superpowers/specs/2026-03-31-gossipelog-agent-review-notes.md`
  - `archive/docs/superpowers/specs/2026-03-31-gossipelog-agent-session-summary.md`

## 后续 agent 应该知道的事

- 当前仓库已经不只是单一叙事引擎，而是在往多 agent 结构演进。
- `gossipelog agent` 是第一个落地的 sidecar agent，因此后续 agent 管理页面不能假设系统从零开始。
- `WorldBase & Cast` 当前仍是一个页面，但后续已经明确有拆分需求。
- 未来继续扩展时，应优先复用现有 `src/agents/` 和 story-package 内 `agents/` 的分层，而不是重新发明第二套组织方式。

## 2026-04-01 Roadmap 讨论前确认的现状

- 用户明确追加了一条冻结判断：`coordinator` 在代码层不是 agent，当前系统里第一个真正的 agent 是 `gossipelog agent`。
- 当前 `worldBase` 里的地点仍是 `locationPatch` 这一整块文本，还没有像角色那样的结构化对象或稳定 ID。
- 当前关系数据文件只围绕角色 ID 建模，没有地点关系或地点对象参与。
- 当前 workbench 运行态主要在页面内存里，切页面后不会保留成一个可恢复的运行会话。
- 当前故事包目录可以列出不同 package，但还没有“一个故事包内部存在多条故事线/多份进展”的模型。
- 当前作者持久状态只覆盖“上一次保存了哪个 section、何时保存”，不覆盖“从哪一个剧情进度继续编辑/继续玩”。
- 用户提出的 7 个方向并不是同一层级的需求，里面至少包含：
  - 产品外壳与多 agent 扩展
  - 世界与角色数据模型重构
  - 运行态与编辑态联动
  - 故事包与故事线持久化
  - 新的导入 agent

## 2026-04-01 术语纠偏

- 当前最容易反复造成误解的地方，不在代码，而在核心说明文档里仍残留了“coordinator agent”这种旧表述。
- 已优先修正的核心文档包括：
  - `AGENTS.md`
  - `README.md`
  - `archive/docs/narrative-editor-redesign/README.md`
  - `archive/docs/narrative-editor-redesign/master-record.md`
- 本次纠偏采用的统一说法是：
  - `coordinator-first` 描述的是作者链路架构
  - `coordinator` 是窄协调角色 / 状态机，不计入 sidecar agent 体系
  - 当前第一个真正落地的 sidecar agent 是 `gossipelog agent`

## 2026-04-01 Roadmap 可视化草图

- 已启动 brainstorming visual companion 本地服务。
- 第一张草图把 7 个方向压成 4 条路线：
  - Agent Surface
  - World Model Rebuild
  - Session Continuity
  - Package & Storyline Layer
- 这张草图的目的不是定方案细节，而是帮助用户先选“第一阶段围绕哪条主线展开”。

## 2026-04-01 针对 C / D 的重组判断

- 用户提出了一个关键修正：角色关系的可视化与管理，不应该被粗暴塞进一个独立桶里，因为它本身带有明显的“故事连续性”属性。
- 基于当前仓库现状，更合理的拆法是：
  - `3a 关系状态查看`：属于角色模型 / 角色页，因为它依赖角色 ID 和已持久化的关系文件读取
  - `3b 关系变化连续性`：属于 session continuity，因为它依赖 workbench 当前运行结果与 editor 之间的无损切换
- 对当前 7 项里最难的两块，判断如下：
  - `C continuity` 很广，但可以分层推进，因为它可以先从“切页不清零 + reset workbench”做轻量版本
  - `D package & storyline` 是当前最重的一块，因为它会引入新的顶层对象与落盘组织方式，牵涉加载、保存、恢复和导入落点
- 基于 best practice 和当前仓库结构，推荐顺序应从：
  - 稳定数据模型与页面边界
  - 再到运行态连续性
  - 再到故事包 / 故事线层
  - 最后再接入新的导入 agent

## 2026-04-01 推荐的四阶段路线

1. `Phase 1: Model & Surface`
   - `世界` / `角色` 拆页
   - 地点结构化与稳定 ID
   - scene 可调用地点
   - 角色页显示当前关系状态
   - agent 管理窗口先做只读外壳
2. `Phase 2: Session Continuity`
   - play ↔ edit 切换不清零
   - 显式 `Reset Workbench`
   - 从上次离开处继续
   - 关系变化的当前进度视图
3. `Phase 3: Package & Storyline`
   - 故事包管理
   - 包内多故事线 / 多份进展
   - session 与 storyline 绑定
4. `Phase 4: New Agents`
   - 外部前序故事导入 agent
   - agent 管理窗口升级为真正管理面

## 2026-04-01 continuity / rollback / package 权限判断

- `continuity` 不自动等于“完整 beat 级回滚”。
- 当前仓库已经在运行时内存里持有这些信息：
  - `StateSnapshot`
  - `historyWindow`
  - 当前 `promptObject`
  - 当前 beat 输出与选项
- 但这些信息目前主要存在于 workbench 页面内存和当前快照里，并没有作为正式的“每个 beat 一条持久记录”写回故事包。
- 因此如果未来要支持可靠的 beat 级回滚，至少要先明确目标是以下哪一种：
  - 仅回到某个 beat 的界面状态
  - 回到某个 beat 后继续生成，但不保证完全可重演
  - 对每个 beat 做近似审计级存档，尽量保存 prompt / 输出 / 状态 / 关系层
- 这三种目标的成本差很多，不能把它们混成一个需求。

- 在 `Phase 2` 与 `Phase 3` 的先后上，基于当前仓库现状，仍更推荐先 `Phase 2` 再 `Phase 3`：
  - 当前 workbench 状态已经存在于内存和快照结构里，因此 continuity 有可以承接的基础
  - 当前 package / storyline 层几乎还不存在，若先做它，会过早引入新的顶层对象与目录结构
  - 若先把 continuity 做成轻量可恢复 session，再把 session 绑定到 storyline，会比先造 storyline 容器更稳

- 关于 “webapp 是否拥有本地新建立文件的权限”，当前答案要分两层：
  - 浏览器页面本身没有直接文件系统权限
  - 但 Next.js 服务端路由已经具备受控写文件能力，因为现有 authoring / gossipelog 都在通过服务端读写本地文件
- 只是当前这份产品实现里，这种能力仍然是“针对既有故事包和既定文件”的，不是通用的一键脚手架能力：
  - authoring repository 只会写现有 package 里的既定 YAML 文件
  - `ensureStoryPackageExists` 明确要求故事包目录已存在
  - gossipelog 只会在现有故事包内部补建自己的 agent 状态文件，不会帮你新建完整故事包
- 所以如果要做“外部前序故事导入 agent”，按当前仓库状态，最稳妥的产品落点不是“先让作者手工复制一个空包再贴文本”，而是二选一：
  - 先补一个受控的“新故事包 / 新故事线脚手架”能力，再接导入 agent
  - 或者先把导入目标限制在“导入到现有故事包 / 现有故事线”里

## 2026-04-01 用户对 rollback 的产品化定义

- 用户进一步把 `rollback` 的实操目标收窄为：
  - 在 beat 5 时决定从 beat 3 重来
  - 用 beat 3 那一轮对应的生成入口重新开跑
  - 作者只能改可配置部分，不直接改 beat 正文
- 这个定义比“完整 prompt / 输出 / 审计级归档重演”更轻，也更适合作为 `Phase 2` 的目标。
- 对当前仓库而言，更合适的实现心智不是“完整回滚系统”，而是：
  - 为已接受 beat 建立检查点
  - 从某个检查点重新组装下一轮生成入口
  - 带上最新可配置项重新继续故事
- 基于这个收窄定义，`Phase 2` 先于 `Phase 3` 的推荐更稳，因为故事线层可以随后直接消费已经成形的检查点 / session 结构。
- 用户进一步补充了一个关键定位：
  - beat 级检查点与回滚，不只是 `Phase 2` 的连续性能力
  - 它同时也是 `Phase 3` 中“一个故事包里多条故事线”的管理基础
  - 这层心智可以类比为 Git 的 branch：故事线不是凭空出现，而是从某个已接受检查点分叉出来
- 这意味着 `Phase 3` 的故事线管理，应该优先围绕这些动作设计：
  - 从某个 beat 检查点创建新故事线
  - 切换到某条故事线继续跑
  - 删除某条故事线
  - 保留主线与分支线的检查点身份
- 同时也意味着 `Phase 2` 和 `Phase 3` 的关系应改写为：
  - `Phase 2` 负责建立可靠检查点与续跑能力
  - `Phase 3` 负责把这些检查点组织成“像 branch 一样可管理的故事线”

## Phase 2 substrate 对齐结论

- `LOGOS` 继续保持故事内容与系统解耦：
  - `story package` 仍是作者定义态与 canonical baseline
  - `Phase 2` 的 continuity 数据应落在独立的 mutable runtime session / checkpoint state
- `Phase 2` 的自然实现切口在 `play runtime`，不是 authoring bridge：
  - 真正该接的位置是 accepted beat 已确定、`currentState` 已冻结、但尚未返回 UI 的 runtime 链路
  - `PlayWorkbench` 的职责更适合保持为进入时恢复、离开时保存、显式 reset
- `PromptObject` 与 `BeatHistory` 都应继续停留在派生层：
  - `PromptObject` 是 generation 入口的派生物，不是事实源
  - `BeatHistory` 是 UI 读模型，不是持久化真相
- 最稳妥的最小方案是：
  - 在 package root 下新增独立的 runtime session / checkpoint 文件
  - 不把 continuity 塞进 `authoring-state.json`
  - 不把 continuity 塞进 gossipelog 关系文件
  - 不把 mutable runtime state 强塞进 `StoryPackage` 或 `state-snapshots.yaml`
- checkpoint 的最小真相应该围绕“可续跑”而不是“可展示”来保存：
  - `checkpointId`
  - 结构化位置字段：`sceneId / phaseIndex / beatIndex / acceptedBeatOrdinal`
  - `StateSnapshot`
  - accepted transcript
  - `lastStableRelationshipLayer`
  - 必要的 round / session metadata
- 不建议把 storyline 序号或人类可读路径写进 checkpoint 主键。
- 更稳的做法是：
  - checkpoint 只用 opaque id
  - `Phase 3` 的 storyline 只做“指向 checkpoint 的 ref / pointer”
- 用户所说的“fallback / 回滚”本质上更接近：
  - 从某个已接受 beat 的 checkpoint 重新组装那一轮 generation 入口
  - 再次把整轮 generation 请求送出
- 这不要求 `Phase 2` 先交完整 rollback UI，但要求 `Phase 2` 交付后的 substrate 已经足够支持 `Phase 3` 去实现它。
- 当前最合理的 durability 目标是：
  - 至少支持页面刷新后的恢复
  - 但数据模型与仓储边界要保持可扩展到更长期的继续，不在后续重做底层
- 一个容易被忽略但必须进入恢复模型的点是 `gossipelog`：
  - 关系层不是 accepted beat 的同步内联结果
  - 它是 accepted 之后为下一拍准备的异步 runtime layer
  - 因此 checkpoint 不能只存 `beatText + stateSnapshot`，还需要携带足以恢复下一拍语义的关系层状态

## Phase 3 当前推荐结构

- `Phase 3` 现在已经可以更明确地收束成“ref layer + management layer”，而不是一个模糊的故事线大桶。
- 下一阶段最稳的对象模型是：
  - `checkpoint` = package-scoped immutable node
  - `storyline` = 指向 checkpoint 的 ref / pointer
  - `session` = 当前活动工作线，与某个 storyline head 绑定
- 这意味着一个 checkpoint 不应被设计成“只属于一条 storyline”：
  - 它可以先是主线当前节点
  - 后续也可以成为多条分支线的共同祖先
- 因而 checkpoint 主键不需要携带 `storylineId`：
  - checkpoint 的唯一性由 package scope + opaque `checkpointId` 保证
  - storyline 的区分度来自自己的 `storylineId` 与 `headCheckpointId`
- 对 `Phase 3` 而言，最轻量但不埋债的 branching 语义是：
  - 新建故事线时优先创建一个新的 storyline ref
  - 它指向既有 checkpoint
  - 不复制整段 checkpoint 历史
- 这也意味着 `Phase 3` 的推荐实现顺序应调整为：
  - 先冻结 storyline / checkpoint / session 三者合同
  - 再补 package 内 mutable storyline repository seam
  - 再接故事包 / 故事线管理 UI
  - 最后补重命名、归档、复制、删除等管理动作的完整交付
- 从当前线程看，`Phase 2` 打下的最重要基础不是“可恢复 UI”，而是：
  - checkpoint 已经是正式节点
  - 它未来可被多个 storyline 复用
  - 因而后续分支创建可以保持轻量且不复制历史

## 2026-04-01 用户对 storyline v1 范围的冻结

- 用户不希望把故事线管理理解成递进式功能裁剪。
- 用户倾向于在第一版里就同时拥有这些核心动作：
  - 新建分支线
  - 切换
  - 删除
  - 重命名
  - 归档
  - 复制
- 但用户同意在实现时把这些目标拆成更小的交付节点，而不是要求一次性整包完成。
- 这意味着 roadmap 表述上应区分：
  - `v1 scope`：功能集合完整
  - `delivery slices`：实现分批落地

## 2026-04-01 编辑器壳子的页面重组判断

- 用户明确认为当前第四页“控制台”本身产品意义不足。
- 用户给出的直接判断是：
  - 报错与阻塞信息不需要占用一个正式页面
  - 这类信息可以直接在对应页面的左上角或更贴近当前操作的位置展示
  - 因此当前“控制台”更适合被替换为“故事包管理”
- 这意味着编辑器壳子的正式页面分工应开始朝以下方向重组：
  - `世界`
  - `角色`
  - `场景与阶段`
  - `控制模块`
  - `故事包管理`
- 同时也意味着诊断能力不会消失，而是从“独立页面”降级为“上下文内提示 / 阻塞提示 / 局部状态提示”。
- 用户进一步明确了“故事包管理”页的基础布局心智：
  - 左侧是故事包列表
  - 选中某个故事包后，右侧显示并管理该故事包内部的故事线
- 这意味着“故事包管理”页在第一版更接近：
  - `package selector + storyline workspace`
  - 而不是一整页平铺所有故事包和所有故事线
- 用户进一步明确了右侧故事线工作区的展示方式：
  - 默认更适合先展示故事线列表
  - 具体呈现可以采用依次展开的故事线条目
  - 配合一个下拉式的滑动区域，而不是先进入单条故事线详情页
- 这意味着右侧区域第一版的心智更接近：
  - `storyline list with expandable items`
  - 而不是 `detail-first inspector`
- 用户进一步明确了故事线条目动作的层级判断：
  - 不希望把“继续这条线”和“从这个节点再分叉”强行分成高低优先级
  - 更希望作者自己在条目展开后选择
  - 心智上更接近一个下拉动作组，而不是单个强主按钮
- 用户进一步明确了故事线列表条目的信息密度：
  - 列表里除了故事线名、分叉来源、更新时间外
  - 还应直接显示当前 `phase / beat` 位置
  - 用户明确说明当前系统不考虑手机适配，因此桌面端可以承受更高的信息密度

## 2026-04-01 受控新建能力的实际实现方向

- “第二种方法”如果要落地，不应该让作者手工复制空目录，而应该把“新建容器”产品化。
- 按当前仓库结构，最现实的两档实现是：
  - 近档：先做“现有故事包内新故事线”脚手架，再让导入 agent 导入到这条新故事线
  - 远档：再补“新建故事包”脚手架

## 2026-04-02 Phase 1 实施完成结论

- `Phase 1` 的实现现在已经完整落地，边界仍然保持在我们冻结的范围内：
  - `世界` / `角色` 已拆成两个可见页面，但继续共用 `worldbase-cast` 保存边界
  - 地点已成为结构化对象，并能在 scene 中做可选引用
  - 角色页保留了关系区，而且空态表达与第一阶段约束一致
  - `控制台` 继续承载整包诊断，并新增了只读 sidecar agent 信息面
- 只读 sidecar 面板最终收口到以下边界：
  - 只显示真实启用的 sidecar agent
  - sidecar 配置缺失或显式关闭时不展示卡片
  - sidecar 配置不可安全读取时展示 bounded unreadable 状态，而不是静默隐藏
  - “重新检查”成功时同时刷新 diagnostics 与 sidecar 卡片，失败时一起回退，不保留误导性的旧远端结果
  - bounded summary 约束已经前移到数据生成侧，展示层只保留轻量防御
- `simulation-toolset` 也已经补齐当前 `EditWorkbench` 的新合同，因此 `type-check:simulation` 重新恢复为绿色。
- 本轮桌面端 UI / UX 复核结论：
  - 世界页、角色页与控制台页都保持了现有新粗野主义视觉语言
  - 关系区在角色页中是“诚实地空着”，没有假内容，也没有报错
  - 控制台中的 sidecar 面板是信息面，不是操作台
  - 浏览器控制台里唯一看到的是开发环境下 `favicon.ico` 的 404，不属于功能回归
- 具体落地时，应由服务端提供受控入口，按固定模板生成允许的文件，而不是开放任意路径写入。

## 2026-04-01 最终采用的路线排序理由

### 为什么不是先做故事包 / 故事线

- 当前仓库还没有“故事线”这一层正式对象。
- 如果过早先做它，会同时拉动：
  - 目录结构
  - 加载逻辑
  - 保存目标
  - 导入落点
  - 恢复点语义
- 这会让 roadmap 在一开始就进入最大牵扯面的区域。

### 为什么先做模型与表面

- 后续所有东西都会依赖：
  - 世界对象
  - 角色对象
  - 地点对象
  - 页面边界
- 如果这些边界不先稳定，连续性、检查点和故事线后面都容易返工。

### 为什么 `Phase 2` 先于 `Phase 3`

- 当前仓库已经拥有运行时快照、history、promptObject 等基础结构，说明 continuity 并非从零开始。
- 用户已经把 rollback 定义成“从某个已接受 beat 的检查点重新开跑”，这使得 `Phase 2` 可以形成明确交付，而不必等待故事线层先落地。
- 一旦有了可靠检查点，`Phase 3` 的故事线管理就不再是空壳，而是对检查点的组织与分叉。

### 为什么 package root / repository seam 不该先作为 simulation 补丁落地

- 这个 seam 最终一定要有，但它的责任属于产品层，不属于 simulation toolset。
- 原因不是 simulation 不需要它，而是：
  - seam 一旦引入，就会同时影响 package 加载、保存、storyline、checkpoint、session、agent state 的正式边界
  - 这已经超出“测试基础设施”范围，属于产品存储模型本身
- 因此更稳的顺序应是：
  - simulation toolset 先继续做 boundary-first 的验证基础设施
  - 产品层在正式进入 `Storage / Repository Substrate` 时，再引入 `package root / repository seam`
- 这也解释了为什么 simulation 当前 README 明确把自己定位为“消费正式 seam 的独立 workspace”，而不是定义长期目录契约的地方。

## 2026-04-02 Phase 1 Task 1 执行补充结论

- `Task 1` 已证明“5 个可见页面 / 4 个保存家族”这层边界可以先落地，不需要提前引入新的 section family。
- 本轮执行中真正需要锁住的，不只是 `surface=world|character` 这个参数本身，而是它只能在 `section=worldbase-cast` 的前提下生效。
- 第一版实现里最容易漏掉的边界，是：
  - 缺失 `section` 时，不能因为带了 `surface=character` 就误进“角色”页
  - 非法 `section` 时，也不能让 `surface` 抢走入口语义
- 这条入口约束已经通过补测和修复冻结，后续任务可以把它当成既定合同继续往下做。

## 2026-04-02 Phase 1 Task 2 执行补充结论

- `Task 2` 的真实边界不是“同包 continuity”，而是更窄的“`worldbase-cast` 内部两个 visible surface 共享同一份未保存草稿”。
- 首版实现一度把 guard 写得过宽，导致同包下新的初始状态被整体忽略；这与 spec 中“只为 world / character 共享草稿，不扩展成更广的 continuity”相冲突。
- 最终回修后，真正冻结下来的行为是：
  - 只有 `section=worldbase-cast` 且 world / character 两个 surface 互切时，未保存草稿会被保留
  - 如果 active surface 没变，则新的同包初始状态仍然会接管
  - 如果离开 `worldbase-cast` 这组共享 surface，再回来时仍然按照原有页面族重载逻辑处理
- 这条边界已经被测试锁住，后续继续拆 `WorldSection` / `CharacterSection` 时可以直接把它当成既定合同使用。

## 2026-04-02 subagent 派单边界补充

- 本轮执行暴露出一个流程问题：审查型 subagent 如果没有被明确告知自身身份与边界，可能会把“审查”误做成“直接改代码”。
- 因此后续派单需要固定包含四条信息：
  - 你是 subagent，不是主 agent
  - 你是只读审查还是可写执行
  - 你只被授权处理哪些文件
  - 你被明确禁止做什么，例如编辑、提交、再派遣 subagent
- 这条规则属于执行纪律，不改变产品 spec，但会直接影响后续 task-level delegation 的安全性和可控性。

## 2026-04-02 Phase 1 Task 3 执行补充结论

- `Task 3` 的第一版实现虽然把结构化地点合同落进了 `worldBase.locations[]`，但一开始没有把它稳定投影回 runtime 仍然消费的 `locationPatch`，因此不能直接算完成。
- 这轮执行最终冻结下来的正确边界是：
  - `worldBase.locations[]` 是 authored source of truth
  - `locationPatch` 仍保留，但不再只覆盖“单个 description-only imported location”的特例
  - 对命名地点、多地点、以及补充了额外字段的地点集合，也必须稳定地产生 deterministic projection
- legacy 兼容规则现在已经被正式锁住：
  - 没有结构化地点时，只水合 1 个 imported location
  - hydration 阶段不提前暴露 durable `loc_` id
  - 第一次成功保存时才 mint 正式地点 ID
  - 如果仍然是 untouched imported location，则 `locationPatch` 继续把 description 原样规范化写回
- 这轮回修还顺手收住了一个容易潜伏到后面的问题：
  - 只有当 `locations` 仍等同于初始 hydration 结果时，旧 `locationPool / locationPatch` 才会去对齐 imported description
  - 一旦地点草稿本身已经改动，就不再允许旧字段把它覆盖回去
- 当前这组规则已经通过主线程验证、spec review 和 code quality review 三层确认，可以作为后续 scene 引用地点的既定基础继续往下走。

## 2026-04-02 Phase 1 Task 5 执行补充结论

- `Task 5` 的第一版实现虽然把 scene `locationIds`、多选 UI 和“删除被引用地点时阻止 worldbase 保存”这条路径接通了，但一开始仍然保留了一个阻塞级缺口：
  - 如果请求里带了未知地点编号，保存桥接会把它静默过滤掉，然后继续返回成功
  - 这会造成“作者看到保存成功，但引用已被悄悄丢失”的隐藏数据回退
- 两轮只读复审都把这个问题判定为真实违约，而不是建议项：
  - spec review 认为它违反了 `when present, every referenced location ID must resolve`
  - code quality review 认为它破坏了 deterministic bridge 应承担的引用完整性边界
- 这轮执行最后冻结下来的正确边界是：
  - scene `locationIds` 仍然是可选字段
  - 空选择继续被省略，不写入 YAML
  - 已删除但仍被 scene 引用的地点，会阻止 `worldbase-cast` 保存
  - 直接提交未知地点编号到 `scene-phase-authoring` 时，也必须 `save_blocked`
  - 阻塞信息必须明确指出无效地点编号，而不是静默吞掉
- 这次回修还顺手收住了一批结构化地点引入后的编译尾项：
  - 多个测试夹具与兼容分支现在都显式补齐 `locations: []`
  - `world-base-compat.ts` 的 legacy / structured 迁移返回值已与新合同重新对齐
  - `SectionTabs.tsx` 的 `surface` 分支现在用显式收窄处理，不再依赖宽松联合访问
- 当前这组规则已经通过主线程验证：
  - `npm run lint`
  - `npm run type-check`
  - `npm test`
  - 结果全部通过，可以作为后续 Task 4 / Task 6 的稳定基础继续往下走。

## 2026-04-02 Phase 1 spec 收口后的三条实施边界

- `世界` / `角色` 的拆分现在已经明确成“一个保存边界、两个可见子页”：
  - 仍共用 `worldbase-cast`
  - 允许用次级 `surface` 选择可见子页
  - 在 `世界` 与 `角色` 之间切换时，共享同一份未保存草稿，不应被清空
  - `Save` / `Reset` 仍作用于整个共享草稿，而不是各管一半
- 旧的 `locationPatch` 到结构化地点的迁移，现已冻结为“保守、不猜测”的 deterministic 规则：
  - 不尝试从 freeform blob 猜多个地点
  - 只水合出 1 个结构化地点
  - 原始文本完整落进 `description`
  - 其它地点字段先置空
  - 首次结构化保存后允许兼容投影被规范化，但不允许静默丢失旧文本
- 只读 agent 面板的最小合同也已冻结：
  - 只展示真正的 sidecar agent
  - 每个 agent 至少有 `agentId`、显示名、职责摘要、技能、配置路径、状态路径
  - “最近状态”必须是有边界的摘要，不允许变成原始状态文件浏览器

## 2026-04-02 Phase 1 implementation plan 完成状态

- 已写出正式 implementation plan：
  - `docs/superpowers/plans/2026-04-02-phase-1-model-surface-implementation.md`
- 这份计划已经过独立 plan review loop，当前审阅结论为通过。
- 审阅过程中补齐并冻结了几条容易在执行时卡住的实施细节：
  - 世界页不仅要有地点区，也必须明确保留世界规则与文风基线
  - 世界页的地点区必须有显式删除动作，否则“删除阻塞”规则无法真正被执行和验证
  - 场景页拿地点列表的传递链必须从 `EditWorkbench` 明确接进 `ScenePhaseAuthoringSection`
  - 场景删除阻塞不仅要阻止保存，还要把仍在引用该地点的场景名或场景 ID 明确反馈给作者
- 相关边界说明可直接参考 [simulation-toolset/README.md](simulation-toolset/README.md)。

### 为什么新 agent 放最后

- 导入 agent 需要明确的落点。
- 当前仓库没有现成的“新建故事包 / 新建故事线”产品能力。
- 如果先做 agent，再补容器，很容易让 agent 同时承担：
  - 语义理解
  - 文件脚手架
  - 内容落盘
  - 状态初始化
- 这会把 agent 的职责做得过重，也更难维护。

## 2026-04-01 每阶段都要复核 UI / UX

- 用户新增了一条正式约束：每个阶段结束前，都要单独检查一次是否需要调整 UI / UX。
- 这意味着 roadmap 里的每个阶段不只是做数据、状态和能力，还要问一次：
  - 页面职责有没有变化
  - 操作路径有没有变长或变绕
  - 信息密度是否还合理
  - 是否需要新增或替换页面 / 面板 / 局部提示
- 因此后续 spec 与 plan 中，应把 `UI/UX review` 作为每个阶段的正式收口项，而不是上线前一次性总复盘。

## 2026-04-01 当前正式认可的第一阶段切片

1. `Editor Shell Reframe`
   - 拆出 `世界` / `角色` 两个正式页面入口
   - 诊断信息改成当前页顶部提示，同时辅助区保留对应提示
2. `World Model Upgrade`
   - 地点对象化与稳定 ID
   - scene 选择地点引用
3. `Character Page Split`
   - 角色页拆出
   - 关系区正式存在，但在 `Phase 1` 允许为空态
4. `Read-only Agent Surface`
   - 只读展示当前 agent 体系，不做创建能力

## 2026-04-01 第一阶段边界最终版

- 第一阶段真正的主轴是：
  - `世界` / `角色` 拆页
  - 地点结构化与稳定 ID
  - scene 调用地点
  - 角色页展示当前关系状态
  - agent 管理只读外壳
- 用户最新调整后，第一阶段不再强行包含“故事包管理”页面替换。
- “控制台”被“故事包管理”替换，仍然是后续阶段的正式方向，但允许与真正的故事包 / 故事线层一起落地。
- 因此第一阶段不包含：
  - 完整故事线管理
  - 检查点绑定
  - 分支创建、切换、删除、重命名、归档、复制
- 这些能力仍分别属于：
  - `Phase 2`：连续会话与检查点
  - `Phase 3`：故事包 / 故事线正式管理层

## 2026-04-01 第一阶段 spec 的 question list

- 基于当前代码现状，第一阶段真正还没冻结的问题主要集中在五块：
  - 世界页和角色页如何分工
  - 地点对象的最小字段集
  - scene 对地点的引用方式
  - 角色关系在第一阶段的展示深度
  - 只读 agent 外壳的最小可见信息
- 这些问题比“故事包管理”壳子是否显示真实数据更前置，因为它们直接决定第一阶段的数据边界与页面边界。
- 因此后续 brainstorming 的顺序应优先围绕这五块展开，再处理第一阶段里那些可以带默认值继续的小问题。

## 2026-04-01 用户已冻结的第一阶段细节

- 世界页保留：世界文本、规则、文风、地点、NPC / 配角。
- 角色页承接：主角、核心角色、反派，并沿用当前角色区的编辑布局与构建方式。
- 地点的交互方式参考当前核心角色：
  - 左侧列表点击条目
  - 右侧显示并编辑明细
- 地点 ID 不由作者手写，改为系统自动生成，心智上参考角色 ID。
- 地点第一版字段集明确为：
  - 名称
  - 说明
  - 环境外观描述
  - 氛围描述
  - 人文描述
- 场景挂载地点的方式参考当前场景挂载角色：
  - 作者可自行选择挂哪些地点
  - 未挂地点时不报错
  - 允许叙事引擎根据上下文和其他设定自行生成
- 第一阶段的页面内提示位置已冻结：
  - 当前页顶部承担阻塞与错误提示
  - 右侧辅助区保留对应提示
- “故事包管理”页不再强行放入第一阶段，可以与后续真正的故事包阶段一起实现。

## 2026-04-01 角色关系区的最终处理原则

- 用户决定第一阶段仍然保留角色关系区，但接受它在这一阶段为空态。
- 这里的空态不是报错，也不是缺功能提示，而是当前阶段边界下的正常结果。
- 同时明确拒绝为了让第一阶段“看起来有内容”而增加临时桥接、额外缓存或一次性读取方案。
- 这意味着第一阶段在关系区上的 best-practice 方向是：
  - 先把页面结构和空态语义做对
  - 不提前引入跨阶段的数据耦合
  - 等 `Phase 2` 的连续会话能力落地后，再让这个区域自然显示非空内容
- 这样做的好处是：
  - 不制造一次性的技术债
  - 不把“最近保存关系”和“当前会话关系”混成两套语义
  - 不会为了填满界面而破坏阶段边界

## 2026-04-02 CI Recommendation

- A two-layer GitHub Actions design is the current best-fit recommendation.
- Layer 1 should be the required main CI:
  - fast
  - branch-protectable
  - uses existing package scripts directly
- Layer 2 should be a separate simulation batch workflow:
  - manual trigger first
  - artifact upload first
  - nightly only after the batch path becomes stable
- This split matters because simulation reports are evidence-heavy and should not slow every PR.
- The current main CI scope should stop at:
  - lint
  - type-check
  - type-check:simulation
  - test:core
  - test:ui
  - test:simulation
- `npm run format:check` should stay out of the first required CI layer for now.
- Reason:
  - the current repository already has large pre-existing formatting drift
  - fresh local verification on 2026-04-02 reported `Code style issues found in 484 files`
  - making format-check required immediately would turn the new CI red for unrelated historical debt
  - that would block adoption of the workflow without improving signal on new regressions
- `npm test` full-suite and heavy batch orchestration are intentionally not part of the first required check set.
- The later repository seam upgrade still belongs to product architecture, not to simulation CI inventing its own storage contract.

## 2026-04-02 Release Readiness

- The root `README.md` now needs to explain two things more explicitly for GitHub readers:
  - the project directory/workspace split, especially `docs/superpowers/`, `simulation-toolset/`, and archive materials
  - a coding-agent reading order that matches the dual-loop architecture and the current simulation workflow
- For this release, `v1.3.2` is the smallest coherent version boundary because it groups together:
  - the cloud-friendly simulation toolset
  - route/UI smoke coverage
  - the cloud Codex agent guide
- Local verification for the release should include both product and toolset checks.
- Temporary `.tmp-simulation-*` directories are still generated during simulation runs.
- A direct shell cleanup attempt was blocked by platform policy in this session, so release hygiene must rely on explicit staging instead of assuming the working tree can be made empty first.
- The GitHub Actions workflow itself is deferred from this release because the current GitHub auth path available in-session cannot reliably obtain `workflow` scope for pushing `.github/workflows/ci.yml`.
- This is a release-ops constraint, not a code-quality blocker in the simulation toolset.

## 2026-04-02 `ui-ux-pro-max` 对 Phase 1 spec 的使用原则

- 已针对 `Phase 1` 的界面方向执行一次 `ui-ux-pro-max` 设计系统查询，关键词为：
  - `desktop authoring editor narrative neue brutalism`
- 这次查询里真正可吸收的部分是：
  - 强边框
  - 零圆角
  - 高对比
  - 大块分区
  - 少动效 / 硬切换
- 但工具给出的通用 brutalism 字体与部分语气，不适合当前仓库已经存在的编辑器界面。
- 因此 `Phase 1` 写 spec 时，`ui-ux-pro-max` 的角色应被明确限定为：
  - 风格边界检查工具
  - 不是重新发明一套视觉系统的来源
- `Phase 1` 的 UI / UX 设计必须严格服从当前仓库已有的新粗野主义视觉语言：
  - 保持黑色粗边框、硬切块、低装饰、桌面端高信息密度
  - 不引入更柔和、更圆润、更现代 SaaS 化的漂移
  - 不因为新页拆分就擅自换字体、换配色、换交互语气

## 2026-04-02 Phase 1 地点收尾结论

- `sample-scene` 里的旧地点长文已经不再保留为一个笼统块，而是被彻底转译成正式地点条目，并同步写回场景地点引用。
- `Scene Location` 现在不再使用复选框网格，而是改成与 `Scene Cast` 同一套壳子：
  - 可收起 / 展开
  - 收起态显示已选地点标签
  - 已选标签本身可直接移除
  - 保持当前编辑器的新粗野主义视觉语言
- 这次用户明确把地点选择从“仅 authoring 元数据”升级成了“真实运行边界”：
  - `sceneSpec.locationIds` 现在会进入 runtime projection
  - 未被选择的地点不会进入场景运行时地点上下文
  - 当没有显式地点时，最终 prompt 文本中不再保留空的地点栏位
- 地点选择器还补了一条恢复路径：
  - 当场景里带着失效地点编号时，作者可以直接用 `清空显式地点` 清掉显式选择
  - 不会再出现“界面看得到坏编号，但作者没有任何自救出口”的情况
