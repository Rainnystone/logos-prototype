# LOGOS-SPEC Todo

## 说明

这是一份持续维护的阶段任务追踪文件。它的作用不是临时记事，而是作为整个规格仓库的执行账本存在。后续每完成一个阶段，都必须同步更新本文件与 `00_META/status-board.md`，否则规格仓库会再次退化成“内容很多但状态不清楚”的文档集合。

当前规则有三条。第一，只在 `LOGOS-SPEC` 内维护拆解进度，不在原始母文档里记阶段状态。第二，凡是被标记为“完成”的阶段，必须已经产生可读文件，而不是只有口头计划。第三，API 文档现在已经正式内化到 `04_MODULES/api-adapter-lite/`，并以 `overview.md` 作为入口，因此后续凡是涉及 API 模块的 review、实现或 UI 联动，都必须以这一仓库内目录为唯一权威源。

## 阶段追踪

### Stage 1：建立规格仓库骨架与导航文件

- [x] 创建 `archive/vendor/LOGOS-SPEC/` 根目录
- [x] 创建 `README.md`
- [x] 创建 `00_META/system-map.md`
- [x] 创建 `00_META/reading-order.md`
- [x] 创建 `00_META/status-board.md`
- [x] 创建持续追踪用的 `TODO.md`
- [x] 建立一级目录骨架：`00_META` 至 `09_ADR`

状态：已完成  
完成日期：2026-03-18

### Stage 2：锁定术语与领域模型

- [x] 创建 `02_DOMAIN/glossary.md`
- [x] 创建 `02_DOMAIN/core-entities.md`
- [x] 创建 `02_DOMAIN/control-primitives.md`
- [x] 创建 `02_DOMAIN/state-model.md`

状态：已完成  
完成日期：2026-03-18

### Stage 3：拆解系统运行编排

- [x] 创建 `03_ORCHESTRATION/runtime-loop.md`
- [x] 创建 `03_ORCHESTRATION/scene-phase-beat-lifecycle.md`
- [x] 创建 `03_ORCHESTRATION/control-flow-and-decision-points.md`
- [x] 在编排层明确 Sample 版本的简化规则

状态：已完成  
完成日期：2026-03-18

### Stage 4：建立模块边界说明

- [x] 创建 `04_MODULES/orchestrator-control-hub.md`
- [x] 创建 `04_MODULES/light-cone-collapse.md`
- [x] 创建 `04_MODULES/phase-gradient.md`
- [x] 创建 `04_MODULES/narrative-router.md`
- [x] 创建 `04_MODULES/director-note-layer.md`
- [x] 创建 `04_MODULES/auditor.md`
- [x] 创建 `04_MODULES/prompt-assembler.md`
- [x] 创建 `04_MODULES/memory-placeholder.md`
- [x] 创建 `04_MODULES/option-generator.md`
- [x] 将修订后的 API 正文内化为 `04_MODULES/api-adapter-lite/overview.md`，并统一 API 模块权威源

状态：已完成  
完成日期：2026-03-18

### Stage 5：提炼跨模块共享契约

- [x] 创建 `05_CONTRACTS/module-dependency-map.md`
- [x] 创建 `05_CONTRACTS/orchestrator-input-output.md`
- [x] 创建 `05_CONTRACTS/prompt-object-schema.yaml`
- [x] 创建 `05_CONTRACTS/audit-packet-schema.yaml`
- [x] 创建 `05_CONTRACTS/state-snapshot-schema.yaml`
- [x] 创建 `05_CONTRACTS/phase-plan-schema.yaml`

状态：已完成  
完成日期：2026-03-18

### Stage 6：补足 Sample Fixtures

- [x] 创建 `06_FIXTURES/sample-scene/scene-overview.md`
- [x] 创建 `06_FIXTURES/sample-scene/phase-plan.yaml`
- [x] 创建 `06_FIXTURES/sample-scene/router-lexicon.yaml`
- [x] 创建 `06_FIXTURES/sample-scene/audit-questions.yaml`
- [x] 创建 `06_FIXTURES/sample-scene/state-snapshots.yaml`

状态：已完成  
完成日期：2026-03-18

### Stage 7：补充作者工作流与 UX 外壳

- [x] 创建 `07_AUTHORING/author-input-surfaces.md`
- [x] 创建 `07_AUTHORING/author-workflow.md`
- [x] 创建 `07_AUTHORING/configuration-matrix.md`
- [x] 创建 `08_UX/information-architecture.md`
- [x] 创建 `08_UX/key-user-flows.md`
- [x] 创建 `08_UX/screen-inventory.md`
- [x] 创建 `08_UX/ui-deferred-decisions.md`

状态：已完成  
完成日期：2026-03-18

## 仓库收口更新

- [x] 将修订后的 API 文档迁入 `04_MODULES/api-adapter-lite/overview.md`
- [x] 在旧路径保留迁移说明，避免旧引用失焦
- [x] 创建 `08_UX/design-artifacts/`，作为 UI 设计稿与线框稿的统一落点
- [x] 创建 `06_FIXTURES/sample-scene/story-source/`，作为当前 sample 故事改编稿的统一落点

状态：已完成  
完成日期：2026-03-18

### Stage 8：仓库重构（路径内化、API 拆分、Agent Metadata、Agent Guide）

- [x] 将 `api-adapter-lite.md` 拆分为 5 个子文件（overview、interface-contracts、schema-mapper、runtime、implementation-guide）
- [x] 更新 5 个文件中的 8 处内部路径引用
- [x] 将 7 个文件中的 11 处绝对路径转换为仓库内相对路径
- [x] 为 9 个模块文档添加 YAML Agent Metadata frontmatter
- [x] 为 6 个契约文件添加 Agent Metadata
- [x] 创建 `00_META/agent-guide.md` 作为 Coding Agent 路由文件

状态：已完成
完成日期：2026-03-19

### Stage 9：规格一致性修复（Schema/Fixture 对齐、光锥坍缩 API 模式、Audit Resolver、命名统一）

- [x] 修复 `state-snapshots.yaml` 中 `historyWindow` 为 `{role, content}` 结构，对齐 `state-snapshot-schema.yaml`
- [x] 创建 `05_CONTRACTS/audit-question-set-schema.yaml`，定义完整审计问题集结构
- [x] 更新 `05_CONTRACTS/audit-packet-schema.yaml` notes 引用新 schema
- [x] 创建 `05_CONTRACTS/collapse-packet-schema.yaml`，定义光锥坍缩 LLM 调用的输入输出契约
- [x] 在 `interface-contracts.md` 添加光锥坍缩模式（collapse，当前位于 §3.4）
- [x] 更新 `overview.md` §8.1 调用次数表与 §8.3 collapse 模式说明
- [x] 更新 `schema-mapper.md` 添加 collapse 映射路径（6 种映射）
- [x] 更新 `runtime.md` §7.2 添加 collapse 分支与 CollapseResult 校验
- [x] 更新 `implementation-guide.md` §11.2/§11.4/§11.5 添加 collapse 相关内容
- [x] 更新 `light-cone-collapse.md` 明确 LLM 调用方式与 collapse-packet-schema 引用
- [x] 更新 `adr-004` 后果部分，记录 collapse API 模式决策
- [x] 更新 `module-dependency-map.md` API Adapter 输入添加 CollapsePacket
- [x] 更新 `orchestrator-input-output.md` API Adapter I/O 添加 CollapsePacket/CollapseResult
- [x] 创建 `04_MODULES/audit-resolver.md`，定义代码层裁决模块职责
- [x] 在 `prompt-assembler.md` 添加 endLine→endState 映射说明
- [x] 在 `state-snapshot-schema.yaml` 将 `generationState.directorNote` 重命名为 `directorNoteSummary`
- [x] 在 `state-snapshots.yaml` 同步更新 4 处 `directorNote` → `directorNoteSummary`
- [x] 在 `option-generator.md` 与 `orchestrator-control-hub.md` 添加 Option Generator 架构位置澄清
- [x] 在 `narrative-router.md` frontmatter `consumed_by` 添加 `prompt-assembler`
- [x] 在 `state-snapshot-schema.yaml` 改进 `phaseConsequences` 描述并在 fixture 中添加示例
- [x] 在 `phase-gradient.md` 正文添加 `Option Generator` 作为下游消费者
- [x] 在 `TODO.md` Stage 4 补录 `option-generator.md`
- [x] 更新 `status-board.md` 记录 Stage 9 与新增模块

状态：已完成
完成日期：2026-03-20

### Stage 10：规格维护（collapse 温度统一、契约关键字标准化、依赖与 I/O 收口）

- [x] 将 `adr-004` 中 collapse 模式的后端强制 `temperature` 统一为 `0.5`
- [x] 将 6 份核心契约 YAML 收口为可机器校验的 JSON Schema 风格关键字
- [x] 在 `orchestrator-control-hub.md` 与 `module-dependency-map.md` 中补齐 `Audit Resolver` 依赖
- [x] 在 `option-generator.md` 与 `orchestrator-input-output.md` 中收口 Option Generator 的设计时模块定位
- [x] 更新 API Adapter Lite 文档，补齐 `collapse` 的能力声明、映射说明与 frontmatter 契约引用
- [x] 修复 `sample-scene/scene-overview.md` 中 2 处故事源稿坏路径
- [x] 更新 `status-board.md` 记录本轮规格维护

状态：已完成
完成日期：2026-03-20

### Stage 11：阶段后果结算链路与重写回传链路修复

- [x] 创建 `04_MODULES/phase-consequence-settlement.md`，定义阶段后果结算模块边界
- [x] 创建 `05_CONTRACTS/phase-consequence-packet-schema.yaml`，定义 settlement 输入输出契约
- [x] 在领域层与编排层明确“阶段后果结算 -> 光锥坍缩”的固定顺序
- [x] 在 `prompt-object-schema.yaml` 中新增 retry-only 的 `generationControl`
- [x] 在 `prompt-assembler.md`、`audit-resolver.md` 与 `runtime-loop.md` 中补齐 rewriteFeedback / previousDraft 回传链路
- [x] 更新 API Adapter Lite 文档，新增 `settlement` 模式与 2×4 映射路径，并同步 `tokenReport` 中的 `generationControl`
- [x] 更新 `module-dependency-map.md`、`orchestrator-input-output.md`、`collapse-packet-schema.yaml` 与 `adr-004`
- [x] 更新 `status-board.md` 记录本轮规格修复

状态：已完成
完成日期：2026-03-20

### Stage 12：正式实施阻塞协议增强

- [x] 在 `00_META/agent-guide.md` 顶部增加“实施遇阻处理卡”
- [x] 在 `00_META/agent-guide.md` 的附录标题中加入 `Blocker Protocol / Conflict Resolution` 检索别名
- [x] 在 `00_META/agent-guide.md` 的 Session 工作流中保留“遇阻回看附录后继续推进”的回路
- [x] 在 `00_META/system-map.md`、`02_DOMAIN/glossary.md`、`03_ORCHESTRATION/runtime-loop.md`、`05_CONTRACTS/module-dependency-map.md`、`04_MODULES/api-adapter-lite/overview.md` 增加统一短提示
- [x] 在具备 frontmatter 的核心枢纽文件中补充 `blocker_protocol` 入口字段
- [x] 更新 `status-board.md` 记录本轮规范增强

状态：已完成
完成日期：2026-03-20

### Stage 13：sample-scene 故事源稿内化与 fixture 同步

- [x] 在 `06_FIXTURES/sample-scene/story-source/` 内补齐 `scene-brief.md`、`characters.md`、`world-style.md`、`phase-outline.md`、`location-pool.md`、`audit-rules.md` 与 `author-notes.md`
- [x] 将 `06_FIXTURES/sample-scene/scene-overview.md` 的故事来源切换为仓库内 `story-source/`
- [x] 根据新源稿刷新 `06_FIXTURES/sample-scene/phase-plan.yaml`
- [x] 根据新源稿刷新 `06_FIXTURES/sample-scene/router-lexicon.yaml`
- [x] 根据新源稿刷新 `06_FIXTURES/sample-scene/audit-questions.yaml`
- [x] 更新 `README.md`、`00_META/status-board.md`、`00_META/reading-order.md` 与 `06_FIXTURES/sample-scene/story-source/README.md`，明确 story-source 与结构化 fixture 的映射关系
- [x] 更新 `07_AUTHORING/` 与 `08_UX/` 中仍指向“外部草案”的说明，避免双重权威源

状态：已完成
完成日期：2026-03-20

### Stage 14：UI 设计产物 round-1 收口与规范回写

- [x] 将 `08_UX/design-artifacts/` 下的参考图与草图归档到 `assets/`
- [x] 创建 `08_UX/design-artifacts/ui-round-1-wireframes.md`
- [x] 在 `08_UX/information-architecture.md`、`08_UX/screen-inventory.md` 与 `08_UX/ui-deferred-decisions.md` 中回写当前稳定的工作台布局结论
- [x] 在 `07_AUTHORING/configuration-matrix.md` 与 `01_PRODUCT/non-goals.md` 中补齐“设计轮次产物不等于最终视觉冻结”的边界说明
- [x] 更新 `08_UX/design-artifacts/README.md`、`README.md`、`00_META/reading-order.md` 与 `00_META/status-board.md`，同步当前 round-1 设计产物状态

状态：已完成
完成日期：2026-03-20

## 当前不做

- [x] 不修改叙事控制中心原始母文档
- [x] 不再维持仓库内外两套并行的 API 正文
- [x] 不提前写实现代码
- [x] 不先做高保真 UI
- [x] 不提前设计完整记忆模块
