# Status Board

## 用途

`status-board.md` 用来记录规格仓库当前的真实状态，而不是理想状态。它的作用是让任何进入仓库的人在最短时间内知道三件事：哪些内容已经落地，哪些内容只是规划，哪些模块目前仍然依赖仓库外原稿，或者已经被正式内化进仓库。

如果 `TODO.md` 负责记录“接下来做什么”，那么这份状态板负责回答“现在到底做到了哪里”。两者必须同步更新，否则会出现阶段任务显示完成、但状态板仍然停留在旧版本的失配情况。

## 仓库总体状态

| 项目 | 当前状态 | 说明 |
|---|---|---|
| 规格仓库根目录 | 已建立 | `LOGOS-SPEC` 已创建在仓库根目录下 |
| 导航层 | 已建立 | `README.md`、`system-map.md`、`reading-order.md`、`agent-guide.md`、`status-board.md`、`TODO.md` 已落地 |
| 产品层 | 已建立（第一版） | 愿景、Sample 边界与非目标文档已落地 |
| 领域层 | 已建立（第一版） | 术语、实体、控制原语与状态模型已落地 |
| 编排层 | 已建立（第一版） | 运行循环、生命周期与判断点文档已落地 |
| 模块层 | 已建立（第一版） | 核心模块边界说明已落地，API 正文已内化进入模块层，并已拆分为 5 个子文件 |
| 契约层 | 已建立（第一版） | 依赖图、I/O 总表与核心 schema 已落地，含 phase-consequence-packet-schema、collapse-packet-schema 与 audit-question-set-schema |
| 样例层 | 已建立（第一版） | sample-scene 的概览、阶段计划、路由词典、审计问题、状态快照与 story-source 源稿已落地 |
| 作者层 | 已建立（第一版） | 作者输入面、工作流与配置矩阵已落地 |
| UX 层 | 已建立（第一版）并进入设计轮次 | 信息架构、关键用户流、页面清单与延后决策已落地；round-1 工作台草图、参考图与线框说明已入库 |
| ADR 层 | 已建立（第一版） | 关键运行时取舍已开始进入 ADR，包括生成顺序、Phase Beat 数量、声量消费时点与光锥坍缩重推演语义 |

## 模块状态

| 模块 | 状态 | 权威源 | 备注 |
|---|---|---|---|
| 叙事控制中心母设计 | 外部上游文档 | `LOGOS Prototype 叙事控制中心测试.md` | 当前作为拆解来源，暂不改动 |
| API 适配器（旧路径迁移说明） | 已迁移 | `模块/LOGOS Lite API适配器设计方案.md` | 旧路径只保留迁移说明，不再是权威源 |
| API Adapter Lite | 已建立正式权威源 | `04_MODULES/api-adapter-lite/` | 修订后的 API 正文已内化进入 `LOGOS-SPEC`，其中 `overview.md` 为入口并已拆分子文档 |
| Orchestrator Control Hub | 已建立第一版 | `04_MODULES/orchestrator-control-hub.md` | 负责总流程协调，不直接生成内容 |
| Light Cone Collapse | 已建立第一版 | `04_MODULES/light-cone-collapse.md` | 负责边界推导与阶段末基于后果的语义重推演 |
| Phase Consequence Settlement | 已建立第一版 | `04_MODULES/phase-consequence-settlement.md` | 负责把当前 Phase 已接受转录结算为 `phaseConsequences[]` |
| Phase Gradient | 已建立第一版 | `04_MODULES/phase-gradient.md` | 负责梯度到声量序列映射 |
| Narrative Router | 已建立第一版 | `04_MODULES/narrative-router.md` | 负责行动语义空间裁剪 |
| Director Note Layer | 已建立第一版 | `04_MODULES/director-note-layer.md` | 负责本轮局部高优先级约束 |
| Prompt Assembler | 已建立第一版 | `04_MODULES/prompt-assembler.md` | 负责统一装配 PromptObject |
| Auditor | 已建立第一版 | `04_MODULES/auditor.md` | 负责是/否判定，不负责最终裁决 |
| Audit Resolver | 已建立第一版 | `04_MODULES/audit-resolver.md` | 代码层裁决模块，负责把审计布尔结果转化为流程信号 |
| Option Generator | 已建立第一版 | `04_MODULES/option-generator.md` | 三步约束管线，通过 optionConstraints 嵌入 PromptObject |
| Memory Placeholder | 已建立第一版 | `04_MODULES/memory-placeholder.md` | 当前仅负责最近 5 Beat 窗口 |

## 阶段状态

| 阶段 | 状态 | 说明 |
|---|---|---|
| Stage 1 | 已完成 | 已建立骨架、导航与追踪文件 |
| Stage 2 | 已完成 | 已完成术语、实体、控制原语与状态模型的第一版落地 |
| Stage 3 | 已完成 | 已完成运行循环、生命周期与关键判断点的第一版落地 |
| Stage 4 | 已完成 | 已完成核心模块边界说明，并完成 API 正文内化 |
| Stage 5 | 已完成 | 已完成依赖图、I/O 总表与四份核心 schema 的第一版落地 |
| Stage 6 | 已完成 | 已完成 sample-scene 的五份 fixture 文件落地 |
| Stage 7 | 已完成 | 已完成作者层与 UX 外壳的第一版落地 |
| Stage 8 | 已完成 | 已完成路径内化、API 拆分、Agent Metadata 与 Agent Guide 收口 |
| Stage 9 | 已完成 | 已完成规格一致性修复——光锥坍缩 API 模式、Audit Resolver 模块、Schema/Fixture 对齐、命名统一与交叉引用修正 |
| Stage 10 | 已完成 | 已完成规格维护——collapse 温度统一、契约关键字标准化、Audit Resolver 依赖补齐、Option Generator 设计时 I/O 收口、API collapse 能力声明补齐与源稿路径修正 |
| Stage 11 | 已完成 | 已完成阶段后果结算链路与重写回传链路修复——新增 Phase Consequence Settlement / settlement 模式、补齐 generationControl、同步 API/契约/编排层文档 |
| Stage 12 | 已完成 | 已完成正式实施阻塞协议增强——在 agent-guide 建立 Blocker Protocol / Conflict Resolution，并在枢纽文件增加回看入口 |
| Stage 13 | 已完成 | 已完成 sample-scene 故事源稿内化与 fixture 同步，并切换到仓库内 story-source 作为样例故事权威源 |
| Stage 14 | 已完成 | 已完成 UI 设计产物 round-1 收口——归档参考图与草图、创建线框说明，并把稳定布局结论回写到 UX / 作者层 / 导航层规范 |

## 最近更新

- 2026-03-18：创建 `LOGOS-SPEC` 目录骨架。
- 2026-03-18：完成第一阶段导航文件与 `TODO.md` 初始化。
- 2026-03-18：完成第二阶段领域层第一版，包括术语表、核心实体、控制原语与状态模型。
- 2026-03-18：完成第三阶段编排层第一版，包括运行循环、三层生命周期与关键判断点。
- 2026-03-18：完成第四阶段模块层第一版。
- 2026-03-18：完成第五阶段契约层第一版，包括依赖图、I/O 总表与 Prompt/Audit/State/Phase schema。
- 2026-03-18：完成第六阶段样例层第一版，基于现有故事草案建立 sample-scene fixtures。
- 2026-03-18：完成第七阶段作者层与 UX 外壳第一版，包括作者输入面、工作流、信息架构与页面清单。
- 2026-03-18：补齐产品层第一版，包括 vision、Sample 边界与 non-goals 文档。
- 2026-03-18：完成 API 文档内化，将修订后的正文迁入 `04_MODULES/api-adapter-lite/overview.md`，并把旧路径降格为迁移说明。
- 2026-03-18：预留 `08_UX/design-artifacts/` 与 `06_FIXTURES/sample-scene/story-source/`，作为后续 UI 与故事稿的统一落点。
- 2026-03-19：收口光锥坍缩定义，明确 Phase 结束后的边界更新必须基于上一阶段真实后果重新面向终点线做语义推演，并同步更新领域层、编排层、模块层、契约层、fixture 与 ADR。
- 2026-03-19：完成仓库重构——路径内化（11 处绝对路径 → 相对路径）、API 适配器拆分（1 → 5 文件）、Agent Metadata（15 个文件加 YAML 头）、Agent Guide 创建。
- 2026-03-20：完成规格一致性修复（Stage 9）——新增光锥坍缩 API 调用模式（collapse）及 `collapse-packet-schema.yaml`；新增 `audit-question-set-schema.yaml` 与 `audit-resolver.md`；修复 Fixture/Schema 结构冲突（historyWindow、directorNote 重命名、phaseConsequences 结构化）；统一 endLine/endState 映射说明；澄清 Option Generator 架构位置；修正 frontmatter 交叉引用。
- 2026-03-20：完成规格维护（Stage 10）——统一 collapse temperature 为 `0.5`；将核心契约 YAML 收口为可机器校验的 JSON Schema 风格关键字；补齐 Orchestrator → Audit Resolver 依赖；收口 Option Generator 为经 `optionConstraints` 外发的设计时约束模块；补齐 API collapse 能力声明与 frontmatter 合同引用；修复 sample-scene 源稿路径。
- 2026-03-20：完成阶段后果结算与重写回传链路修复（Stage 11）——新增 `phase-consequence-settlement.md` 与 `phase-consequence-packet-schema.yaml`；为 API Adapter Lite 增加 `settlement` 模式；把 retry 控制显式收口为 `PromptObject.generationControl`；同步更新领域层、编排层、模块层、契约层、API 文档与 ADR。
- 2026-03-20：完成正式实施阻塞协议增强（Stage 12）——在 `agent-guide.md` 增加实施遇阻处理卡、Blocker Protocol / Conflict Resolution 附录别名与工作流回看回路；在 `system-map.md`、`glossary.md`、`runtime-loop.md`、`module-dependency-map.md`、`api-adapter-lite/overview.md` 增加统一短提示，并在核心 frontmatter 中补充 `blocker_protocol` 入口。
- 2026-03-20：完成 sample-scene 故事源稿内化（Stage 13）——在 `06_FIXTURES/sample-scene/story-source/` 补齐 scene/characters/world-style/phase/location/audit/author 七份源稿；将 `scene-overview.md` 的故事来源切换为仓库内 story-source；同步刷新 `phase-plan.yaml`、`router-lexicon.yaml` 与 `audit-questions.yaml`，并更新 README、作者工作流与 UX 说明中的源稿引用。
- 2026-03-20：完成 UI 设计产物 round-1 收口（Stage 14）——将参考图与草图归档到 `08_UX/design-artifacts/assets/`；创建 `ui-round-1-wireframes.md`；同步更新 UX 上层规范、作者配置边界说明、产品层非目标说明，以及 `README.md`、阅读顺序与状态追踪文件，防止设计稿与既有 SPEC 产生歧义或越层冲突。
