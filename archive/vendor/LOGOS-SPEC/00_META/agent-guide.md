---
module: agent-guide
type: meta
priority: core
tokens_estimate: 2800
last_updated: 2026-03-20
---

# Agent Guide
**本文档优先级高于 reading-order.md**

本文件是 Coding Agent 进入 LOGOS-SPEC 仓库的强制首读文件。它的作用是告诉 agent 该读什么、不该读什么、以什么顺序读、以及如何在 context 有限的条件下高效工作。

**最高实施指令：如果在正式实施、联调或写代码过程中遇到阻塞、必填字段缺少来源、命名冲突、字段漂移、mode 未闭合或语义不统一，严禁自行跳过。请回看本文末尾的“附录：正式实施时的阻塞疏通与语义对齐规则”，按附录中的裁决顺序和默认疏通策略处理。**

**实施遇阻处理卡**
- 字段缺来源：补 producer
- 输出无入口：补共享契约入口
- 代码被迫做语义理解：补 LLM 步骤或 LLM mode
- 名词、字段或 mode 冲突：按本文附录裁决顺序统一后继续

## 阅读禁区

以下目录与实现规格无关，Agent 绝对不读：

- `Agent Client/` — 历史会话日志，仅供人类回溯设计讨论
- `LOGOS Prototype/` — 母文档与早期设计，除非人类明确要求比对
- `SillyTavern调研/`、`Psycho-Pass*/`、`Reference/` — 研究归档

## Phase 0：每次 session 必读

无论任务类型，每次 session 开始时必须按顺序读取以下文件：

| 顺序 | 文件 | 预估 tokens |
|------|------|------------|
| 1 | `00_META/agent-guide.md`（本文件） | ~1,500 |
| 2 | `00_META/system-map.md` | ~1,000 |
| 3 | `02_DOMAIN/glossary.md` | ~1,100 |
| 4 | `05_CONTRACTS/module-dependency-map.md` | ~900 |
| | **合计** | **~4,500** |

## 按任务类型加载

Phase 0 完成后，根据任务类型选择性加载：

| 任务类型 | 在 Phase 0 基础上加读 | 追加 tokens |
|----------|----------------------|-------------|
| 理解系统全貌 | `01_PRODUCT` 全部 → `02_DOMAIN` 全部 → `03_ORCHESTRATION` 全部 | ~12,000 |
| 实现某个模块 | 目标模块文档 + 其 frontmatter 中 `contracts` + `reading_context` 指定的文件 | ~5,000-10,000 |
| 修改 API 适配器 | `api-adapter-lite/overview.md` → `interface-contracts.md` → 按需加载其子文档与 `phase-consequence-packet-schema.yaml` | ~3,500-8,000/子文档 |
| 修改 Schema | 目标 schema + `module-dependency-map` + `02_DOMAIN/state-model.md` | ~5,000 |
| 集成测试 | `03_ORCHESTRATION/runtime-loop.md` + `06_FIXTURES/sample-scene/` 全部 | ~8,000 |

## Context 预算规则

- 单次 session 的规格文本占用不应超过 **40,000 tokens**
- 超限时按以下优先级丢弃：
  1. 首先丢弃 `implementation-guide.md`（非规范性附录）
  2. 其次丢弃 `06_FIXTURES/`（可在需要时按需加载）
  3. **永远不丢弃** `glossary.md` 和 `module-dependency-map.md`

## 使用 Frontmatter 做预判

每个模块文档和契约文件都带有 YAML frontmatter，包含以下 Agent 路由信息：

- `priority`: `core`（必读）、`support`（按需）、`placeholder`（可跳过）
- `depends_on` / `consumed_by`: 局部依赖图。`depends_on` 中的值可能是模块标识符（如 `prompt-assembler`，对应 `04_MODULES/` 下的文件）或领域层概念（如 `scene-spec`、`state-snapshot`，对应 `02_DOMAIN/` 下的定义）
- `contracts`: 关联的 schema 文件路径（相对于 LOGOS-SPEC 根目录）
- `tokens_estimate`: 全文 LLM token 粗估
- `reading_context`: 读本文件前建议先读的前置文件

在读取一个模块文档的全文之前，可以先只读其 frontmatter 来判断是否需要继续。

## 实现顺序建议

按模块依赖拓扑排列，每个 session 只处理 1-2 个模块：

| Round | 模块 | 理由 |
|-------|------|------|
| 1 | Memory Placeholder, Phase Gradient | 无上游模块依赖 |
| 2 | Light Cone Collapse, Narrative Router | 依赖领域层定义 |
| 3 | Director Note Layer, Option Generator | 依赖 Round 1-2 输出 |
| 4 | Prompt Assembler | 装配层，消费所有控制模块 |
| 5 | API Adapter Lite | 外发层 |
| 6 | Auditor, Audit Resolver, Phase Consequence Settlement, Orchestrator Control Hub | 闭环层 |
| 7 | 端到端验证 | 用 sample-scene fixtures 跑完整 Beat 循环 |

## Session 工作流

```
┌─ Session Start ─────────────────────────────────┐
│ 1. 读 agent-guide.md（路由）                      │
│ 2. 读 system-map.md（架构）                       │
│ 3. 读 glossary.md（术语锁定）                     │
│ 4. 读 module-dependency-map.md（依赖图）           │
│    ── Phase 0 完成，~4,500 tokens ──              │
│                                                    │
│ 5. 读目标模块 frontmatter → 确认 depends_on       │
│ 6. 按 reading_context 加载前置文件                 │
│ 7. 读目标模块正文 + 关联 contract schema           │
│    ── 任务上下文就绪 ──                            │
│                                                    │
│ 8. 实现 / 修改 / 测试                              │
│ 9. 若遇阻塞/语义漂移 → 回看本文附录后继续推进       │
│ 10. 提交前读 module-dependency-map 验证无非法依赖   │
│ 11. 更新 status-board.md + TODO.md                 │
└─────────────────────────────────────────────────────┘
```

---

## 附录：正式实施时的阻塞疏通与语义对齐规则（Blocker Protocol / Conflict Resolution）
**以下规则为按需触发规则。正常首轮阅读只需知道其存在；仅当正式实施、写代码或联调过程中发现阻塞、命名冲突、字段漂移、语义不统一时，再按本节执行。**

### 1. 核心不变量与职责边界

- LOGOS 的叙事引擎就是 LLM。凡是需要语义生成、语义提炼、语义压缩、语义改写、语义重推的步骤，默认应由独立的 LLM 模块或 LLM 调用模式负责。
- 代码层默认只负责编排、状态维护、契约校验、重试控制、协议映射与持久化，不负责替代 LLM 进行文学或叙事语义推理。
- 如果某个流程只有让代码“理解文本语义”才能继续，默认判断为规格缺少一个 LLM 步骤、LLM 模块或 LLM mode；不得优先用隐式 heuristics 代替。
- Beat 是最小生成单位；Phase 是最小控制单位。任何修复都不得破坏这一抽象边界。
- 系统必须保持题材无关、故事无关；不得为了 sample-scene 或单一剧本临时污染通用规格。

### 2. 冲突裁决顺序

当多个文件对同一概念给出不同说法时，按以下顺序裁决，低优先级文本必须向高优先级定义对齐：

1. `00_META/agent-guide.md` 中的核心不变量与明确裁决规则
2. `02_DOMAIN/glossary.md` 中的 canonical term
3. `09_ADR/` 中已明确通过的设计决议
4. `05_CONTRACTS/` 中的 schema、input/output、dependency map
5. `03_ORCHESTRATION/` 中的生命周期与 producer/consumer 顺序
6. `04_MODULES/` 中的模块职责描述
7. `implementation-guide`、`fixtures`、示例文本

补充规则：

- 术语冲突时，以 `glossary` 的 canonical name 为准。
- 字段名、对象形状、必填关系，以 `05_CONTRACTS` 为准。
- 生命周期顺序、谁产出谁消费，以 `03_ORCHESTRATION` 为准。
- 模块 prose 不得私自推翻 schema 或 orchestration。
- 若 ADR 与 contract 冲突，优先判断是否 contract 未同步 ADR；实施时不得同时保留两套有效语义。

### 3. 正式实施时的默认疏通策略

当 agent 在正式实施中发现阻塞时，默认按以下方式自主疏通：

- 若某个必填字段存在，但没有规范性 producer：补 producer，不得靠“临时写死”“从 prose 猜”“运行时静默置空”跳过。
- 若某个模块输出了控制信息，但下游协议没有入口：补最近的共享契约入口，通常是状态对象、`PromptObject` 或 API request schema。
- 若某个职责表面属于代码层，但实质需要语义理解：改为“代码组包 -> LLM 执行 -> 代码校验/落盘”的三段式，而不是继续扩大代码职责。
- 若同一概念出现多个命名、多个温度值、多个 section 编号、多个 mode 定义：必须统一为一个 canonical 版本，并清理旧名残留。
- 若某个能力仅在 sample 或 fixture 中暂时成立：必须显式标记为 `sample-only` 或 `non-normative`，不得伪装成正式规范。
- 若存在多种修法，默认选择：新增概念最少、联动文件最少、最符合“叙事语义归 LLM、控制与校验归代码”边界、且不改变作者控制模型与 Beat/Phase 基本抽象的方案。

只有当修复会改变以下内容时，agent 才应停止自主扩展并等待人类裁决：

- 作者可见的控制模型
- 核心领域对象边界
- 公共 API 语义
- Beat / Phase / Scene 的基本定义

### 4. 联动同步与收尾义务

agent 一旦自主修复阻塞，必须完成最小联动同步，避免留下新的漂移：

- 改术语：同步 `glossary`、相关 contract、相关模块文档。
- 改字段或对象结构：同步 schema、`state-model`、`runtime-loop`、相关 input/output 文档。
- 改模块职责：同步 frontmatter 的 `depends_on`、`consumed_by`、`contracts`、`reading_context`，并检查 `module-dependency-map`。
- 改 API mode 或协议映射：同步 `overview`、`interface-contracts`、`schema-mapper`、`runtime`、`implementation-guide`。
- 新增模块或契约：同步 `reading-order.md`、`status-board.md`、`TODO.md`，必要时补充 ADR 或 glossary。
- 收尾前必须执行一次一致性检查，至少覆盖：canonical name 是否唯一、旧 section 编号或旧 mode 说法是否残留、producer / consumer 链路是否闭合、schema 与 prose 是否仍然一致、sample 是否被误写成正式规范。
