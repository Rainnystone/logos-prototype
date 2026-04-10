# 任务计划：gossipelog 能力升级前置梳理

## 目标
为后续 `gossipelog` 大规模升级建立准确的执行起点：补齐其现有工作机制、reference/skill 机制与代码接入边界，并把下一轮要做的两件事压实为可规划的升级方向。

具体升级目标：
1. 为 `gossipelog` 提供一套“如何梳理人际关系”的 reference 机制，例如词表、关系分类规则、输出约束示例。
2. 把当前“关系记录”升级为角色级的“人际关系记忆”，而不只是一次性的 prompt 关系层。

## 当前阶段
阶段 2

## 各阶段

### 阶段 1：现状恢复与机制梳理
- [x] 读取仓库级执行指引与恢复文件
- [x] 梳理 `gossipelog` agent 本体、state、prompt contract、reference 机制现状
- [x] 额外确认 `gossipelog` 在 runtime / editor 中的接入方式
- [x] 将关键发现记录到 `findings.md`
- **状态：** complete

### 阶段 2：升级边界与方案收敛
- [x] 基于用户给定 `reference.md` 明确 reference 的挂载方式与注入范围
- [x] 明确“人际关系记忆”是扩展现有 `character-relationships.yaml`，还是拆分为新 state 合同
- [x] 明确时间戳、事件原因、历史保留与当前关系强调的精确合同
- [x] 明确与现有 runtime `relationshipLayer`、editor surface、bootstrap 的兼容策略
- [ ] 输出后续 implementation packet 划分
- **状态：** in_progress

### 阶段 3：实现
- [ ] 按方案逐步实现 reference / memory 升级
- [ ] 为新 contract、prompt、repository、surface 补测试
- [ ] 保持 code / tests / active plan 同步
- **状态：** pending

### 阶段 4：测试与验证
- [ ] 跑 targeted tests 覆盖 gossipelog 相关模块
- [ ] 跑 `npm run build`
- [ ] 跑全量 `npm test`
- [ ] 检查关键 fallback、bootstrap、prompt 注入与 continuity 路径
- **状态：** pending

### 阶段 5：交付
- [ ] 总结升级结果与边界
- [ ] 说明已验证项、未验证项与需要人工决定的事项
- [ ] 交付给用户继续下一轮决策或实现
- **状态：** pending

## 关键问题
1. `gossipelog` 的 reference 是只作用于 `gossipelogUpdate`，还是同时也要约束 `gossipelogInjection`？
2. “每个决策（除了主角）”这里是否等价于“每个角色（除了主角）”，即非主角角色都要维护它对其它角色的有向关系时间线？
3. 对“建立关系”的阈值要多低？首次见面/知晓存在就建边，还是只有出现明确主观看法后才建边？
4. 现有 package-owned relationship state、runtime `relationshipLayer`、editor surface 文案，哪些必须兼容，哪些允许重构？

## 已做决策
| 决策 | 理由 |
|------|------|
| 先做机制梳理，再进入实现 | 这轮目标是大规模升级，先弄清现有 skill / state / loop 机制能避免误接架构点 |
| 把 gossipelog 代码循环接入交给只读 subagent | 用户明确允许，且可节约主线程上下文，把注意力集中在 agent 本体与升级切口 |
| 当前“skill 机制”按 adapter prompt template + schema contract 理解，而不是外部独立技能文件 | 仓库内 `gossipelog` 当前没有像平台技能那样的独立执行体，升级抓手在 definition / prompt / schema / state |
| 参考 `weaver` 的 reference manifest 机制作为 gossipelog reference 的现成模式 | `weaver` 已有 `referenceManifestsByOperation + resolveSidecarReferences` 的完整链路，可直接复用设计骨架 |
| 非主角关系记忆按“非主角 -> 其它角色”的有向关系维护 | 用户明确确认“不记录主角对别人的长期关系记忆”，但要保留别人对主角和别人对别人 |
| 新关系建立采用“谁形成主观看法，先记谁那一边” | 用户用“我认识明星，但明星不认识我”的例子明确了单向建立是允许的 |
| `reference.md` 作为可扩展草稿而非硬编码白名单 | 用户明确允许扩词，不要求严格锁死词表 |
| 变化原因字段采用拆分结构 | 用户同意拆成事件、理由、动作三类因果字段 |
| prompt 必须带全历史，同时额外强调当前关系 | 用户明确拒绝在注入前做语义压缩，要求叙事 LLM 自己看到历史与当前关系层次 |
| 当前关系采用显式 `currentRelation` 快照 | 用户同意不要在 prompt 阶段临时重新推导当前关系 |
| 旧状态允许兼容迁移；必要时清空也可接受 | 用户优先接受兼容迁移，且对彻底清空不敏感 |
| agent surface 应同步升级为新的关系记忆摘要 | 用户同意顺带更新 editor 侧最小可读摘要 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 无 | 0 | 当前为只读梳理阶段，未遇到阻塞性错误 |

## 备注
- 2026-04-10 已完成第一轮 catch-up，根目录三件套从模板状态补成可继续执行状态。
- 当前已知最近完成的一轮正式计划是 runtime alignment 修复；该计划明确把 reference / memory schema 升级排除在外，因此本线程属于下一轮工作。
- 2026-04-10 已将用户确认后的升级设计落档到 `docs/superpowers/specs/2026-04-10-gossipelog-memory-reference-design.md`，下一步应进入 implementation plan。
