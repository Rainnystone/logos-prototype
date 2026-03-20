# Screen Inventory

## 目的

这份页面清单的作用，是把当前 Sample 版本真正需要的界面承载面列出来，避免后续实现时在没有信息架构约束的情况下随意长页面。它不是视觉稿，也不是组件树，而是一份“当前阶段最小页面面”的盘点。

对当前项目而言，页面清单越克制越好。因为当前验证目标是叙事控制链，不是完整产品外观；只要页面数量开始无节制增加，系统重心就会从控制结构转移到界面拼装。

## 当前推荐页面 / 面板清单

| 名称 | 类型 | 当前必要性 | 主要承载内容 |
|---|---|---|---|
| `Sample Dashboard` | 主工作台 | 必需 | 当前 Scene 概览、Phase 总览、主要控制入口 |
| `Author Control Panel` | 配置面板 | 必需 | 主轴、终点线、Phase 计划、梯度、路由提示、审计问题 |
| `Runtime Config Panel` | 配置面板 | 必需 | Provider、API Key、模型、生成参数、保存配置 |
| `GameView` | 运行视图 | 必需 | 当前 Beat 正文、4 个选项、自由输入入口 |
| `System Feedback Panel` | 反馈面板 | 必需 | 审计结果、重写提示、Token 仪表盘、阶段状态 |
| `Prompt Assembly Status Panel` | 辅助状态面板 | 可选但推荐 | `PromptObject` 摘要、`Director Note` 摘要、上下文长度与 Token 预算观察 |
| `Fixture Reference Panel` | 辅助阅读面板 | 可选但推荐 | 当前样例来源、角色源稿、`world-style` 摘要与地点词池 |

## 推荐组织方式

在当前阶段，最合理的组织方式不是把这些页面做成完全割裂的多页面站点，而是把它们组织成一个主工作台加若干可切换面板。原因很简单：当前 Sample 的用户核心任务是持续观察“控制输入”和“系统反馈”的关系，如果切得太碎，操作体验会变成反复跳页。

因此，`Sample Dashboard` 更适合作为主容器，而 `Author Control Panel`、`Runtime Config Panel`、`GameView` 和 `System Feedback Panel` 则作为其中的主要工作区。

如果当前 round-1 设计采用单工作台方案，那么这些承载面可以进一步映射为：

- `Sample Dashboard` 收敛为顶部 `Sample Context` 摘要条
- `Author Control Panel` 与 `Runtime Config Panel` 共用左上切换槽
- `Prompt Assembly Status Panel` 占据左下辅助观察位
- `GameView` 固定占据中央主区
- `System Feedback Panel` 拆成右上 `Narrative Auditor` 与右下 `Narrative State Dashboard`
- `Fixture Reference Panel` 通过抽屉、二级面板或弹层进入

## 每个页面最小承载要求

### Sample Dashboard

至少要显示当前 Scene 名称、主轴摘要、终点线摘要、当前 Phase 位置，以及进入其他面板的入口。它相当于一个总览页，用来防止用户失去当前上下文。在单工作台设计里，它可以收敛为顶部摘要条，而不必单独做成一整页。

### Author Control Panel

至少要让用户看到当前 Phase 列表、每个 Phase 的目标和梯度，并能感知路由提示和审计问题集。它是控制系统的作者侧入口。即使在运行导向的工作台里，它也只能被折叠、抽屉化或作为切换态存在，而不能被 Runtime Config 完全挤掉。

### Runtime Config Panel

至少要让用户选择 provider、模型并查看 Token 反馈。当前版本还需要承载 API Key 和保存配置操作。

### GameView

至少要能显示当前 Beat 正文、4 个选项和自由输入入口。当前阶段它仍然是 placeholder 级别，因此重点是可交互性，而不是精致视觉。为了维持“玩家体验窗口”的身份，这个区域不应再混入审计卡、配置表单或 Prompt 诊断模块。

### System Feedback Panel

至少要显示审计是否通过、失败项是什么、是否触发重写、当前 Token 是否接近边界，以及当前处于哪个 Phase / Beat。这个面板的存在，是为了让 LOGOS 的“控制系统身份”在界面上可见。在 round-1 工作台中，它可以进一步拆成 `Narrative Auditor` 与 `Narrative State Dashboard` 两块相邻面板。

### Prompt Assembly Status Panel

如果当前实现希望把 `PromptObject` 摘要、`Director Note` 摘要和 Context/Token 长度单独呈现，那么它应被视为只读辅助状态面板，而不是新的作者输入面。它更适合作为左下低权重观察位，而不是中央主区的一部分。

## 当前版本边界

当前页面清单不包括完整角色百科页、全局素材管理页、模型市场页、发布中心或多人协作审阅页。这些页面即使未来需要，也不应该在当前 Sample 阶段抢占实现注意力。
