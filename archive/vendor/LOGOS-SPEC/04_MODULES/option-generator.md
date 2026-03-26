---
module: option-generator
title: 选项生成器
type: module
priority: core
depends_on:
  - narrative-router
  - memory-placeholder
  - light-cone-collapse
  - phase-gradient
consumed_by:
  - director-note-layer
  - prompt-assembler
contracts: []
  # 当前版本不单列独立 OptionSet schema；外部稳定结果对齐 GenerateResult.options（见 interface-contracts.md）
tokens_estimate: 1600
reading_context:
  - 02_DOMAIN/glossary.md
  - 04_MODULES/narrative-router.md
  - 04_MODULES/api-adapter-lite/interface-contracts.md
status: v1-complete
last_updated: 2026-03-20
---

# Option Generator

## 模块定位

`Option Generator` 是负责在每一轮生成 4 个玩家可选行动的结构化管线模块。它不是一个自由发散器，而是一条三步约束管线：先根据当前运行态路由与局部态势确定行动语义重心，再通过强制思维链推导角色心理动机以防止 OOC，最后根据目标声量对选项文本进行最终润色。

这个模块之所以必须独立存在，是因为选项质量直接决定玩家体验的区分度和角色一致性。如果选项生成被简化为"让模型随手写四个选择"，系统就会迅速退化为无差别发散，也无法保证角色行为的心理合理性。

## 核心职责

当前 Sample 中，Option Generator 负责按以下三步顺序生成 4 个选项：

1. 从当前运行态路由与局部态势中拉开 4 个正交行动方向。
2. 强制执行 CoT 心理推导，确保每个方向在当前角色性格和光锥边界下具有心理合理性。
3. 根据目标声量的颗粒度要求，对推导结果进行最终文本润色。

这三步的顺序不可颠倒，因为每一步都依赖前一步的输出作为约束输入。

## 三步管线详解

### 第一步：上下文读取与路由定调 (Context & Router)

引擎首先回顾前文（当前版本默认提取前 5 个 Beat 的剧情），确立玩家当前的处境与状态。随后，引擎结合当前运行态 `routerName` 与 `verbLexicon`，从该语义重心中拉开 4 个正交的动作方向，让它们在策略、风险、投入程度或即时战术上形成清晰区分。

这一步在物理层面上限制了选项的情景范围，确保 4 个选项截然不同且不脱离当前情境。当前版本明确要求：runtime router 名称与 verb lexicon 应继续进入生成链路，但不再被 Director Note 文本直接改写成固定选项模板或硬锁句式。

### 第二步：基于 CoT 的心理学推导 (Anti-OOC Engine)

在生成具体文本前，引擎强制大模型在后台进行一次思维链（Chain of Thought）推导。

推导逻辑：大模型必须结合【主角设定的性格】与【当前光锥的 Alpha/Beta 边界】，自主推演主角在面对第一步抽取的 4 个动作时，其真实的内心活动和动机。

此机制是防止角色 OOC 的核心。例如，同一个"强攻"动作，懦弱角色的 CoT 会推导为"闭眼乱挥"，而战神角色的 CoT 会推导为"战术突击"。若抽取的词汇超出了当前光锥的物理限制，CoT 也会自动将其合理化为"绝望/无效的尝试"。

### 第三步：声量模具的最终应用 (Volume Formatting)

最后，选项生成器读取段落梯度中定义的目标声量。大模型根据目标声量的颗粒度要求（如 `High` 的微观感官聚焦，或 `Low` 的宏观时空跨度），将第二步推导出的心理动机，润色并包装为最终展示给玩家的 4 个行动选项。

## 输入

Option Generator 的最小输入包括：

- `precedingBeats`（前序历史窗口）
- `routerName` + `verbLexicon`（当前运行态路由与行为词典）
- 主角性格设定（来自 `WorldBase`）
- `alpha` / `beta`（当前光锥边界）
- `currentVolume`（当前 Beat 声量）

## 输出

当前版本中，`Option Generator` 的稳定对外结果不是一个独立模块返回值，而是一组会被写入 `PromptObject.directorNote.optionConstraints` 的选项生成约束。模型在同一次 generate 调用中执行这些约束后，最终对外暴露的稳定结果是 `GenerateResult.options[]`。

换句话说，`OptionSet` 在当前 Sample 中是设计层概念，表示“本轮应产出的 4 个选项集合”；它不是一个单独的运行时接口对象。当前版本不额外承诺内部动作语义方向 tag 的独立对外契约。

## 与其他模块的关系

Option Generator 的上游是 `Narrative Router`（提供运行态路由结果）、`Light Cone Collapse`（提供边界）、`Phase Gradient`（提供声量）和 `Memory Placeholder`（提供历史窗口）。这些输入并不会被它组装成一次独立 API 调用，而是被 `Prompt Assembler` 以“运行态路由上下文 + Director Note 约束文本”的组合方式并入最终 `PromptObject`。

在当前架构中，Option Generator 与 Beat 正文在同一轮生成调用中同步产出（见 `09_ADR/adr-001-generation-order.md`），但无论调用方式如何，它都必须经过完整的三步管线，不允许跳过 Anti-OOC Engine 直接输出。

## 不负责什么

当前版本中，Option Generator 不负责：

- 不生成 Beat 正文。
- 不决定当前轮使用哪条路由。
- 不更新 Alpha/Beta 边界。
- 不执行审计判定。
- 不负责 Prompt 的最终装配。

它只负责定义 4 个高区分度、角色一致、节奏匹配的行动选项应如何被约束地产出。

## 与 Prompt Assembler 的架构关系

根据 ADR-001 的决策，Beat 正文与 4 个选项在同一轮 LLM 调用中同步产出。这意味着 Option Generator 的三步管线（路由定调 → Anti-OOC CoT → 声量模具）并不是一个独立的代码调用链，而是通过“运行态路由上下文 + `Director Note Layer` 生成的 `optionConstraints`”共同嵌入到 `PromptObject` 中，由 LLM 在同一次 generate 调用内部执行。

换句话说，Option Generator 在当前架构中是一个"设计时模块"而非"运行时独立调用"。它的三步管线定义了选项生成必须遵循的约束顺序，而这些约束最终通过 `PromptObject.directorNote.optionConstraints` 传递给模型。Orchestrator 不需要单独调用 Option Generator；真正直接消费本模块设计的是 `Director Note Layer`，随后由 `Prompt Assembler` 把约束正式外发给 API Adapter。

## 当前版本边界

在 Sample 版本中，Option Generator 先以显式词典和固定三步顺序工作。CoT 推导当前依赖叙事引擎自身的推理能力，不引入额外的外部推理模块。后续如果需要更精细的 Anti-OOC 检测，可以在第二步内部挂载更复杂的推理策略，但不改变三步管线的整体结构。
