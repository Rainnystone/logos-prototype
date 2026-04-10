# Task Plan

## Goal

- 完成对 `pretext`、图编辑框架候选、`gossipelog` sidecar reference 缺口，以及 `gossipelog` runtime/skill 机制的阶段性评估。
- 在进入 reference 与“人际关系记忆”升级前，先确认并记录当前 runtime 链路里的真实 bug 与高风险点。
- 把本轮结论沉淀为可恢复的根目录规划文件，便于下一轮直接进入修复与实现。

## Success Criteria

- 明确记录 `pretext` 在当前 LOGOS 作者端中的实际价值与边界。
- 明确记录“人际关系图编辑”和“非线性 scene graph 编辑”两类 use case 的框架判断。
- 明确记录 `gossipelog` 当前 sidecar skill 机制、runtime 接入方式，以及当前状态仍停留在“关系记录”而非“关系记忆”。
- 明确区分一条已确认 bug 与一条高置信待复现风险，不把 reference 缺口与代码缺陷混为一谈。
- 给出下一阶段推荐工作块，并说明哪些内容仍未进入实现与验证。

## Active Track

### 当前任务

- 任务名称：`gossipelog` reference / 关系记忆升级前置梳理
- 当前状态：两个已确认 bug 已完成修复并通过验证；下一阶段可以回到 `gossipelog` reference 与“人际关系记忆”设计
- 范围：作者端现状、`pretext` 价值、图编辑框架候选、`gossipelog` reference 缺口、`gossipelog` runtime/skill 机制、升级前 bug 排查
- 关键约束：
  - 作者端保存必须继续走 deterministic bridge
  - 关系编辑应保持结构化数据，不依赖 LLM 把自由文本回译成图
  - 选型优先贴合 Next.js 15 + React 19 的现有作者端壳层
  - 下一阶段优先处理 `gossipelog` 指令边界与运行链路 bug，而不是立即开做人际关系图 UI
  - `gossipelog` 的持久化状态目前仍是 package-owned 文件，但 runtime 读取的 story package 必须与 active storyline variant 对齐
  - 第二个 bug 的修复目标以 engine 现有合同为准：超时后允许回退到上一份稳定关系层继续，不改成无限阻塞
  - 本线程所有 subagent 的等待策略统一为：首轮 120 秒，若有新产出则依次退避到 180 / 300 秒；只有连续两轮无产出才允许发状态问询，且状态问询不得要求其停止当前任务

### 阶段拆分

| 阶段 | 状态 | 目标 | 备注 |
|------|------|------|------|
| 阶段 1 | complete | 评估 `pretext` 与当前作者端的适配度 | 已读取仓库结构、作者端页面与 `pretext` 官方资料 |
| 阶段 2 | complete | 调研图编辑框架候选 | 已结合 GitHub 官方仓库与 subagent 结果完成初筛 |
| 阶段 3 | complete | 定位 `gossipelog` sidecar 的 reference 缺口 | 已确认仓库机制存在，`gossipelog` 尚未接入 |
| 阶段 4 | complete | catch up `gossipelog` runtime / skill 机制，并检查升级前 bug | 已确认一条 runtime variant 对齐 bug，并记录一条前端锁死风险 |
| 阶段 5 | complete | 一起修复两个已确认 bug：runtime variant 对齐错误 + gossipelog pending 导致的输入永久锁定 | 已补齐 late finalize failure 并发回滚风险；`test:core`、`build`、全量 `npm test` 均通过 |
| 阶段 6 | pending | 设计 `gossipelog` update / injection reference v1 | 先把关系证据、词表、No-op 边界讲清楚 |
| 阶段 7 | pending | 设计并落地“人际关系记忆”数据模型 v1 | 从当前 baseline/recentDelta 记录升级，而不是继续堆 prompt 文案 |
| 阶段 8 | pending | 设计人际关系图第一版 UI 与数据映射方案 | 建议在 reference 规则与 memory schema 收紧后推进 |

### 下一阶段建议

1. 为 `gossipelog` 增加 `update-reference.md` 与 `injection-reference.md`，先把关系证据、词表、No-op 边界和注入语义讲清楚。
2. 扩展 `gossipelog` request / prompt / reference manifest，使 provider 真正接收 resolved references。
3. 在现有 baseline / recentDelta 记录之上设计“角色人际关系记忆”数据结构，而不是继续堆 prompt 文案。
4. 在 reference 规则与 memory schema 收紧后，再推进第一版关系图 UI 与数据映射方案。
