# Phase 4 Task Plan

## Goal

为 `Phase 4` 建立独立的工作记忆入口，并把当前已经冻结的产品方向、架构边界与待补 spec 范围稳定记录下来。

当前这套文档的职责不是直接指挥实现，而是：

- 记录 `Phase 4` 当前已经谈定的结论
- 提供恢复 `Phase 4` 讨论上下文的最短入口
- 在正式 spec / implementation plan 落盘前，避免后续线程重复发散或误解边界

## Current Status

- `Phase 4` 仍处于 spec 准备阶段，尚未进入实现。
- 当前已经冻结的方向是：
  - 新增内建、`always-on` 的 `sidecar agent`
  - 新 agent 名称固定为 `weaver agent`
  - 现有 `控制台` 页面整体改为 `agent 管理页面`
  - `Phase 4` 暂不引入 `extension agent` 体系
- `weaver agent` 的产品定位已经冻结：
  - 面向作者粘贴的一段原始文本
  - 主用途是把原始文本导入成一个新的 `story package`
  - 它不是对现有 package 的覆盖式导入工具
- 当前已确认采用的主实现方向是：
  - `weaver agent` 先解析文本并形成结构化导入稿
  - 再尽量复用现有服务端 `new story package` 主链路落盘
  - 不额外发明第二套 package persistence 主路径

## Frozen Decision Map

| 主题 | 当前冻结结论 |
|---|---|
| agent 名称 | `weaver agent` |
| agent 类型 | built-in `sidecar`，`always-on` |
| 页面改造 | `控制台` -> `agent 管理页面` |
| extension | `Phase 4` 不做 |
| 主入口位置 | `故事包管理` 页的 `新建故事包` 流程 |
| 新建入口形态 | 先选择 `空白创建 / 文本导入` |
| 导入范围 | 仅支持 `粘贴文本 -> 新建 story package` |
| 输入形态 | 同时接受自由文本与半结构化文本；自由文本为主路径 |
| 导入策略 | 不做预览，直接运行导入 + 建包 |
| package 名称 | agent 提议，作者可修改 |
| package 落盘 | 复用现有服务端 scaffold / create path |
| 结构化填充重点 | `worldbase`、`hero`、`core cast`、`antagonists`、`npc`、`locations` |
| 剧情结构策略 | 不拆 `phase` / `beat`；原始整段默认沉淀为 `opening hook` |
| gossipelog 接入 | 建包后立即 bootstrap；首次 Play 前仅在缺失/损坏时 fallback |
| gossipelog 控制面 | built-in sidecar 只展示，不提供关闭 |
| diagnostics | 不再保留整页；只在页面右上角小提示区保留轻量状态提示 |
| 导入失败策略 | 允许部分导入成功，其余字段回退到 scaffold 默认 |
| 原始文本保存 | 不保存全文，只保留简短导入摘要和来源说明 |
| weaver state | 保留轻量 state / summary 文件 |
| sidecar 架构 | `weaver` 应复用 `gossipelog` 的 sidecar 骨架，不另起 agent 文件体系 |
| weaver 目录形态 | `src/agents/weaver/` + `registry` + package-owned `agents/weaver/...` |
| 身份提示载体 | 通过代码里的 system prompt / static instruction 声明身份与边界 |
| 私有 agent 文档 | 不为 `weaver` 新增私有 `AGENTS.md` / `CLAUDE.md` / 独立 prompt markdown |
| weaver skill 形态 | 当前推荐 `1` 个 `weaver-import-skill`，不按字段拆成多个 skill |
| weaver reference | 当前推荐为 `weaver-import-skill` 配 `1` 份按需披露的重 reference |
| sidecar reference 支持 | sidecar 架构应预留统一的 reference 装载能力，而不是只给 `weaver` 特判 |
| gossipelog reference 兼容性 | `gossipelog` 后续也可以接入同一套 sidecar reference 机制 |
| reference 装载策略 | 主 skill 保持精简；重 reference 按需加载，不默认常驻 |
| reference 组织方式 | `SKILL.md` 负责触发条件与边界；supporting reference 负责字段映射与细则 |
| loader 架构建议 | 采用统一 sidecar reference loader 框架，而不是每个 sidecar 各写一套基础设施 loader |
| sidecar 差异承载点 | 每个 sidecar 自己声明 reference manifest / resolver；差异体现在“加载什么、何时加载、如何组装” |
| “独立 loader” 的建议解释 | 可以有 sidecar 自己的 resolver / loader spec，但不建议各自实现缓存、注入、权限与预算控制 |
| prompt assembly 边界 | `prompt assembly` 继续保持统一对外边界，不直接承载每个 sidecar 的 reference 特例分支 |
| reference 入口位置 | sidecar 在 `definition / registry` 层声明 manifest / resolver，先完成 reference resolution，再进入统一 prompt assembly |
| prompt 结构化方式 | sidecar prompt 应继续采用清晰分段 / 标签化上下文与结构化 JSON 输出 |

## Current Product Shape

如果按当前冻结结论继续写 spec，`Phase 4` 应默认使这些产品陈述成立：

- 作者可以在 `故事包管理 -> 新建故事包` 流程里选择 `文本导入`
- 作者把原始文本交给 `weaver agent` 后，系统创建一个新的 story package
- `weaver agent` 负责把可可靠识别的 authoring 信息填入结构化字段
- 不能可靠切分到剧情编排层的内容，不强行拆成 `phase` / `beat`
- 新包创建完成后，应直接回到该 package 的 `故事包管理`
- `agent 管理页面` 主要展示 built-in sidecar agents 的职责、技能与最近状态

## Open Decisions Still Pending

这些点还没有冻结，正式 spec 仍需继续收口：

- `weaver agent` 的输入长度上限、失败提示与 loading 口径
- `weaver` 导入稿在服务端的具体 contract 形状
- `weaver` 的轻量 state / summary 文件 schema
- `weaver` reference 的最小内容边界应该多大
- sidecar reference manifest / descriptor 的最小字段集应该是什么
- sidecar reference resolver 的缓存键、token budget 与注入顺序如何统一
- `agent 管理页面` 的最终信息架构、中文文案与视觉层级
- 页面右上角轻量状态提示的展示范围与触发规则
- `opening hook` 具体落在哪个 authoring 字段组合里
- `locations` / `npc` / `antagonists` 的最低可靠抽取标准
- `gossipelog bootstrap` 的 route / hook 形态与失败回退规则
- 是否需要在创建后的新 package 中显示导入来源摘要

## Canonical References

- 根目录恢复入口：
  - [../../../task_plan.md](../../../task_plan.md)
  - [../../../progress.md](../../../progress.md)
  - [../../../findings.md](../../../findings.md)
- 现有架构边界：
  - [../../../AGENTS.md](../../../AGENTS.md)
  - [../../../archive/docs/narrative-editor-redesign/master-record.md](../../../archive/docs/narrative-editor-redesign/master-record.md)
  - [../specs/2026-04-02-phase-1-model-surface-design.md](../specs/2026-04-02-phase-1-model-surface-design.md)
  - [../specs/2026-04-06-phase-3-master-design.md](../specs/2026-04-06-phase-3-master-design.md)
- 现有主工作记忆：
  - [../phase-3/task_plan.md](../phase-3/task_plan.md)
  - [../phase-3/progress.md](../phase-3/progress.md)
  - [../phase-3/findings.md](../phase-3/findings.md)
