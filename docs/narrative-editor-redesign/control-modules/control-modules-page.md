# Control Modules Page

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块 (Control Modules)` 的 section page 设计文档

Related documents:

- [../section-map.md](../section-map.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)
- [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
- [../coordinator-agent.md](../coordinator-agent.md)

Visual references:

- [control-modules UIUX 草图.png](control-modules%20UIUX%20%E8%8D%89%E5%9B%BE.png)
- [../../assets/example.png](../../assets/example.png)
- [../../../vendor/LOGOS-SPEC/04_MODULES/prompt-assembler.md](../../../vendor/LOGOS-SPEC/04_MODULES/prompt-assembler.md)

## 1. Purpose

本页是 `控制模块 (Control Modules)` 的作者工作台。

它不是故事骨架页，也不是普通设置页。它的任务是把当前 package
里真正影响控制链的模块集中到一页里，让作者可以看见它们在系统中的
大致层级关系，并对每个模块做针对性的输入。

本页必须让 coding agent 明白：

- 这里负责的是控制定义，不是 scene / phase 的故事骨架
- 这里可以参考 `Prompt Assembler` 的层次感来做 UI
- 但页面不能误导用户，以为所有控制项都属于 prompt 的同一层

## 2. Approved Content Scope

本页当前批准承载的模块只有这 5 组：

1. 光锥坍缩：替换式自定义
2. Director Note Layer：附加式自定义
3. Auditor Question：结构化自定义
4. Beat Volume 定义：结构化定义
5. Router Profile：结构化新增 / 编辑

本页不负责：

- scene 级故事骨架编辑
- phase 级故事骨架编辑
- `gradientType` / `routerHint` 的选择动作本身
- story package 装配关系可视化

## 3. Approved Structural Rule

本页允许借用 `Prompt Assembler` 的结构感，但不能伪造系统结构。

准确表达应当是：

- 光锥坍缩属于 `叙事边界层`
- Director Note、Beat Volume、Router Profile 更接近 `导演控制层`
- Auditor 是并行控制块，不属于 prompt layer 本体

因此左侧不是简单的五张平级卡片，也不是把所有东西硬塞成四层 prompt。
它应该是：

- 一组有层级感的主堆栈
- 再加一个并行审计块

## 4. Approved Module Grouping

### 4.1 Layer 3：叙事边界层

这一块只承载：

- 光锥坍缩

这个模块要表现成边界收束控制，而不是普通提示词设置。

### 4.2 Layer 4：导演控制层

这一块承载：

- Director Note Layer 自定义附加层
- Beat Volume 的 `Low / Med / High` 定义
- Router Profile 的新增与编辑

这一层是控制口径和生成导向的主要工作区。

### 4.3 Parallel：审计规则块

这一块承载：

- Auditor Question 自定义
- 题目选择规则

它必须在视觉上与 Layer 3 / Layer 4 有关联，但不能被画成 prompt 堆栈
中的第五层。

## 5. Approved UX Layout

整体继续沿用前两个 section page 的工作台语法：

- 左侧：主编辑结构面
- 右上：当前选中模块的详细编辑区
- 右下：`页面助手`

### 5.1 左侧

左侧应当是一块浅色主编辑面，内部画出控制链积木。

建议结构：

1. 上部：`Layer 3 / 叙事边界层`
2. 中部：`Layer 4 / 导演控制层`
3. 下部或侧边：`Parallel Audit / 并行审计块`

左侧的每个模块块都需要可点击，点击后切换右上编辑器。

### 5.2 右上

右上是“当前选中模块”的详细编辑区。

每次只展示一个模块的编辑界面，例如：

- 选中光锥坍缩，就显示光锥定义输入
- 选中 Director Note，就显示附加层输入
- 选中 Beat Volume，就显示 `Low / Med / High` 定义输入
- 选中 Router Profile，就显示 profile 新增 / 编辑输入
- 选中 Auditor，就显示 question set 与选择规则输入

### 5.3 右下

右下延续前两页的 `页面助手` 区：

- AI 整理
- 字段缺失 / 冲突提示
- 保存结果
- 当前页摘要

这个区同时应被明确视为当前页编辑时的主要解释入口。

也就是说：

- 大多数与当前模块编辑直接相关的问题，应优先在这里被处理和解释
- 包括字段缺失、局部冲突、保存状态变化和当前页摘要提示
- 作者不应为了处理这些局部问题先跳去高级诊断页

本区继续使用深色技术辅助块，不改成普通表单区。

### 5.4 动作区

页面仍应提供清晰的：

- `提交`
- `重置`

不要只依赖自动保存，也不要把这些动作藏进 `页面助手` 区。

Approved placement:

- use a stable page-level action bar in the right-side column
- align it with the current module editor and the lower-right `页面助手` block
- do not scatter these actions across the left-side module structure

Approved behavior:

- `提交` applies only to this section page
- it sends the current page's unsaved changes into the existing save / validate / reload path
- `重置` applies only to this section page
- it discards only this page's unsaved changes and returns to the latest successful saved state, or the currently loaded state if no newer save exists

Important boundary:

- these actions do not start the runtime loop
- to observe runtime effects, the user returns to the existing workbench flow and starts from the opening-hook / `Start Round` step

## 6. Approved Visual Direction

视觉方向继续沿用前两个 section page：

- 浅色主编辑面
- 深色 `页面助手` 技术辅助块
- 信息密度高，但分区清楚
- 有系统层级感，不做黑客终端式 UI

本页适合“模块积木 + 结构标签”的表达，不适合做成普通设置列表。

### 6.1 Auditor Editor Interaction Rule

当右上当前编辑器切到 `Auditor Question` 模块时，页面必须额外满足：

- 提供显式的 `添加问题` 按钮
- 为每条问题提供显式的 `删除` 动作
- 问题列表或问题编辑面应有独立纵向滚动能力
- 要有可见的纵向滚动条或明确的滚动容器边界，不要只依赖页面整体滚动

这是为了支持审计问题的结构化维护，而不是把全部问题压进一块长文本区。

## 7. Approved Module Card Rules

左侧每个模块块应至少显示：

- 模块名称
- 模块类型标签
- 一句简短说明

建议的类型标签：

- `替换式`
- `附加式`
- `结构化`
- `定义层`
- `并行控制`

这些标签的作用是帮助作者和 coding agent 立刻分清每块的边界。

## 8. Prompt Assembler Relation

本页可视化可以参考 `Prompt Assembler`，但必须遵守以下规则：

1. 光锥坍缩对应 `叙事边界` 控制
2. Director Note、Beat Volume、Router Profile 对应 `导演控制` 区域
3. Auditor 是并行控制链，不是 prompt layer

硬规则：

- 不允许把 Auditor 画成 prompt stack 的第五层
- 不允许把 Router Profile 伪装成独立 prompt layer

## 9. TailwindCSS Build Rule

本页未来实现时应使用 `TailwindCSS`。

不要为这页单独引入一套普通 CSS 文件来完成主要布局。

## 10. Coding Agent Build Rules

未来 coding agent 实现本页时，应遵守：

1. 左侧必须是控制结构面，不是简单 tabs 列表
2. 右上必须是“当前选中模块”的详细编辑区
3. 右下必须保留 `页面助手`
4. 不要把 Auditor 画成 prompt stack 的一层
5. 不要把 story 骨架字段混进这一页
6. 不要把 5 个模块压平为一个无结构的 settings wall
7. Router 相关模块在交互上应表现为 `故事结构` 页中 `routerHint`
   的上游来源，而不是同页并列随手填写的孤立字段

## 11. Pairing Reminder

`control-modules` 的 skill family 现已存在。

未来 coding agent 继续实现这一页时，仍需保证 page 与 skill family 对齐，尤其要对齐：

- 5 个模块的边界
- 替换式 / 附加式 / 结构化 的差异
- Prompt 与 Audit 的真实关系
- 左侧积木、右上编辑、右下 `页面助手` 的布局前提
- 每个左侧模块块都应当和一个明确的小 skill 对应
