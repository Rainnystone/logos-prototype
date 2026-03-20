# UI Round 1 Wireframes

## 目的

这份文档记录当前 `sample-scene` 主工作台的 round-1 结构方案，用来把“认可的参考图 + 认可的草图”收口成一份可被 Gemini、Figma 和 coding agent 共同引用的说明文档。

它属于设计轮次产物，而不是上层规范替代品。若本文与 `08_UX/`、`07_AUTHORING/` 或 `01_PRODUCT/` 上层文件冲突，以上层规范为准，并应把稳定结论优先回写到上层规范后再继续扩展设计稿。

## 输入材料

- 视觉参考图：`assets/ui-round-1-reference-dark-workbench.jpg`
- 结构草图：`assets/ui-round-1-sketch-layout.png`
- 上层规范：`08_UX/information-architecture.md`
- 上层规范：`08_UX/screen-inventory.md`
- 上层规范：`08_UX/ui-deferred-decisions.md`
- 作者层约束：`07_AUTHORING/configuration-matrix.md`

## 当前收口结论

### 1. 工作台形态

当前 round-1 采用桌面端 `16:9` 单工作台，而不是多页面站点。核心目标是让用户在同一屏里同时感知上下文、控制入口、当前 Beat 和系统反馈。

### 2. 顶部必须有 Sample Context

虽然草图最初把中心与侧栏关系画得比较完整，但上层规范要求用户先确认自己当前操作的是哪个样例。因此，正式 round-1 工作台必须补一个简洁的 `Sample Context` 摘要条或摘要卡，至少包含：

- `scene name`
- `main axis`
- `end line`
- `current phase / beat progress`

### 3. 左上区域不能只剩 Runtime Config

当前草图把左上角明确画成 `API Dashboard`，这可以作为默认展开态；但为了不与 `Author Control Panel` 的上层要求冲突，左上区域必须支持在 `Author Controls` 与 `Runtime Config` 之间切换，或者通过同级抽屉/页签进入作者控制面。

换句话说，`Author Controls` 不能消失，只能不作为当前默认可见态。

### 4. 左下区域用于低权重组装状态观察

左下区域当前采用 `Prompt Assembly Status Panel`（草图中可沿用 `Prompt Assembler Status` 标签）是合理的，但它必须被理解为只读的系统观察面，而不是作者配置面。适合放在这里的内容包括：

- `PromptObject` 摘要
- `Director Note` 摘要
- 当前上下文长度
- Token 预算占比

### 5. 中央 GameView 必须保持纯净

中央 `GameView` 是整张工作台的阅读与交互重心，应只承载：

- 当前 Beat 正文
- 4 个选项
- 1 个自由输入框
- 当前事件 / 回合标识

不要把审计、Token 仪表盘、作者配置或其他技术性面板塞进中央区，否则会破坏阅读连续性，也会让 `GameView` 失去“玩家实际体验窗口”的身份。

### 6. 右侧反馈区分成两块

右上适合放 `Narrative Auditor`，右下适合放 `Narrative State Dashboard`。这种拆分符合当前样例的观察任务：

- 上半区回答“这轮有没有越界、有没有触发 rewrite”
- 下半区回答“系统当前推进到哪里、Phase/Beat/边界状态是什么”

### 7. Fixture Reference 作为可开关辅助层

`Fixture Reference Panel` 仍然推荐保留，但不需要常驻占用主视口。它更适合作为从 `Sample Context` 区进入的抽屉、弹层或二级面板，用来查看角色源稿、`world-style` 摘要和地点词池。

## 与上层规范的映射

| 上层规范对象 | round-1 中的落位方式 |
|---|---|
| `Sample Dashboard` | 顶部 `Sample Context` 摘要条 + Phase 进度 |
| `Author Control Panel` | 左上切换态之一，不应缺席 |
| `Runtime Config Panel` | 左上默认态，承载 provider / model / API key / save |
| `GameView` | 中央主阅读区，保持纯净 |
| `System Feedback Panel` | 右上 `Narrative Auditor` + 右下 `Narrative State Dashboard` |
| `Prompt Assembly Status Panel` | 左下只读辅助状态面板 |
| `Fixture Reference Panel` | 可开关辅助层，从上下文区或侧边入口进入 |

## 区域说明

### Sample Context

这是防止用户丢失当前 Scene 语境的摘要区。它不是详细编辑器，而是工作台入口层。

### Author Controls / Runtime Config

这两个面都属于左上高层控制区，但优先级不同：

- `Author Controls` 负责叙事走向
- `Runtime Config` 负责模型调用条件

视觉上不应让 `Runtime Config` 比 `Author Controls` 更像系统中心。

### Prompt Assembly Status Panel

这个区域属于技术诊断辅助面，不应抢夺中央阅读区注意力。推荐做成低对比、只读、摘要式卡片集合。

### GameView

中央区的首要任务是阅读与选择。正文区要保证长文本阅读舒适，选项区要保证清晰的点击层级，自由输入框要和四个选项形成完整的行动入口组。

### Narrative Auditor

审计区重点展示：

- pass / fail
- blocker / non-blocker
- latest violations
- rewrite 是否触发

不需要复杂评分图谱或雷达图。

### Narrative State Dashboard

状态区重点展示：

- 当前 Scene / Phase / Beat
- 当前 Beat Volume
- 当前 Phase Goal / Gradient
- 当前 Router Hint
- 当前 Alpha/Beta 边界

## 只读 / 可编辑边界

### 可编辑

- `Author-owned` 输入
- `Runtime-owned` 输入
- 玩家当前的自由文本输入

### 只读

- `Alpha / Beta`
- `Volume Sequence`
- `Current Router`
- `Director Note`
- `PromptObject` 摘要
- 审计结果
- Token / Context 长度反馈

这些字段在当前 Sample 中属于 `System-derived` 或运行反馈，不应被误做成作者直接填写的表单。

## 当前不意味着什么

- 不意味着已经锁定最终品牌视觉系统
- 不意味着已经进入完整高保真产品交付阶段
- 不意味着要为移动端重做排版
- 不意味着要扩展成多 Scene、多项目或发布工作台
