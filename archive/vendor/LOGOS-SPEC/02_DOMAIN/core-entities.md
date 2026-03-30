# Core Entities

## 目的

术语表回答的是“词是什么意思”，而核心实体文档回答的是“系统里到底有哪些对象”。这一步之所以必须单独存在，是因为很多概念虽然在语言层面已经清楚，但一旦进入工程拆解，仍然需要被判断为“持久对象、临时对象、运行时对象还是评估对象”。如果这一步不提前做，后续模块文档就会一边解释概念，一边重新发明对象边界。

因此，本文件的重点不在实现细节，而在对象分类、关系方向和持久性。对于 coding agent 来说，知道某个对象是否应该长期保存、是否应在每轮重建，以及它与其他对象的依赖关系，往往比知道它最终长什么 UI 更重要。

## 实体分组原则

当前 Sample 版本的实体分为四组。第一组是作者定义的静态实体，它们在运行前就存在，主要决定故事方向和控制边界。第二组是运行时状态实体，它们随每轮推进而变化。第三组是生成产物实体，也就是由叙事引擎输出并交给后续模块消费的对象。第四组是评估与修正实体，它们不直接推进故事，但会影响本轮是否被接受。

这种分组方式的价值，在于它天然对应后续的模块边界。作者层负责生产静态实体，编排层负责推进运行时实体，生成层负责产生产物实体，而审计层负责处理评估实体。

## 作者定义的静态实体

| 实体 | 作用域 | 说明 | 持久性 |
|---|---|---|---|
| `SceneSpec` | Scene 级 | 定义当前 Scene 的主轴、终点线与整体目标。 | 持久 |
| `PhasePlan` | Phase 级 | 定义某个 Phase 的局部目标与梯度类型。 | 持久 |
| `RouterProfile` | 路由级 | 定义一个叙事路由的名称、语义和行为词典。 | 持久 |
| `WorldBase` | 场景级 | 包含主角设定、按需加载的配角设定与地点词池。 | 持久 |
| `AuditQuestionSet` | 规则级 | 一组可供当前轮挑选的是/否审计问题。 | 持久 |

这些实体都属于“运行前已经存在”的对象。它们可以来自作者配置、设计文档或样例 fixture，但不应该在一轮生成中被临时重写。即使后续实现允许编辑，它们的修改节奏也应明显慢于运行时状态。

## 运行时状态实体

| 实体              | 作用域     | 说明                                                     | 持久性  |
| --------------- | ------- | ------------------------------------------------------ | ---- |
| `SceneState`    | Scene 级 | 表示当前 Scene 的运行位置与可达边界。                                 | 可变   |
| `PhaseState`    | Phase 级 | 表示当前 Phase 的索引、目标、剩余 Beat 与梯度映射。                       | 可变   |
| `RoundState`    | Round 级 | 表示当前轮生成所需的最小控制状态。                                      | 短时可变 |
| `StateSnapshot` | 任意时点    | 某一时刻可被读取和传递的状态快照；在 Phase 结束时，它也承载阶段后果结算结果，供光锥坍缩模块重推边界。 | 短时持久 |
| `HistoryWindow` | Round级  | 当前轮允许访问的前序 Beat 视窗。                                    | 滚动更新 |

在当前 Sample 中，`RoundState` 是运行时最关键的状态实体，因为导演批注层、Prompt 组装器和审计员最终都围绕它工作。`StateSnapshot` 则是为了后续跨模块传递而存在的读取形态，它不是独立业务对象，而是对运行时状态的一个可序列化切片；尤其在 Phase 结束处理时，它需要把上一阶段累积的真实后果稳定地交给 `Light Cone Collapse`，作为下一次边界重推演的输入。

## 生成产物实体

| 实体 | 产生时机 | 说明 | 下游消费者 |
|---|---|---|---|
| `BeatArtifact` | generate 完成后 | 本轮生成的正文。 | 玩家界面、审计员、历史窗口 |
| `OptionSet` | generate 完成后 | 与正文共同生成的 4 个选项。 | 玩家界面、审计员 |
| `DirectorNote` | generate 前 | 将当前轮控制条件压缩为局部高优先级指令。 | Prompt 组装器 |
| `PromptObject` | 调用 LLM 前 | 由多个上游模块输出拼装成的结构化提示对象。 | API 适配器 |
| `PhaseConsequencePacket` | Phase 结束时 | 由 Orchestrator 汇聚当前 Phase 已接受转录与上下文，交给阶段后果结算调用。 | API 适配器、Phase Consequence Settlement |
| `PhaseConsequenceResult` | Phase 结束时 | settlement 模式返回的 `phaseConsequences[]` 与 `settlementTrace`。 | Orchestrator、Light Cone Collapse |
| `CollapsePacket` | Phase 结束时 | 由 Orchestrator 汇聚 `phaseConsequences[]` 与当前边界，交给 API 适配器的 collapse 模式调用 LLM 推演新边界。 | API 适配器、Light Cone Collapse |

这些实体都有一个共同特征，即它们是“流经系统”的对象，而不是长期自足的配置。`DirectorNote` 会随着每轮变化，`PromptObject` 只为一次调用服务，`BeatArtifact` 和 `OptionSet` 则在被历史窗口吸收之后，才会间接影响下一轮。

## 评估与修正实体

| 实体 | 产生时机 | 说明 | 备注 |
|---|---|---|---|
| `AuditPacket` | 审计前 | 把前序上下文、本轮正文、选项与问题组装成审计输入。 | 交给审计员 |
| `AuditResult` | 审计后 | 审计员对问题的布尔判定结果。 | 不负责最终裁决 |
| `RewriteFeedback` | 审计失败后 | 由失败项整理出的重写要求。 | 交回生成侧 |
| `GenerationControl` | 重写前 | 由 `retryCount`、`RewriteFeedback` 与上一版失败草稿组装成的 retry 控制包。 | Prompt 组装器、生成链路 |
| `RetryState` | 重写循环中 | 记录当前已重试次数与最后一次失败项。 | 防止无限循环 |
| `AuditResolverResult` | 审计裁决后 | Audit Resolver 基于 AuditResult 与阻塞规则输出的流程裁决信号（pass/fail）与 RewriteFeedback。 | Orchestrator、重写链路 |

这组实体的特点，是它们存在于“生成之后、接受之前”的狭窄区间。它们不直接产出故事内容，却决定本轮产物能否进入正式历史。因此，它们必须被当作独立对象对待，而不能被随手塞进注释或日志里。

## 实体关系总览

从关系上看，当前 Sample 的核心链条可以概括为：

`SceneSpec` 包含多个 `PhasePlan`，并与 `WorldBase` 共同构成当前 Scene 的静态边界；运行时由此派生出 `SceneState`、`PhaseState` 与 `RoundState`；`RoundState` 经过导演批注层后产出 `DirectorNote`，再与历史窗口、世界基础和叙事边界一起组成 `PromptObject`；如果当前轮进入重写，系统还会把 `GenerationControl` 临时附着到 `PromptObject`；`PromptObject` 经生成得到 `BeatArtifact` 与 `OptionSet`；随后系统把这些产物打包成 `AuditPacket`，得到 `AuditResult`，必要时再生成 `RewriteFeedback` 并进入重试循环；而当一个 Phase 结束时，系统会先组装 `PhaseConsequencePacket`，经阶段后果结算得到 `PhaseConsequenceResult.phaseConsequences[]`，再写入 `StateSnapshot` 并交给 `Light Cone Collapse` 重新推演下一阶段的 `Alpha/Beta`。

这条链条之所以重要，是因为它说明 LOGOS 不是“从 prompt 直接到正文”的单步系统，而是一组对象连续变形的控制系统。后续无论是写编排层还是写模块层，都应围绕这条对象链展开，而不是绕过对象直接描述页面交互。

## 当前版本的实体边界

当前 Sample 版本刻意不引入多 Scene 调度器、长期记忆库、Header 实体和复杂世界状态图。这并不意味着未来不会有这些对象，而是意味着现阶段如果把它们也写成核心实体，只会让领域层过早膨胀。因此，第二阶段只承认当前真的会参与 Sample 测试的对象，其余对象先留在模块边界或后续 ADR 中处理。
