# Configuration Matrix

## 目的

这份配置矩阵的任务，是把系统里的配置项按归属与责任分清楚。它不是功能列表，也不是界面草图，而是一张边界表：哪些配置属于作者层，哪些属于系统内部计算结果，哪些属于基础设施运行配置，哪些当前阶段故意不开放。

这一步非常必要，因为在复杂项目中，最容易失控的不是功能数量，而是“所有字段都看起来像应该出现在界面里”。配置矩阵的存在，就是为了阻止这种失控。

## 配置归属原则

当前 Sample 版本的配置项分为四类：

1. `Author-owned`：作者直接提供或确认。
2. `System-derived`：系统根据作者输入自动推导，不作为作者直接编辑项。
3. `Runtime-owned`：运行时与 provider 相关配置。
4. `Deferred`：当前阶段有概念，但故意不开放。

## 配置矩阵

| 配置项 | 归属 | 当前是否暴露 | 说明 |
|---|---|---|---|
| `Scene 主轴` | Author-owned | 是 | 作者提供故事方向，不逐 Beat 编写。 |
| `Scene 终点线` | Author-owned | 是 | 作者定义终局边界。 |
| `Phase 列表` | Author-owned | 是 | 作者确认样例包含哪些阶段。 |
| `Phase Goal` | Author-owned | 是 | 作者定义每个阶段要完成什么。 |
| `Phase Gradient` | Author-owned | 是 | 作者定义每个阶段的节奏曲线。 |
| `Router Hint` | Author-owned | 是 | 作者提供阶段的优先语义方向。 |
| `World Base` | Author-owned | 是 | 作者确认角色、世界观和地点基础。 |
| `Audit Questions` | Author-owned | 是 | 作者或设计侧提供硬规则问题集。 |
| `Alpha / Beta` | System-derived | 否 | 当前由光锥模块推导，不要求作者手填。 |
| `Volume Sequence` | System-derived | 否 | 当前由 Phase Gradient 映射得到。 |
| `Current Router` | System-derived | 否 | 当前由 Orchestrator 基于场景状态决定。 |
| `Director Note` | System-derived | 否 | 当前由 Director Note Layer 生成。 |
| `PromptObject` | System-derived | 否 | 当前由 Prompt Assembler 组装。 |
| `Provider` | Runtime-owned | 是 | 当前由 API 配置面板管理。 |
| `API Key` | Runtime-owned | 是 | 当前仅为跑通 Sample 所需。 |
| `Model` | Runtime-owned | 是 | 当前由运行配置层管理。 |
| `Temperature / Top-P / Max Tokens` | Runtime-owned | 是 | 当前暴露给配置面板。 |
| `Header 策略` | Deferred | 否 | 当前记忆模块尚未正式设计。 |
| `长期记忆策略` | Deferred | 否 | 当前故意不开放。 |
| `多 Scene 编排规则` | Deferred | 否 | 当前样例只支持单 Scene。 |
| `审计裁决阻塞规则代码` | Deferred | 否 | 当前属于系统内部裁决逻辑。 |

## 为什么要保持这条边界

如果 `System-derived` 的项目也被直接暴露成作者输入项，系统很快就会失去“通过少量高层参数驱动复杂控制”的设计优势。作者会被迫理解一堆本该由系统代算的内部中间量，而 coding agent 也会面临“这些字段究竟应该手填还是推导”的歧义。

反过来，如果 `Author-owned` 的核心叙事输入被隐藏起来，只暴露 provider 和模型参数，那么界面会误导用户把 LOGOS 理解成一个普通的模型调用壳，而不是叙事控制系统。

因此，在当前 UI round-1 中，`System-derived` 项目更适合被呈现成只读状态卡、摘要面板或仪表盘，而不是和 `Author-owned` 项目混做成同一组可编辑表单。尤其是 `Alpha / Beta`、`Volume Sequence`、`Current Router`、`Director Note` 与 `PromptObject`，都应被明确视为系统计算结果。

## 当前阶段结论

当前 Sample 的配置面必须把“作者输入”和“系统代算”清楚分开，并且让前者在信息架构上优先于后者。后续做页面时，这张矩阵应被当作硬边界使用，而不是当作建议参考。
