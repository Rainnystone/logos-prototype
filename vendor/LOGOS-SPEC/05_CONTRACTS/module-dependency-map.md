---
contract: module-dependency-map
type: contract
consumed_by:
  - all-modules
blocker_protocol: 00_META/agent-guide.md#附录-正式实施时的阻塞疏通与语义对齐规则
tokens_estimate: 900
last_updated: 2026-03-20
---
# Module Dependency Map

> 若正式实施中发现依赖越层、必填字段缺少 producer 或模块职责打架，回看 `00_META/agent-guide.md` 附录中的 Blocker Protocol / Conflict Resolution 执行裁决与疏通规则。

## 目的

模块边界文档已经回答了“每个模块负责什么”，但在真正实现时，还需要进一步约束“谁可以依赖谁、谁不应该直接调用谁”。否则，模块说明再清楚，也可能在实现阶段被绕过。因此，这份依赖图的任务，是把当前 Sample 版本允许的依赖方向固定下来。

这里的依赖不是泛泛而谈的“会用到”，而是指模块在正常工作时可以正当读取或调用的上游接口。只要这张图足够稳定，后续 coding agent 在落代码时就不必每次重新猜测系统的调用边界。

## 依赖规则总述

当前版本采用单向依赖原则。上游模块可以向下游提供结构化结果，但下游模块不应反向读取上游的内部实现细节，更不应直接跳过中间层去调用更远的模块。尤其需要强调的是，`Prompt Assembler` 是生成链路唯一正式外发口，`Audit Resolver` 是最终流程裁决者，而 API 模块只能处理调用与协议差异，不能反向主导叙事控制。

## 模块依赖图

| 模块 | 允许依赖 | 主要输出去向 | 不应直接依赖 |
|---|---|---|---|
| `Orchestrator Control Hub` | `SceneSpec`、`PhasePlan`、`WorldBase`、`RouterProfile`、`AuditQuestionSet`、`Memory Placeholder`、`Phase Consequence Settlement`、`Light Cone Collapse`、`Phase Gradient`、`Narrative Router`、`Director Note Layer`、`Prompt Assembler`、`Auditor`、`Audit Resolver` | 生成链路、审计链路、生命周期推进 | 外部 provider、UI 内部状态 |
| `Light Cone Collapse` | `SceneSpec`、`StateSnapshot` | `Orchestrator`、`Director Note Layer`、`Prompt Assembler`、`Option Generator` | `Prompt Assembler` 内部装配逻辑、API 模块 |
| `Phase Consequence Settlement` | `StateSnapshot`、当前 Phase 已接受转录、`API Adapter Lite` | `Orchestrator`、`Light Cone Collapse` | `Prompt Assembler` 内部装配逻辑、最终裁决逻辑 |
| `Phase Gradient` | `PhasePlan`、当前 Beat 索引 | `Orchestrator`、`Director Note Layer`、`Prompt Assembler`、`Option Generator` | `Auditor`、外部 provider |
| `Narrative Router` | 当前场景判定、`RouterProfile` | `Orchestrator`、`Director Note Layer`、`Option Generator` | `Phase Gradient` 内部逻辑、API 模块 |
| `Director Note Layer` | `RoundState`、局部硬规则 | `Prompt Assembler` | 历史压缩、最终裁决逻辑 |
| `Option Generator` | `Narrative Router`、`Memory Placeholder`、`Light Cone Collapse`、`Phase Gradient`、主角性格（`WorldBase`） | `Director Note Layer`、`Prompt Assembler`（经 `optionConstraints`） | `Prompt Assembler` 内部装配逻辑、API 模块 |
| `Prompt Assembler` | `WorldBase`、`Memory Placeholder`、`Light Cone Collapse`、`Phase Gradient`、`Narrative Router`、`Director Note Layer` | `API Adapter Lite` | 外部 provider、审计裁决逻辑 |
| `Memory Placeholder` | 已接受历史窗口 | `Prompt Assembler`、`Auditor`、`Orchestrator`、`Option Generator` | 生成链路内部实现、最终裁决逻辑 |
| `API Adapter Lite` | `PromptObject`、`AuditPacket`、`PhaseConsequencePacket`、`CollapsePacket`、provider 配置 | 外部 LLM provider、返回统一响应给上游 | 叙事控制模块内部逻辑 |
| `Auditor` | `AuditPacket` | `Audit Resolver` / 代码裁决层 | `Prompt Assembler` 内部装配逻辑、路由选择逻辑 |
| `Audit Resolver`（代码层） | `AuditResult`、重试计数、阻塞规则 | `Orchestrator`、重写链路 | 外部 provider、叙事主轴定义 |

## 关键依赖纪律

当前 Sample 版本有七条依赖纪律必须保持不变。第一，任何生成请求都必须经过 `Prompt Assembler`，不能由局部模块绕过它直接调用 API。第二，任何外部 LLM 调用都必须经过 `API Adapter Lite`，其他模块不直接接触 provider 协议。第三，`Auditor` 只输出判定结果，不直接推进流程；流程推进权留在 `Audit Resolver` 和 `Orchestrator`。第四，`Memory Placeholder` 只负责已接受历史窗口，不读取未通过审计的中间草稿。第五，`Phase Consequence Settlement` 只结算阶段后果，不直接推演 `Alpha/Beta`；`Light Cone Collapse` 只基于已结算后果重推边界。第六，`Light Cone Collapse`、`Phase Gradient` 和 `Narrative Router` 都是控制信号提供者，而不是最终装配者。第七，`Option Generator` 在当前版本中通过 `Director Note Layer` 写入 `optionConstraints`，而不是作为独立运行时调用链存在。

## 允许的跨层依赖

当前版本允许编排层读取领域层概念，也允许模块层消费领域层与编排层定义的结构。但反过来，领域层和编排层不应依赖模块层的实现细节。换句话说，当前仓库的依赖方向必须与目录层级保持一致：

`02_DOMAIN -> 03_ORCHESTRATION -> 04_MODULES -> 05_CONTRACTS / 06_FIXTURES`

`05_CONTRACTS` 虽然在目录上位于后面，但它不是更低层的实现，而是对前面各层共享结构的抽取，因此它不应反向改变前面已经固定的语义边界。

## 当前版本边界

虽然 API 详细设计已经内化到 `04_MODULES/api-adapter-lite/` 并拆分为多份子文档，但本图仍只承认 `API Adapter Lite` 的系统位置与调用职责，不把 provider 内部映射细节展开到依赖图里。同理，当前版本也不引入长期记忆模块、Header 召回器或多 Scene 调度器，因此这些未来可能存在的依赖节点不在本图中占位。
