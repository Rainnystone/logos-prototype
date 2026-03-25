# Package Wiring & Validation Page

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `组装与校验 (Package Wiring & Validation)` 的 section page 设计文档

Related documents:

- [../section-map.md](../section-map.md)
- [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
- [../coordinator-agent.md](../coordinator-agent.md)
- [../master-record.md](../master-record.md)

Visual references:

- [组装与校验 UIUX 参考图.png](%E7%BB%84%E8%A3%85%E4%B8%8E%E6%A0%A1%E9%AA%8C%20UIUX%20%E5%8F%82%E8%80%83%E5%9B%BE.png)
- [../../assets/example.png](../../assets/example.png)

## 1. Purpose

本页不是第四个内容编辑页。
本页也不是普通作者日常频繁进入的主工作面。

它的定位是：

- 高级总览与诊断页
- package 健康状态页
- coordinator 无法静默解决的问题集中展示面

它存在的目的，不是让作者在这里重新编辑前三个 section 的内容，而是让作者快速看清：

- 当前整个 package 是否健康
- 哪些后台无法自动化收敛的问题仍然存在
- 哪些问题已经超出当前 section 页右下角 `页面助手` 的局部修复范围
- 哪些问题是阻塞项
- 应该回哪一页修

本页还应承接一类明确结果：

- 来源 section 页本地保存已经成功
- 但保存结果仍携带全局提醒或跨 section 剩余问题
- 这些内容不应继续挤在当前页右下角，而应在这里汇总展示

## 2. Core Design Principle

本页必须建立在一个前提上：

- 真正的组装与校验在后台自动完成
- 各 section 页右下角的 coordinator 优先处理和解释当前页的大多数问题
- 本页负责展示结果，而不是承担后台逻辑

因此 coding agent 必须理解：

- 本页是高级 dashboard
- 不是一个手工运行检查步骤的控制台
- 也不是另一个大编辑页
- 也不是普通编辑流程里的第一反馈入口

## 3. What This Page Actually Covers

本页应集中展示这几类信息：

1. 整包当前状态
2. 各 section 的健康状态
3. section 之间的装配链路
4. 当前仍未被 coordinator 自动解决的阻塞项与提醒项
5. 当前选中问题的详情
6. `全局诊断助手` 给出的全局修复引导

本页不负责：

- 重写 `世界与角色`
- 重写 `故事结构`
- 重写 `控制模块`
- 人工重复执行后台检查逻辑

## 4. Approved Page Role

本页更像：

- 高级诊断仪表盘
- 全局状态页
- 联调与验收面板

而不是：

- 第四个主要创作页
- 大而全修理台
- 替代前三页的超级编辑器
- 普通作者每次保存后都要先看的主页

## 5. Approved UX Layout

整体继续沿用当前 redesign 的页面语法，但这里的内容类型不同。

批准布局：

- 左侧：全局诊断面
- 右上：当前选中问题 / 节点 / section 的详情区
- 右下：`全局诊断助手`

### 5.1 左侧

左侧应当是一块浅色主工作面，主要承载四层总览：

1. `Overall Status`
2. `Section Health`
3. `Assembly Flow`
4. `Unresolved Issue Queue`

左侧不应堆满表单字段。

它应该强调：

- 状态
- 关系
- `coordinator` 尚未自动收敛的缺口
- 优先级

### 5.2 右上

右上不是内容编辑器。

它的职责是展示当前选中对象的完整说明，包括：

- 问题来源
- 影响范围
- 为什么这一项没有在局部 `页面助手` / `coordinator` 通路中被静默解决
- 建议修复入口
- 当前状态类型

也就是说，右上更像问题详情面板，而不是表单面板。

### 5.3 右下

右下继续保留 `全局诊断助手`，但它在本页的角色和前三页不同。

在本页里，`全局诊断助手` 背后的解释逻辑应更偏向：

- 全局诊断解释
- 修复顺序建议
- 当前最重要问题提醒
- 后台检查结果摘要
- 说明哪些问题已经超出局部自动修复边界

### 5.4 保存结果提升规则

本页不是所有保存结果的默认落点。

Approved V1 rule:

- `save_applied`
  - 留在来源 page 的 `页面助手`
  - 不需要进入本页主问题队列
- `save_applied_with_warnings`
  - 来源 page 本地提示成功
  - 同时进入本页的问题队列或状态摘要
- `save_blocked`
  - 默认留在来源 page 本地处理
  - 只有当问题已经明确跨 section 或整包时，才提升到本页
- `save_failed`
  - 默认先留在来源 page 本地显示
  - 只有当整包状态因此变得不确定时，才在本页增加全局失败提示

而不是字段补全助手。

## 6. Approved Information Blocks

### 6.1 Overall Status

这一块直接显示：

- 当前总体状态
- 阻塞项数量
- 提醒项数量

作者一进入本页就应该先看到这一层。

### 6.2 Section Health

这一块展示前三个 section 的当前健康情况：

- `世界与角色`
- `故事结构`
- `控制模块`

每块至少应有：

- 当前状态
- 一句话摘要
- 是否影响整体运行
- 当前问题是否已被该页局部 `页面助手` / `coordinator` 通路尝试处理

### 6.3 Assembly Flow

这一块用简洁链路图表达：

- section 输出
- bridge 分发
- package reload
- runtime health

它的作用是让作者直观看见：

- 后台到底在检查什么
- 当前未解决问题大致断在哪一段

### 6.4 Issue Queue

这一块展示当前问题列表。

建议至少区分：

- 阻塞项
- 提醒项
- 已自动收敛项不应在这里占主要视觉比重

不建议把所有问题压成一个没有层次的大列表。

## 7. Approved Interaction Rule

本页的主要交互不是编辑，而是：

- 选中某个问题
- 查看某个 section 状态
- 查看某个装配节点
- 跳回对应 section 修复
- 重新检查

这意味着 coding agent 不应把本页实现成大规模可编辑表单。
默认情况下，本页也不应抢走各 section 页右下 `页面助手` 的问题解释职责。

## 8. Coordinator Relation

本页和前三页右下角的 `页面助手` 不是重复关系。

正确分工是：

- 各 section 页右下 `页面助手`：
  - 负责局部编辑反馈
  - 解释当前页这次提交的问题
  - 尽可能自动解决当前页的大多数可修复问题

- 本页右下 `全局诊断助手`：
  - 负责全局诊断解释
  - 解释整个 package 当前最大的断点
  - 展示局部 `页面助手` 无法静默解决的剩余问题

## 9. TailwindCSS Build Rule

本页未来实现时继续使用 `TailwindCSS`。

不要为了做 dashboard 单独引入一套普通 CSS 主布局。

## 10. Audience Rule

本页主要面向：

- 高级作者
- 设计者
- 联调阶段的实现者

它不应被实现成普通作者每次提交后必须依赖的主工作流页面。

## 11. Coding Agent Build Rules

未来 coding agent 实现本页时，应遵守：

1. 本页必须是 dashboard，不是第四个内容编辑页
2. 左侧必须优先展示状态、链路和问题，而不是堆表单
3. 右上必须是详情解释区，而不是重型编辑器
4. 右下 `全局诊断助手` 要偏全局诊断，不要复刻前三页的局部填写逻辑
5. 本页应以“引导作者回正确 section 修复”为核心，而不是把修复动作全部搬到本页
6. 后台检查逻辑属于系统能力，本页只负责展示和引导

## 12. Implementation Reminder

本页是高级诊断页，不承担 section 内容编辑职责。

未来 coding agent 在实现时，应优先确认：

- 本页没有自己的“提交本页内容”动作
- 本页只消费后台结果与页面升级后的问题摘要
- 本页不抢走前三页右下 `页面助手` 的日常解释职责
