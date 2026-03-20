# ADR-004: Phase 结束后的光锥坍缩必须基于阶段后果重推演边界

## 状态

已决定

## 背景

母文档在光锥坍缩部分的要求非常明确：Phase 结束时，系统不只是“把边界收小”，而是要以玩家在上一阶段造成的真实后果为新坐标，重新看向 Scene 终点线，并据此推演下一阶段的 `Alpha/Beta`。然而早期 `LOGOS-SPEC` 第一版为了强调 Sample 可落地性，把这一机制描述得过于接近“规则收缩”，从而弱化了 LOGOS 最关键的因果反馈结构。

## 决策

当前 `LOGOS-SPEC` 统一采用以下定义：当一个 Phase 结束时，`Light Cone Collapse` 必须基于状态结算得到的 `phaseConsequences`，重新面向 `endLine` 做语义重推演，并生成下一阶段新的 `Alpha/Beta`。这一步在概念上不得被降格为单纯规则缩放。

## 理由

1. 这条机制决定了 LOGOS 为什么不是普通的阶段式约束系统，而是一个会根据玩家真实后果不断重建可达叙事空间的控制系统。
2. 如果只保留“边界会收缩”而不保留“为何如此收缩、围绕什么重新推演”，后续实现会误把光锥坍缩写成固定模板或数值规则，从而损伤跨题材通用性。
3. 对 coding agent 来说，这条定义必须足够稳定且足够显式，否则它们会把 `Light Cone Collapse` 误实现成流程性的收尾模块，而不是叙事边界的重投影模块。

## 后果

- `StateSnapshot` 在 Phase 结束时需要能够携带 `phaseConsequences`，供 `Light Cone Collapse` 消费。
- 编排层和生命周期文档必须把“阶段后果结算 -> 边界重推演”写成 Phase 结束处理的固定链路。
- 当前 Sample 版本将阶段后果结算明确建模为独立的 `Phase Consequence Settlement` 步骤；它通过 API Adapter Lite 的 `settlement` 模式调用 LLM，把当前 Phase 已接受转录结算为 `phaseConsequences[]`。
- API Adapter Lite 已新增 `collapse` 调用模式（`mode: "collapse"`），专门服务于 Phase 结束时的光锥坍缩语义推演。该模式的输入契约为 `CollapsePacket`，输出契约为 `CollapseResult`，详见 `05_CONTRACTS/collapse-packet-schema.yaml` 与 `04_MODULES/api-adapter-lite/interface-contracts.md` §3.4。
- settlement 模式的输入契约为 `PhaseConsequencePacket`，输出契约为 `PhaseConsequenceResult`，详见 `05_CONTRACTS/phase-consequence-packet-schema.yaml` 与 `04_MODULES/api-adapter-lite/interface-contracts.md` §3.3。
- collapse 模式的 `temperature` 由后端强制收束到 `0.5`，以在确定性推理与适度发散之间取得平衡。
