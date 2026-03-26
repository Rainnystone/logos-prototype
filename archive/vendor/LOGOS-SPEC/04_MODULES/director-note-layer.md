---
module: director-note-layer
title: 导演备注层
type: module
priority: core
depends_on:
  - light-cone-collapse
  - phase-gradient
consumed_by:
  - prompt-assembler
contracts: []
tokens_estimate: 1600
reading_context:
  - 02_DOMAIN/glossary.md
  - 03_ORCHESTRATION/runtime-loop.md
status: v1-complete
last_updated: 2026-03-26
---

# Director Note Layer

## 模块定位

`Director Note Layer` 是当前轮的局部约束模块。它把已经由其他控制模块确定好的条件，重新压缩成模型在本轮最需要优先服从的短文本约束。这个模块的重要性，不在于它创造了新信息，而在于它防止已有信息在长上下文中被稀释。

因此，它在系统中的角色更像“本轮导演”而不是“世界设定师”。它服务的始终是当前这一轮，而不是整个故事。

## 核心职责

在当前 Sample 中，Director Note Layer 负责以下工作：

1. 从 Orchestrator 接收当前轮的控制状态。
2. 为 Beat 正文生成面向正文的局部批注。
3. 为选项集生成面向选项的局部批注。
4. 压缩本轮最关键的规则，避免生成第二份膨胀的系统提示。
5. 保持批注格式稳定，使后续调参与测试可重复。
6. 对 Beat 正文施加强制段落纪律，明确禁止“整段无换行的大墙文本”。
7. 不把 runtime router 与 verb lexicon 重新固化为 Director Note 的硬锁，避免局部批注反过来压死本轮涌现空间。

这些职责共同构成它的本质：重申控制，而不是增加设定。

## 内部子部分

按照母文档的第一版设计，这个模块内部可以被理解为五个协作部分：

1. `Round State Collector`
2. `Beat Note Generator`
3. `Option Note Generator`
4. `Rule Compressor`
5. `Note Template Layer`

模块层在这里承认这些子部分的存在，但不把它们拆成独立模块。原因在于当前 Sample 的重点是先验证它作为整体能否稳定提供本轮强约束，而不是过早把内部再次切碎。

## 输入

这个模块当前最小输入包括：

- 当前 `Volume`
- 当前 `Phase Goal`
- 当前 Scene 方向
- 当前 `Alpha/Beta` 边界
- 必要的少量硬规则

这些输入的共同特点，是它们都描述“模型这轮必须优先服从什么”。它不需要重新读取完整世界观，也不需要重新解释历史窗口。

需要特别强调的是：当前版本允许 `RoundState` 继续保存 runtime router 与 verb lexicon，供编排层、Prompt Assembler 与状态检查使用；但 `Director Note Layer` 不再把它们直接重写成正文/选项的硬锁约束。

在 `branch/narrative-editor` 当前实现中，Director Note Layer 已支持读取 story
package 的 `control-modules.yaml`。系统仍然先生成基础 director note，再叠加作者
提供的 `directorNoteAdditions`，同时用 `beatVolumeDefinitions` 重定义
`Low / Med / High` 三档的正文与选项表达口径。作者输入是附加层，不替换系统收集到
的当前轮控制事实。

## 输出

这个模块的输出是面向当前轮的压缩批注文本，通常至少包含两种面向：

- 面向正文的导演批注
- 面向选项的导演批注

在 Sample 版本中，二者可以共享一套当前轮控制状态，但应允许使用不同模板，以便分别强调镜头尺度和选项正交性。

其中，面向正文的导演批注必须显式约束段落结构。当前版本不接受“单个超长段落”或“视觉上没有自然断点的大块正文”作为合格输出；如果正文退化为这类墙文本，应视为当前轮局部控制失败，而不是把它当作纯风格差异放过。

## 与其他模块的关系

Director Note Layer 上承 `Orchestrator Control Hub`，下接 `Prompt Assembler`。它不直接对接外部 provider，也不直接参与最终裁决。它的典型位置，是在路由、边界、声量这些条件都已确定之后，最后一次把它们重新钉到模型面前。

正因为如此，它是“最终装配前的最后一道局部控制收束层”。

## 不负责什么

当前版本中，这个模块明确不负责：

- 不做记忆压缩。
- 不决定 Prompt 的最终装配顺序。
- 不重新定义剧情主线。
- 不直接生成玩家可见正文或选项。

如果这些职责被塞进来，这个模块就会从“局部控制层”膨胀成“第二个编排器”，这是必须避免的。

## 当前版本边界

当前 Sample 版本直接读取前序 5 个 Beat，不依赖 Header，并且只服务于 sample 测试目的。因此，这个模块当前只需要证明一件事：它能否把本轮控制条件稳定、清晰、可复用地压缩为高优先级局部约束。
