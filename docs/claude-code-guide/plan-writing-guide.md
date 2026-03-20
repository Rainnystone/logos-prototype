# Plan Writing Guide — 如何编写 Execution Plan

## 概述

Execution Plan 是人类给 Ralph 的执行指令。每个 phase 对应 `execution-plans/` 下的一个目录，内含两个核心文件：

| 文件          | 职责                                    | 类比   |
| ------------- | --------------------------------------- | ------ |
| `PROMPT.md`   | **What + Why** — 目标、约束、上下文声明 | 任务书 |
| `fix_plan.md` | **How** — 具体步骤、验收标准、TDD 要求  | 施工图 |

```
execution-plans/
└── 04_prompt-assembler/
    ├── PROMPT.md       ← Ralph 首先读取
    └── fix_plan.md     ← Ralph 按步骤执行
```

## PROMPT.md 格式

### Frontmatter

```yaml
---
phase: 04_prompt-assembler
title: 实现 Prompt Assembler 模块
branch: feature/04-prompt-assembler
depends_on_phases:
  - 00_foundation
  - 01_memory-gradient
  - 03_director-options
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
blocker_protocol: LOGOS-SPEC/00_META/agent-guide.md#附录
---
```

**字段说明**：

| 字段                              | 必填 | 说明                          |
| --------------------------------- | ---- | ----------------------------- |
| `phase`                           | 是   | Phase 标识符，与目录名一致    |
| `title`                           | 是   | 中文标题                      |
| `branch`                          | 是   | 目标 Git 分支名               |
| `depends_on_phases`               | 是   | 前置依赖的 phase 列表         |
| `spec_context_load.phase_0`       | 是   | Phase 0 必读文件（固定 4 个） |
| `spec_context_load.task_specific` | 是   | 本 phase 需要的 spec 文件     |
| `estimated_tokens`                | 是   | spec context 的 token 粗估    |
| `blocker_protocol`                | 是   | 阻塞协议引用路径              |

### 正文结构

```markdown
# [Phase Title]

## Objective（目标）

一段话概述本 phase 要达成什么。

## Success Criteria（成功标准）

- [ ] 标准 1：可验证的、无歧义的
- [ ] 标准 2：包含具体的量化指标
- [ ] 标准 3：对应 spec 中的哪个规格点

## Context（上下文）

### Spec 引用

- 主 spec：`04_MODULES/prompt-assembler.md`
- 契约 schema：`05_CONTRACTS/prompt-object-schema.yaml`
- 依赖模块：...

### 已有代码

- 类型定义：`src/types/prompt-object.ts`（如果已存在）
- 上游模块：`src/engine/modules/director-note-layer.ts`

### 代码 -> Spec 文件映射

- `src/engine/modules/prompt-assembler.ts` → `04_MODULES/prompt-assembler.md`
- `src/types/prompt-object.ts` → `05_CONTRACTS/prompt-object-schema.yaml`

## Constraints（约束）

- 不可变数据模式
- 不硬编码任何叙事内容
- PromptObject 的四层结构不可改变
- Layer 4（导演批注）必须在最后（Recency Priority）
- generationControl 仅在 retry 时附加，不是第五层
```

## fix_plan.md 格式

### 总体结构

```markdown
# Fix Plan: [Phase Title]

## Pre-flight（预检）

在开始任何实现之前执行的检查。

## Tasks

### Task 1: [标题]

...

### Task 2: [标题]

...

## Post-flight（收尾）

所有 task 完成后的验证步骤。
```

### Pre-flight（预检）

````markdown
## Pre-flight

1. 确认前置 phase 已合并到目标分支：
   ```bash
   git log --oneline | grep "feature/01\|feature/03"
   ```
````

2. 确认依赖的类型文件已存在：

   ```bash
   ls src/types/prompt-object.ts
   ls src/types/state-snapshot.ts
   ```

3. 确认依赖的上游模块可 import：

   ```bash
   # 编译检查
   npx tsc --noEmit src/engine/modules/director-note-layer.ts
   ```

4. 创建分支：
   ```bash
   git checkout -b feature/04-prompt-assembler
   ```

````

### Task 格式

```markdown
### Task 3: 实现四层装配逻辑

**Spec 引用**: `04_MODULES/prompt-assembler.md` > "当前四层结构"

**目标文件**: `src/engine/modules/prompt-assembler.ts`

**验收标准**:
- 函数接收 AssemblyInput，返回 PromptObject
- Layer 1-4 按固定顺序装配
- Layer 4 (Director Note) 始终在最后
- 输入为 readonly，不发生 mutation
- 无硬编码文本内容

**TDD 步骤**:

1. 写测试 `tests/engine/modules/prompt-assembler.test.ts`:
   ```typescript
   describe('assemblePrompt', () => {
     it('should assemble layers in correct order: world → memory → boundary → director', () => {
       // 用 fixture 构造 input
       // 调用 assemblePrompt
       // 验证输出 PromptObject 的层级顺序
     });

     it('should place director note as the last layer (recency priority)', () => {
       // ...
     });

     it('should not mutate input objects', () => {
       // 深拷贝 input，调用函数，比较原 input 未变
     });
   });
````

2. 运行测试，确认 FAIL（RED）:

   ```bash
   pnpm test tests/engine/modules/prompt-assembler.test.ts
   ```

3. 实现 `src/engine/modules/prompt-assembler.ts`

4. 运行测试，确认 PASS（GREEN）:

   ```bash
   pnpm test tests/engine/modules/prompt-assembler.test.ts
   ```

5. Commit:
   ```bash
   git add src/engine/modules/prompt-assembler.ts tests/engine/modules/prompt-assembler.test.ts
   git commit -m "feat: implement four-layer prompt assembly logic"
   ```

````

### Post-flight（收尾）

```markdown
## Post-flight

1. 运行全量测试，确认无回归：
   ```bash
   pnpm test
````

2. 检查测试覆盖率：

   ```bash
   pnpm test:coverage
   # 确认 prompt-assembler 相关文件覆盖率 >= 80%
   ```

3. 检查类型安全：

   ```bash
   npx tsc --noEmit
   ```

4. 检查无硬编码叙事内容：

   ```bash
   # 搜索 src/ 中的中文文本（story 内容）
   grep -r "[\u4e00-\u9fff]" src/engine/ --include="*.ts" | grep -v "// " | grep -v "import"
   # 如果有结果，检查是否是注释或合法的错误信息
   ```

5. 推送并创建 PR：

   ```bash
   git push -u origin feature/04-prompt-assembler
   gh pr create --title "feat: implement prompt-assembler module" \
     --body "## Summary
   - 实现 Prompt Assembler 四层装配逻辑
   - 实现 generationControl retry 附加逻辑
   - 测试覆盖率 XX%

   ## Spec Reference
   - 04_MODULES/prompt-assembler.md
   - 05_CONTRACTS/prompt-object-schema.yaml

   ## Test Plan
   - [ ] 四层顺序正确
   - [ ] Director Note 在最后
   - [ ] retry 时附加 generationControl
   - [ ] 不可变数据
   - [ ] 无硬编码内容"
   ```

6. **STOP** — 等待人类 review。

````

## 编写计划时的完整检查清单

### Context 与依赖

- [ ] **Context token 预算 <= 40,000**：spec_context_load.estimated_tokens 不超限
- [ ] **Pre-flight 依赖验证**：明确前置 phase 的 merge 状态和文件存在性检查
- [ ] **Spec-to-code 文件映射**：PROMPT.md 中明确每个代码文件对应的 spec 文档
- [ ] **Contract schema 作为 type 来源**：TypeScript 类型必须从 `05_CONTRACTS/*.yaml` 推导，不自行发明

### 架构约束

- [ ] **单一外发口（Prompt Assembler）**：所有 prompt 构造必须经过 Prompt Assembler
- [ ] **单一 LLM 门户（API Adapter）**：所有 LLM 调用必须经过 API Adapter
- [ ] **LLM vs 代码职责边界**：语义理解归 LLM，编排校验归代码
- [ ] **不可变数据模式**：所有函数返回新对象，不 mutate 输入

### 内容约束

- [ ] **题材/故事无关**：代码不含硬编码的叙事内容
- [ ] **Blocker Protocol 引用**：PROMPT.md 中声明 blocker_protocol 路径
- [ ] **STOP 条件明确**：fix_plan 末尾有明确的 STOP 指令

### TDD 与质量

- [ ] **测试先行**：每个 Task 的 TDD 步骤是「写测试 → RED → 实现 → GREEN」
- [ ] **覆盖率目标 80%+**：Post-flight 中有覆盖率检查
- [ ] **验收标准可验证**：每个 Task 的验收标准是具体的、可用测试验证的

### 人类协作

- [ ] **人类 review 检查点**：计划末尾有 STOP + 等待 review 指令
- [ ] **Git 分支命名**：`feature/XX-phase-name` 格式
- [ ] **Commit 格式**：`<type>: <description>`
- [ ] **PR description template**：包含 Summary、Spec Reference、Test Plan

## Task 粒度规则

### 合适的粒度

一个 Task 应该：
- 可以在**一次 TDD 循环**中完成（RED → GREEN → REFACTOR）
- 产出**一个可独立测试的函数或模块**
- 对应**一个有意义的 commit**
- 大约 **30-100 行代码**（不含测试）

### 太粗的信号

- Task 描述超过 200 字
- 涉及 3 个以上文件的修改
- 需要多次 commit 才能完成
- 验收标准超过 5 条

**解决方案**：拆分为子 task。

### 太细的信号

- Task 只是"创建空文件"或"添加 import"
- 不需要测试就能验证
- commit message 会显得无意义

**解决方案**：合并到相邻 task。

## 禁止模式

以下模式在 plan 中**严格禁止**：

### 1. 硬编码叙事内容

```markdown
# 错误
Task 5: 在 prompt 中添加 "你是一个侦探游戏的叙事引擎..."

# 正确
Task 5: 从 story-package 加载 worldBase，传入 Prompt Assembler
````

### 2. 跨 Phase 假设

```markdown
# 错误

Task 3: 假设 API Adapter 已经实现了 collapse 模式，直接调用

# 正确

Task 3: 为 API Adapter 接口编写 mock，后续 Phase 05 实现真实版本
```

### 3. 模糊的验收标准

```markdown
# 错误

验收标准: 代码能正常工作

# 正确

验收标准:

- assemblePrompt() 返回包含 4 层的 PromptObject
- layers[3].type === 'director-note'
- Object.freeze(input) 后调用不抛错（验证不可变）
```

### 4. 无 Spec 引用的实现

```markdown
# 错误

Task 2: 实现一个 helper 函数来处理文本格式化
（没有说明这个函数对应 spec 中的哪个概念）

# 正确

Task 2: 实现 buildDirectorNoteSection()
Spec 引用: 04_MODULES/director-note-layer.md > "核心职责"
```

### 5. 跳过 TDD

```markdown
# 错误

Task 4:

1. 实现功能
2. 补写测试

# 正确

Task 4:

1. 写测试 (RED)
2. 运行测试确认 FAIL
3. 实现功能 (GREEN)
4. 运行测试确认 PASS
```

## Spec 冲突裁决顺序

当 plan 中引用的多个 spec 文件对同一概念说法不同时，按以下优先级裁决：

1. `00_META/agent-guide.md` 中的核心不变量
2. `02_DOMAIN/glossary.md` 中的 canonical term
3. `09_ADR/` 中的设计决议
4. `05_CONTRACTS/` 中的 schema
5. `03_ORCHESTRATION/` 中的生命周期顺序
6. `04_MODULES/` 中的模块职责描述
7. `implementation-guide`、`fixtures`、示例文本

在 plan 中明确标注使用的优先级来源，避免 Ralph 执行时自行猜测。

## 完整示例：Phase 04 Prompt Assembler

以下是一个完整 phase plan 的骨架示例：

### PROMPT.md

```yaml
---
phase: 04_prompt-assembler
title: 实现 Prompt Assembler 模块
branch: feature/04-prompt-assembler
depends_on_phases:
  - 00_foundation
  - 01_memory-gradient
  - 03_director-options
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
blocker_protocol: LOGOS-SPEC/00_META/agent-guide.md#附录
---

# Phase 04: Prompt Assembler

## Objective

实现 Prompt Assembler 模块，使其能将上游控制模块的输出按固定四层结构
（世界基础 → 记忆上下文 → 叙事边界 → 导演批注）装配为 PromptObject，
并在 retry 路径上正确附加 generationControl。

## Success Criteria

- [ ] assemblePrompt() 返回符合 prompt-object-schema 的 PromptObject
- [ ] 四层按固定顺序装配，Layer 4 始终在最后
- [ ] retry 时 generationControl 正确附加到输出
- [ ] 不 mutate 任何输入对象
- [ ] 无硬编码叙事内容
- [ ] 测试覆盖率 >= 80%

## Constraints

- Prompt Assembler 是唯一对外出口，不可被绕过
- generationControl 不是第五层语义，是临时控制覆盖层
- 输入字段来源见 prompt-assembler.md "输入" 一节
```

### fix_plan.md

```markdown
# Fix Plan: Prompt Assembler

## Pre-flight

1. 确认 feature/01-memory-gradient 和 feature/03-director-options
   已合并到当前分支
2. 确认 src/types/prompt-object.ts 存在
3. 确认上游模块 mock 可用
4. 创建分支: git checkout -b feature/04-prompt-assembler

## Tasks

### Task 1: 定义 AssemblyInput 接口

Spec: prompt-assembler.md > "输入"
文件: src/types/assembly-input.ts
测试: types 编译通过即可

### Task 2: 实现四层装配逻辑

Spec: prompt-assembler.md > "当前四层结构"
文件: src/engine/modules/prompt-assembler.ts
测试: tests/engine/modules/prompt-assembler.test.ts
TDD: 写测试 → RED → 实现 → GREEN

### Task 3: 实现 generationControl 附加逻辑

Spec: prompt-assembler.md > "generationControl"
文件: src/engine/modules/prompt-assembler.ts
测试: tests/engine/modules/prompt-assembler.test.ts
TDD: 写测试 → RED → 实现 → GREEN

### Task 4: 实现输入校验

Spec: prompt-object-schema.yaml (required fields)
文件: src/engine/modules/prompt-assembler.ts
测试: 边界条件测试（缺失字段、空值）

### Task 5: 集成测试 — 与上游模块 mock 对接

Spec: module-dependency-map.md (依赖方向验证)
文件: tests/engine/modules/prompt-assembler.integration.test.ts

## Post-flight

1. pnpm test — 全量测试通过
2. pnpm test:coverage — 覆盖率 >= 80%
3. npx tsc --noEmit — 类型检查通过
4. 推送 + 创建 PR
5. STOP — 等待人类 review
```

## PR Description 模板

```markdown
## Summary

- [一句话概述本 phase 完成的核心工作]
- [具体实现了哪些能力]
- [测试覆盖情况]

## Spec Reference

- 主 spec: `04_MODULES/[module].md`
- 契约: `05_CONTRACTS/[schema].yaml`
- 依赖: `05_CONTRACTS/module-dependency-map.md`

## Changes

- `src/engine/modules/[module].ts` — [描述]
- `src/types/[type].ts` — [描述]
- `tests/...` — [描述]

## Test Plan

- [ ] [验证点 1]
- [ ] [验证点 2]
- [ ] [验证点 3]
- [ ] 覆盖率 >= 80%
- [ ] 无硬编码叙事内容
- [ ] 不可变数据模式

## Blockers Encountered

- [无 / 描述遇到的阻塞及处理方式]
```
