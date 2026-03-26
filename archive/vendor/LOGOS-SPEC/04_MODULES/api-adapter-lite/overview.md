---
module: api-adapter-lite
title: API Adapter Lite
type: module
priority: core
depends_on:
  - prompt-assembler
consumed_by: []
contracts:
  - 05_CONTRACTS/prompt-object-schema.yaml
  - 05_CONTRACTS/audit-packet-schema.yaml
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/collapse-packet-schema.yaml
blocker_protocol: 00_META/agent-guide.md#附录-正式实施时的阻塞疏通与语义对齐规则
tokens_estimate: 3500
reading_context:
  - 02_DOMAIN/glossary.md
  - 04_MODULES/prompt-assembler.md
status: v1-complete
last_updated: 2026-03-20
---
# LOGOS Lite API 适配器 — 完整设计方案 v2.2

> 若正式实施中发现 mode、schema、capability、runtime 或协议映射之间不闭合，回看 `00_META/agent-guide.md` 附录中的 Blocker Protocol / Conflict Resolution 后再继续修复。

> **本文档面向 Coding Agent（如 Antigravity / Codex / Claude Code）**
> 所有接口定义、数据结构、映射规则均以可直接实现为标准编写。
> **GameView（玩家游玩界面）为 placeholder，UI 将独立设计，本方案不涉及其具体实现。**
>
> **规范性范围说明**
> - 本文档的规范性正文只覆盖 API Adapter Lite 的职责边界、调用契约、协议映射、统一响应与 provider 能力要求。
> - 完整运行循环的权威源仍是 `archive/vendor/LOGOS-SPEC/03_ORCHESTRATION/` 下的编排层文档；本文只从 API 视角引用，不再复写一份完整编排流程。
> - provider / model 清单是 `2026-03` 的 Sample 运行快照，不构成长期版本承诺。
> - 第 9-11 节是非规范性附录，仅供 localhost 原型运行参考；它们保留在本文件中作为实现附录，但不作为其他模块应依赖的规范性正文。

---

## 0. 设计范围

### 0.1 Sample 测试范围

本轻量版 API 适配器专为 **localhost 环境下的 Sample 测试** 设计：
- **1个 Scene**（场）
- **4-6个 Phase**（段），每个 Phase 约 4 个 Beat
- **全量读取前序 5 个 Beat**（记忆模块 placeholder）
- **正式支持 4 家 LLM 供应商**：Google AI Studio, MiniMax, Kimi, 阿里百炼（标准 API）

> 说明：各家 Coding Plan / 套餐别名不再视为本文件中的正式支持清单；只有在完成能力校验与条款校验后，它们才允许作为本地原型的 runtime alias 单独登记。

---

## 1. 架构总览

### 1.1 系统分层

```
┌─────────────────────────────────────────────────────────────────┐
│                    浏览器 (Vue 3 前端)                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ 导演配置面板  │  │ GameView     │  │ Token 仪表盘             │ │
│  │ (API选择/Key) │  │ (placeholder) │  │ (System/Phase/History)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────────────────┘ │
│         │                 │                  │                    │
│  ┌──────▼─────────────────▼──────────────────▼──────────────────┐ │
│  │          前端服务层 (src/services/)                            │ │
│  │  ┌─────────────┐  ┌──────────────────────────────────────┐   │ │
│  │  │StorageService│  │ AdapterService                       │   │ │
│  │  │(存储读写)    │  │ ┌────────────────────────────────┐   │   │ │
│  │  │              │  │ │ SchemaMapper                   │   │   │ │
│  │  │              │  │ │ • toOpenAIFormat()             │   │   │ │
│  │  │              │  │ │ • toGeminiFormat()             │   │   │ │
│  │  │              │  │ │ • forGenerate() / forAudit() / forSettlement() / forCollapse() │   │   │ │
│  │  │              │  │ ├────────────────────────────────┤   │   │ │
│  │  │              │  │ │ TokenInspector                 │   │   │ │
│  │  │              │  │ │ • inspect() → TokenReport      │   │   │ │
│  │  └──────┬───────┘  │ └────┬───────────────────────┘   │   │ │
│  │         │          └──────────┼───────────────────────────┘   │ │
│  └─────────┼─────────────────────┼───────────────────────────────┘ │
│            │                     │                                 │
└────────────┼─────────────────────┼─────────────────────────────────┘
             │ fetch /api/         │ fetch /api/llm/chat
             │ logos/save          │ { mode: "generate" | "audit" | "settlement" | "collapse" }
             │                     │
┌────────────▼─────────────────────▼─────────────────────────────────┐
│              Vite Dev Server (Node.js 后端)                          │
│                                                                     │
│  vite.config.js 中间件:                                              │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐  │
│  │ /api/logos/save   │  │ /api/llm/chat                          │  │
│  │ /api/logos/load   │  │ 1. 读取 logos.config.json (apiKey)     │  │
│  │ (磁盘读写 JSON)   │  │ 2. 从 providers.js 查供应商配置         │  │
│  │                   │  │ 3. SchemaMapper 转换格式               │  │
│  │                   │  │ 4. fetch 转发到 LLM 供应商              │  │
│  │                   │  │ 5. 统一响应格式返回                     │  │
│  └──────────────────┘  └────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
             │
             │ HTTPS (从 Vite 服务器发出，无 CORS 问题)
             ▼
    ┌─────────────────────────────────┐
    │  LLM API 供应商                   │
    │  • Google AI Studio (Gemini)     │
    │  • MiniMax (OpenAI-compatible)   │
    │  • Kimi (OpenAI-compatible)      │
    │  • 阿里百炼 (OpenAI-compatible)   │
    └─────────────────────────────────┘
```

### 1.2 关键设计决策

**为什么 API 调用放在 Vite 后端？**
1. **调用隔离**：前端虽然参与 Key 录入，但所有外部 LLM 请求只从后端发出
2. **无 CORS**：Node.js 环境发 HTTP 请求没有跨域限制
3. **简化**：原版在 itch.io 上不得不用 CORS 代理，我们 localhost 完全不需要

**为什么 3/4 供应商都走 OpenAI 兼容格式？**
- MiniMax、Kimi、阿里百炼都提供 OpenAI-compatible endpoint
- 只有 Google Gemini 需要独立映射
- SchemaMapper 只需维护 2 套逻辑，而不是 4 套

**API 适配器服务四个调用方**：
1. **Prompt 组装器** → 主生成模式（`mode: "generate"`）：生成 Beat 正文 + 4 个选项
2. **审计员** → 审计模式（`mode: "audit"`）：对生成内容做是/否判定
3. **Phase Consequence Settlement** → 阶段后果结算模式（`mode: "settlement"`）：Phase 结束时把当前阶段已接受转录收束为 `phaseConsequences[]`
4. **Orchestrator** → 光锥坍缩模式（`mode: "collapse"`）：Phase 结束时基于已结算阶段后果重推演叙事边界

---

## 2. 文件结构

```
logos-sample/
├── vite.config.js              ← Vite 中间件（后端：磁盘存储 + LLM 代理）
├── logos.config.json            ← 持久化配置文件（含 API Key，已加入 .gitignore）
├── logos.config.example.json    ← 配置模板（不含真实 Key，可提交 Git）
├── .gitignore                   ← 必须包含 logos.config.json
├── src/
│   ├── services/
│   │   ├── storage.js           ← StorageService（前端↔Vite 磁盘桥）
│   │   ├── adapter/
│   │   │   ├── index.js         ← AdapterService 主入口（对外统一接口）
│   │   │   ├── mapper.js        ← SchemaMapper（2 路径 × 4 模式映射）
│   │   │   ├── inspector.js     ← TokenInspector（分段 Token 计数）
│   │   │   └── providers.js     ← 供应商注册表（endpoint/auth/模型规格）
│   │   └── orchestrator/        ← 叙事控制中心（已有设计，本方案不涉及）
│   │       ├── lightCone.js
│   │       ├── phaseConsequenceSettlement.js  ← 调用 API 适配器（调用方 C）
│   │       ├── phaseGradient.js
│   │       ├── narrativeRouter.js
│   │       ├── directorNote.js
│   │       ├── promptAssembler.js  ← 输出给 API 适配器（调用方 A）
│   │       └── auditor.js          ← 调用 API 适配器（调用方 B）
│   ├── components/
│   │   ├── ConfigPanel.vue      ← 导演配置面板
│   │   ├── TokenDashboard.vue   ← Token 占比仪表盘
│   │   └── GameView.vue         ← 【PLACEHOLDER】玩家游玩界面，UI 待独立设计
│   └── App.vue
└── package.json
```

---

## 8. API 视角的数据流摘要（非编排权威源）

本节只保留 API Adapter Lite 在一个 Beat 周期中的介入点与调用次数。完整的叙事推进、重写裁决、Phase/Scene 状态流转，以及是否触发记忆压缩，仍然以 `archive/vendor/LOGOS-SPEC/03_ORCHESTRATION/` 下的编排层文档为权威源；本文不再复写一份并行流程，以避免仓库内外同时存在两套看起来都像主规范的运行图。

### 8.1 一次完整 Beat / Phase 边界 的 API 调用次数

| 场景 | generate 调用 | audit 调用 | settlement 调用 | collapse 调用 | 总计 |
|---|---|---|---|---|---|
| 一次通过 | 1 | 1 | 0 | 0 | 2 |
| 重写 1 次后通过 | 2 | 2 | 0 | 0 | 4 |
| 重写 2 次后通过 | 3 | 3 | 0 | 0 | 6 |
| 3 次重写仍失败（强制放行） | 3 | 3 | 0 | 0 | 6 |
| Phase 结束处理 | 0 | 0 | 1 | 1 | 2 |

**最坏情况**：一个 Beat 最多 6 次 API 调用。一个 Phase（4 Beat）最多 `24 + 2 = 26` 次。一个 Scene（4-6 Phase）最多 `104-156` 次，因此 provider 选择与调用预算必须按高频重试场景来估算，而不能只看单次请求成本。

### 8.2 API 适配器在 Beat 周期中的介入点

1. Prompt Assembler 输出 `PromptObject`，其中 `history`、`narrative`、`directorNote` 都已经是上游状态收束后的结果；若当前轮处于 retry，还会额外携带 `generationControl`。API Adapter 不再追加额外叙事控制职责。
2. API Adapter 在 `generate` 模式下执行 `TokenInspector`、`SchemaMapper`、provider 转发与 `GenerateResult` 校验，并把 `tokenReport` 作为元数据返回。
3. Auditor 基于 `AuditPacket` 与 `GenerateResult` 再次调用 API Adapter 的 `audit` 模式，并且只消费 `AuditResult.answers[]` 这一稳定结果，不再解析自然语言内容。
4. Audit Resolver 是否要求重写、是否放行，以及 warning 如何反馈给编排层，全部属于上游裁决逻辑，而不是 API Adapter 的职责。
5. 当 Phase 结束时，系统会先经 `settlement` 模式得到 `phaseConsequences[]`，再经 `collapse` 模式基于这些后果推演新边界。

### 8.3 阶段后果结算调用模式（settlement）

Phase 结束时的 `phaseConsequences[]` 不再由 Orchestrator prose 隐式生成，而是通过独立的 LLM 结算步骤产生。因此 API Adapter Lite 提供第三种调用模式 `settlement`，由 `Phase Consequence Settlement` 模块在 Phase 结束处理时触发。

settlement 模式的输入是 `PhaseConsequencePacket`（含当前 Phase 已接受转录与上下文），输出是 `PhaseConsequenceResult`（含 `phaseConsequences[]` 与 `settlementTrace`）。详细契约见 `interface-contracts.md` §3.3 与 `05_CONTRACTS/phase-consequence-packet-schema.yaml`。

settlement 模式的 `temperature` 由后端强制收束到 `0.2`，因为这一步应偏向稳定抽取与事实结算，而不是创造性扩写。

### 8.4 光锥坍缩调用模式（collapse）

Phase 结束时的光锥坍缩需要基于上一阶段真实后果重新面向终点线做语义推演，这一步必须通过 LLM 调用完成。因此 API Adapter Lite 提供第四种调用模式 `collapse`，由 Orchestrator 在 Phase 结束处理时触发。

与 generate、audit 和 settlement 不同，collapse 模式不参与每轮 Beat 生成循环，而是只在 Phase 边界处被调用一次。它的输入是 `CollapsePacket`（含已结算阶段后果与当前边界），输出是 `CollapseResult`（含新的 Alpha/Beta 与推演说明）。详细契约见 `interface-contracts.md` §3.4 与 `05_CONTRACTS/collapse-packet-schema.yaml`。

collapse 模式的 `temperature` 由后端强制收束到 `0.5`，因为边界推演需要确定性推理与适度发散的平衡。

---


---

## 子文件导航

| 文件 | 内容 |
|------|------|
| [interface-contracts.md](interface-contracts.md) | §3 核心接口契约（generate / audit / settlement / collapse） |
| [schema-mapper.md](schema-mapper.md) | §4 SchemaMapper 协议映射 |
| [runtime.md](runtime.md) | §5 TokenInspector + §6 供应商 + §7 后端代理 |
| [implementation-guide.md](implementation-guide.md) | §9-11 非规范性附录 |
