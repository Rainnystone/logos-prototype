# Task Plan

## Goal

- 完成对 `pretext`、图编辑框架候选、以及 `gossipelog` sidecar reference 缺口的阶段性评估。
- 把本轮结论沉淀为可恢复的根目录规划文件，便于下一轮直接进入实现。

## Success Criteria

- 明确记录 `pretext` 在当前 LOGOS 作者端中的实际价值与边界。
- 明确记录“人际关系图编辑”和“非线性 scene graph 编辑”两类 use case 的框架判断。
- 明确记录 `gossipelog` 当前最优先的工作不是关系图，而是补齐 reference 与提取规则。
- 给出下一阶段推荐工作块，并说明哪些内容仍未进入实现与验证。

## Active Track

### 当前任务

- 任务名称：作者端图编辑路线与 `gossipelog` reference 评估
- 当前状态：研究完成，等待进入下一阶段实现
- 范围：作者端现状、`pretext` 价值、图编辑框架候选、`gossipelog` reference 缺口
- 关键约束：
  - 作者端保存必须继续走 deterministic bridge
  - 关系编辑应保持结构化数据，不依赖 LLM 把自由文本回译成图
  - 选型优先贴合 Next.js 15 + React 19 的现有作者端壳层
  - 下一阶段优先处理 `gossipelog` 指令边界，而不是立即开做人际关系图 UI

### 阶段拆分

| 阶段 | 状态 | 目标 | 备注 |
|------|------|------|------|
| 阶段 1 | complete | 评估 `pretext` 与当前作者端的适配度 | 已读取仓库结构、作者端页面与 `pretext` 官方资料 |
| 阶段 2 | complete | 调研图编辑框架候选 | 已结合 GitHub 官方仓库与 subagent 结果完成初筛 |
| 阶段 3 | complete | 定位 `gossipelog` sidecar 的 reference 缺口 | 已确认仓库机制存在，`gossipelog` 尚未接入 |
| 阶段 4 | pending | 设计 `gossipelog` update / injection reference v1 | 下一阶段主目标 |
| 阶段 5 | pending | 设计人际关系图第一版 UI 与数据映射方案 | 建议在 reference 规则收紧后推进 |

### 下一阶段建议

1. 为 `gossipelog` 增加 `update-reference.md` 与 `injection-reference.md`。
2. 扩展 `gossipelog` request / prompt / reference manifest，使 provider 真正接收 resolved references。
3. 在此基础上再输出“人际关系图第一版”交互与持久化方案。
