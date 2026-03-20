# Ralph Workflow — Ralph Loop 完整执行指南

## 什么是 Ralph

Ralph 是 Claude Code 在 LOGOS 项目中的执行角色。Ralph 的职责是：按照 `execution-plans/` 中的计划文件严格执行实现任务。Ralph 不做设计决策，不自行发明新架构，不跳过计划中的步骤。

**核心循环：人类选择方向 → Ralph 执行 → 人类验证结果。**

## 工作流总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ralph Loop 工作流                            │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │ 人类选择  │───→│ Ralph 读取    │───→│ Ralph 加载 Spec        │ │
│  │ 目标 Phase│    │ PROMPT.md    │    │ (Phase 0 + task spec)  │ │
│  └──────────┘    └──────────────┘    └───────────┬────────────┘ │
│                                                   │              │
│                                                   ▼              │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │ 人类审核  │◄───│ Ralph STOP   │◄───│ Ralph 执行 fix_plan    │ │
│  │ PR & 代码 │    │ 创建 PR      │    │ (TDD per task)         │ │
│  └────┬─────┘    └──────────────┘    └────────────────────────┘ │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐                                                    │
│  │ 合并或    │                                                    │
│  │ 要求修改  │                                                    │
│  └──────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 详细步骤

### Step 1: 人类选择目标 Phase

人类确认当前要执行的 phase 以及其前置依赖是否已满足：

```bash
# 查看可用 phase
ls execution-plans/
# 00_foundation/  01_memory-gradient/  02_collapse-router/  ...

# 确认前置 phase 已合并
git log --oneline -10
```

### Step 2: 启动 Ralph

```bash
cd C:\Users\Administrator\Documents\GitHub\LOGOS
claude
```

向 Claude Code 发出启动指令：

```
你是 Ralph。执行 execution-plans/04_prompt-assembler/。
读取 PROMPT.md 了解目标和约束，按 fix_plan.md 逐步执行。
```

### Step 3: Ralph 读取 PROMPT.md

Ralph 首先读取目标 phase 的 `PROMPT.md`，从中获取：

- **Objective**：本 phase 的目标
- **Success Criteria**：完成标准
- **spec_context_load**：需要加载的 spec 文件清单
- **Constraints**：实现约束
- **Branch**：目标分支名

### Step 4: Ralph 加载 Spec Context

按 [spec-context-loading.md](./spec-context-loading.md) 中的规则：

1. 加载 Phase 0 必读文件（~4,500 tokens）
2. 按 PROMPT.md 的 `spec_context_load.task_specific` 加载任务相关文件
3. 验证 token 预算未超限

### Step 5: Ralph 创建分支

```bash
git checkout -b feature/04-prompt-assembler
```

分支命名规范：`feature/XX-phase-name`

### Step 6: Ralph 执行 fix_plan.md

按 fix_plan.md 中的编号步骤**逐一执行**。每个步骤遵循 TDD 循环：

```
对于 fix_plan.md 中的每个 Task N:

1. 读取 Task N 的描述和验收标准
2. 确认对应的 spec 文档已加载
3. 写测试 (RED)
   - 基于 spec 中定义的输入/输出编写测试
   - 运行测试 → 应该 FAIL
4. 实现代码 (GREEN)
   - 按 spec 定义实现模块
   - 运行测试 → 应该 PASS
5. 重构 (REFACTOR)
   - 检查代码质量
   - 确保不可变数据模式
   - 确保无硬编码内容
6. Commit
   - git add 相关文件
   - git commit -m "feat: implement [module] [specific function]"
```

**关键规则**：

- 不跳过步骤
- 不合并步骤（除非 fix_plan 明确说明可以合并）
- 不执行 fix_plan 中未列出的额外工作
- 遇到阻塞时按 Blocker Protocol 处理（见下文）

### Step 7: Ralph 完成后创建 PR

```bash
git push -u origin feature/04-prompt-assembler
gh pr create --title "feat: implement prompt-assembler module" --body "..."
```

PR description 应包含：

- 本 phase 的目标
- 完成的具体 task 列表
- 测试覆盖情况
- 发现的阻塞及处理方式（如有）

### Step 8: Ralph STOP

**PR 创建后 Ralph 必须停止。** 不得：

- 自行合并 PR
- 开始执行下一个 phase
- 对代码做 PR 之外的额外修改

输出最终状态报告：

```
Phase 04_prompt-assembler 执行完成。

完成的 Tasks: 1-6
测试覆盖率: 87%
发现的阻塞: 无 / [描述]
PR: [URL]

等待人类 review。
```

### Step 9: 人类审核

人类 review PR 后可能的结果：

| 结果           | 后续动作                          |
| -------------- | --------------------------------- |
| 批准合并       | 合并 PR，清理分支                 |
| 要求修改       | 人类再次启动 Ralph，指定修改内容  |
| 发现 spec 问题 | 人类修改 LOGOS-SPEC，然后重新执行 |
| 拒绝           | 关闭 PR，分析原因，可能重写 plan  |

## 监控 Ralph

### 实时检查（/ralph-check）

在 Ralph 执行过程中，人类可以随时检查进度：

```
/ralph-check

当前状态:
- Phase: 04_prompt-assembler
- 当前 Task: 3/6
- 最新 commit: feat: implement layer assembly logic
- 测试状态: 12 pass, 0 fail
- Context 使用: ~15,000/40,000 tokens (spec)
```

### 关键观察点

1. **Ralph 是否按步骤顺序执行** — 如果跳步，说明 plan 可能有问题
2. **测试是否先写** — 如果先写实现后补测试，需要纠正
3. **是否引入了硬编码内容** — 任何中文故事文本出现在 `.ts` 中都是红灯
4. **是否出现非法依赖** — 模块直接 import provider 或绕过 Prompt Assembler

## 并行执行

### 可并行的 Phase 判断

参考 `LOGOS-SPEC/00_META/agent-guide.md` 中的实现顺序建议：

```
Round 1 (可并行):
  ├── Memory Placeholder      → 00_foundation / 01_memory-gradient
  └── Phase Gradient          → 01_memory-gradient

Round 2 (可并行):
  ├── Light Cone Collapse     → 02_collapse-router
  └── Narrative Router        → 02_collapse-router

Round 3 (可并行):
  ├── Director Note Layer     → 03_director-options
  └── Option Generator        → 03_director-options

Round 4 (串行):
  └── Prompt Assembler        → 04_prompt-assembler

Round 5 (串行):
  └── API Adapter Lite        → 05_api-adapter

Round 6 (串行):
  └── Auditor + Audit Resolver + Phase Consequence + Orchestrator
                              → 06_audit-loop

Round 7 (串行):
  └── 端到端验证              → 07_e2e-validation
```

### 使用 Git Worktree 并行

```bash
# 同一 Round 内的多个 phase 可用 worktree 并行
git worktree add ../LOGOS-wt-collapse -b feature/02-collapse-router
git worktree add ../LOGOS-wt-router   -b feature/02-narrative-router

# 在不同 terminal 中分别启动 Ralph
# Terminal 1:
cd ../LOGOS-wt-collapse && claude
# Terminal 2:
cd ../LOGOS-wt-router && claude
```

**并行规则**：

- 同一 Round 内的 phase **可以**并行
- 跨 Round 的 phase **不可以**并行（存在依赖）
- 每个 worktree 中的 Ralph 是独立 session，互不影响
- 合并时注意处理冲突

## Blocker Protocol（阻塞处理）

### Ralph 可以自主处理的阻塞

以下情况 Ralph 按 `agent-guide.md` 附录中的策略自行疏通：

| 阻塞类型                 | 处理方式                                     |
| ------------------------ | -------------------------------------------- |
| 必填字段缺少 producer    | 补 producer，不靠写死或猜测                  |
| 模块输出无下游入口       | 补最近的共享契约入口                         |
| 代码被迫做语义理解       | 改为「代码组包 → LLM 执行 → 代码校验」三段式 |
| 术语 / 字段名冲突        | 按裁决顺序统一为 canonical 版本              |
| 仅在 sample 中成立的假设 | 标记为 `sample-only`，不伪装成正式规范       |

### Ralph 必须停下等待人类的阻塞

以下情况 Ralph **必须 STOP** 并报告给人类：

| 阻塞类型                              | 原因                       |
| ------------------------------------- | -------------------------- |
| 修复会改变**作者可见的控制模型**      | 影响产品定义               |
| 修复会改变**核心领域对象边界**        | 影响 Beat/Phase/Scene 定义 |
| 修复会改变**公共 API 语义**           | 影响外部接口契约           |
| Spec 文档之间存在**不可调和的矛盾**   | 需要人类做设计决策         |
| 测试覆盖率无法达到 **80%** 且原因不明 | 可能是 plan 本身有问题     |

**报告格式**：

```
⚠ BLOCKER — 需要人类裁决

Phase: 04_prompt-assembler
Task: 3
阻塞描述: [具体描述]
已尝试的方案: [尝试过什么]
Spec 引用: [相关 spec 文件和章节]
建议选项:
  A. [方案 A 及其影响]
  B. [方案 B 及其影响]

等待人类指示。
```

## Session 管理

### 何时启动新 Session

| 信号                                                         | 行动                               |
| ------------------------------------------------------------ | ---------------------------------- |
| Context window 接近饱和（对话变长、回复变慢）                | 结束当前 session，新 session 继续  |
| 完成了一个完整的 fix_plan                                    | 正常 STOP，下个 phase 开新 session |
| Ralph 出现明显的"遗忘"症状（重复已做的工作、忘记之前的约束） | 立即结束，新 session 重新加载      |
| 人类需要 Ralph 切换到完全不同的任务                          | 结束当前 session                   |

### Session 交接

新 session 启动时：

1. 重新加载 Phase 0（必须，不可跳过）
2. 读取 git log 确认上次停在哪里
3. 读取 fix_plan.md 确认下一步是什么
4. 如果是同一 phase 的继续，读取已有代码确认当前状态
5. 从断点继续执行

## Phase 完成后的人类检查清单

PR 收到后，人类在合并前应检查：

### 代码质量

- [ ] 所有模块实现可追溯到 spec 文档
- [ ] 无硬编码叙事内容（中文故事文本不应出现在 `.ts` 中）
- [ ] 不可变数据模式（无 `.push()`、`.splice()`、`=` 赋值给已有对象）
- [ ] 模块依赖方向正确（无非法跨层调用）
- [ ] LLM vs 代码职责边界清晰

### 测试

- [ ] 测试覆盖率 >= 80%
- [ ] 测试先于实现编写（commit 历史可验证）
- [ ] 测试中无硬编码故事内容（从 fixture 加载）
- [ ] 边界条件有测试覆盖

### 架构

- [ ] 所有 LLM 调用经过 API Adapter
- [ ] 所有 prompt 构造经过 Prompt Assembler
- [ ] Auditor 只返回 boolean，Audit Resolver 做流程决策
- [ ] TypeScript 类型与 contract schema 一致

### Git

- [ ] 分支命名符合 `feature/XX-phase-name`
- [ ] Commit message 格式正确（`<type>: <description>`）
- [ ] 无意外文件（`.env.local`、`node_modules/` 等）被提交
- [ ] PR description 完整（目标、task 列表、测试覆盖、阻塞记录）
