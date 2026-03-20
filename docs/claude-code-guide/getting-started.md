# Getting Started — LOGOS 开发环境搭建

## 前置要求

| 工具            | 版本   | 用途                    |
| --------------- | ------ | ----------------------- |
| Node.js         | 20+    | Next.js runtime         |
| pnpm            | 9+     | 包管理（monorepo 友好） |
| Git             | 2.40+  | 版本控制、worktree 支持 |
| Claude Code CLI | latest | AI agent 执行环境       |

验证安装：

```bash
node --version   # >= 20.x
pnpm --version   # >= 9.x
git --version    # >= 2.40
claude --version # 应正常输出版本号
```

## 仓库关系

```
C:\Users\Administrator\Documents\GitHub\
└── LOGOS/               ← 实现仓库（你写代码的地方）
    ├── CLAUDE.md        ← Claude Code 启动时自动读取
    ├── src/             ← Next.js + TypeScript 实现
    ├── execution-plans/ ← 各 phase 执行计划
    ├── story-packages/  ← 叙事内容包
    ├── tests/           ← 测试
    └── vendor/
        └── LOGOS-SPEC/  ← vendored 规格权威源（只读镜像）
            ├── 00_META/     ← agent-guide, system-map
            ├── 02_DOMAIN/   ← glossary, entities
            ├── 04_MODULES/  ← 模块规格
            ├── 05_CONTRACTS/← schema, dependency-map
            └── ...          ← 共 10 层，70+ 文件
```

**关键关系**：

- `LOGOS/` 中的每个模块实现都对应 `vendor/LOGOS-SPEC/04_MODULES/` 中的一份规格文档
- `LOGOS/src/types/` 中的 TypeScript 类型定义对应 `vendor/LOGOS-SPEC/05_CONTRACTS/*.yaml` 中的 schema
- `LOGOS/CLAUDE.md` 中维护了完整的 代码文件 -> Spec 文档 映射表
- vendored `LOGOS-SPEC` 对 LOGOS 是**只读**关系 — 永远不从实现仓库修改 spec 文件

## 环境搭建

### 1. Clone 实现仓库

```bash
cd C:\Users\Administrator\Documents\GitHub

git clone <LOGOS-repo-url> LOGOS
```

### 2. 安装依赖

```bash
cd C:\Users\Administrator\Documents\GitHub\LOGOS
pnpm install
```

### 3. 配置环境变量

在 `LOGOS/` 根目录创建 `.env.local`：

```env
# LLM API Keys — 根据使用的 provider 配置
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# LOGOS-SPEC 路径（可选，默认使用 vendored spec）
LOGOS_SPEC_PATH=.\vendor\LOGOS-SPEC

# 开发模式
NODE_ENV=development
```

> **安全提醒**：`.env.local` 已在 `.gitignore` 中，不会被提交。永远不要在代码中硬编码 API key。

### 4. 验证 Spec 路径

```bash
# 从 LOGOS 仓库根目录验证 spec 路径可达
ls vendor/LOGOS-SPEC/00_META/agent-guide.md
```

如果路径不通，检查 vendored spec 是否已随仓库正确拉取。

## 首次运行

### 启动开发服务器

```bash
cd C:\Users\Administrator\Documents\GitHub\LOGOS
pnpm dev
```

默认在 `http://localhost:3000` 启动 Next.js 开发服务器。

### 运行测试

```bash
pnpm test           # 运行全部测试
pnpm test:watch     # watch 模式
pnpm test:coverage  # 查看覆盖率报告
```

## Claude Code 启动

### 基本启动

```bash
cd C:\Users\Administrator\Documents\GitHub\LOGOS
claude
```

Claude Code 启动后会**自动读取** `CLAUDE.md`，其中包含：

- 项目概述与架构说明
- 6 条强制规则（spec 权威、禁止硬编码、不可变数据等）
- 完整的 代码 -> Spec 映射表
- Blocker Protocol
- Git 规范

你不需要手动告诉 Claude 去读 `CLAUDE.md` — 它是 Claude Code 的内置行为。

### Session 开始后的 Spec 加载

每次 Claude Code session 开始后，agent 应按以下顺序加载 Phase 0 必读文件：

```
1. LOGOS-SPEC/00_META/agent-guide.md     (~1,500 tokens)
2. LOGOS-SPEC/00_META/system-map.md      (~1,000 tokens)
3. LOGOS-SPEC/02_DOMAIN/glossary.md      (~1,100 tokens)
4. LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md (~900 tokens)
                                          合计 ~4,500 tokens
```

详见 [spec-context-loading.md](./spec-context-loading.md)。

## Ralph 启动

Ralph 是 Claude Code 在 LOGOS 项目中的执行角色名。启动 Ralph 执行某个 phase：

### 1. 确认目标 phase

```bash
ls execution-plans/
# 输出：00_foundation/ 01_memory-gradient/ 02_collapse-router/ ...
```

### 2. 启动 Claude Code 并指定 phase

```bash
cd C:\Users\Administrator\Documents\GitHub\LOGOS
claude
```

在 Claude Code 中发出指令：

```
执行 execution-plans/04_prompt-assembler/ 的 PROMPT.md。
按照 fix_plan.md 中的步骤严格执行。
```

Ralph 会：

1. 读取 PROMPT.md 中的 frontmatter 确认 spec 加载清单
2. 按 Phase 0 + task-specific 顺序加载 spec context
3. 按 fix_plan.md 中的编号步骤逐一执行
4. 每步执行 TDD：写测试 -> RED -> 实现 -> GREEN
5. 完成后创建 commit + PR
6. **STOP** — 等待人类 review

详见 [ralph-workflow.md](./ralph-workflow.md)。

## 并行 Worktree 配置

当多个 phase 可以并行开发时（参见 `LOGOS-SPEC/00_META/agent-guide.md` 中的实现顺序建议），使用 Git worktree 实现并行执行：

### 创建 worktree

```bash
cd C:\Users\Administrator\Documents\GitHub\LOGOS

# 为 Phase 01 创建 worktree
git worktree add ../LOGOS-wt-01 -b feature/01-memory-gradient

# 为 Phase 02 创建 worktree（如果与 01 无依赖）
git worktree add ../LOGOS-wt-02 -b feature/02-collapse-router
```

### 在不同 worktree 中启动独立 Claude Code session

```bash
# Terminal 1
cd C:\Users\Administrator\Documents\GitHub\LOGOS-wt-01
claude
# → 执行 Phase 01

# Terminal 2
cd C:\Users\Administrator\Documents\GitHub\LOGOS-wt-02
claude
# → 执行 Phase 02
```

### 可并行的 Phase 组（基于 module-dependency-map）

| Round | 可并行 Phase                                                | 原因                  |
| ----- | ----------------------------------------------------------- | --------------------- |
| 1     | `00_foundation`, `01_memory-gradient`, `02_collapse-router` | 无上游模块依赖        |
| 2     | `03_director-options`, `04_prompt-assembler`                | 依赖 Round 1 输出     |
| 3     | `05_api-adapter`                                            | 依赖 Prompt Assembler |
| 4     | `06_audit-loop`                                             | 依赖 API Adapter      |
| 5     | `07_e2e-validation`                                         | 依赖所有模块          |
| 6     | `08_workbench-ui`                                           | 依赖引擎闭环          |

> **注意**：Round 内部的多个 phase 可以并行；不同 Round 之间必须等上一 Round 完成并合并。

### 清理 worktree

```bash
# 完成后删除 worktree
git worktree remove ../LOGOS-wt-01
git worktree remove ../LOGOS-wt-02

# 查看当前所有 worktree
git worktree list
```

## 常见首次问题

| 问题                         | 解决方案                                          |
| ---------------------------- | ------------------------------------------------- |
| `pnpm install` 失败          | 确认 Node.js >= 20，尝试 `pnpm install --force`   |
| LOGOS-SPEC 路径不通          | 确保 LOGOS 和 LOGOS-Design 在同一父目录           |
| Claude Code 未读取 CLAUDE.md | 确认在 LOGOS 根目录启动 `claude`                  |
| `.env.local` 中的 key 无效   | 检查 API key 是否过期，provider 配额是否充足      |
| 测试跑不起来                 | 先运行 `pnpm install`，确认 test framework 已安装 |

## 下一步

- 了解如何加载 spec context：[spec-context-loading.md](./spec-context-loading.md)
- 了解 Ralph 完整工作流：[ralph-workflow.md](./ralph-workflow.md)
- 了解如何编写新 phase plan：[plan-writing-guide.md](./plan-writing-guide.md)
