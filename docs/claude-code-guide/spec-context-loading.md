# Spec Context Loading — 规格上下文加载指南

## 为什么需要分层加载

LOGOS-SPEC 包含 **70+ 文件、12,000+ 行、估算 40,000+ tokens**。Claude Code 的 context window 虽然足够大，但无限制地全量加载会导致：

1. **信息噪音**：不相关的模块规格会干扰当前任务的实现决策
2. **关键信息被冲淡**：在大量 context 中，关键约束条件容易被模型"遗忘"
3. **Token 浪费**：留给代码阅读和生成的空间被 spec 文本挤占

因此，LOGOS 采用**分层按需加载**策略，确保每次 session 只加载当前任务真正需要的 spec 子集。

## Phase 0：每次 Session 必读（~4,500 tokens）

无论执行什么任务，每次 Claude Code session 开始后都必须加载以下 4 个文件：

| 顺序 | 文件 | 内容 | Token 估算 |
|------|------|------|-----------|
| 1 | `00_META/agent-guide.md` | Agent 路由规则、阅读禁区、阻塞协议 | ~1,500 |
| 2 | `00_META/system-map.md` | 仓库分层地图、权威源规则 | ~1,000 |
| 3 | `02_DOMAIN/glossary.md` | 核心术语锁定（Scene/Phase/Beat 等） | ~1,100 |
| 4 | `05_CONTRACTS/module-dependency-map.md` | 模块依赖图、依赖纪律 | ~900 |

**Phase 0 是不可跳过的。** 即使你"记得"上次 session 读过这些文件，新 session 仍然必须重新加载，因为 Claude Code 不跨 session 保持记忆。

### Phase 0 加载后你获得的能力

- 知道哪些文件不可读（阅读禁区）
- 知道术语的精确定义（避免同义替换导致的实现偏移）
- 知道模块间的合法依赖方向（避免非法跨层调用）
- 知道遇到阻塞时的疏通策略（避免自作主张跳过问题）

## 按任务类型加载

Phase 0 完成后，根据当前任务类型选择性加载额外文件：

### 实现某个模块（最常见场景）

```
Phase 0                                        ~4,500 tokens
+ 目标模块 spec（如 prompt-assembler.md）         ~1,500
+ frontmatter.contracts 指定的 schema            ~800-1,500
+ frontmatter.reading_context 指定的前置文件      ~1,000-3,000
+ 已有代码文件（如果是增量开发）                    变动
                                                ─────────────
                                                ~8,000-11,000
```

**具体步骤**：

1. 先只读目标模块文档的 **frontmatter**（前 20 行）
2. 查看 `depends_on`、`contracts`、`reading_context` 字段
3. 按 `reading_context` 顺序加载前置文件
4. 加载 `contracts` 中列出的 schema
5. 最后读模块文档正文

### 理解系统全貌

```
Phase 0                                        ~4,500 tokens
+ 01_PRODUCT/ 全部                              ~3,000
+ 02_DOMAIN/ 全部                               ~5,000
+ 03_ORCHESTRATION/ 全部                        ~4,000
                                                ─────────────
                                                ~16,500
```

### 集成测试

```
Phase 0                                        ~4,500 tokens
+ 03_ORCHESTRATION/runtime-loop.md              ~2,500
+ 06_FIXTURES/sample-scene/ 全部                ~5,000
                                                ─────────────
                                                ~12,000
```

### 修改 API 适配器

```
Phase 0                                        ~4,500 tokens
+ 04_MODULES/api-adapter-lite/overview.md       ~2,000
+ 04_MODULES/api-adapter-lite/interface-contracts.md ~3,000
+ 相关 schema（按需）                             ~1,500-3,000
                                                ─────────────
                                                ~11,000-12,500
```

## 使用 YAML Frontmatter 做预判

LOGOS-SPEC 中的每个模块文档和契约文件都带有 YAML frontmatter，包含 agent 路由信息。在读取全文之前，**先只读 frontmatter**（通常在文件前 20 行）可以快速判断是否需要继续加载。

### Frontmatter 字段说明

```yaml
---
module: prompt-assembler          # 模块标识符
title: 提示词组装器                 # 中文名
type: module                      # 类型：module / contract / meta
priority: core                    # core（必读）/ support（按需）/ placeholder（可跳过）
depends_on:                       # 上游依赖（模块标识符或领域概念）
  - memory-placeholder
  - light-cone-collapse
  - phase-gradient
  - narrative-router
  - director-note-layer
consumed_by:                      # 下游消费者
  - api-adapter-lite
contracts:                        # 关联 schema 路径（相对于 LOGOS-SPEC 根）
  - 05_CONTRACTS/prompt-object-schema.yaml
tokens_estimate: 1600             # 全文 token 粗估
reading_context:                  # 建议先读的前置文件
  - 02_DOMAIN/glossary.md
  - 03_ORCHESTRATION/runtime-loop.md
status: v1-complete               # 当前状态
last_updated: 2026-03-20          # 最后更新日期
---
```

### 预判决策树

```
读 frontmatter
  ├── priority: placeholder → 跳过，除非人类明确要求
  ├── priority: support → 检查是否在当前任务的 depends_on 链中
  │     ├── 是 → 加载
  │     └── 否 → 跳过
  └── priority: core → 必须加载
        └── 检查 tokens_estimate → 是否会超出预算
              ├── 预算充足 → 加载全文
              └── 预算紧张 → 只加载核心 section
```

## Token 预算计算

单次 session 的 spec 文本占用**不应超过 40,000 tokens**。

### 典型预算分配

```
┌──────────────────────────────────────────────────┐
│              40,000 tokens 总预算                  │
├──────────────────────────────────────────────────┤
│ Phase 0 必读          ~4,500 tokens   (11%)      │
│ Phase spec            ~3,000-8,000    (8-20%)    │
│ Contract schemas      ~1,500-3,000    (4-8%)     │
│ 已有代码上下文         ~5,000-10,000   (13-25%)   │
│ ────────────────────────────────────────────     │
│ 留给实现/生成/对话     ~14,000-25,000  (35-63%)   │
└──────────────────────────────────────────────────┘
```

### 超限时的丢弃优先级

当 spec 文本即将超过 40,000 tokens 时，按以下顺序丢弃：

| 优先丢弃 | 文件类型 | 理由 |
|----------|---------|------|
| 1（最先丢弃） | `implementation-guide.md` | 非规范性附录，参考用 |
| 2 | `06_FIXTURES/` 中的 fixture | 可在需要时按需单独加载 |
| 3 | 非当前任务的模块 spec | 不直接依赖则不需要 |
| **永远不丢弃** | `glossary.md` | 术语漂移会导致全局实现偏差 |
| **永远不丢弃** | `module-dependency-map.md` | 依赖违规会导致架构腐化 |

## 阅读禁区

以下目录与实现规格无关，**agent 绝对不读**：

| 目录 | 原因 |
|------|------|
| `Agent Client/` | 历史会话日志，仅供人类回溯设计讨论 |
| `LOGOS Prototype/` | 母文档与早期设计，除非人类明确要求比对 |
| `SillyTavern调研/` | 研究归档 |
| `Psycho-Pass*/` | 研究归档 |
| `Reference/` | 研究归档 |
| `LOGOS-SPEC 仓库重构与 AI Coding 实施方案/` | 历史方案文档 |

这些目录位于 `LOGOS-Design/` 下但在 `LOGOS-SPEC/` 之外。agent 的活动范围应始终限制在 `LOGOS-SPEC/` 内部。

## PROMPT.md 中的 spec_context_load 声明

每个 phase 的 PROMPT.md 应在 frontmatter 中声明本 phase 需要加载的 spec 文件清单：

```yaml
---
phase: 04_prompt-assembler
spec_context_load:
  phase_0:
    - 00_META/agent-guide.md
    - 00_META/system-map.md
    - 02_DOMAIN/glossary.md
    - 05_CONTRACTS/module-dependency-map.md
  task_specific:
    - 04_MODULES/prompt-assembler.md
    - 05_CONTRACTS/prompt-object-schema.yaml
    - 03_ORCHESTRATION/runtime-loop.md
    - 04_MODULES/director-note-layer.md
    - 04_MODULES/memory-placeholder.md
  estimated_tokens: 12000
---
```

Ralph 在开始执行时会按此声明加载 context，不会擅自加载未声明的文件。

## 示例：为 prompt-assembler 模块加载 context

以下是一个完整的 context 加载流程演示：

### Step 1: Phase 0（~4,500 tokens）

```
读取 00_META/agent-guide.md         → 获得路由规则、阻塞协议
读取 00_META/system-map.md          → 获得仓库分层地图
读取 02_DOMAIN/glossary.md          → 锁定 Beat/Phase/Scene 等术语
读取 05_CONTRACTS/module-dependency-map.md → 确认依赖方向
```

### Step 2: 读目标模块 frontmatter

```
只读 04_MODULES/prompt-assembler.md 前 22 行
→ priority: core ✓ 必须加载
→ depends_on: memory-placeholder, light-cone-collapse,
              phase-gradient, narrative-router, director-note-layer
→ contracts: 05_CONTRACTS/prompt-object-schema.yaml
→ reading_context: glossary.md (已在 Phase 0), runtime-loop.md
→ tokens_estimate: 1600
```

### Step 3: 加载 reading_context

```
读取 03_ORCHESTRATION/runtime-loop.md  (~2,500 tokens)
→ glossary.md 已在 Phase 0 加载，跳过
```

### Step 4: 加载 contracts

```
读取 05_CONTRACTS/prompt-object-schema.yaml  (~800 tokens)
→ 获得 PromptObject 的完整结构定义
```

### Step 5: 读模块正文

```
读取 04_MODULES/prompt-assembler.md 全文  (~1,600 tokens)
→ 获得四层装配结构、输入输出、不负责什么
```

### Step 6: 按需加载上游模块（仅 frontmatter 判断）

```
读取 04_MODULES/director-note-layer.md frontmatter
→ tokens_estimate: 1200, priority: core → 全文加载

读取 04_MODULES/memory-placeholder.md frontmatter
→ tokens_estimate: 800, priority: core → 全文加载

读取 04_MODULES/phase-gradient.md frontmatter
→ 不直接参与 prompt 装配逻辑 → 本次跳过正文，只记住接口

读取 04_MODULES/light-cone-collapse.md frontmatter
→ 不直接参与 prompt 装配逻辑 → 本次跳过正文，只记住接口
```

### 最终 Context 清单

```
Phase 0:           ~4,500 tokens
runtime-loop.md:   ~2,500 tokens
prompt-assembler:  ~1,600 tokens
prompt-object:     ~  800 tokens
director-note:     ~1,200 tokens
memory-placeholder:~  800 tokens
────────────────────────────────
合计:              ~11,400 tokens ← 远在 40,000 预算内
```

留出充足空间给已有代码阅读和新代码生成。

## 要点总结

1. **每次 session 从 Phase 0 开始** — 不跳过，不假设"上次读过"
2. **先读 frontmatter，再决定是否读全文** — 节省 token 预算
3. **只加载 PROMPT.md 声明的文件** — 不擅自扩大范围
4. **超限时先丢 implementation-guide 和 fixture** — 永远保留 glossary 和 dependency-map
5. **不碰阅读禁区** — Agent Client/、LOGOS Prototype/ 等目录与实现无关
