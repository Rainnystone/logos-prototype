# LOGOS Claude Code 操作手册

本目录是 LOGOS 项目 AI 驱动开发的操作手册。团队由 1-2 名人类 + Claude Code / Ralph agent 组成，人类负责方向与审核，agent 负责执行。

## 阅读顺序

| 顺序 | 文件 | 内容 |
|------|------|------|
| 1 | **README.md**（本文件） | 入口、核心原则、全局约束 |
| 2 | [getting-started.md](./getting-started.md) | 环境搭建、仓库关系、首次启动 |
| 3 | [spec-context-loading.md](./spec-context-loading.md) | 如何高效加载 LOGOS-SPEC 上下文 |
| 4 | [ralph-workflow.md](./ralph-workflow.md) | Ralph Loop 完整执行流程 |
| 5 | [plan-writing-guide.md](./plan-writing-guide.md) | 如何编写 execution plan |
| 6 | [troubleshooting.md](./troubleshooting.md) | 常见问题与排查指南 |

## 核心原则

### 1. LOGOS-SPEC 是唯一设计权威

所有实现必须可追溯到 `../LOGOS-Design/LOGOS-SPEC/` 中的规格文档。当代码与 spec 冲突时，**spec 胜出**，除非有 ADR 明确覆盖。agent 不得从实现仓库反向修改 LOGOS-SPEC 文件。

### 2. 禁止硬编码叙事内容

角色名、故事文本、地点描述、Phase 计划等内容全部来自 `story-packages/`。代码层必须保持 **题材无关**（genre-agnostic）和 **故事无关**（story-agnostic）。如果你在 `.ts` 文件中发现自己在写中文故事文本，**立即停止**。

### 3. 不可变数据模式

永远不要 mutate 已有对象，而是创建新副本：

```typescript
// 正确
const newState = { ...oldState, field: newValue };
const newArray = [...oldArray, newItem];

// 错误 — 禁止原地修改
oldState.field = newValue;
oldArray.push(newItem);
```

### 4. TDD 强制执行

所有实现遵循 RED -> GREEN -> REFACTOR 循环。先写测试、跑失败、再实现、跑通过。覆盖率底线 80%。测试中的 story 内容必须从 test fixture 加载，不可硬编码。

### 5. Ralph 执行、人类审核

Ralph agent 按照 `execution-plans/` 中的 PROMPT.md + fix_plan.md 严格执行。执行结束后必须 **STOP**，等待人类 review PR。agent 不得自主合并，不得跳过 plan 中未提及的步骤。

### 6. 模块依赖纪律

- 所有 LLM 调用必须经过 **API Adapter** — 模块不可直接 import provider
- 所有 prompt 构造必须经过 **Prompt Assembler** — 唯一外发口
- **Auditor** 只返回 boolean，**Audit Resolver** 做流程决策
- 详见 `LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md`

### 7. LLM 与代码的职责边界

| 职责 | 归属 |
|------|------|
| 语义生成、摘要、推理、改写 | LLM |
| 编排、状态管理、校验、重试控制 | 代码 |

如果代码不得不"理解文本语义"才能继续，说明缺少一个 LLM 步骤，不要用 heuristic 代替。

## 仓库总地图

```
LOGOS/                          ← 实现仓库
├── CLAUDE.md                   ← Claude Code 项目指令（自动加载）
├── execution-plans/            ← 按 phase 组织的执行计划
│   ├── 00_foundation/
│   ├── 01_memory-gradient/
│   ├── 02_collapse-router/
│   ├── 03_director-options/
│   ├── 04_prompt-assembler/
│   ├── 05_api-adapter/
│   ├── 06_audit-loop/
│   ├── 07_e2e-validation/
│   └── 08_workbench-ui/
├── src/
│   ├── app/                    ← Next.js 页面
│   ├── engine/                 ← 核心引擎
│   │   ├── orchestrator.ts
│   │   ├── modules/            ← 各功能模块
│   │   └── api-adapter/        ← LLM API 适配层
│   ├── lib/                    ← 工具函数
│   ├── loader/                 ← Story package 加载器
│   └── types/                  ← TypeScript 类型（对应 contract schema）
├── story-packages/             ← 叙事内容包（题材无关加载）
├── tests/                      ← 测试文件
└── docs/
    └── claude-code-guide/      ← 本操作手册

LOGOS-Design/                   ← 设计仓库（只读参考）
└── LOGOS-SPEC/                 ← 规格权威源（70+ 文件，10 层架构）
    ├── 00_META/                ← 导航层（agent-guide, system-map）
    ├── 01_PRODUCT/             ← 产品层
    ├── 02_DOMAIN/              ← 领域层（glossary, entities, state-model）
    ├── 03_ORCHESTRATION/       ← 编排层（runtime-loop, lifecycle）
    ├── 04_MODULES/             ← 模块层（12 个模块规格）
    ├── 05_CONTRACTS/           ← 契约层（schema, dependency-map）
    ├── 06_FIXTURES/            ← 样例层（sample-scene）
    ├── 07_AUTHORING/           ← 作者层
    ├── 08_UX/                  ← UX 层
    └── 09_ADR/                 ← 决策记录层
```

## 模块 -> Spec 映射表

| 代码文件 | Spec 文档 |
|-----------|-----------|
| `src/engine/orchestrator.ts` | `04_MODULES/orchestrator-control-hub.md` |
| `src/engine/modules/memory-placeholder.ts` | `04_MODULES/memory-placeholder.md` |
| `src/engine/modules/phase-gradient.ts` | `04_MODULES/phase-gradient.md` |
| `src/engine/modules/light-cone-collapse.ts` | `04_MODULES/light-cone-collapse.md` |
| `src/engine/modules/narrative-router.ts` | `04_MODULES/narrative-router.md` |
| `src/engine/modules/director-note-layer.ts` | `04_MODULES/director-note-layer.md` |
| `src/engine/modules/option-generator.ts` | `04_MODULES/option-generator.md` |
| `src/engine/modules/prompt-assembler.ts` | `04_MODULES/prompt-assembler.md` |
| `src/engine/modules/auditor.ts` | `04_MODULES/auditor.md` |
| `src/engine/modules/audit-resolver.ts` | `04_MODULES/audit-resolver.md` |
| `src/engine/modules/phase-consequence-settlement.ts` | `04_MODULES/phase-consequence-settlement.md` |
| `src/engine/api-adapter/` | `04_MODULES/api-adapter-lite/` |
| `src/types/*.ts` | `05_CONTRACTS/*.yaml` |

## Git 规范

- 分支命名：`feature/XX-phase-name`（如 `feature/00-foundation`）
- Commit 格式：`<type>: <description>`
- Type 可选：`feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- 合并到 `develop` 需要 PR + 人类 review
