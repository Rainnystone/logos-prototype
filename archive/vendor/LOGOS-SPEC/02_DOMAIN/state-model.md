# State Model

## 目的

如果术语表负责锁定语言，核心实体文档负责锁定对象，那么状态模型负责锁定“系统在运行时究竟要记住什么”。这一步之所以重要，是因为 LOGOS 不是一次性生成器，而是一个逐轮推进、逐阶段收束的控制系统。只要运行时状态没有被定义清楚，后续无论写 Prompt Assembler、Auditor 还是光锥坍缩，都会在“应该从哪里取当前信息”这个问题上不断打架。

当前这份状态模型只服务于 Sample 版本，因此它追求的是“最小可运行状态”，而不是未来完整版本的全景状态图。换句话说，它刻意收缩，只保留当前真的要被读取、传递和更新的状态。

## 状态分层

当前 Sample 版本的状态可以分为四层。第一层是静态配置状态，也就是作者或设计阶段先定义好的世界基础、Scene 主轴、Phase 计划和路由资源。第二层是场景级运行状态，它描述当前 Scene 已经推进到哪里，以及当前的光锥边界是什么。第三层是本轮状态，它描述当前生成循环真正需要消费的局部控制条件。第四层是评估与重写状态，它描述本轮产物是否通过，以及如果失败应如何重试。

这样的分层方式有一个直接好处：它把“会频繁变化的状态”和“几乎不变化的状态”分开了。这样后续系统实现时，就不会把大段静态设定和短期重试计数放进同一个对象里。

## 最小状态集合

| 状态组 | 代表字段 | 谁负责写入 | 更新频率 |
|---|---|---|---|
| 静态配置状态 | `sceneSpec`、`phasePlans`、`worldBase`、`routerProfiles`、`auditQuestionSet` | 作者配置或 fixture | 很低 |
| Scene 运行状态 | `currentSceneId`、`currentPhaseIndex`、`alpha`、`beta`、`endLine`、`sceneProgress`、`phaseConsequences` | Orchestrator | 每 Phase 或每轮读取 |
| Round 状态 | `currentBeatIndexInPhase`、`currentVolume`、`currentRouter`、`phaseGoal`、`historyWindow`、`directorConstraints` | Orchestrator / Director Note Layer | 每轮更新 |
| 生成产物状态 | `currentBeatText`、`currentOptions`、`promptObject` | 生成链路 | 每轮重建 |
| 评估状态 | `auditAnswers`、`blockingFailures`、`retryCount`、`rewriteFeedback` | Auditor / Resolver | 每轮更新 |

这里最关键的是，`historyWindow` 虽然看起来像过去内容，但在工程上它仍然属于当前轮状态的一部分。因为系统并不需要“记住一切”，只需要记住当前轮被允许访问的那一小段历史窗口。需要特别区分的是：重写路径和 Phase 结束路径都不能只依赖这段滚动窗口。前者还需要读取当前轮失败草稿与 `rewriteFeedback` 来形成 `generationControl`；后者则需要读取当前 Phase 已接受转录来做 `phaseConsequences` 结算。

## Sample 版本的状态约束

Sample 版本在状态建模上有四条硬约束。第一，同一时刻只存在一个活跃 Scene，不考虑并发场景。第二，同一时刻只存在一个活跃 Phase，Phase 内按固定 4 Beat 推进。第三，历史窗口默认直接读取最近 5 个 Beat，不做 Header 压缩。第四，光锥边界在 Phase 内保持恒定，但当 Phase 结束时，系统必须先完成阶段后果结算，并以该结算结果为新坐标重新面向终点线推演下一阶段边界。

这四条约束非常关键，因为它们决定了当前状态模型不需要引入复杂的回溯、并行状态树或长期记忆索引。也正因为如此，当前状态模型是“线性可推进”的，这使它非常适合先做 Sample 验证。

## 建议的最小状态快照形态

下面这个结构不是最终契约，只是当前领域层认可的最小状态快照轮廓。后续 `05_CONTRACTS/state-snapshot-schema.yaml` 会把它转成机器可读版本。

```yaml
sceneState:
  sceneId: sample-scene
  currentPhaseIndex: 1
  currentBeatIndexInPhase: 2
  mainAxis: "Scene 叙事主轴"
  endLine: "Scene 终点线"
  alpha: "当前激进极边界"
  beta: "当前消极极边界"
  phaseConsequences: []

roundState:
  phaseGoal: "当前 Phase 目标"
  currentVolume: "Med"
  currentRouter: "悬疑/探案"
  verbLexicon: ["勘查", "质证", "诱导", "演绎"]
  historyWindow:
    - role: assistant
      content: "Beat 1 正文"
    - role: user
      content: "玩家选择"
    - role: assistant
      content: "Beat 2 正文"

generationState:
  directorNoteSummary: "本轮高优先级约束"
  promptObject: {}
  currentBeatText: null
  currentOptions: []

evaluationState:
  auditAnswers: []
  blockingFailures: []
  retryCount: 0
  rewriteFeedback: null
```

## 状态更新原则

虽然编排层会在下一阶段更细致地定义何时更新状态，但领域层现在已经可以先锁定几条原则。首先，静态配置状态不应在运行循环中被就地改写；运行循环只应消费它们。其次，Round 状态必须被视为一次性工作状态，因为它天然依赖当前 Beat 的位置和当前历史窗口。再次，评估状态只能由生成结果触发，而不能预先存在于生成前。第四，`phaseConsequences` 只在 Phase 结束处理时被写入，并服务于下一阶段边界的重推演，而不是作为每轮都更新的噪音字段。第五，`retryCount` 与 `rewriteFeedback` 只对当前轮有效，它们会和 `currentBeatText`、`currentOptions` 一起临时组装成 `PromptObject.generationControl`，但不应被直接带入下一轮。第六，Phase 结束时做后果结算时，应读取“当前 Phase 已接受转录”，而不是复用面向当前轮的滚动 `historyWindow` 充当替身。

这些原则的意义在于，把“状态是什么”和“状态如何流动”先区分开。当前文档只负责前者，后续编排层再负责后者。

## 当前版本不建模的内容

当前状态模型故意不纳入以下内容：长期记忆索引、Header 召回、跨 Scene 全局世界状态、复杂角色属性系统、多玩家输入源，以及 UI 级临时状态。这些对象在未来版本可能有价值，但如果此时就把它们塞进状态模型，只会模糊本阶段真正需要验证的核心，也就是叙事控制是否能够在线性 Sample 中稳定运行。
