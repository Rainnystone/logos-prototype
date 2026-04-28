# Archive

`archive/` 用于存放**历史记录与参考材料**，默认不作为当前实现的直接执行依据。

## 归档目标

- 保留设计演进脉络（为什么当时这么做）。
- 保留历史方案与实验（做过什么、放弃了什么）。
- 保留旧版规格快照（便于追溯语义来源）。
- 避免历史文档污染当前执行入口。

---

## 当前归类（推荐阅读顺序）

### A. 高价值历史记录（优先看）

1. `archive/docs/narrative-editor-redesign/`
   - 编辑器重构主记录与分区文档。
   - 用途：理解 editor 架构迁移、页面边界和历史决策。

2. `archive/docs/narrative-editor-branch.md`
   - 分支过渡与阶段背景说明。

### B. 历史计划与设计快照（按需看）

1. `archive/docs/superpowers/plans/`
2. `archive/docs/superpowers/specs/`
3. `archive/docs/superpowers/plans/drafts/`
4. `archive/docs/dev-updates/`
5. `archive/docs/workstreams/`

> `archive/docs/superpowers/` 更适合回看单篇 plan / spec 的历史演进；`archive/docs/dev-updates/` 则用于回看一整轮已封板的大更新。
> `archive/docs/workstreams/` 用于归档“单一工作流”封板包（spec/plan/tracking 一起归档）。

### C. 历史规格库（只在需要追溯时看）

1. `archive/vendor/LOGOS-SPEC/`
   - 包含旧版模块说明、契约、ADR、样例与 UX 草图。
   - 性质：规格快照（snapshot），不是当前代码行为的唯一真值。

### D. 静态资产与截图

1. `archive/docs/assets/`
2. `archive/docs/narrative-editor-redesign/**.png`
3. `archive/vendor/LOGOS-SPEC/08_UX/design-artifacts/assets/`

> 主要用于历史对照和视觉参考，不应直接当作实现验收标准。

---

## 使用原则（避免“读档误驱动”）

当归档文档与当前任务发生冲突时，优先级应为：

1. 当前对话中的人类指令
2. 当前分支的代码与测试行为
3. `docs/` 下的活跃计划/规格（若存在）
4. `archive/` 下历史记录

换句话说：`archive/` 是“解释历史”的地方，不是“强制执行当前实现”的入口。

---

## 维护约定

- 新增归档文档时，请在对应目录保留日期前缀（如 `2026-04-01-...`）或明确时间上下文。
- 若某份文档已被新文档取代，请在旧文档顶部补“被替代说明 + 指向链接”。
- 需要长期引用的归档内容，优先在本 README 增加索引，不建议重复复制内容。
- 若后续决定进一步细分，可按“runtime / authoring / ux / experiments”在 `archive/docs/` 下增加二级目录，但应一次性迁移并附迁移说明。

---

## 工作流归档索引

| Workstream | Archived On | Location | Included Materials | Note |
| --- | --- | --- | --- | --- |
| `2026-04-10-gossipelog-memory-reference` | 2026-04-15 | `archive/docs/workstreams/2026-04-10-gossipelog-memory-reference/` | spec, plan, tracking snapshots (`task_plan/progress/findings`) | 首次按 `workstreams/` 容器归档 |
| `2026-04-10-gossipelog-runtime-alignment-fixes` | 2026-04-28 | `archive/docs/workstreams/2026-04-10-gossipelog-runtime-alignment-fixes/` | spec, plan | 根目录三件套已处于下一工作流待命状态，未重复归档 |

---

## 快速索引

- 编辑器重构主记录：`archive/docs/narrative-editor-redesign/master-record.md`
- 重构目录入口：`archive/docs/narrative-editor-redesign/README.md`
- 历史 superpowers 归档入口：`archive/docs/superpowers/README.md`
- 开发更新档案入口：`archive/docs/dev-updates/README.md`
- 最近一轮完整开发更新：`archive/docs/dev-updates/march-dev-update/README.md`
- 最近一次单工作流封板：`archive/docs/workstreams/2026-04-10-gossipelog-runtime-alignment-fixes/README.md`
- 历史规格入口：`archive/vendor/LOGOS-SPEC/README.md`
