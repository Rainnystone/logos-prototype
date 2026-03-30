# Sample 故事源稿落点说明

这个目录用于存放当前 `sample-scene` 的故事改编稿、角色稿、世界观稿和阶段大纲。这样安排的原因，是因为这些内容本质上属于样例层的“内容源文件”，它们既不是系统规格，也不是运行时 fixture 本身；只有把故事源稿和 `phase-plan.yaml`、`router-lexicon.yaml`、`audit-questions.yaml` 这类结构化样例分开，后续 agent 才能清楚区分“作者原稿”和“系统消化后的测试输入”。

建议你把故事包至少拆成下面几类文件，而不要继续维持一篇混合式总稿：

- `scene-brief.md`：场景目标、主轴、终点线与测试意图
- `characters.md`：主角、配角、关系与禁忌设定
- `world-style.md`：世界规则、文风、表现边界
- `phase-outline.md`：Phase 级别的大纲与节奏安排
- `author-notes.md`：作者备注、改编原则与暂不定稿内容
- `location-pool.md`：地点环境、空间元素与 `locationPatch` 的来源
- `audit-rules.md`：可被反推为审计问题集的硬规则与阶段检查点

需要特别区分的是：`story-source/` 并不等于运行时的 `worldBase`。在当前 sample 中，`PromptObject.worldBase` 的主要直接来源是 `characters.md` 与 `location-pool.md`；而 `scene-brief.md`、`world-style.md`、`phase-outline.md`、`audit-rules.md` 与 `author-notes.md` 则分别服务于 `scene-overview.md`、`phase-plan.yaml`、`router-lexicon.yaml`、`audit-questions.yaml` 与作者侧说明。

当这些源稿稳定之后，再由它们反推并更新上层的 `scene-overview.md`、`phase-plan.yaml`、`router-lexicon.yaml` 和 `audit-questions.yaml`。换句话说，这个目录负责“作者写什么”，而 `06_FIXTURES/sample-scene/` 同层现有的结构化文件负责“系统实际吃什么”。
