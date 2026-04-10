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
- [ ] 明确 reference 应挂在 `gossipelogUpdate`、`gossipelogInjection`，还是两者分别配置
- [ ] 明确“人际关系记忆”是扩展现有 `character-relationships.yaml`，还是拆分为新 state 合同
- [ ] 明确与现有 runtime `relationshipLayer`、editor surface、bootstrap 的兼容策略
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
1. `gossipelog` 的 reference 是做成和 `weaver` 一样的静态 repo-relative 文档清单，还是按 update / injection 分成两套引用材料？
2. “人际关系记忆”应当以“边”为核心继续演进，还是改成“角色视角下的记忆条目 + 派生关系层”？
3. 现有 package-owned relationship state、runtime `relationshipLayer`、editor surface 文案，哪些必须兼容，哪些允许重构？

## 已做决策
| 决策 | 理由 |
|------|------|
| 先做机制梳理，再进入实现 | 这轮目标是大规模升级，先弄清现有 skill / state / loop 机制能避免误接架构点 |
| 把 gossipelog 代码循环接入交给只读 subagent | 用户明确允许，且可节约主线程上下文，把注意力集中在 agent 本体与升级切口 |
| 当前“skill 机制”按 adapter prompt template + schema contract 理解，而不是外部独立技能文件 | 仓库内 `gossipelog` 当前没有像平台技能那样的独立执行体，升级抓手在 definition / prompt / schema / state |
| 参考 `weaver` 的 reference manifest 机制作为 gossipelog reference 的现成模式 | `weaver` 已有 `referenceManifestsByOperation + resolveSidecarReferences` 的完整链路，可直接复用设计骨架 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 无 | 0 | 当前为只读梳理阶段，未遇到阻塞性错误 |

## 备注
- 2026-04-10 已完成第一轮 catch-up，根目录三件套从模板状态补成可继续执行状态。
- 当前已知最近完成的一轮正式计划是 runtime alignment 修复；该计划明确把 reference / memory schema 升级排除在外，因此本线程属于下一轮工作。
