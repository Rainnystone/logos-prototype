# Phase 4 Findings

## 最终恢复点

`Phase 4` 现在已经有正式 spec 和已 review 通过的 implementation plan，但仍未进入实现阶段。

最短恢复顺序：

1. [../../../AGENTS.md](../../../AGENTS.md)
2. [../../../task_plan.md](../../../task_plan.md)
3. [../../../progress.md](../../../progress.md)
4. [../../../findings.md](../../../findings.md)
5. [task_plan.md](task_plan.md)
6. [progress.md](progress.md)
7. [findings.md](findings.md)
8. [../specs/2026-04-02-phase-1-model-surface-design.md](../specs/2026-04-02-phase-1-model-surface-design.md)
9. [../specs/2026-04-06-phase-3-master-design.md](../specs/2026-04-06-phase-3-master-design.md)
10. [../specs/2026-04-07-phase-4-weaver-agent-management-design.md](../specs/2026-04-07-phase-4-weaver-agent-management-design.md)
11. [../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md](../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md)
12. [../../../archive/docs/narrative-editor-redesign/master-record.md](../../../archive/docs/narrative-editor-redesign/master-record.md)

## 当前冻结结论

- `Phase 4` 的新 agent 名称固定为 `weaver agent`。
- `weaver agent` 是 built-in `sidecar`，且为 `always-on`。
- `Phase 4` 不做 `extension agent`。
- `控制台` 页面将不再保留为 diagnostics 整页，而是改造为 `agent 管理页面`。
- `agent 管理页面` 的 built-in sidecar 只有展示，不提供关闭选项。
- `weaver` 的主产品动作不是“修改已有 package”，而是“从文本创建一个新的 package”。
- `weaver` 的主入口应放在 `故事包管理 -> 新建故事包` 流程里。
- `weaver` 运行后不做导入预览。
- `weaver` 不负责强行切出 `phase` / `beat`；作者原始整段默认作为 `opening hook` 进入 package。
- `gossipelog` 不能等到后续自然慢慢理解起始状态；必须有显式初始化路径。
- `weaver` 的架构应和 `gossipelog` 保持统一：
  - agent 骨架落在 `src/agents/weaver/`
  - 通过 `registry` 与统一 `agent surface` 管理
  - package-owned config / state 放在 `story-packages/*/agents/weaver/`
- `weaver` 不应新建私有 `AGENTS.md` / `CLAUDE.md` 或独立 prompt markdown。
- `weaver` 的身份说明应继续沿用现有 sidecar 做法，放在代码里的 system prompt / static instruction。
- `weaver` 的 code-owned instruction 与 sidecar-loaded reference 不是同一件事：
  - instruction 是代码里的静态身份/边界约束
  - heavy reference 是 repo 内可装载的静态 reference asset
  - 后者不等于 sidecar 私有 prompt markdown 体系
- `weaver` 当前最合理的 skill 形态是：
  - 保持 `1` 个 `weaver-import-skill`
  - 不按 `worldbase / cast / locations / npc` 再拆成多个 skill
  - 通过 skill 的结构化输出分区和代码分发完成字段落位
- `weaver-import-skill` 应配 `1` 份按需披露的重 reference，用来承载字段映射、输出 contract、禁止项与不确定性规则。
- `weaver` 的 heavy reference 在 `Phase 4` 应视为 required 资产：
  - 若无法装载，应在模型调用前 hard fail
  - 不允许在缺 reference 的情况下 degraded import
- `text_import` 的 package naming 应冻结为：
  - 作者显式输入优先
  - 作者留空时，才使用 `weaver suggestedPackageName`
  - 若 suggestion 无效或与现有 package 冲突，则请求失败并要求作者手动命名
- 这次不应只给 `weaver` 临时加 reference；整个 sidecar 架构都应支持统一的 reference 装载能力，供 `gossipelog` 等后续 built-in sidecar 复用。
- sidecar reference 的 best practice 不是“每个 sidecar 各写一套 loader”，而是：
  - 一套统一的 sidecar reference loader 框架负责缓存、token budget、注入顺序和权限边界
  - 每个 sidecar 通过自己的 manifest / resolver 声明要加载哪些 reference、何时加载、如何组装
  - 这样 reference 内容可以独立变化，但装载机制仍然统一管理
- `prompt assembly` 仍应保持为统一对外的 prompt 边界。
  最稳的分层是：
  - `definition / registry` 层声明 sidecar 的 reference manifest / resolver
  - shared loader 先完成 reference resolution
  - `prompt assembly` 再把 instructions、context、references、output contract 统一组装成最终 prompt
- `Phase 4` 的 implementation plan 现在也已经冻结了执行边界：
  - `text_import` 继续复用单一 package creation route，而不是另起一套导入 API
  - `openingHook` 的权威来源始终是作者原始 `sourceText`
  - `operationalHint` 与 `latestStateLine` 由 shared agent-surface loader 统一生产
  - `gossipelog` fallback 以 relationship state 的 missing / unreadable 为主判定，而不是只看 summary status
  - `/api/play/gossipelog/bootstrap` 也必须复用 shared `parseAdapterConfig()`，不再分叉 play-side adapter parsing
- 如果把“独立 loader”理解为“每个 sidecar 都有自己的 reference resolver / loader spec”，这是合理的；
  但如果把它理解为“每个 sidecar 都各自实现缓存、注入、权限与预算控制”，那会破坏 sidecar 的统一管理边界。
- 按当前 best practice 收敛，skill / reference 的边界应是：
  - `SKILL.md` 保持精简，只负责说明何时使用、核心边界与主流程
  - 重 reference 只在需要时装载，避免让 skill 主文档变胖、变难搜、变难维护
  - reference 更适合承载字段映射表、输出 contract、禁止项和不确定性规则
- sidecar 的身份与长期行为约束应放在稳定 instruction 中，而不是临时塞进 user prompt。
- sidecar prompt 仍应保持强结构化：
  - 明确区分 instructions、context、reference、output contract
  - 输出继续收敛为可验证的结构化 JSON

## 当前最重要的工程边界

- `weaver` 不应绕开现有服务端 package scaffold / create 主链路。
- `weaver` 解析文本的职责，与 package 持久化职责必须保持分离。
- `weaver` 只创建新 package，不进入对已有 package 的覆盖式导入，否则会把冲突检测、差异应用和回滚问题一起拉进来。
- `weaver` 的 sidecar 统一性比“为每个 agent 发明新的文档组织法”更重要；否则后续 built-in sidecar 很快会失去统一管理边界。
- `weaver` 的字段差异不应通过增加 skill 数量来解决；真正该拆的是代码里的解析和验证流水线，而不是 LLM skill 数量。
- 参考 OpenAI、Anthropic 与 Google ADK 的共同方向，稳定身份提示应放在持续性的 instructions 中；大块 reference 则应按需注入，而不是默认常驻在每次调用上下文里。
- 同样基于这些方向，共享的是装载框架和统一 assembly 边界，变化的是每个 sidecar 的 instructions、reference manifest / resolver 和输出 contract；不要把“内容不同”误解成“必须有独立 loader 实现”。
- `gossipelog bootstrap` 最合理的当前方向是：
  - package 创建后立即执行一次
  - 仅在状态缺失或损坏时，于首次 Play 前做 bounded fallback
- `diagnostics` 不能继续占据独立整页，但其最小状态信息仍应在页面右上角小提示区保留。

## 当前最值得记住的产品判断

- 从产品上看，`weaver` 不是一个“agent 管理页里的实验按钮”，而是 `新建故事包` 的一种形式。
- `agent 管理页面` 更像 built-in agent 的说明与状态面板，而不是本期主操作入口。
- `weaver` 的真正价值是降低从外部原始文本进入 LOGOS authoring 结构的门槛，而不是替代后续细致 authoring。
- `opening hook` 是当前最合适的剧情承接边界，因为它比 `phase` / `beat` 更宽，不会逼系统做不可靠的剧情切分。
