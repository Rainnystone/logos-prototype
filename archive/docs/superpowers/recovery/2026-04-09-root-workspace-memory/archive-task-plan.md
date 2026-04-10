# Task Plan

## Goal

在独立 worktree 中落地 `/play` 体感延迟优化的第一批实现，范围收敛到两件事：
- `audit` 语义改为只检查“当前新生成的 beat + 本轮 options”
- `audit off` 时支持“正文先流、选项和输入后置”，`audit on` 时维持现有非流式路径

## Success Criteria

- `audit` 生产链路不再向模型发送 preceding beats / 全历史，只保留当前新生成 `beatText` 与本轮 `options` 加上选中的审计问题。
- `audit off` 路径下，workbench 可以更早看到正文增量；在最终结果完成前不提前解锁输入，也不提前暴露最终 options。
- `audit on` 路径保持当前行为，不因为流式化引入 rewrite / force-accept / 状态切换回归。
- 新实现保持模块边界清晰：
  - `audit` 语义收窄归属于 audit packet / prompt / tests
  - streaming 只先落在 generate 主链，不顺手把 route / settlement / collapse 一并流式化
- 新 worktree 的实现前后都能通过针对性测试，并在完工前重新跑全量 `npm test`。

## Scope

此 worktree 进入实现准备阶段，但只围绕已经冻结的两条方案展开，不顺手扩修其他延迟议题，不把 router / memory / model split 一并带入当前包。

## Active Track

- 轨道：`/play` 体感延迟优化实现
- 当前状态：implementation 已完成，已完成真实 API 验证，进入提交与合流评估
  - 当前执行位置：
    - Packet 2（Task 1）已通过实现、主线程复验与双 review
    - Packet 3（Task 2）已完成对齐并通过主线程复验
    - Packet 4（Task 3）已通过实现、主线程复验与正确 worktree 下的 review
    - Packet 5（Task 4）已完成实现、review 修补与主线程复验
    - Packet 6（Task 5）已完成本地全量验证与真实 API 测试
- 关键约束：
  - 延迟定义是“玩家体感延迟”，即从做完选择到下一段正文重新可见的时间
  - 优先考虑高效、轻便、稳定、容易模块化的方案
  - 避免为了短期见效引入长期技术债
  - VPN 可能影响远端请求耗时，必须纳入判断
  - `auditor` 可关闭这一点已知，但要继续探索除此之外的优化空间
  - `memory placeholder` 维持全量记忆，不通过裁剪历史窗口来换取延迟
  - `router` 暂按“每个 beat 都必须重新判断”的硬约束处理，不再把 sticky router 作为候选
  - 按 mode 拆模型先记录为后续方向，本线程暂不推进实现
  - `routerHint` 不是本 worktree 的实现目标；除非后续被证明能带来结构性简化，否则先不碰
  - 本轮 spec 只允许做延迟优化，不改变既有叙事控制方式；不得顺手修改 router 等控制模块的语义

## Worktree Setup

- 分支：`codex/play-latency-audit-streaming`
- 路径：`.worktrees/codex-play-latency-audit-streaming`
- 基线验证：
  - `npm install`
  - `npm test`

## Current Investigation

- 当前观察到的 terminal 截图里，`POST /api/llm/proxy` 多次落在约 `17s` 到 `111s`，明显高于本地 route / 页面请求耗时。
- `POST /api/play/packages/sample-scene/runtime-session`、`POST /api/play/gossipelog`、`POST /api/play/gossipelog/bootstrap` 在截图里大多位于几十到几百毫秒，初步显示体感瓶颈更像是远端 LLM 往返，而不是本地 Next route 本身。
- 上述观察仍需结合当前代码链路确认：截图里这些 `llm/proxy` 请求分别对应主生成、rewrite、audit，还是其他 sidecar 路径。
- 当前需要重点判定的两个设计问题已经收敛为：
  - `route` 是否可以只吃最近两轮上文，同时不破坏选项生成与叙事控制语义
  - 是否值得引入“`audit` 开时默认不 stream、`audit` 关时默认 stream”的双路径方案
- 当前已新增并冻结的待改语义：
  - `audit` 后续应只检查“当前新生成的这一个 beat + 本轮 options”，不再读取 preceding beats / 全历史；本线程先记录，不立即实现
  - `routerHint` 是否移除，需要单独评估牵扯面；仅当它能带来结构简化价值时再考虑，不把它当成延迟主优化项
- 已确认的流式 UX 选择：
  - 正文按较粗 chunk 更新，不做 token 级逐字动画
  - 状态文案继续沿用 `Generating...`，不新增 `Streaming...`
  - 只有当用户停留在底部时才自动跟随滚动
  - options 只能在完整 `GenerateResult` 成功后一次性出现
  - 输入区从提交开始一直锁到最终 options 到齐
  - `audit on` 完全维持现状，不做可见流式

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
| complete | Packet 1 | 建立独立 worktree，安装依赖并验证基线测试通过 |
| complete | Packet 1.5 | 收口设计边界并写出正式 spec |
| complete | Packet 1.8 | 根据已批准 spec 写出 implementation plan |
| complete | Packet 2 | 收窄 `audit` 语义：更新 packet / prompt / tests，使其只看当前 beat 与本轮 options |
| complete | Packet 3 | beat-local audit 题目与 fixture 对齐 |
| complete | Packet 4 | generate streaming transport 与 buffered fallback |
| complete | Packet 5 | non-audited workbench/orchestrator 可见 streaming 接回 |
| complete | Packet 6 | 已完成本地全量验证、真实 API 测试与收口记录 |

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
- [archive-progress.md](archive-progress.md)
- [archive-findings.md](archive-findings.md)
- [docs/codemaps/architecture.md](docs/codemaps/architecture.md)
- [docs/codemaps/frontend.md](docs/codemaps/frontend.md)
- [docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md](docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md)
- [docs/superpowers/plans/2026-04-09-play-latency-audit-streaming.md](docs/superpowers/plans/2026-04-09-play-latency-audit-streaming.md)
- [archive/docs/dev-updates/march-dev-update/README.md](archive/docs/dev-updates/march-dev-update/README.md)
- [docs/superpowers/specs/2026-04-09-play-latency-audit-streaming-design.md](docs/superpowers/specs/2026-04-09-play-latency-audit-streaming-design.md)
