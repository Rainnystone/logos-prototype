# Simulation Toolset Agent Guide

这份 guide 面向云端 Codex。

它的目标不是让 agent 临时写一堆测试脚本，而是让 agent 在独立工作区里，利用 `simulation-toolset/` 对 LOGOS 做结构化系统回归，替人类完成一部分长链路验证、问题定位、证据沉淀和修改建议整理。

这份 guide 默认对应的是“验证与调查”工作流，不是“直接改代码”工作流。云端 run 的标准产物应该是结构化证据和修改建议，而不是产品代码改动。

## 1. 为什么需要这套工作流

随着 LOGOS 的 authoring、runtime、adapter、sidecar 能力持续增加，人类手工测试会越来越受限：

- 测试频率有限
- 覆盖范围有限
- 长链路回归成本高
- 异常路径很难稳定复现
- 人工复盘容易漏掉边界细节

`simulation-toolset/` 的职责，就是让云端 Codex 在人类做别的事情时，沿正式边界做可脚本化验证，并留下可复盘的运行证据。

## 2. 适用场景与非目标

### 适用场景

- 作者链路回归：
  - `structured save -> bridge validation -> writeback -> reload -> diagnostics`
- 玩家链路回归：
  - `runtime start/runBeat -> adapter outbound/inbound -> accept -> state update`
- adapter / provider 异常路径：
  - timeout
  - malformed response
  - provider error
  - delayed response
  - duplicate / out-of-order structured simulation
- sidecar 生命周期验证：
  - gossipelog update
  - injection
  - fallback
  - side effects
- 轻量入口验证：
  - route smoke
  - UI smoke

### 非目标

- 不把浏览器自动化当第一版主轴
- 不在 cloud run 里直接改产品代码
- 不绕开 authoring bridge 或 runtime 正式入口
- 不把 story package 的具体故事文本写死进 harness
- 不在 run 过程中临时重定义产品架构

## 3. 这套 toolset 里现在有什么

| 组件 | 位置 | 职责 |
|---|---|---|
| `AuthorSimulator` | `simulation-toolset/src/author-simulator.ts` | 模拟作者输入，走正式 save/bridge/reload 链路 |
| `PlayerSimulator` | `simulation-toolset/src/player-simulator.ts` | 模拟玩家推进 runtime loop |
| `ScriptedAdapter` | `simulation-toolset/src/scripted-adapter.ts` | fake / loopback adapter，控制 outbound/inbound 与异常模式 |
| `GossipelogObserver` | `simulation-toolset/src/gossipelog-observer.ts` | 观察 gossipelog 生命周期与副作用 |
| `sidecar-trace` | `simulation-toolset/src/sidecar-trace.ts` | 把 sidecar 结果归一化成统一 trace |
| `Scenario runner` | `simulation-toolset/src/scenario-runner.ts` | 顺序执行 scenario，汇总结果并落盘 |
| `Recorder / Report writer` | `simulation-toolset/src/recorder.ts`、`simulation-toolset/src/report-writer.ts` | 记录动作、trace、assertions、final state、JSON report |
| `Scenario manifest` | `simulation-toolset/src/scenario-manifest.ts` | 管理场景清单与 batch metadata |
| `Temp package helper` | `simulation-toolset/src/temp-package.ts` | 构造临时 story package fixture |
| `Temp package scavenger` | `simulation-toolset/src/temp-package-scavenger.ts` | 列出、dry-run、清理 `.tmp-simulation-*` |
| `Route smoke` | `simulation-toolset/src/route-smoke.ts` | 程序化验证正式 route 还连着正式边界 |
| `UI smoke` | `simulation-toolset/src/ui-smoke.ts` | 用轻量 UI smoke 验证页面仍连着正式链路 |

## 4. 工作前提

### 必须使用独立工作区

推荐：

- 独立 worktree，基于 `branch/narrative-editor`

备选：

- 独立 clone
- 独立 branch，例如 `codex/sim-<run-id>`

原因：

- 当前正式 package 加载边界仍然依赖 `src/story-packages/`
- 中断 run 可能残留 `.tmp-simulation-*`
- cloud run 不应和人类正在写的工作区共享可写目录

如果仓库策略要求先获得人工许可，再创建 worktree 或 branch，先拿许可，再运行。

### 开始前先读这些文件

1. `README.md`
2. `AGENTS.md`
3. `simulation-toolset/README.md`
4. `simulation-toolset/docs/2026-04-01-cloud-simulation-toolset-design.md`
5. `simulation-toolset/docs/findings.md`

## 5. 标准运行工作流

### Step 0: 先写清本次 run 的目标

先决定这次 run 属于哪一类：

- 健康检查
- 单场景验证
- 异常路径调查
- sidecar 行为核对
- route/UI smoke 验证
- batch 回归

不要在目标不清晰时直接跑一堆命令。

### Step 1: 创建 run artifact 目录

每次 run 都应有独立 artifact 目录，例如：

- `simulation-toolset/reports/2026-04-02-run-001/`

至少创建这些文件：

- `summary.md`
- `commands.log`
- `suggested-changes.md`

按需创建：

- `debug.log`
- `reports/`
- `scratch/`

### Step 2: 在 `summary.md` 记录 run intent

至少写这些内容：

- run id
- 日期和时区
- 工作区说明
- branch / worktree 名称
- 本次目标
- 计划跑哪些 scenario / suite
- 这是纯验证 run，还是调查 run

### Step 3: 先用现成入口，不先发明新脚本

优先跑现成命令：

- `npm run type-check:simulation`
- `npm run test:simulation`

按需跑更聚焦的验证：

- `npm run test:simulation -- simulation-toolset/tests/scripted-adapter.test.ts`
- `npm run test:simulation -- simulation-toolset/tests/scenario-runner.test.ts`
- `npm run test:simulation -- simulation-toolset/tests/route-smoke.test.ts`
- `npm run test:simulation -- simulation-toolset/tests/ui-smoke.test.ts`
- `npm run test:simulation -- simulation-toolset/tests/governance.test.ts`

如果 simulation run 暴露出正式边界问题，再补跑跨边界验证：

- `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/orchestrator.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts`

### Step 4: 只有在必要时才进入 programmatic batch

`runSimulationScenarioBatch(...)` 适合 batch run，但要遵守这几个规则：

- 优先使用仓库已有入口
- 不为一次 run 在产品代码里新增永久入口
- 如果必须写一次性 launcher，只能放在本次 run artifact 目录里
- run 结束后删除一次性 launcher

### Step 5: 边跑边记证据

`commands.log` 至少记录：

- 命令
- 开始时间
- 结束时间
- exit code
- 高信号输出摘要

`debug.log` 只记录真正有用的诊断信息，例如：

- 失败测试名
- 关键 adapter trace 摘要
- `run-index.json` 路径
- report 落盘路径
- leftover temp package 证据
- cross-boundary suite 结果

### Step 6: 产出结论，但不要直接改代码

如果 run 发现问题，输出到 `suggested-changes.md`：

- 现象
- 受影响边界
- root-cause hypothesis
- 最小修改建议
- 修改后应该补跑什么验证

默认不要在 cloud simulation run 里直接改产品代码。

### Step 7: 收尾和清理

run 结束前至少做这几件事：

1. 确认 scenario 自带 cleanup 已执行
2. 检查 `src/story-packages/` 是否还有 `.tmp-simulation-*`
3. 清掉本次 run 产生的一次性 launcher 或 scratch 文件
4. 回写 `summary.md` 的最终结论

如果要清理残留 temp package，优先通过 toolset 自己的 scavenger 路径，并记录本次清理属于：

- list-only
- dry-run
- actual removal

只允许在独立工作区里执行清理，不要在共享工作区里做破坏性收尾。

## 6. 云端 Codex 的调试纪律

这一节借鉴 `systematic-debugging`，但按 simulation workflow 改写。

### 规则 1：先找失败边界，再谈修法

先回答：

- 是 authoring bridge 失败
- runtime orchestrator 失败
- adapter simulation 失败
- sidecar 失败
- report persistence 失败

没定位边界前，不要先写修改建议。

### 规则 2：先确保可复现，再开始分析

至少要知道：

- 失败是否稳定复现
- 复现命令是什么
- 是单场景失败，还是整类场景失败

如果问题不可稳定复现，先收集更多证据，不要猜。

### 规则 3：沿边界反向追踪，不在症状点停下

如果错误出现在深层调用里，按边界往回追：

- 哪个 trace event 开始异常
- 上一层传入的是什么
- 这个值是在哪里偏掉的

不要只盯着报错出现的最末端位置。

### 规则 4：多组件链路要逐层记证据

对 authoring / runtime / adapter / sidecar 这种多边界链路，至少记录：

- 输入动作
- outbound 摘要
- inbound 摘要
- validation / writeback / reload 结果
- accept / fallback / side effects

不要只留一句“这里坏了”。

### 规则 5：先和通过路径比较，再形成假设

优先对比：

- 一个通过的 scenario
- 一个通过的 suite
- 预期 trace 形状

不要从单条失败日志直接反推出 root cause。

### 规则 6：一次只写一个 hypothesis

在 `summary.md` 或 `debug.log` 里写清：

- 我的假设是什么
- 哪些证据支持它
- 哪些现象会推翻它

不要把多个不相关原因堆成一个建议。

### 规则 7：等待条件，不猜等待时间

如果需要等待异步结果：

- 优先等条件成立
- 不要默认加固定 sleep

只有在验证真实时序行为时，才允许显式 timeout，而且要写清为什么这个等待时间是合理的。

### 规则 8：如果建议修复，优先给出 defense-in-depth 方向

当问题明显是无效输入、边界失守或环境保护不足时，建议里优先考虑分层防护：

- 入口校验
- 业务层校验
- 环境保护
- 调试 instrumentation

但这些都只写进建议，不在本次 run 里直接实现。

### 规则 9：连续几轮假设都失败，就升级为边界问题

如果多次尝试后发现：

- 每次都暴露不同层的问题
- 修改建议越来越像大改架构
- 解释不再稳定

就不要继续堆 patch 建议，而应升级为“边界或架构需要复核”的结论。

## 7. 运行产物规范

### `summary.md`

建议至少有这些段落：

- Goal
- Run Scope
- Commands Executed
- What Passed
- What Failed
- Root-Cause Hypotheses
- Suggested Changes
- Cleanup Status
- Next Step

### `commands.log`

每条记录至少包含：

- timestamp
- command
- exit code
- short result

### `debug.log`

只记录高价值信息：

- 关键 trace 摘要
- event id
- report 路径
- 失败边界
- leftover temp package

不要把无穷无尽的低信号 console 输出原样堆进去。

### `suggested-changes.md`

每条建议至少包含：

- 标题
- 影响范围
- 观察到的症状
- root-cause hypothesis
- 最小修改建议
- 修改后验证

建议要尽量小、可验证、贴边界，不要写泛泛的“大重构”。

### JSON reports

如果本次 run 产生 JSON report，至少要保留：

- `run-index.json`
- scenario JSON report
- 最终 summary 对这些 report 的引用

## 8. 一个完整 run 应该长什么样

一个合格的 run，通常会像这样：

1. 在独立 workspace 里启动
2. 建立 `simulation-toolset/reports/<run-id>/`
3. 先写 `summary.md` 的 run intent
4. 先跑现成的 simulation suite 或目标 scenario
5. 如果失败，补跑 cross-boundary verification
6. 沿 trace 和边界反向定位问题
7. 在 `debug.log` 记录关键证据
8. 在 `suggested-changes.md` 写最小修改建议
9. 清理 temp artifact
10. 回写最终 `summary.md`

如果 run 最后只留下“测试失败了”这种一句话，这次 run 就不合格。

## 9. 当前已知边界

- 还没有正式的 package root repository seam
- 当前正式 package 加载仍依赖 `src/story-packages/`
- batch runner 还是顺序执行，不是并发 orchestration
- `duplicate` 和 `out-of-order` 目前仍是结构化模拟，不是真正 callback scheduler
- route/UI smoke 是轻量入口验证，不是重浏览器回归

这些是已知边界，不是 agent 在 run 中临时重写架构的理由。

## 10. 未来兼容方向

等产品层进入 `Storage / Repository Substrate` 后，这份 guide 应逐步迁移到这些正式边界：

- `package definition`
- `mutable state`
- `storylineId`
- `checkpointId`
- `sessionId`
- repository-backed target

在那之前，这份 guide 应被视为一套纪律化的过渡工作流，而不是最终存储架构说明。
