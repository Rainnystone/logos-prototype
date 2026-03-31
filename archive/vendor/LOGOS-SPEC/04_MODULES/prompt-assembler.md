---
module: prompt-assembler
title: 提示词组装器
type: module
priority: core
depends_on:
  - memory-placeholder
  - light-cone-collapse
  - phase-gradient
  - narrative-router
  - director-note-layer
consumed_by:
  - api-adapter-lite
contracts:
  - 05_CONTRACTS/prompt-object-schema.yaml
tokens_estimate: 1600
reading_context:
  - 02_DOMAIN/glossary.md
  - 03_ORCHESTRATION/runtime-loop.md
status: v1-complete
last_updated: 2026-03-26
---

# Prompt Assembler

## 模块定位

`Prompt Assembler` 是把多模块控制结果收束成最终 `PromptObject` 的装配模块。它不重新定义故事，不补充遗失设定，也不直接生成内容；它做的事情只有一件，就是把已经准备好的输入按固定层次拼成最终可调用的提示对象。

这件事之所以必须单独成模块，是因为“装配顺序”本身就是控制的一部分。如果没有一个统一装配点，不同模块就会尝试各自把信息直接塞给模型，最终导致上下文顺序不可控。

## 核心职责

在当前 Sample 中，Prompt Assembler 负责：

1. 接收世界基础、历史窗口、叙事边界与导演批注等上游结果。
2. 按既定层级和顺序构造 `PromptObject`。
3. 确保最关键的局部控制在最终装配结果中拥有最高近因权重。

因此，它的本质是一台“组装机”，不是一台“解释机”。

## 当前四层结构

根据母文档第一版设计，Prompt Assembler 当前采用四层语义装配结构：

1. `Layer 1: 世界基础`
2. `Layer 2: 记忆上下文`
3. `Layer 3: 叙事边界`
4. `Layer 4: 导演批注`

其中第四层必须放在最后，因为当前版本明确采用 `Recency Priority` / `Recency Bias` 原则，让本轮最关键的局部控制以最高近因权重出现在最终提示对象中。

在这四层之外，当前版本还允许在重写路径上附加一个可选的 `generationControl` 控制包。它不是第五层叙事语义，也不改写四层结构本身；它只是 retry 时附着到 `PromptObject` 的临时控制覆盖层，用来显式传递 `retryCount`、`rewriteFeedback` 与上一版失败草稿。

## 输入

Prompt Assembler 当前最小输入包括：

- `worldBase`
- `precedingBeats`
- `mainAxis`
- `endLine`
- `phaseGoal`
- `alpha`
- `beta`
- `routerName`
- `verbLexicon`
- `directorNote`
- `retryCount`（仅重写时）
- `rewriteFeedback`（仅重写时；其中应包含失败的 audit question 文本与对应正确答案）
- `currentBeatText` / `currentOptions`（仅重写时，作为 `previousDraft` 来源）

这些字段来源于不同上游模块，但它们一旦进入 Prompt Assembler，就不应被再次语义重写，而应被视为已经就绪的装配材料。

## 输出

该模块的标准输出是一个结构化 `PromptObject`，其直接下游是 API 适配器。对编排层来说，Prompt Assembler 是生成链路唯一允许的对外出口；对模块层来说，它是控制结果被合并成单一对象的最终收束点。在普通生成路径上，输出只包含四层语义对象；在重写路径上，输出还会额外挂载 `generationControl`。

这意味着任何绕过它直接发起 LLM 调用的设计，都应被视为违反当前架构。

## 与其他模块的关系

Prompt Assembler 的上游是 `WorldBase`、`Light Cone Collapse`、`Phase Gradient`、`Narrative Router` 和 `Director Note Layer`；在 retry 时，它还会接收由 Orchestrator 提供的 `generationControl`；下游是 API 适配器。它不应向上游反推控制条件，也不应向下游泄露未经整理的局部模块内部结构。

在当前架构里，它既是边界，也是一种纪律：所有对模型的正式输入都必须从这里出发。

在 `branch/narrative-editor` 当前实现中，Prompt Assembler 仍然只消费已经组装好的
控制结果。即使 `control-modules.yaml` 已成为 story package 的一部分，Prompt
Assembler 也不直接读取这份文件；光锥自定义先被 collapse 路径吸收，Director
Note 与 volume 定义先被导演层吸收，然后 Prompt Assembler 只接最终成品。

## 不负责什么

Prompt Assembler 当前不负责：

- 不生成任何正文或选项。
- 不计算 Alpha/Beta。
- 不选择 Narrative Router。
- 不压缩记忆内容。
- 不执行 provider 协议映射。
- 不自己生成 `RewriteFeedback`。

它只负责装配，而装配本身已经足够重要，因此不应再给它附加第二职责。

## 当前版本边界

当前 Sample 版本仍然要求默认读取全部已接受历史，不依赖 Header 或长期记忆召回；因此，Prompt Assembler 当前只需要证明其四层结构和装配顺序是稳定的，同时在 retry 时能稳定附加 `generationControl`，而不需要提前支持复杂记忆拼装策略。
