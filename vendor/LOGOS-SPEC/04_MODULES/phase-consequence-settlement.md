---
module: phase-consequence-settlement
title: 阶段后果结算器
type: module
priority: core
depends_on:
  - state-snapshot
  - api-adapter-lite
consumed_by:
  - orchestrator-control-hub
contracts:
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/state-snapshot-schema.yaml
tokens_estimate: 1700
reading_context:
  - 02_DOMAIN/state-model.md
  - 03_ORCHESTRATION/runtime-loop.md
  - 04_MODULES/light-cone-collapse.md
status: v1-complete
last_updated: 2026-03-20
---

# Phase Consequence Settlement

## 模块定位

`Phase Consequence Settlement` 是 Phase 结束时专门负责把“本阶段已经真实发生了什么”结算成结构化 `phaseConsequences[]` 的模块。它不负责推演下一阶段边界，也不负责推进生命周期；它只负责把本 Phase 已接受历史中的真实后果提炼出来，交给后续光锥坍缩使用。

这个模块存在的原因很直接：当前 Sample 版本的 Beat 产物仍然是自然语言正文与选项，没有同步产出可直接聚合的结构化 `stateDelta`。在这种前提下，阶段后果结算本质上是一次受控的语义抽取任务，不能继续模糊地留给 Orchestrator prose，也不应被错误地塞进 `Light Cone Collapse` 自己内部。

## 核心职责

当前 Sample 中，Phase Consequence Settlement 负责以下四件事：

1. 接收当前 Phase 已接受的玩家/系统转录与必要的阶段上下文。
2. 只基于已发生事实，提炼 3-6 条可供下游消费的 `phaseConsequences[]`。
3. 输出 `settlementTrace`，说明这些后果是如何从阶段转录中被归纳出来的。
4. 明确过滤猜测性、计划性与反事实表述，保证结果可直接进入 `CollapsePacket`。

因此，它是“阶段事实提炼器”，不是“阶段边界推演器”。

## 输入

这个模块的最小输入包括：

- 当前 Scene 的 `mainAxis`
- 当前 Scene 的 `endLine`
- 刚结束的 `phaseGoal`
- 当前 Scene 的推进摘要（可选）
- 当前 Phase 的已接受转录 `phaseTranscript[]`

这里的 `phaseTranscript[]` 必须只包含已经通过审计并写入历史的 `user / assistant` 内容，不得混入失败草稿、候选中间稿或未被接受的选项分支。

## 输出

该模块的标准输出包括：

- `phaseConsequences[]`
- `settlementTrace`

`phaseConsequences[]` 的每一项都应是一句完整、可验证、面向事实的后果陈述，供 `Light Cone Collapse` 作为下一阶段边界重推演的输入。`settlementTrace` 则只承担可追踪性职责，不替代 `phaseConsequences[]` 自身。

## 工作方式

在实现路径上，Orchestrator 会在 Phase 结束时先从“当前 Phase 已接受历史”中组装 `PhaseConsequencePacket`，随后通过 API Adapter Lite 的 `settlement` 模式调用 LLM。该 LLM 调用只负责做语义结算，不负责生成 `Alpha/Beta`；结算结果返回为 `PhaseConsequenceResult`，其中最关键的字段是 `phaseConsequences[]`。

只有当阶段后果已经被稳定结算出来，Orchestrator 才允许继续触发 `Light Cone Collapse`。这条顺序不可颠倒，因为 `collapse` 的输入不是“原始 Phase 转录”，而是已经完成事实收束的 `phaseConsequences[]`。

## 与其他模块的关系

`Phase Consequence Settlement` 上承 `Orchestrator Control Hub`，下接 API Adapter Lite 的 `settlement` 调用模式，并把结果回交给 Orchestrator。它与 `Light Cone Collapse` 的关系是串行协作而不是职责重叠：前者负责“结算后果”，后者负责“基于后果重推边界”。

这两个模块如果不拆开，后续实现就会混淆“事实提炼”和“边界推演”这两种不同的语义工作。

## 不负责什么

当前版本中，这个模块明确不负责：

- 不直接推演新的 `Alpha/Beta`
- 不直接推进 Phase / Scene 生命周期
- 不裁决审计是否通过
- 不压缩长期记忆
- 不把失败草稿混入阶段后果

## 当前版本边界

当前 Sample 版本采用“Phase 结束时新增一次专门的 LLM 结算调用”作为规范性路径。这不是对长期形态的永久冻结。后续如果系统升级为每个 Beat 同步产出结构化 `stateDelta`，阶段后果就可以改由代码聚合；但在当前版本里，对外仍必须表现为一个明确、稳定、可验证的结算步骤，而不是隐含在人类理解中的模糊过程。
