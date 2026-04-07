# Phase 4 Task Plan

## Goal

为 `Phase 4` 维护独立的工作记忆入口，并把当前已经冻结的产品方向、架构边界、正式 spec 与 implementation plan 基线稳定记录下来。

当前这套文档的职责不是直接指挥实现，而是：

- 记录 `Phase 4` 当前已经谈定的结论
- 提供恢复 `Phase 4` 讨论上下文的最短入口
- 在实现开始前，避免后续线程重复发散或误解边界

## Current Status

- `Phase 4` 已产出正式 spec 与 implementation plan，尚未进入实现。
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
- 当前正式 spec 文件为：
  - [../specs/2026-04-07-phase-4-weaver-agent-management-design.md](../specs/2026-04-07-phase-4-weaver-agent-management-design.md)
- 当前 implementation plan 文件为：
  - [../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md](../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md)
  - plan 已完成 reviewer 修订并通过 review，可作为执行入口

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
| 输入上限 | `12,000` Unicode 字符是 `Phase 4` 默认上限 |
| 导入策略 | 不做预览，直接运行导入 + 建包 |
| package 名称 | agent 提议，作者可修改 |
| 命名优先级 | 作者显式输入优先；为空时才使用 `weaver suggestedPackageName`；若 suggestion 无效或冲突则要求作者手动命名 |
| package 落盘 | 复用现有服务端 scaffold / create path |
| 创建 API | 保持统一 package creation route，用 `mode: blank | text_import` 区分创建方式 |
| 原子建包策略 | `weaver` 导入值应在 staged scaffold 中应用并验证，再一次性 promote，不走“先建空包再二次写入”主路径 |
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
| reference 资产形态 | `weaver` heavy reference 是 repo 内静态 reference asset，不是 sidecar 私有 prompt 文档体系 |
| weaver skill 形态 | 当前推荐 `1` 个 `weaver-import-skill`，不按字段拆成多个 skill |
| weaver reference | 当前推荐为 `weaver-import-skill` 配 `1` 份按需披露的重 reference |
| weaver reference 故障语义 | `weaver` reference 在 `Phase 4` 为 required；无法装载时导入请求在模型调用前 hard fail |
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

## Remaining Work Shape

当前已没有阻塞 implementation plan 的产品级待定项。

接下来的未完成部分属于执行期工作，而不是 spec 级方向不清：

- 按 implementation plan 分任务落代码
- 在真实代码里把 `weaver`、shared sidecar reference loader、`agent 管理页面`、`gossipelog bootstrap/fallback` 接起来
- 跑完计划里要求的测试、构建与浏览器验证

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
  - [../specs/2026-04-07-phase-4-weaver-agent-management-design.md](../specs/2026-04-07-phase-4-weaver-agent-management-design.md)
  - [../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md](../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md)
- 现有主工作记忆：
  - [../phase-3/task_plan.md](../phase-3/task_plan.md)
  - [../phase-3/progress.md](../phase-3/progress.md)
  - [../phase-3/findings.md](../phase-3/findings.md)
