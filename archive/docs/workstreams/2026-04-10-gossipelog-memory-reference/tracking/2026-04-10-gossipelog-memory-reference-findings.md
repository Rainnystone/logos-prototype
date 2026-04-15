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

## 实现期发现
- 2026-04-10 Task 1 首轮实现已经把 gossipelog v2 memory 的大体骨架接进了类型层和 prompt 层，但规格评审确认它还没有真正把“reference + 新合同”锁死。
- 当前最关键的 5 个实现缺口是：
  1. repo 内 gossipelog reference 仍只是字段说明，没有真正承接外部草稿里的功能定位、心态词组、单向关系规则与结构化示例；
  2. provider response schema 仍停留在旧 `edgeUpdates` 语义，没有把 `memoryUpdates` 及其因果字段投射给模型；
  3. 共享 `GossipelogUpdateResultSchema` 仍接受 legacy `edgeUpdates`，导致“memory-only 合同”没有真正成立；
  4. `GossipelogUpdateRequest` 的 `phaseId` / `beatIndex` 仍被做成 nullable，弱于已批准 spec；
  5. v2 `history` 仍允许空数组，尚未锁住“完整历史必须保留”的核心约束。
- 这些问题说明：单靠“测试过了”并不能证明 Task 1 已完成，必须同时检查 reference 内容、provider schema 与 schema 约束是否真的和设计文档一致。
- Task 1 修复回合通过 spec review 之后，质量评审和构建验证又进一步确认：当前改动仍然只是“合同骨架完成”，真正的运行链路还没有同步迁移。
- 目前已经确定的真实断裂点有：
  1. `GossipelogUpdateRequest` 已要求 `phaseId` / `beatIndex` / `resolvedReferences`，但 agent / adapter 的真实请求链路还没有全部补齐；
  2. `gossipelogUpdate` 已注册必需 reference manifest，但 agent 真实运行时还没有像 `weaver` 那样 resolve 并注入 reference；
  3. prompt/schema 已切到 `memoryUpdates`，但 parser / agent / merge 等下游仍有旧 `edgeUpdates` 语义残留；
  4. 公开的 `CharacterRelationshipsFile` 已允许 v2，但 repository / merge / runtime 读写还未完成对 v2 的判别和处理。
- 这说明 implementation plan 的 Task 2 与 Task 3 不是“可选增强”，而是当前 Task 1 合同迁移落地后的必经后续步骤；否则工程层面会继续 build 红、类型红或运行时断裂。
- 2026-04-10 Task 2 已确认可行并完成闭环：
  - repository 现在可以兼容读取 v1 文件，并在内存中统一归一化为 v2；
  - save 路径统一按 v2 schema 写回；
  - merge 已改为消费 `memoryUpdates`，显式维护 `currentRelation + history[]`；
  - hero 仍不能作为持久化 source；
  - 同一条 memory update 被重复应用时，merge 现在有幂等保护，不会把 history 错误追加成重复轨迹。
- Task 2 完成后，`type-check` 仍然显示的主要错误都集中在 Task 3 范围：`agent.ts`、`adapter.ts`、`response-parsers.ts`、`agent.test.ts`、`orchestrator.test.ts` 等还停留在旧 `edgeUpdates` / 缺少 `phaseId` / `beatIndex` / `resolvedReferences` 的状态。
- 2026-04-10 Task 3 的主链路已贯通：
  - `RunGossipelogCycleInput` 现在要求 `phaseId` 和 `beatIndex`；
  - browser bridge、API route、orchestrator 已把 accepted beat 的 phase/beat 真正传进 gossipelog refresh；
  - gossipelog agent 会真实 resolve `gossipelogUpdate` reference，并将 `resolvedReferences` 注入 update request；
  - adapter 的输入校验和 response parser 都已切到新 gossipelog update 合同；
  - `memoryUpdates` 已不再只是 prompt/schema 层的概念，而是贯穿真实 update path 的结构。
- Task 3 完成后重新跑 `type-check`，剩余红线已收敛为三类：
  1. `bootstrap.ts` 仍未补传新增的 `phaseId` / `beatIndex`；
  2. 一些基于 union 的测试需要更明确的类型窄化，主要在 `merge.test.ts`、`repository.test.ts`、`character-relationships.test.ts`；
  3. 少量旧 mock / 旧断言仍停留在 `edgeUpdates` 时代，主要在 `play.test.tsx`、`type-conformance.test.ts` 和 `schema-mapper.test.ts`。
- 这意味着主流程风险已经大幅下降，下一步更适合用一个小范围 cleanup packet 清掉这些残余，而不是继续大面积改动 gossipelog 主链路。
- 2026-04-11 Task 3 的 quality review 已闭环，额外确认并修掉了三类真实运行风险：
  1. bootstrap 现在使用“首个 phase + beatIndex 0”的显式引导锚点，不再缺参调用 `runGossipelogCycle`；
  2. workbench demo adapter 与 mock adapter 都已切到 `memoryUpdates`，fallback 路径不再停留在旧 `edgeUpdates` 合同；
  3. route / response parser / agent 已对时间锚点增加严格约束，避免错误的 `phaseId` / `beatIndex` 被静默持久化。
- 截至当前，剩余 `type-check` 红线已经进一步压缩成 8 个文件：
  - `src/agents/gossipelog/__tests__/merge.test.ts`
  - `src/agents/gossipelog/__tests__/repository.test.ts`
  - `src/agents/gossipelog/definition.ts`
  - `src/agents/gossipelog/merge.ts`
  - `src/agents/gossipelog/repository.ts`
  - `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
  - `src/types/__tests__/character-relationships.test.ts`
  - `src/types/__tests__/type-conformance.test.ts`
- 这些残余不再属于“主流程没接通”，而是 union 类型窄化、定义文件类型提示和旧断言迁移的扫尾工作，适合单独打一个小 cleanup packet。
- 2026-04-11 cleanup packet 已闭环：
  - `type-check` 已恢复为 0 error；
  - 定向测试已确认 v2 relationship memory 的 repository / merge / schema mapper / contracts 没有因为扫尾修正而回归；
  - 这意味着 gossipelog memory 升级当前剩余的核心实现面，已经只剩 Task 4 的 injection 语义与 sidecar surface 摘要升级。
- 当前 Task 4 的明确切口是：
  1. `gossipelogInjection` prompt 不能再只把 `relationshipSubgraph` 当作原始 JSON 转述，而要明确分段组织“当前关系”与“历史关系”；
  2. `relationshipLayer` 外层合同仍保持 `highlightedDeltasText + stableBackgroundText` 不变，但内部语义要升级为“当前关系强调 + 全历史轨迹”；
  3. `agent-surface` 当前虽然已能统计 v2 的 history 条目数，但摘要文案仍偏“link count”，还没有真正站在 relationship memory 视角表达状态。
- 2026-04-11 Task 4 现已闭环：
  - injection system/user prompt 已显式拆成当前关系层与历史关系层；
  - `relationshipLayer` 外壳保持兼容，但语义已升级为“当前关系强调 + 全历史轨迹”；
  - sidecar surface 摘要对 v2 不再只是 link count，而是明确说明 directed relationship memory、current relation snapshots 和 history coverage；
  - spec review 额外证明“空状态也要用 relationship memory 语义”，因此最终实现专门补了 `schemaVersion === 2 && trackedEdgeCount === 0` 的 memory 文案与对应测试。
- 2026-04-11 Task 5 也已闭环：
  - `schema-validator.test.ts` 和 `schema-mapper.test.ts` 的收尾验证都已通过；
  - `schema-mapper.test.ts` 中残留的 `no-explicit-any` 已以最小方式修补；
  - `npm run build` 通过；
  - `npm test` 全量 `91 files / 813 tests` 通过。
- 本轮还暴露出一个执行层面的重要发现：subagent 如果没有被强制绑定到 worktree 落点，就可能默认把实现改动写回主仓库 checkout。后续主线程必须在接入任何 subagent 结果之前，先核对根仓库与 worktree 的 `git status`，再决定是否合并结果。

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 根目录 `task_plan.md / findings.md / progress.md` 仍是模板态，无法承接多轮 gossipelog 升级 | 本轮先补齐 catch-up 结论，作为下一步规划和实现入口 |
| Task 1 首轮实现只锁住了部分表层字段，尚未锁死 reference 深度与 memory-only 合同 | 增加 spec review 回合，并要求 implementer subagent 按 5 个问题重新做一轮 TDD 修复 |
| Task 1 修完后 build 仍失败，暴露出 repository / merge / agent / adapter 等真实链路未完成迁移 | 不回退 Task 1，而是按 implementation plan 顺序继续执行 Task 2 和 Task 3，把 v2 memory 合同真正接通 |
| Task 2 首轮实现会在同一 update 重放时重复追加 history，污染关系轨迹 | 增加专门的幂等回归测试，并在 merge 层仅对“全字段完全一致”的重复 memory entry 做短路保护 |
| Task 3 主链路完成后，工程还残留一批非主链路 type-check 红线 | 把剩余问题收敛成独立的小范围 cleanup packet，避免继续扩大主链路改动面 |
| Task 3 首轮质量复核发现 bootstrap、fallback adapter 与时间锚点约束仍有真实运行风险 | 在 Task 3 内完成第二轮回修，随后再转入 cleanup packet，确保主链路问题不被拖进后续任务 |
| Task 4 首轮实现遗漏了“v2 空状态”这条 surface 语义分支 | 在 spec review 指出问题后，补一条空状态 RED 测试，再将 `definition.ts` 的空状态摘要切到 relationship memory 文案 |
| Task 5 build 最后仍被 `schema-mapper.test.ts` 中的 `no-explicit-any` 卡住 | 将返回类型最小收紧为 `Record<string, unknown>`，复跑定向测试与 build 后恢复 |
| subagent 一度把实现改动落到了根仓库 `branch/narrative-editor` | 先把三件套同步到 worktree，再清空根仓库改动；后续只在 worktree 接收和验证 subagent 结果 |

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
