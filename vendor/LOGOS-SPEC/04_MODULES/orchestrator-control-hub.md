---
module: orchestrator-control-hub
title: 编排控制中枢
type: module
priority: core
depends_on:
  - phase-consequence-settlement
  - light-cone-collapse
  - phase-gradient
  - narrative-router
  - director-note-layer
  - prompt-assembler
  - auditor
  - audit-resolver
  - memory-placeholder
consumed_by: []
contracts:
  - 05_CONTRACTS/prompt-object-schema.yaml
  - 05_CONTRACTS/audit-packet-schema.yaml
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/collapse-packet-schema.yaml
  - 05_CONTRACTS/audit-question-set-schema.yaml
  - 05_CONTRACTS/state-snapshot-schema.yaml
  - 05_CONTRACTS/phase-plan-schema.yaml
tokens_estimate: 1400
reading_context:
  - 02_DOMAIN/glossary.md
  - 03_ORCHESTRATION/runtime-loop.md
  - 04_MODULES/audit-resolver.md
  - 04_MODULES/phase-consequence-settlement.md
  - 05_CONTRACTS/module-dependency-map.md
status: v1-complete
last_updated: 2026-03-20
---

# Orchestrator Control Hub

## 模块定位

`Orchestrator Control Hub` 是 LOGOS Sample 版本的总控模块。它的职责不是直接写出故事文本，而是把作者定义的静态边界、当前运行时状态和各个控制模块的输出组织成一条可执行的生成链路。换句话说，它是流程协调者，而不是内容生产者。

从系统位置上看，Orchestrator 处在作者配置与运行时生成之间。上游给它的是 Scene 主轴、Phase 计划、路由资源、世界基础与审计规则，下游从它这里获得的是可用于当前轮生成与校验的一致控制状态。

## 核心职责

当前 Sample 版本中，Orchestrator 至少负责以下四件事：

1. 维护当前活跃的 Scene、Phase 与 Beat 位置。
2. 在每一轮开始前收束 `RoundState`，并驱动下游控制模块按顺序工作。
3. 在一轮结束后推进计数，并在需要时触发 Phase 结束处理；当 Phase 结束时，负责组装阶段结算输入、调用 `Phase Consequence Settlement` 产出 `phaseConsequences[]`，再驱动 `Light Cone Collapse` 重新推演下一阶段边界。
4. 维护“谁应该在何时被调用”的总流程顺序，防止模块绕过统一编排点。

它的价值不在于拥有所有细节，而在于拥有流程主导权。只要 Orchestrator 的位置不稳，其他模块就会各自尝试接管控制，系统就会迅速失去一致性。

## 输入

Orchestrator 在当前版本消费两类输入。一类是静态输入，包括 `SceneSpec`、`PhasePlan`、`WorldBase`、`RouterProfile` 和 `AuditQuestionSet`；另一类是运行时输入，包括玩家本轮输入、当前历史窗口、当前 `Alpha/Beta` 边界、上一轮留下的状态结果，以及在重写路径上来自 `Audit Resolver` 的 `RewriteFeedback / retryCount`，和在 Phase 结束时需要被组装为 `PhaseConsequencePacket` 的当前 Phase 已接受转录。

对 Orchestrator 来说，最重要的不是输入内容多，而是输入是否已经处于可消费的结构化形态。因此，它应依赖领域层和契约层，而不应直接去解释未经整理的散乱原稿。

## 输出

Orchestrator 并不直接对玩家输出正文。它的主要输出有三种：

1. 提供给当前轮控制模块的 `RoundState`。
2. 提供给 Prompt 组装器的上游结构化控制结果。
3. 提供给裁决与生命周期处理的流程推进信号。

因此，Orchestrator 输出的是“下一步该怎么干”的控制信息，而不是最终的叙事文本本身。

## 协作关系

在 Sample 版本中，Orchestrator 与其他模块的协作顺序应保持稳定：

1. 调用 `Light Cone Collapse` 获取或更新当前边界；当一个 Phase 结束时，必须先调用 `Phase Consequence Settlement` 结算上一阶段真实后果，再触发下一次边界重推演。
2. 调用 `Phase Gradient` 获取当前 Phase 的声量序列与本轮音量。
3. 调用 `Narrative Router` 取得当前轮路由与行为词典。
4. 调用 `Director Note Layer` 形成局部高优先级约束。
5. 将上述结果交给 `Prompt Assembler` 形成 `PromptObject`。其中 `Option Generator` 的三步管线约束已通过 `Director Note Layer` 的 `optionConstraints` 嵌入 `PromptObject`，不需要 Orchestrator 单独调用；如果当前轮处于重写路径，则还要把 `retryCount + RewriteFeedback + previousDraft` 作为 `generationControl` 一并交给 `Prompt Assembler`。
6. 通过 API 适配器触发生成与审计调用。生成结果同时包含 Beat 正文与 4 个选项（见 ADR-001）。
7. 读取 `Auditor` 与 `Audit Resolver` 的结果，决定重写、推进或结束。

这条顺序之所以必须写明，是因为它实际上就是 LOGOS 当前版本的最小运行骨架。

## 不负责什么

Orchestrator 在当前版本明确不负责以下事项：

- 不直接生成 Beat 正文或 4 个选项。
- 不直接执行 LLM provider 协议映射。
- 不直接给出最终审计布尔答案。
- 不自己承担阶段后果的语义抽取工作。
- 不承担长期记忆压缩与 Header 召回。
- 不替代 UI 做页面状态管理。

这些边界必须保持严格，否则 Orchestrator 会迅速膨胀成一个“什么都做一点”的超大模块，后续不仅难实现，也难被 coding agent 正确维护。

## 当前版本边界

在 Sample 版本里，Orchestrator 允许采用线性单 Scene 编排，不需要处理并发 Scene、不需要处理动态 Phase 长度，也不需要提前支持复杂工作流恢复。这不是偷懒，而是因为当前验证目标是控制链能否闭环，而不是编排器能否覆盖未来所有扩展场景。
