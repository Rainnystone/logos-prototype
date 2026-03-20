---
contract: orchestrator-io
type: contract
consumed_by:
  - orchestrator-control-hub
tokens_estimate: 1000
last_updated: 2026-03-20
---
# Orchestrator Input / Output

## 目的

这份文件的任务，是把当前 Sample 版本各模块对外暴露的输入输出摘要压成一张可快速检索的表。它不替代详细模块说明，也不替代后面的 schema 文件；它更像一份工程导航页，让 coding agent 在开始实现某个模块时，能够先快速判断“这个模块吃什么、吐什么、谁来用它”。

## 使用原则

这里记录的是“对外可见 I/O”，而不是模块内部的每个中间变量。因此，表中的字段会刻意压缩成当前阶段真正稳定的输入输出边界。只要后续 schema 继续演化，这份表就应保持同步，但不需要追逐实现细节。

## 模块 I/O 总表

| 模块 | 最小输入 | 最小输出 | 主要消费者 |
|---|---|---|---|
| `Orchestrator Control Hub` | `SceneSpec`、`PhasePlan[]`、`WorldBase`、玩家输入、历史窗口、当前状态 | `RoundState`、流程推进信号、阶段切换信号 | 下游控制模块、裁决逻辑 |
| `Phase Consequence Settlement` | `mainAxis`、`endLine`、`phaseGoal`、当前 Phase 已接受转录 | `phaseConsequences[]`、`settlementTrace` | `Orchestrator`、`Light Cone Collapse` |
| `Light Cone Collapse` | `mainAxis`、`endLine`、`StateSnapshot`（含 `phaseConsequences`） | `alpha`、`beta`、边界说明 / 重推演说明 | `Orchestrator`、`Director Note Layer`、`Prompt Assembler`、`Option Generator` |
| `Phase Gradient` | `gradientType`、`currentBeatIndexInPhase` | `volumeSequence`、`currentVolume` | `Orchestrator`、`Director Note Layer`、`Prompt Assembler`、`Option Generator` |
| `Narrative Router` | 当前场景判定、`RouterProfile` | `routerName`、`verbLexicon` | `Orchestrator`、`Director Note Layer`、`Option Generator` |
| `Option Generator` | `precedingBeats`、`routerName`、`verbLexicon`、主角性格、`alpha`、`beta`、`currentVolume` | `optionConstraints` 生成逻辑（设计时约束） | `Director Note Layer`、`Prompt Assembler` |
| `Director Note Layer` | `RoundState`、局部硬规则 | `beatConstraints`、`optionConstraints` | `Prompt Assembler` |
| `Memory Placeholder` | 已接受历史窗口 | `precedingBeats` | `Prompt Assembler`、`Auditor`、`Orchestrator`、`Option Generator` |
| `Prompt Assembler` | `worldBase`、`precedingBeats`、`mainAxis`、`endLine`、`phaseGoal`、`alpha`、`beta`、`currentVolume`、`routerName`、`verbLexicon`、`beatConstraints`、`optionConstraints`、可选 `generationControl` | `PromptObject` | `API Adapter Lite` |
| `API Adapter Lite` | `PromptObject`、`AuditPacket`、`PhaseConsequencePacket` 或 `CollapsePacket`、provider 配置 | 统一响应对象（`GenerateResult` / `AuditResult` / `PhaseConsequenceResult` / `CollapseResult`）、`usage`、`tokenReport` | 生成链路、审计链路、阶段后果结算链路、光锥坍缩链路 |
| `Auditor` | `AuditPacket` | `AuditResult` / 布尔答案数组 | `Audit Resolver` |
| `Audit Resolver`（代码层） | `AuditResult`、阻塞规则、`retryCount` | `pass/fail`、`blockingFailures`、`RewriteFeedback` | `Orchestrator`、重写链路 |

## 关键命名对齐

为了避免契约层和 API 层出现双重命名，当前版本固定以下对齐规则：

- Prompt 装配后的统一对象命名为 `PromptObject`。
- `PromptObject` 内部顶层字段命名为 `worldBase`、`history`、`narrative`、`directorNote`，并允许在 retry 时附加 `generationControl`。
- 审计输入统一命名为 `AuditPacket`。
- `AuditPacket` 顶层字段命名为 `context`、`generatedContent`、`auditQuestions`。
- 阶段后果结算输入统一命名为 `PhaseConsequencePacket`。
- 阶段后果结算返回统一命名为 `PhaseConsequenceResult`。
- 状态快照统一命名为 `StateSnapshot`。
- `StateSnapshot` 在 Phase 结束处理时允许额外携带 `phaseConsequences`，作为 `Light Cone Collapse` 重新推演下一阶段边界的输入。

这里有一个容易混淆的点：`Memory Placeholder` 的模块输出字段名是 `precedingBeats`，但在 `PromptObject` 里，这部分被装配到 `history` 字段下。也就是说，模块输入名与装配后对象名并不完全相同，这属于正常映射，而不是冲突。

另一个容易混淆的点是 `Option Generator`。当前版本中，它不是一次独立的运行时模块调用，而是定义“4 个选项应如何被约束地产出”的三步管线。它的结果先被 `Director Note Layer` 写成 `optionConstraints`，再进入 `PromptObject.directorNote`；玩家最终看到的 4 个选项，则由同一次 generate 调用返回的 `GenerateResult.options[]` 承载。

还有一个容易混淆的点是 `generationControl`。它不是第五层世界语义，也不是 `Director Note Layer` 的替身；它只是在 retry 路径上由 Orchestrator 基于 `retryCount`、`RewriteFeedback` 与上一版失败草稿临时附着到 `PromptObject` 的控制覆盖层。

## 结构化输出优先级

当前版本要求所有面向下游的模块输出尽量采用结构化形态，而不是松散自然语言。例如，`Narrative Router` 的核心输出应是 `routerName + verbLexicon`，而不是一段自由描述；`Phase Gradient` 的核心输出应是序列和当前值，而不是只说“这段比较紧张”；`Auditor` 的核心输出应是布尔答案，而不是长评语。

这条原则的意义在于，后续 coding agent 只有在面对稳定结构时，才能真正并行实现多个模块，而不至于反复从 prose 中重新提取字段。

## 当前版本边界

由于当前 Sample 版本尚未进入实现代码阶段，这份总表仍然只记录逻辑接口，不记录函数签名、文件导出方式和具体语言类型定义。等后续需要把这些契约压成 TypeScript 类型时，可以在实现仓库中进一步细化，但不应回头改写这里的逻辑命名。
