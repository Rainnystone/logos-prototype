# 发现与决策

## 需求
- 用户希望先让我补齐 `gossipelog agent` 与其 skill/reference 机制的上下文，再继续推进大规模升级。
- 这轮升级的两个主目标是：
  1. 给 `gossipelog` 增加“如何梳理人际关系”的 reference；
  2. 把当前关系记录升级为角色级“人际关系记忆”。
- 用户新增的强约束：
  - 关系必须是有方向的，按 `A -> B` 记录。
  - 一旦角色互相认识或相遇，就应建立关系记录。
  - 关系变化必须带统一时间标识，用户接受使用现有 phase / beat 体系中的统一 id。
  - 关系变化要记录原因，至少包括事件 / 理由 / 动作导致的变化。
  - 历史关系记录必须保留，不能只保留最新变动。
  - 除主角外，角色对其它角色建立后的关系变化都应持续进入 prompt assembler，但要额外强调“当前关系”。
  - 非主角关系建立采用“谁形成了主观看法，就先记录谁那一边”，不要求首次认识时强制双向对称落边。
  - `reference.md` 只是草稿，词表允许扩展，不需要做成死白名单。

## 研究发现
- `gossipelog` 当前是 built-in sidecar，不是独立常驻进程；其核心定义在 [src/agents/gossipelog/definition.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/definition.ts)。
- 当前所谓 `gossipelog` “skill” 在代码里体现为两个 adapter 模式：
  - `gossipelogUpdate`
  - `gossipelogInjection`
  它们的 system/user prompt 定义在 [src/engine/api-adapter/prompt-templates.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/engine/api-adapter/prompt-templates.ts)。
- 这两个 skill 当前都没有 reference 注入能力。证据是 [src/agents/gossipelog/definition.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/definition.ts) 里 `referenceManifestsByOperation` 为空对象。
- 现成的 reference 机制已经存在，并且由 `weaver` 在生产路径中使用：
  - manifest 类型定义在 [src/agents/registry.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/registry.ts)
  - loader 在 [src/agents/reference-loader.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/reference-loader.ts)
  - 已落地样例在 [src/agents/weaver/definition.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/weaver/definition.ts) 与 [src/agents/weaver/references/import-reference.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/weaver/references/import-reference.md)
- `gossipelog` 当前持久化的不是“角色记忆”，而是 package-owned 的关系边状态文件 [src/types/character-relationships.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/types/character-relationships.ts)：
  - `baseline`
  - `recentDelta`
  - `highlightNextPrompt`
  这更像“关系图的边状态 + 下一轮提示高亮”，不是角色视角长期记忆。
- runtime 真正注入到生成 prompt 的不是整个关系文件，而是更薄的一层 `relationshipLayer`，只有：
  - `highlightedDeltasText`
  - `stableBackgroundText`
  合同定义在 [src/types/gossipelog-skill-packets.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/types/gossipelog-skill-packets.ts)。
- `gossipelog` 的核心子循环是：
  1. 从 `character-relationships.yaml` 读取或创建状态；
  2. 按 hero + scene cast 裁剪候选角色集合；
  3. 调 `gossipelogUpdate` 返回结构化边更新；
  4. merge 并持久化；
  5. 调 `gossipelogInjection` 生成 prompt-ready relationship layer。
  核心实现位于 [src/agents/gossipelog/agent.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/agent.ts)。
- 代码循环接入更偏 `play/runtime` 而不是 `editor/authoring`：
  - `PlayWorkbench` 初始化前可触发 bootstrap
  - accepted beat 后由 orchestrator 异步调度 refresh
  - `editor` 侧主要负责显示 agent surface 和在 `text_import` 创建包后尝试一次 bootstrap
- 最近已完成的 runtime alignment 计划故意没有处理 reference / memory 升级，见：
  - [docs/superpowers/plans/2026-04-10-gossipelog-runtime-alignment-fixes.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/plans/2026-04-10-gossipelog-runtime-alignment-fixes.md)
  - [docs/superpowers/specs/2026-04-10-gossipelog-runtime-alignment-design.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/specs/2026-04-10-gossipelog-runtime-alignment-design.md)
- 用户提供的外部参考文档已经给出一套建议性的关系分类法，位于 `/Users/tachikoma/Library/CloudStorage/OneDrive-个人/Obsidian/L.O.G.O.S/LOGOS-Design/product-discussions/gossipelog-research/reference.md`，其核心内容包括：
  - `gossipelog` 的核心是“主观定向关系”；
  - 推荐归纳格式是 `[功能定位] + [心态词组] —— [语义总结]`；
  - 已给出 10 类功能定位与 14 类主观心态词组；
  - 文档定位明显更适合作为 `gossipelogUpdate` 的 reference，而不是直接替代最终注入文本。
- 现有系统里可直接复用的标识现状是：
  - `phaseId` 在 `phase-plans.yaml` 与 phase plan 类型里稳定存在；
  - runtime checkpoint 里有 `phaseIndex`、`beatIndex`、`roundId`，定义见 [src/types/runtime-sessions.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/types/runtime-sessions.ts)；
  - `gossipelog` 当前 update/injection 合同已经传 `roundId`，并在 state 中使用 `sourceRound` / `lastAbsorbedRound`；
  - 当前没有现成的独立 `beatId` 字段，因此若要精确标注“phase a, beat b”，需要在 gossipelog 更新链路里显式补传 phase/beat 信息，或者仅依赖 `roundId`。

## 技术决策
| 决策 | 理由 |
|------|------|
| 后续若加 reference，优先复用 `weaver` 的 manifest + loader 结构 | 仓库已有稳定实现、测试覆盖与 token budget 规则 |
| 后续若做“人际关系记忆”，不能只在 injection prompt 上补文案 | 当前瓶颈不只在 prompt，而在 state 模型本身仍是边级快照 |
| 升级设计必须同时考虑 repository、types、prompt contracts、surface summary | 这四层共同定义了当前 gossipelog 的实际能力边界 |
| 用户提供的 `reference.md` 优先视为 update 侧的分类参考手册 | 它主要约束“如何判断和归纳关系”，不是“如何把历史关系压缩进最终 prompt” |
| 统一时间标识优先采用 `phaseId + beatIndex + roundId` | 现有系统已有 `phaseId` 与 `roundId`，`beatIndex` 也存在于 runtime checkpoint，组合后既可读也足够区分 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 根目录 `task_plan.md / findings.md / progress.md` 仍是模板态，无法承接多轮 gossipelog 升级 | 本轮先补齐 catch-up 结论，作为下一步规划和实现入口 |

## 资源
- [coding-agent-guide.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/coding-agent-guide.md)
- [src/agents/gossipelog/definition.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/definition.ts)
- [src/agents/gossipelog/agent.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/agent.ts)
- [src/agents/gossipelog/repository.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/repository.ts)
- [src/agents/gossipelog/merge.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/gossipelog/merge.ts)
- [src/engine/api-adapter/prompt-templates.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/engine/api-adapter/prompt-templates.ts)
- [src/agents/reference-loader.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/reference-loader.ts)
- [src/agents/weaver/definition.ts](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/weaver/definition.ts)
- [src/agents/weaver/references/import-reference.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/agents/weaver/references/import-reference.md)
- [docs/superpowers/specs/2026-04-10-gossipelog-memory-reference-design.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/specs/2026-04-10-gossipelog-memory-reference-design.md)
- [docs/superpowers/plans/2026-04-10-gossipelog-memory-reference-implementation.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/plans/2026-04-10-gossipelog-memory-reference-implementation.md)

## 视觉/浏览器发现
- 本轮没有进行浏览器检查；当前阶段是只读代码与文档梳理。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
