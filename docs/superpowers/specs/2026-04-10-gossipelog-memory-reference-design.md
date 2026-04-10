# Gossipelog Relationship Memory and Reference Design

**Date:** 2026-04-10

**Status:** Approved for planning

## Goal

在保持现有 `gossipelog` sidecar 接入方式不推倒重来的前提下，完成两项升级：

1. 为 `gossipelogUpdate` 增加一份 repo 内 reference，指导 agent 如何归纳和记录“主观定向关系”。
2. 将当前只保存边级快照的关系 state 升级为“带时间戳、原因字段、完整历史、显式当前关系”的人际关系记忆。

本轮设计目标不是重写 runtime loop，而是在现有 package-owned gossipelog state、runtime `relationshipLayer`、editor surface 这三条链上做兼容升级。

## Product Decisions Confirmed

以下产品决策已经由用户确认：

- 关系必须是有方向的，按 `A -> B` 记录。
- 长期关系记忆不记录 `hero -> others`，但保留：
  - `others -> hero`
  - `others -> others`
- 新关系建立采用“谁在当前 beat 里形成了主观看法，就先记录谁那一边”，不要求首次认识时强制双向对称建边。
- 一旦角色互相认识、相遇，或者至少形成主观看法，就允许建立关系记录。
- 记录需要带统一时间标识，并优先使用现有系统里的：
  - `phaseId`
  - `beatIndex`
  - `roundId`
- 每次关系变化都要记录因果信息，至少拆成：
  - `triggerEvent`
  - `reasoning`
  - `causalAction`
- 历史必须保留，不能只保存最新变化。
- prompt assembler 必须拿到全历史，同时要额外强调“当前关系”。
- `currentRelation` 必须显式持久化，不能在注入阶段临时从历史中推导。
- `reference.md` 只是草稿；关系功能定位和心态词组允许扩展，不做死白名单。
- editor sidecar surface 需要做最小必要同步升级。

## Existing Behavior

当前 `gossipelog` 的核心行为如下：

- sidecar 定义在 `src/agents/gossipelog/definition.ts`
- 运行子循环在 `src/agents/gossipelog/agent.ts`
- 持久化文件在 `agents/gossipelog/character-relationships.yaml`
- 当前 state 模型只有：
  - `baseline`
  - `recentDelta`
  - `highlightNextPrompt`
- 当前 prompt 注入层只有：
  - `highlightedDeltasText`
  - `stableBackgroundText`
- 当前没有像 `weaver` 一样的 reference manifest，`gossipelog` 还没有静态 reference 注入。

因此，当前系统能表达“最近这轮的关系变动”和“较稳定的关系背景”，但不能表达：

- 明确的历史时间线
- 每次变化的触发事件与主观理由
- 显式的“当前关系快照”
- 结构化的关系分类与心态词组

## Scope

本轮设计处理：

- `gossipelogUpdate` reference 挂载与文档格式
- gossipelog state schema 从快照升级为关系记忆
- gossipelog update / injection 合同升级
- relationship layer 的注入语义升级
- 旧 gossipelog state 的兼容迁移
- editor surface 最小摘要升级
- 对应测试面扩展

本轮明确不处理：

- 将 gossipelog state 从 package-owned 改成 storyline-owned
- 新建复杂 editor UI
- 为 gossipelog 增加新的独立 sidecar 进程或新 route
- 在注入前新增一个专门负责“历史压缩”的 LLM sidecar

## Design Decision

采用“在现有 `character-relationships.yaml` 上做兼容升级”的方案，而不是创建第二套独立 memory 文件。

理由：

- 最符合用户“参考 weaver 实现方式，不另起炉灶”的要求。
- 当前 runtime route、bootstrap、repository、surface 都已默认这条文件路径，原地升级能把风险和改动面控制在最小范围。
- 旧数据兼容和迁移可以集中处理，不必同步维护两套 gossipelog truth source。

## Reference Design

### Decision 1: Reuse Weaver-Style Reference Injection

`gossipelog` 的 reference 机制直接复用 `weaver` 的结构：

- 在 `src/agents/gossipelog/definition.ts` 中新增 `referenceManifestsByOperation`
- 新增 gossipelog 自己的 reference 文档目录
- 使用现有 `src/agents/reference-loader.ts`
- 不新增新的 resolver、缓存层或 token 预算规则

### Decision 2: Reference Only Targets `gossipelogUpdate`

本轮 reference 只挂到 `gossipelogUpdate`，不挂到 `gossipelogInjection`。

原因：

- 用户提供的 `reference.md` 本质是在定义“如何判断与记录关系”
- 这是 update 阶段的职责，不是 injection 阶段的职责
- injection 阶段应主要消费结构化记忆，负责把“当前关系”和“历史关系”组织成 prompt-ready 文本

### Planned Local Reference File

设计上将外部草稿整理为 repo 内文档，例如：

- `src/agents/gossipelog/references/relationship-reference.md`

该文档的内容结构应参考 `weaver` 的 reference：

- 定义 gossipelog 的记录目标
- 说明主观定向关系的含义
- 给出功能定位示例与心态词组示例
- 允许扩展，不把词表写成死白名单
- 给出输入 beat 与期望输出的结构化示例
- 明确“允许只形成单向关系”的规则
- 明确“无明确功能定位或情感色彩时允许部分为空”

## State Design

### Decision 3: Upgrade Edge State Into Directed Relationship Memory

新的 state 仍然以 `sourceRoleId -> targetRoleId` 为主索引，但单条边不再只存基线和 recent delta，而是同时保存：

- `currentRelation`
- `history[]`

推荐结构如下：

```ts
interface CharacterRelationshipsFileV2 {
  meta: {
    fileType: 'character-relationships';
    schemaVersion: 2;
    storyPackage: string;
  };
  relationshipsBySource: Record<string, RelationshipSourceBucketV2>;
}

interface RelationshipSourceBucketV2 {
  targets: Record<string, RelationshipMemoryEdge>;
}

interface RelationshipMemoryEdge {
  sourceRoleId: string;
  targetRoleId: string;
  currentRelation: RelationshipMemoryEntry;
  history: RelationshipMemoryEntry[];
}

interface RelationshipMemoryEntry {
  phaseId: string | null;
  beatIndex: number | null;
  roundId: string;
  functionalRole: string | null;
  mindsetTags: string[];
  summary: string;
  triggerEvent: string;
  reasoning: string;
  causalAction: string;
}
```

### Field Semantics

- `currentRelation`
  - 表示目前对这条边有效的最新关系快照
  - 每次 update 成功后必须显式写入
- `history`
  - 保留这条边从建立以来的全部关系条目
  - 追加式增长，不覆盖旧记录
- `phaseId`
  - 使用当前 runtime phase plan 的稳定 id
- `beatIndex`
  - 使用 accepted beat 对应的当前 beat index
- `roundId`
  - 沿用现有 gossipelog / runtime 已存在的稳定标识
- `functionalRole`
  - 可为空，允许“仅有态度尚未稳定分类”
- `mindsetTags`
  - 可为空数组
- `summary`
  - 必填，用于承载简洁的主观关系结论
- `triggerEvent / reasoning / causalAction`
  - 用于表达“发生了什么”“为什么这样理解”“什么动作导致了这次变化”

### Decision 4: Keep Hero as a Forbidden Source

为了和当前产品决定一致，`hero` 仍然不能作为持久化关系记忆的 source。

这意味着：

- `hero -> others` 不写入 gossipelog memory
- `others -> hero` 可以写
- `others -> others` 可以写

现有 merge 层对 hero-outgoing 的限制需要保留，但要改写为适配新的 memory schema。

## Update Contract Design

### Decision 5: Extend Update Request With Phase/Beat Context

当前 `GossipelogUpdateRequest` 只有 `roundId`，不足以满足用户要的“phase + beat”时间语义。

因此 update request 需要新增：

```ts
{
  phaseId: string;
  beatIndex: number;
}
```

最终 update 请求将至少包含：

- `acceptedBeatText`
- `roundId`
- `phaseId`
- `beatIndex`
- `sceneCastRoleIds`
- `sceneCastFraming`
- `candidateRoles`
- `roleDefinitions`
- `relationshipSubgraph`
- `resolvedReferences`

其中 `resolvedReferences` 的加入方式应与 `weaverImport` 类似，但字段命名和 mapper 可以按 gossipelog 自己的合同设计，不要求和 weaver 完全同名。

### Decision 6: Replace Edge Delta Output With Memory Entry Updates

当前 `gossipelogUpdate` 的输出是 `edgeUpdates`，偏向“对旧边做 delta/new_edge”。

本轮升级后，更适合直接让 update skill 输出“新的关系记忆条目”，而不是只输出薄 delta。推荐方向：

```ts
interface GossipelogMemoryUpdate {
  sourceRoleId: string;
  targetRoleId: string;
  shouldCreateEdge: boolean;
  nextCurrentRelation: RelationshipMemoryEntry;
}
```

这样 deterministic merge 层负责：

- 没有边时创建边
- 有边时把 `nextCurrentRelation` 追加到 `history`
- 同步覆盖 `currentRelation`

不再依赖 `baseline/recentDelta/highlightNextPrompt` 这套旧语义。

## Injection Design

### Decision 7: Preserve the Existing Outer `relationshipLayer` Shape

为了减少 runtime / continuity / play 侧的连锁改动，本轮不改 `relationshipLayer` 的外层 schema 形状，仍保留：

```ts
{
  highlightedDeltasText: string;
  stableBackgroundText: string;
}
```

但其内部语义升级为：

- `highlightedDeltasText`
  - 当前关系强调层
  - 显式告诉叙事 LLM 哪些是“当前有效关系”
- `stableBackgroundText`
  - 全历史层
  - 显式告诉叙事 LLM 哪些是“历史关系轨迹”

这属于“保持外壳兼容、升级文本语义”的策略。

### Decision 8: Full History Enters Prompt, Scene-Bounded

用户明确要求全历史进入 prompt，而不是预先再做语义压缩。

本轮因此不新增“历史压缩 sidecar”。

但为防止 token 失控，仍保留当前 gossipelog 的 scene-bounded 思路：

- 只针对当前 scene cast 与 hero 相关的关系边做 injection
- 对这些边，history 全量进入 prompt text
- prompt 中显式分段：
  - 当前关系
  - 历史关系

这样既满足“全历史进入 prompt”，也不把整个故事包的所有边一次性灌入。

### Injection Prompt Output Expectations

`gossipelogInjection` 的职责变为：

- 根据结构化的 `currentRelation + history[]`
- 组织出可读的“当前关系强调块”
- 组织出可读的“历史关系轨迹块”

叙事 LLM 将看到类似层次：

- 当前关系：A 对 B 当前视为……
- 历史关系：phase-X beat-Y 因为……从……变为……

## Compatibility and Migration

### Decision 9: Read Old Schema, Write New Schema

迁移策略采用：

- 兼容读取旧 schemaVersion 1
- 写回统一使用 schemaVersion 2

迁移规则：

- 旧的 `baseline.state` 迁移为一条历史条目
- 旧的 `recentDelta.state` 若存在，迁移为最新条目
- 旧数据缺少 `phaseId` 与 `beatIndex` 时允许写入 `null`
- 旧数据的 `lastAbsorbedRound` / `sourceRound` 转换为对应条目的 `roundId`
- `functionalRole` 迁移为 `null`
- `mindsetTags` 迁移为空数组
- `triggerEvent / reasoning / causalAction` 迁移为空字符串

如果旧文件完全不可读，则继续保留现有“视为 unreadable 或 fallback”行为，不在 migration 层硬猜。

## Surface Design

### Decision 10: Minimal Editor Surface Upgrade

`agent-surface` 不扩复杂 UI，只升级摘要语义。

建议从现在的“多少条 relationship link tracked”升级为更贴近 memory 的表述，例如：

- 已跟踪多少条定向关系记忆
- 最近一次当前关系更新时间
- 是否存在历史轨迹

这仍然保持 read-only surface，不引入编辑能力。

## File Impact

设计上预期会影响这些核心文件：

- `src/agents/gossipelog/definition.ts`
- `src/agents/gossipelog/agent.ts`
- `src/agents/gossipelog/repository.ts`
- `src/agents/gossipelog/merge.ts`
- `src/agents/gossipelog/contracts.ts`
- `src/types/character-relationships.ts`
- `src/types/gossipelog-skill-packets.ts`
- `src/engine/types/adapter-interface.ts`
- `src/engine/api-adapter/adapter.ts`
- `src/engine/api-adapter/schema-mapper.ts`
- `src/engine/api-adapter/prompt-templates.ts`
- `src/agents/agent-surface.ts`
- 新增 `src/agents/gossipelog/references/relationship-reference.md`
- 对应 gossipelog / adapter / surface / runtime tests

## Testing Strategy

本轮按 TDD 实施，重点补这些测试面：

1. reference loading
   - gossipelog update 会解析并传入 reference
2. schema migration
   - 旧版 gossipelog state 能读并迁移
3. update contract
   - 输出新的 memory entry update 结构
   - hero 仍不能作为 source
4. merge logic
   - 建新边
   - 追加历史
   - 覆盖 current relation
5. injection behavior
   - 当前关系与历史关系都进入 relationship layer
   - scene-bounded 过滤仍成立
6. editor surface
   - 新摘要可读
7. regression
   - gossipelog route / bootstrap / play runtime 现有主链不被破坏

## Risks

- 全历史进入 prompt 会抬高 token 压力，因此 scene-bounded 过滤必须保留。
- 外层 `relationshipLayer` 名称不变但语义升级，会带来一点命名漂移；这是为了换取 runtime continuity 的低风险兼容。
- 旧数据迁移信息不完整，迁移出的历史条目可能只有 `roundId` 没有 `phaseId/beatIndex`；这是已接受的兼容代价。

## Success Criteria

满足以下条件即视为本轮设计落地成功：

- `gossipelogUpdate` 使用 repo 内 reference 指导关系归纳
- gossipelog state 能保存有向关系、显式当前关系和完整历史
- 每次关系变化都可追溯到 `phaseId + beatIndex + roundId`
- 每次关系变化都能表达事件、理由和动作
- 非主角角色对其它角色的关系变化会持续进入 prompt
- prompt 中能清楚区分“当前关系”和“历史关系”
- 旧 gossipelog state 可兼容读取并迁移
- editor surface 能显示升级后的 gossipelog memory 摘要
