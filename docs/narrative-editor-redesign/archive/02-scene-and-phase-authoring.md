# 故事结构（Scene and Phase Authoring）

## 文档状态

- 日期：2026-03-22
- 状态：draft / brainstorming in progress
- 上级索引：`docs/narrative-editor-redesign/redesign-design-recorder.md`
- 目标：细化 redesign 中“故事结构”这一页的字段、边界、页面形式与现有代码映射关系

## 1. 页面目标

这一页负责定义当前 story package 的具体故事组织方式，也就是 `SceneSpec`、`PhasePlan` 和 `AuditQuestionSet` 中最贴近作者掌舵的部分。

它回答的问题是：

- 这个故事要往哪里走
- 会分几个 Phase
- 每个 Phase 要完成什么
- 当前审计系统到底在盯什么

## 2. 当前已确认范围

本页当前保留这些内容：

- `sceneName`
- `mainAxis`
- `endLine`
- `openingHook`
- 当前 sample purpose / 测试意图
- Phase 数量与顺序
- 每个 Phase 的 `phaseGoal`
- 每个 Phase 选用的梯度类型
- 每个 Phase 的 `routerHint`
- 每个 Phase 的 `notes`
- 全局审计问题
- 控制型审计问题
- 阶段特定审计问题
- 审计问题选择策略

## 3. 当前已确认的交互方向

基于当前讨论，这一页的作者输入暂时朝“文本框优先”收敛，但不能误解成“所有字段都是随便填字符串”。

我认为这里有 3 种可行做法：

### 3.1 方案 A：全自由文本页

- 所有字段都以文本框或文本域呈现
- Phase、Audit 问题也只作为一组松散文本块编辑
- 保存时再尽量猜测结构

优点：

- 最轻
- 第一眼最像“写作面板”

缺点：

- 对 coding agent 最不友好
- 保存层要做很多猜测
- 很容易把 `phaseId`、`selectionPolicy`、`expected`、`blocking` 之类的硬语义写坏

### 3.2 方案 B：文本框优先的结构化页

- 作者主要看到的仍然是文本框
- 但字段分组是明确的
- 列表对象有清楚边界，例如“一个 Phase 一组输入”“一条 Audit Question 一组输入”
- 系统字段保留只读或半隐藏
- 保存层只做校验和序列化，不做大规模猜结构

优点：

- 仍然轻量
- 最适合 coding agent 接手
- 最符合现有 runtime schema

缺点：

- 比纯自由文本多一点结构感

### 3.3 方案 C：直接暴露 YAML 编辑器

- `scene.yaml`
- `phase-plans.yaml`
- `audit-questions.yaml`

优点：

- 和当前文件一一对应
- 最少中间映射

缺点：

- 对非程序作者不友好
- 非常容易破坏 schema
- 不符合这次 redesign 想要的新 authoring surface

我当前推荐 `方案 B`。

也就是说，这一页第一阶段采用：

- 单行文本输入
- 多行文本框
- 按字段分组的文本编辑区
- 可重复的 Phase 区块
- 可重复的 Audit Question 区块
- 少量系统只读字段

这比“自由写 YAML”更友好，也比“全自由大文本”更稳。

## 4. 与当前工程文件的直接映射

### 4.1 `SceneSpec`

对应当前类型与文件：

- [story-package.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/types/story-package.ts)
- [scene.yaml](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/story-packages/sample-scene/scene.yaml)

当前字段：

- `sceneId`
- `sceneName`
- `mainAxis`
- `endLine`
- `openingHook`
- `samplePurpose`
- `source`

这意味着本页明确对应的作者字段至少有：

- `sceneName`
- `mainAxis`
- `endLine`
- `openingHook`
- `samplePurpose`

而 `sceneId` 与 `source` 更像系统标识 / 追溯元数据，不一定需要作为主要作者输入暴露。

我目前的建议是：

- `sceneId`：只读显示或弱编辑，不作为普通文本框主字段
- `source`：只读显示或隐藏

原因不是它们不重要，而是 `sceneId` 现在不只存在于 `scene.yaml`，还同时存在于 `phase-plans.yaml`、`audit-questions.yaml`、`router-lexicon.yaml`、`world-base.yaml` 等 story package 文件中。它更像 package 级主键，而不是普通故事文案字段。

### 4.2 `PhasePlan`

对应当前类型与文件：

- [phase-plan.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/types/phase-plan.ts)
- [phase-plans.yaml](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/story-packages/sample-scene/phase-plans.yaml)

当前字段：

- `phaseId`
- `phaseIndex`
- `phaseGoal`
- `gradientType`
- `beatCount`
- `routerHint`
- `notes`

这意味着本页明确对应的作者字段至少有：

- Phase 数量 / 顺序
- `phaseGoal`
- `gradientType`
- `routerHint`

同时我认为这里有一个当前 recorder 还没写进去、但工程上真实存在的重要遗漏：

- `notes`

因为 `phasePlan.notes` 当前会进入 orchestrator 的 `directorConstraints` 组装，属于“阶段红线 / 局部硬约束”的来源之一。它虽然不是主视觉字段，但不是可以随便丢掉的无关信息。

我目前对这一组字段的建议是：

- `phaseGoal`：文本框
- `gradientType`：文本框也可以，但保存层必须校验到 `GradientTypeSchema`
- `routerHint`：文本框
- `notes`：多行文本框
- `phaseIndex`：由列表顺序派生，尽量不让作者手填
- `phaseId`：系统生成或弱编辑，因为它会被 `phaseSpecificQuestions` 与 `selectionPolicy.phaseOverrides` 引用
- `beatCount`：只读显示为固定 4，不作为作者输入

### 4.3 `AuditQuestionSet`

对应当前类型与文件：

- [audit-question-set.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/types/audit-question-set.ts)
- [audit-questions.yaml](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/story-packages/sample-scene/audit-questions.yaml)

当前字段：

- `globalQuestions`
- `controlQuestions`
- `phaseSpecificQuestions`
- `selectionPolicy`

这意味着本页明确应该处理的，不只是“全局审计问题”和“阶段特定问题”，还包括一个 recorder 里目前没有写清楚的遗漏：

- `controlQuestions`

如果不把它单独承认，后面 coding agent 很容易误以为 audit 只有“全局问题 + phase 问题”两层。

更重要的是，`AuditQuestionSet` 不是“一大块审计文本”，它当前是一个带引用关系的结构：

- `globalQuestions`
- `controlQuestions`
- `phaseSpecificQuestions`
- `selectionPolicy.default`
- `selectionPolicy.phaseOverrides`

所以就算这页坚持“文本框优先”，也至少要保留这几层边界。否则保存层会很难知道某条问题该去哪一组，以及某个 `append` ID 到底引用了谁。

## 5. 与当前 webapp 组件的映射关系

### 5.1 `StoryPackageSelector` / `SceneOverview`

相关文件：

- [StoryPackageSelector.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/components/StoryPackageSelector.tsx)
- [SceneOverview.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/components/SceneOverview.tsx)

当前首页已经展示了：

- `sceneName`
- `sceneId`
- `mainAxis`
- `endLine`
- `samplePurpose`
- phase 数量
- 总 beat 数

这意味着未来“故事结构”页如果接入新 authoring 页面，首页这些 summary 仍然会受到它的保存结果影响。

这也说明：

- `sceneName`
- `mainAxis`
- `endLine`
- `samplePurpose`
- phase 数量

已经有现成的只读消费面，不需要从零发明 summary 语义。

### 5.2 `AuthorControlPanel`

相关文件：

- [AuthorControlPanel.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/components/AuthorControlPanel.tsx)

当前 workbench 中，这个组件直接展示：

- 当前 scene 名称
- phase 顺序
- `gradientType`
- `phaseGoal`
- `routerHint`
- `notes`

所以这页和现有 webapp 最直接的页面映射关系，其实就在这里。

也就是说，“故事结构”页未来如果改写了 `phase-plans.yaml`，这个组件会是最先感受到变化的现有 UI 消费者之一。

这里有一个很重要的现实约束：

- 这个组件当前是只读 runtime surface
- 它不应该被直接改造成 authoring editor

更合理的做法是：

- 新 authoring page 负责编辑
- `AuthorControlPanel` 继续负责消费保存后的结果并展示 phase 摘要

### 5.3 `PlayWorkbench`

相关文件：

- [PlayWorkbench.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/play/PlayWorkbench.tsx)

这里当前直接消费：

- `storyPackage.sceneSpec.openingHook`
- `storyPackage.sceneSpec.mainAxis`
- `storyPackage.phasePlans`
- `storyPackage.auditQuestionSet`

但它对这些字段的消费是 runtime-oriented，不是 authoring-oriented。

所以本页未来的实现不应该直接改造 `PlayWorkbench` 作为编辑器，而应该通过保存 story package 数据，间接影响它当前的运行态读取结果。

除此之外，`PlayWorkbench` 里还有两个很关键的消费点：

- `openingHook` 会在开始第一轮之前直接展示
- `auditQuestionSet` 会影响 tracked adapter 的审计问题映射

这意味着这页的保存结果会同时影响：

- 进入场景前的 opening hook 展示
- 每轮审计的问题选择与结果解释

## 6. 与当前运行链路的映射关系

### 6.1 `story-loader`

相关文件：

- [story-loader.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/story-loader.ts)

它负责读取：

- `scene.yaml`
- `phase-plans.yaml`
- `audit-questions.yaml`

所以这一页如果进入实现，最核心的落点不是组件本身，而是：

- 这些文件如何被读
- 这些文件如何被改
- 改完以后 `StoryPackage` 聚合结果是否仍然合法

从 coding agent 角度看，这里更具体的含义是：

- 不要试图让页面直接拼 runtime 对象
- 应先定义 authoring write model
- 再序列化回 `scene.yaml`、`phase-plans.yaml`、`audit-questions.yaml`
- 再复用现有 `loadStoryPackage()` 做回读校验

### 6.2 `orchestrator`

相关文件：

- [orchestrator.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/orchestrator.ts)

这里会直接消费：

- `sceneSpec.mainAxis`
- `sceneSpec.endLine`
- `phasePlans`
- `phasePlan.phaseGoal`
- `phasePlan.routerHint`
- `phasePlan.notes`
- `auditQuestionSet`

所以这页不是“改几个文本描述而已”，它改的是当前整个 runtime control loop 的输入源。

特别要注意：

- `phasePlan.notes` 会进入 `directorConstraints`
- `routerHint` 会进入 route request context
- `mainAxis / endLine` 会进入 initial collapse、prompt assembly、phase consequence settlement
- `selectionPolicy` 会直接决定每轮究竟审什么

### 6.3 `narrative-router` / `phase-gradient` / `auditor`

相关方向：

- `routerHint` 会影响路由选择
- `gradientType` 会影响 phase volume sequence
- `auditQuestionSet` 会影响当前轮审计问题选择与裁决流程

这说明本页虽然看起来像“都是文本框”，但它其实牵动三个运行时模块：

- 路由
- 节奏
- 审计

以及一个初始化入口：

- `openingHook`

## 7. 我看到的当前遗漏

基于现有工程文件，我认为当前 recorder 对这页至少漏了这几项：

- `phasePlan.notes`
- `controlQuestions`
- `sceneId` 是否只读显示还是完全隐藏
- `phaseId` / `phaseIndex` 是自动生成还是显式可改
- `beatCount` 当前固定为 4，是只读显示还是不显示
- `openingHook` 为空时当前 runtime 会 fallback 到 `mainAxis`
- `routerHint` 实际上与 `router-lexicon.yaml` 中的 router 名称存在关联
- `phaseId` 同时会被 `phaseSpecificQuestions` 与 `selectionPolicy.phaseOverrides` 引用
- `selectionPolicy.default / append` 必须引用真实存在的问题 ID
- `samplePurpose` 当前更多是 catalog / fixture metadata，不直接驱动 runtime loop
- `source` 是追溯字段，不宜混进主要作者输入流

我目前的倾向是：

- `notes` 应保留，而且适合文本框
- `controlQuestions` 应保留，而且适合单独一组文本框
- `sceneId` 更适合只读或弱编辑
- `phaseId` / `phaseIndex` 更适合系统生成或由列表顺序派生
- `beatCount` 当前固定 4，更适合只读说明，而不是作者输入
- `openingHook` 应保留为文本框，但页面要知道它不是必填；为空时 runtime 有 fallback
- `routerHint` 可以是文本框，但保存层应校验它是否能映射到现有 router profile
- `selectionPolicy` 仍然可以让作者以文本方式输入，但保存层必须做引用一致性检查

## 8. 推荐页面结构

如果按你说的“里面提到的都是文本框”，我认为最稳的页面结构应该是：

### 8.1 Scene 基础

- `sceneName`
- `mainAxis`
- `endLine`
- `openingHook`
- `samplePurpose`

这些都可以是文本框或文本域。

### 8.2 Phase 列表

每个 Phase 一个重复区块，内部是：

- `phaseGoal`
- `gradientType`
- `routerHint`
- `notes`

系统信息只读显示：

- `phaseId`
- `phaseIndex`
- `beatCount = 4`

### 8.3 Audit 规则

分 4 组：

- 全局审计问题
- 控制型审计问题
- 阶段特定审计问题
- 选择策略

每条问题仍是一个结构化小块，但具体字段可以用文本框呈现：

- `id`
- `question`
- `expected`
- `blocking`
- `rationale`

这里的重点不是控件类型，而是数据边界不能丢。

## 9. 对 coding agent 的直接映射提醒

如果后续有 coding agent 来实现这一页，它最应该先对齐这些文件：

- [story-package.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/types/story-package.ts)
- [phase-plan.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/types/phase-plan.ts)
- [audit-question-set.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/types/audit-question-set.ts)
- [story-loader.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/story-loader.ts)
- [SceneOverview.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/components/SceneOverview.tsx)
- [AuthorControlPanel.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/components/AuthorControlPanel.tsx)
- [PlayWorkbench.tsx](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/play/PlayWorkbench.tsx)
- [story-package-catalog.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/app/story-package-catalog.ts)
- [auditor.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/modules/auditor.ts)
- [narrative-router.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/modules/narrative-router.ts)
- [phase-gradient.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/modules/phase-gradient.ts)
- [orchestrator.ts](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/src/engine/orchestrator.ts)

潜在还会波及：

- `router-lexicon.yaml` 的有效值校验
- `state-snapshots.yaml` 的 fixture 参考一致性
- `src/app/__tests__/fixtures.ts`
- `src/story-packages/__tests__/sample-scene.test.ts`
- `src/app/__tests__/story-package-catalog.test.ts`
- `src/engine/__tests__/e2e/mock-adapter-e2e.test.ts`
- `src/engine/__tests__/e2e/full-phase-run.test.ts`

## 10. 对 coding agent 的初步约束

后续实现这页时，coding agent 应遵守：

1. 不要把这页实现成“直接编辑 runtime workbench 组件”
2. 不要因为“都是文本框”就忽略现有 schema 约束
3. `gradientType` 虽然可以用文本框呈现，但底层仍必须满足 `GradientTypeSchema`
4. `auditQuestionSet` 不能被简化成只有一坨文本；至少要保留 `global / control / phase-specific / selectionPolicy` 的边界
5. `phasePlan.notes` 不能在 redesign 时无声消失
6. `sceneId` 与 `phaseId` 牵涉跨文件引用，不能当普通文案字段随意改
7. `routerHint` 保存前要校验与 router profile 的可对齐性
8. `selectionPolicy` 保存前要校验问题 ID 是否真实存在
9. 这页保存后，首页 summary、workbench phase 卡片、opening hook、runtime loop 都会受到影响，测试必须覆盖

## 11. 当前 review 结论

基于现在的工程实现，我认为你说的“这一页里的内容都可以是文本框”是可以成立的，但要加上两个边界：

- 文本框只决定作者输入形式，不等于放弃结构
- 真正危险的字段必须由保存层负责校验、引用修复和序列化

所以我现在的推荐结论是：

- 页面层面：可以坚持文本框优先
- 数据层面：必须保持 `SceneSpec / PhasePlan / AuditQuestionSet` 的结构边界
- 系统字段：`sceneId / phaseId / phaseIndex / beatCount / source` 不建议当成普通作者文本输入

我现在只想再确认一个关键点：

`Audit 规则` 这块，你也希望继续按照“每条问题一组字段”的结构化文本块来做，而不是把全局问题、控制问题、阶段问题各自压成一个超大文本域，对吗？
