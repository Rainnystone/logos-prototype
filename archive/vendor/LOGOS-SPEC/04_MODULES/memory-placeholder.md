---
module: memory-placeholder
title: 记忆占位符
type: module
priority: placeholder
depends_on: []
consumed_by:
  - prompt-assembler
  - auditor
  - orchestrator-control-hub
  - option-generator
contracts: []
tokens_estimate: 1100
reading_context:
  - 02_DOMAIN/glossary.md
status: v1-complete
last_updated: 2026-03-19
---

# Memory Placeholder

## 模块定位

`Memory Placeholder` 不是完整记忆模块，而是当前 Sample 版本为了让系统先跑起来而保留的一个最小边界位。它的存在意义，不是提前设计未来复杂记忆系统，而是明确告诉后续实现：当前版本确实需要“历史窗口”这一能力，但还不需要真正的长期记忆架构。

这一点必须写清楚，因为如果没有这个占位模块，coding agent 很容易在实现早期直接把“最近 5 个 Beat 读取”硬编码到多个地方，后续一旦升级记忆系统，就会出现多处同时返工的问题。

## 当前职责

在当前 Sample 中，这个模块只承担非常有限的职责：

1. 默认提供全部已接受历史的可读窗口。
2. 在需要显式截断时，按传入窗口大小返回最近一段历史。
3. 为未来 Header 压缩和历史召回预留接口位置。

它不负责语义压缩，也不负责复杂检索；它只是历史读取策略的临时容器。

## 当前输入

当前版本中，Memory Placeholder 读取的是已经被系统接受并写入历史窗口的 Beat 正文、玩家输入和必要的轮次记录。它不直接读取未通过审计的中间草稿，也不直接消费作者层的原始设定。

这种输入边界有助于保持历史窗口的干净性，即只有“被系统接受的过去”才算历史。

## 当前输出

该模块的输出是供当前轮读取的 `precedingBeats` 窗口。在 Sample 版本中，这个窗口默认按最近性线性排列，不做额外摘要、压缩或语义重排。

它最终会被 `Prompt Assembler` 和 `Auditor` 消费，因此格式稳定比策略复杂更重要。

## 为什么单独保留这个模块

把记忆先作为 placeholder 单列出来，有两个工程上的好处。第一，它能防止“历史窗口读取规则”在多个模块中散落成硬编码规则。第二，它给未来完整记忆模块留出了自然扩展点，而不会逼迫系统在后期进行大范围架构迁移。

因此，这个模块虽然简单，但它的价值是结构性的，而不是功能性的。

## 不负责什么

当前版本中，Memory Placeholder 不负责：

- 不做 Header 生成与召回。
- 不做长期记忆索引。
- 不做语义摘要。
- 不做跨 Scene 记忆融合。
- 不决定哪些内容属于阻塞失败项。

只要这些边界保持清晰，后续升级记忆模块时就不会伤到当前 Sample 的主验证链。

## 当前版本边界

当前 Sample 现在采用“默认读取全部已接受历史、必要时显式截断”的策略，这条规则必须只存在于这个模块和编排层中，而不应被复制到系统的其他角落。后续第五阶段提炼契约时，也应围绕这一占位模块来抽出 `precedingBeats` 的结构，而不是在多个模块里各自定义一版。
