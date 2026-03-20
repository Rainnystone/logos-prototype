---
module: light-cone-collapse
title: 光锥坍缩
type: module
priority: core
depends_on:
  - scene-spec
  - state-snapshot
consumed_by:
  - orchestrator-control-hub
  - director-note-layer
  - prompt-assembler
  - option-generator
contracts:
  - 05_CONTRACTS/state-snapshot-schema.yaml
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/collapse-packet-schema.yaml
tokens_estimate: 1500
reading_context:
  - 02_DOMAIN/glossary.md
  - 02_DOMAIN/state-model.md
  - 04_MODULES/phase-consequence-settlement.md
status: v1-complete
last_updated: 2026-03-20
---

# Light Cone Collapse

## 模块定位

`Light Cone Collapse` 是负责管理 `Main Axis`、`End Line` 与 `Alpha/Beta` 边界关系的模块。它服务的不是某一轮文本怎么写，而是整个 Scene 在推进过程中还能容许怎样的偏离。换句话说，它管理的是"可达叙事空间"，而不是"具体句子如何生成"。

在当前 Sample 中，这个模块具有两个工作时点。第一个时点是 Scene 初始化时，它需要基于主轴和终点线推导初始边界；第二个时点是 Phase 结束时，它需要以玩家已经造成的阶段性后果为新坐标，重新面向终点线推演并收缩边界。

## 核心职责

这个模块当前承担三项职责：

1. 基于 `SceneSpec` 的主轴与终点线建立初始 `Alpha/Beta` 边界。
2. 在 Phase 内向系统提供当前稳定工作边界。
3. 在 Phase 结束时根据状态结算结果和终点线，重新语义推演下一阶段的 `Alpha/Beta`。

这意味着它既是一个初始化模块，也是一个阶段性更新模块。它不需要参与每一个细小步骤，但一旦需要重新定义可行空间，必须由它出手。

## 输入

初始化阶段，Light Cone Collapse 主要读取 `mainAxis`、`endLine` 和当前 Scene 的整体方向信息。Phase 结束时，它还需要读取由 `Phase Consequence Settlement` 结算出来并写入 `StateSnapshot` 的 `phaseConsequences`；这些内容应已经被收束为稳定事实条目，而不是仍然停留在原始 Phase prose 中。

这些输入的共同特点，是它们都描述"玩家已经把世界推到哪里"。因此，这个模块不应直接依赖 UI 事件或单条自然语言输入，而应依赖经过 Orchestrator 整理后的结构化状态。

## 输出

这个模块的输出核心非常稳定，主要包括：

- 当前有效的 `alpha`
- 当前有效的 `beta`
- 供本阶段读取的边界说明
- 从阶段后果到新边界的推演说明
- 在需要时供下一 Phase 使用的新边界结果

这些输出最终会被下游的 `RoundState`、`Director Note` 和 `PromptObject` 消费，因此它们必须被视为全局控制条件，而不是局部建议。尤其是在 Phase 结束时，下游不应只拿到“边界变小了”这一事实，还应知道新的边界是围绕怎样的阶段后果重新推演出来的。

## 工作方式

在 Scene 初始化时，模块遵循因果弹性法则（Causal Elasticity，见 `02_DOMAIN/glossary.md`），根据"必须抵达终点线"的约束，从主轴出发推导最激进和最消极两侧的可承受偏离。这一步建立的不是"最佳路线"，而是"仍可收束"的边界。

在 Phase 运行期间，边界保持稳定，不随每个 Beat 波动。只有当本阶段的 Beat 全部完成并完成状态结算后，系统才允许这个模块重算边界。这里的“重算”不是指数值缩放，而是以玩家上一阶段造成的真实后果为新坐标，重新看向 `End Line`，并在“仍然必须收束到终点线”的约束下推演下一阶段还能允许的激进极与消极极。这样设计的目的，是让玩家在一个 Phase 内拥有足够清晰的局部行动空间，而不是每走一步边界都重写一次；同时也让 Phase 结束成为真正的因果反馈时点，而不仅仅是计数器归零时点。

在实现层面，Phase 结束时的边界重推演通过 API Adapter Lite 的 `collapse` 模式完成。Orchestrator 先组装 `PhaseConsequencePacket` 并触发 `Phase Consequence Settlement`，得到 `PhaseConsequenceResult.phaseConsequences[]`；随后再将这些后果与当前边界、主轴和终点线打包为 `CollapsePacket`，经 API Adapter 调用 LLM 进行语义推演，最终得到 `CollapseResult`（含新的 `Alpha/Beta` 与推演说明）。这一步是 LLM 调用而非代码规则计算，因为边界推演的本质是"基于因果后果重新评估可达叙事空间"，这需要语义理解能力。详细契约见 `05_CONTRACTS/phase-consequence-packet-schema.yaml` 与 `05_CONTRACTS/collapse-packet-schema.yaml`。

## 与其他模块的关系

`Light Cone Collapse` 的结果会被以下模块消费：

- `Orchestrator Control Hub` 用它来建立当前阶段的控制边界。
- `Director Note Layer` 用它来提醒模型当前轮不可越界。
- `Prompt Assembler` 用它把叙事主轴与边界放入最终提示对象。
- `Auditor` 间接用它判断选项是否越界。

因此，它本质上是一个上游边界模块，而不是中游润色模块。

## 不负责什么

当前版本中，Light Cone Collapse 明确不负责：

- 不生成正文或选项。
- 不决定当前轮具体使用哪条路由。
- 不直接决定审计是否通过。
- 不负责记忆窗口裁剪。

它只定义"这个阶段仍然允许发生什么"，不定义"模型该如何写出来"。

## 当前版本边界

在当前 Sample 中，Phase 结束后的光锥坍缩仍然必须保留“基于阶段后果重新面向终点线做语义推演”这一机制定义，不应被降格为单纯的规则缩放。Sample 的简化只允许发生在输入规模、场景数量和实现细节上，而不允许发生在这条机制本身上。换句话说，即使后续实现会先采用较轻量的调用方式，它对外仍然必须表现为一次真正的边界重推演，而不是一次机械缩放。
