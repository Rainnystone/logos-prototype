# Task Plan

## Goal

摸清 `/play` 从“玩家完成选择”到“下一段正文可见”的体感延迟来源，判断是否存在更快、更轻、更稳、且容易模块化的优化路径；优先考虑能减少技术债的结构性方案，而不是继续堆补丁。

## Success Criteria

- 明确拆出体感延迟的主要构成：前端状态切换、服务端编排、LLM 请求、auditor、`gossipelog`、以及网络/VPN 的影响边界。
- 基于当前代码链路与实际日志，形成一份按“收益 / 实施复杂度 / 技术债风险”排序的候选方案。
- 方案必须区分：
  - 可以直接用配置或执行顺序优化解决的问题
  - 需要小范围架构调整但仍保持模块化的问题
  - 只适合作为兜底补丁、原则上不应优先采用的问题
- 补充外部最佳实践调研，重点参考叙事 / RPG / 交互式 fiction / LLM runtime 相关项目或开发者社区。
- 形成下一步建议时，明确哪些结论已经被当前仓库证据支持，哪些只是外部经验或待验证假设。

## Scope

当前线程以调查、诊断、方案比较和验证建议为主，不默认进入实现。可以读取和分析 `/play`、runtime、LLM proxy、`gossipelog`、auditor 相关代码与日志；如需真正改代码，先把设计判断和优先级讲清楚。

## Active Track

- 轨道：`/play` 体感延迟优化探索
- 当前状态：正在做链路诊断、日志归因与外部最佳实践检索
- 关键约束：
  - 延迟定义是“玩家体感延迟”，即从做完选择到下一段正文重新可见的时间
  - 优先考虑高效、轻便、稳定、容易模块化的方案
  - 避免为了短期见效引入长期技术债
  - VPN 可能影响远端请求耗时，必须纳入判断
  - `auditor` 可关闭这一点已知，但要继续探索除此之外的优化空间

## Current Investigation

- 当前观察到的 terminal 截图里，`POST /api/llm/proxy` 多次落在约 `17s` 到 `111s`，明显高于本地 route / 页面请求耗时。
- `POST /api/play/packages/sample-scene/runtime-session`、`POST /api/play/gossipelog`、`POST /api/play/gossipelog/bootstrap` 在截图里大多位于几十到几百毫秒，初步显示体感瓶颈更像是远端 LLM 往返，而不是本地 Next route 本身。
- 上述观察仍需结合当前代码链路确认：截图里这些 `llm/proxy` 请求分别对应主生成、rewrite、audit，还是其他 sidecar 路径。

## Parallel Investigation

- 并行讨论：`March Dev Update Phase 4` 的 `weaver` 导入成功率优化
- 当前状态：design spec 已写完并通过 review；在进入 implementation plan 前，先修复了 `branch/narrative-editor` 的 baseline 问题，避免 fresh worktree 和主工作区对仓库状态的判断不一致
- 关注点：
  - `weaver` reference 是否需要进一步明确 `worldBase`、角色、地点等中间输出结构
  - prompt 里的 `Output Contract` 是否需要从“仅列 key 名”升级为“列 key 名 + 类型/语义/约束”
  - 是否需要补充面向连续书稿/自由文本输入的 extraction examples，而不是继续依赖抽象原则描述
- 已冻结的新前提：
  - `weaver` 允许局部失败；抽不出来就留空并记录，不应报硬错误、卡住流程，或强迫作者立即补全
  - `hero / coreCast / antagonists / npcCharacters / locations` 的最小 shape 可以压到“有名字即可”，其余字段按证据可选
- 当前 spec：
  - [docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md](docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md)
- 本线程暂不创建 implementation plan；等你审阅并确认 spec 后再决定是否进入下一步
- 当前新增约束：
  - `sample-scene` 继续保留你真实使用过的痕迹，包括推进过 beat、复制过故事线后的状态，不把它回退成“干净模板”
  - baseline 测试要自己构造 legacy baseline，不再把 `sample-scene` 误当成未使用夹具

## Work Packets

| 状态 | 任务块 | 说明 |
| --- | --- | --- |
| complete | Packet 1 | 恢复上下文、重读仓库规则、锁定这次调研的目标与边界 |
| in_progress | Packet 2 | 拆解 `/play` 体感延迟链路，确认本地流程、远端 LLM、auditor、`gossipelog`、VPN 的相对贡献 |
| pending | Packet 3 | 并行外部检索：收集叙事 / RPG / 交互式 fiction / LLM runtime 低延迟实践 |
| pending | Packet 4 | 汇总候选优化方案，并按收益、复杂度、技术债风险排序 |
| pending | Packet 5 | 如果值得进入下一步，产出建议的实验顺序与最小验证方案 |

## Baseline Repair

- 当前状态：`branch/narrative-editor` baseline 已修复并重新验证通过
- 根因拆分：
  - fresh worktree 的依赖可复现性不稳定：仓库忽略了 `package-lock.json`，而主工作区本地其实存在一个未纳管 lockfile，导致 main workspace 与 fresh worktree 装出的依赖状态不一致
  - 多个 baseline 测试把带真实使用痕迹的 `sample-scene` 当成 legacy baseline，和当前 fixture 角色发生漂移
- 已采取的修复方向：
  - 保留 `sample-scene` 的真实使用状态不变
  - 新增测试 helper，把 `sample-scene` 复制成“剥离 runtime/storyline/variants 的 legacy baseline”供相关测试使用
  - 停止忽略 `package-lock.json`，并将 lockfile 纳入当前分支改动，准备带回 fresh worktree

## Current References

- [AGENTS.md](AGENTS.md)
- [coding-agent-guide.md](coding-agent-guide.md)
- [progress.md](progress.md)
- [findings.md](findings.md)
- [docs/codemaps/architecture.md](docs/codemaps/architecture.md)
- [docs/codemaps/frontend.md](docs/codemaps/frontend.md)
- [docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md](docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md)
- [archive/docs/dev-updates/march-dev-update/README.md](archive/docs/dev-updates/march-dev-update/README.md)
