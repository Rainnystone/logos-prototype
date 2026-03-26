---
module: phase-gradient
title: 阶段梯度
type: module
priority: core
depends_on:
  - phase-plan
consumed_by:
  - orchestrator-control-hub
  - director-note-layer
  - prompt-assembler
  - option-generator
contracts:
  - 05_CONTRACTS/phase-plan-schema.yaml
tokens_estimate: 1500
reading_context:
  - 02_DOMAIN/glossary.md
  - 02_DOMAIN/control-primitives.md
status: v1-complete
last_updated: 2026-03-20
---

# Phase Gradient

## 模块定位

`Phase Gradient` 模块负责把作者对某个 Phase 节奏形态的宏观判断，转换成这一阶段内部可逐轮读取的 `Beat Volume` 序列。它控制的是局部节奏，而不是情节内容；因此，它既比单轮 `Volume` 更高一层，又比整个 Scene 的主轴更具体。

从工程角度看，这个模块的功能非常明确：它把一个离散的梯度类型映射成一条固定长度的声量序列，并在每一轮推进时提供当前位置对应的声量值。

## 核心职责

当前版本中，Phase Gradient 负责两件事：

1. 根据 `PhasePlan.gradientType` 生成一条 4 Beat 的声量序列。
2. 在 Phase 推进过程中，为当前 Beat 提供对应的 `currentVolume`。

这两件事听上去简单，但它们是整个系统节奏稳定的基础。如果没有这个模块，下游生成会知道“这一段要紧张一些”，却无法知道“这一轮应该高压还是综述”。

## 输入

Phase Gradient 的主输入是当前 Phase 的梯度类型。在 Sample 版本中，这个类型来自作者定义好的 `PhasePlan`，例如 `Rising`、`Falling`、`Static High`、`U-Shape`、`Arch`、`Pulse`、`Steady`。

模块还需要知道当前 Beat 在 Phase 中的位置，因为只有这样它才能从已建立的序列中取出本轮的 `Volume`。因此，它天然与 Beat 计数发生关系，但它并不维护计数本身。

## 输出

这个模块的输出包括两层：

- Phase 级输出：完整的 `volumeSequence`
- Round 级输出：当前轮的 `currentVolume`

完整序列是为了让 Phase 在进入时就建立局部节奏框架，而当前轮声量则是为了让 Orchestrator、Director Note 和 Prompt Assembler 在每轮取用时不需要重复推导。

## 当前支持的梯度

在当前 Sample 中，Phase Gradient 至少要稳定支持以下七种模式：

- `Rising`
- `Falling`
- `Static High`
- `U-Shape`
- `Arch`
- `Pulse`
- `Steady`

这些模式的含义已经在领域层固定，因此模块层不再重新解释美学意图，而把重点放在“如何稳定映射为 4 Beat 序列”。

## 与其他模块的关系

`Phase Gradient` 的下游消费者主要有四个：

- `Orchestrator Control Hub` 读取当前轮 `Volume` 参与收束 `RoundState`。
- `Director Note Layer` 把当前 `Volume` 转成局部写作约束。
- `Prompt Assembler` 把当前 `Volume` 作为最终提示对象的一部分装配进去。
- `Option Generator` 在第三步声量模具中读取当前 `Volume`，据此调整选项文本的颗粒度。

因此，这个模块不需要知道生成文本长什么样，但它必须保证提供给下游的节奏信号稳定、可重复、可索引。

## 不负责什么

当前版本中，Phase Gradient 不负责：

- 不生成选项内容。
- 不选择 Narrative Router。
- 不更新 Alpha/Beta 边界。
- 不判断当前 Phase 是否已满。

它只负责“节奏映射”，而不负责“流程推进”或“叙事合法性”。

## 当前版本边界

当前 Sample 版本固定按 4 Beat 处理一个 Phase，因此这个模块目前不需要支持可变长度梯度映射。后续如果系统需要扩展成可变 Beat 数量，这个模块可能需要增加更一般化的序列生成逻辑，但那属于未来扩展，而不是当前边界。
