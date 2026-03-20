---
module: audit-resolver
title: 审计裁决器
type: module
priority: core
depends_on:
  - auditor
  - audit-question-set
consumed_by:
  - orchestrator-control-hub
contracts:
  - 05_CONTRACTS/audit-packet-schema.yaml
  - 05_CONTRACTS/audit-question-set-schema.yaml
tokens_estimate: 1200
reading_context:
  - 02_DOMAIN/glossary.md
  - 03_ORCHESTRATION/control-flow-and-decision-points.md
  - 04_MODULES/auditor.md
status: v1-complete
last_updated: 2026-03-20
---

# Audit Resolver

## 模块定位

`Audit Resolver` 是当前 Sample 版本中负责把审计员的布尔判定结果转化为流程裁决的代码层模块。它不是 LLM 模块，而是纯代码逻辑；它的存在意义，是把"语义判定"和"流程推进"之间的边界固定下来，防止审计员越权直接控制流程。

在系统中，Auditor 负责"看"，Resolver 负责"判"。只要这条边界保持清楚，系统的可追踪性就不会因为审计逻辑的复杂化而下降。

## 核心职责

当前 Sample 中，Audit Resolver 负责三件事：

1. 读取 `AuditResult.answers[]` 与完整问题集中对应问题的 `expected` 和 `blocking` 属性，判定哪些问题构成阻塞失败。
2. 根据阻塞失败项的存在与否，输出 `pass`（放行）或 `fail`（需要重写）的流程信号。
3. 当判定为 `fail` 时，基于失败项整理 `RewriteFeedback`，交回生成侧，并由 Orchestrator 进一步组装为 `PromptObject.generationControl`。

## 输入

Audit Resolver 的最小输入包括：

- `AuditResult.answers[]`：审计员返回的布尔答案数组。
- 当前轮使用的问题 ID 列表（来自 Orchestrator 按 `selectionPolicy` 挑选的结果）。
- 完整问题集中对应问题的 `expected` 与 `blocking` 属性（来自 `AuditQuestionSet`）。
- `retryCount`：当前轮已重试次数。

## 输出

该模块的标准输出包括：

- `pass` 或 `fail`：本轮是否放行。
- `blockingFailures[]`：阻塞失败项的问题 ID 与失败描述。
- `RewriteFeedback`：当 `fail` 时，基于失败项整理的精确重写要求文本。

## 裁决规则

当前 Sample 版本采用以下裁决规则：

1. 逐条比对 `answers[i]` 与对应问题的 `expected` 值。
2. 如果不匹配且该问题的 `blocking` 为 `true`，则记为阻塞失败项。
3. 如果存在至少一个阻塞失败项，且 `retryCount < 3`，则输出 `fail` 并生成 `RewriteFeedback`。
4. 如果 `retryCount >= 3`，即使存在阻塞失败项，也强制放行并附带警告标记。
5. 如果不存在阻塞失败项，即使存在非阻塞失败，也输出 `pass`。

## RewriteFeedback 生成方式

当前版本中，`RewriteFeedback` 由代码基于阻塞失败项拼接生成，不需要额外 LLM 调用。拼接逻辑为：列出所有阻塞失败项的问题文本与期望答案，形成一段精确的修正要求；随后由 Orchestrator 把它与 `retryCount`、`currentBeatText`、`currentOptions` 一起组装为 `PromptObject.generationControl`，在重写时作为显式控制包注入。

## 与其他模块的关系

Audit Resolver 上承 `Auditor`，下接 `Orchestrator Control Hub`。它不直接调用 API 适配器，也不直接修改历史窗口。它的唯一职责是把审计结果转化为可执行的流程信号；至于 `generationControl` 何时被装入 `PromptObject`，属于 Orchestrator / Prompt Assembler 的职责边界，而不是 Resolver 自己直接外发给模型。

## 不负责什么

当前版本中，Audit Resolver 不负责：

- 不执行审计判定本身（那是 Auditor 的职责）。
- 不直接推进 Beat 计数或 Phase 生命周期。
- 不生成正文或选项。
- 不管理 provider 或 API 调用。

## 当前版本边界

在 Sample 版本中，Audit Resolver 是纯代码模块，不涉及 LLM 调用。它的裁决规则固定为上述五条，不支持动态权重或复杂评分。后续如果需要更精细的裁决策略，可以在不改变 Auditor 接口的前提下扩展本模块的内部逻辑。
