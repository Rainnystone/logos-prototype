# Troubleshooting — 常见问题与排查指南

## 1. Context Overflow（上下文溢出）

### 症状

- Claude Code 回复变慢，内容变短
- Ralph 开始"遗忘"之前读过的 spec 约束
- 同一个问题被重复解释或重复实现
- Ralph 停止遵守之前确认过的 TDD 步骤

### 原因

Spec 文件 + 已有代码 + 对话历史 + 生成内容的总量超过了 context window 的有效利用范围。即使未达到硬限制，模型在 context 后段的注意力会下降。

### 解决方案

**即时缓解**：

1. 结束当前 session，启动新 session
2. 新 session 中只加载 Phase 0 + 当前 task 需要的 spec（最小集合）
3. 读取 git log 确认断点，从 fix_plan 中的下一步继续

**预防措施**：

1. 严格遵守 40,000 token spec 预算（见 [spec-context-loading.md](./spec-context-loading.md)）
2. 每个 Task 完成后 commit，确保进度不丢失
3. 当 session 中的 Task 数量超过 5 个时，主动评估是否需要新 session
4. 不要在同一个 session 中处理多个不相关的 phase

**检测方法**：

如果你怀疑 context overflow，让 Ralph 回答以下问题作为"心智测试"：

```
请简述 LOGOS 的以下约束：
1. Prompt Assembler 的四层结构顺序是什么？
2. 哪些模块不可以直接调用 LLM provider？
3. 重写循环的上限是多少次？
```

如果回答不准确，说明有效 context 已不足，应启动新 session。

## 2. Type Mismatch（类型不匹配）

### 症状

- `npx tsc --noEmit` 报错
- 运行时出现 `undefined` 字段或意外的数据形状
- 测试中 mock 数据与实际接口不符

### 原因

TypeScript 类型定义（`src/types/`）与 LOGOS-SPEC 中的 contract schema（`05_CONTRACTS/*.yaml`）发生了偏移。常见场景：

- Spec 中更新了字段名，代码未同步
- 实现时自行添加了 spec 中不存在的字段
- 不同模块对同一个接口的理解不一致

### 排查步骤

1. **找到冲突源**：确认哪个 schema 文件定义了该类型

   ```
   代码类型文件 → 对应的 contract schema
   参考 CLAUDE.md 中的映射表：
     src/types/*.ts → 05_CONTRACTS/*.yaml
   ```

2. **比对字段**：逐字段比对 TypeScript 接口和 YAML schema

   ```bash
   # 查看 schema 定义
   cat vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml

   # 查看当前 TypeScript 定义
   cat src/types/prompt-object.ts
   ```

3. **以 schema 为准**：如果不一致，**contract schema 胜出**，修改 TypeScript 代码

4. **检查影响范围**：修改类型后，检查所有使用该类型的模块

   ```bash
   # 查找所有引用
   grep -r "PromptObject" src/ --include="*.ts"
   ```

### 预防措施

- 实现新模块前，先从 contract schema 生成/对齐 TypeScript 类型
- 不要在代码中自创 schema 里没有的字段
- 每次 Phase 完成的 Post-flight 中包含 `npx tsc --noEmit` 检查

## 3. Spec Conflict（规格冲突）

### 症状

- 两份 spec 文档对同一个概念给出不同说法
- 模块 prose 中的描述与 contract schema 不一致
- ADR 中的决议与模块文档冲突

### 裁决顺序

按 `agent-guide.md` 附录中的冲突裁决顺序处理：

```
优先级从高到低：
1. 00_META/agent-guide.md 中的核心不变量
2. 02_DOMAIN/glossary.md 中的 canonical term
3. 09_ADR/ 中已通过的设计决议
4. 05_CONTRACTS/ 中的 schema
5. 03_ORCHESTRATION/ 中的生命周期顺序
6. 04_MODULES/ 中的模块职责描述
7. implementation-guide、fixtures、示例文本
```

### 具体规则

| 冲突类型           | 以谁为准                   | 需要修改谁             |
| ------------------ | -------------------------- | ---------------------- |
| 术语名称不同       | `glossary.md`              | 改低优先级文档中的术语 |
| 字段名/结构不同    | `05_CONTRACTS/` schema     | 改模块 prose           |
| 生命周期顺序不同   | `03_ORCHESTRATION/`        | 改模块描述             |
| ADR 与 schema 冲突 | 判断 schema 是否未同步 ADR | 同步其中一方           |

### 处理方式

- Ralph 可以自行按裁决顺序解决**低优先级**方向的不一致
- 如果冲突涉及**核心领域对象边界**或**作者可见控制模型**，Ralph 必须 STOP 等待人类

## 4. Ralph Drift（偏离计划执行）

### 症状

- Ralph 开始实现 fix_plan 中没有的功能
- Ralph 跳过了某些步骤
- Ralph 改变了 spec 中定义的模块职责
- Ralph 对代码做了"优化"但偏离了 spec 定义

### 原因

- Context 过长导致对 plan 细节的"遗忘"
- 模型的"过度助力"倾向 — 想做得更多更好
- Plan 本身描述不够精确，留下了解读空间

### 解决方案

**即时纠正**：

```
STOP。
你偏离了 fix_plan。当前 Task 是 Task 3，要求是 [具体要求]。
你正在做的 [描述偏离行为] 不在 plan 中。
请回到 Task 3，严格按照验收标准执行。
```

**预防措施**：

1. fix_plan 中的每个 Task 写明**验收标准**（可验证的条件列表）
2. 每个 Task 结束后让 Ralph 对照验收标准自查
3. 在 plan 中明确写出 **"不要做什么"**：

   ```markdown
   ## 不在本 phase 范围内

   - 不要实现真实的 API 调用（Phase 05 的事）
   - 不要修改 story-packages/ 中的内容
   - 不要添加 spec 中未定义的字段
   ```

## 5. Story Package 加载失败

### 症状

- `story-packages/` 中的文件无法被 loader 正确解析
- 测试中的 fixture 加载返回 undefined
- 运行时 worldBase、phaseGoal 等字段为空

### 排查步骤

1. **确认文件存在**：

   ```bash
   ls story-packages/
   ls tests/fixtures/
   ```

2. **检查文件格式**：story package 文件应使用 spec 定义的格式（YAML / JSON）

3. **检查 loader 实现**：`src/loader/` 中的加载逻辑是否与文件格式匹配

4. **对比 fixture 格式**：参考 `LOGOS-SPEC/06_FIXTURES/sample-scene/` 中的结构

   ```bash
   # 查看 spec 中定义的格式
   cat vendor/LOGOS-SPEC/06_FIXTURES/sample-scene/phase-plan.yaml
   ```

5. **检查路径配置**：确认 `LOGOS_SPEC_PATH` 指向 `vendor/LOGOS-SPEC`（如果你的本地工具读取它）

### 常见错误

| 错误          | 原因                               | 修复                        |
| ------------- | ---------------------------------- | --------------------------- |
| YAML 解析失败 | 文件中有非法缩进                   | 检查 YAML 语法              |
| 字段缺失      | story package 结构与 schema 不匹配 | 对比 `05_CONTRACTS/` schema |
| 编码问题      | 中文内容的 UTF-8 BOM 头            | 确保文件为 UTF-8 无 BOM     |

## 6. 后期 Phase 的 Build 错误

### 症状

- 后期 phase（如 06_audit-loop、07_e2e-validation）编译失败
- 错误指向更早 phase 实现的模块
- 接口签名与预期不符

### 原因

- 早期 phase 的 mock 接口与后期 phase 的真实实现不一致
- 多个并行 phase 合并时产生冲突
- 类型定义在合并过程中被覆盖

### 排查步骤

1. **定位错误源**：

   ```bash
   npx tsc --noEmit 2>&1 | head -30
   ```

2. **确认类型定义**：错误涉及的类型是否与 contract schema 一致

3. **检查合并历史**：

   ```bash
   git log --oneline --graph -20
   # 查看最近的合并是否引入了冲突
   ```

4. **比对接口签名**：对比真实实现和 mock 的接口

5. **按 spec 修复**：以 `05_CONTRACTS/` 中的 schema 为 single source of truth

### 预防措施

- 并行 phase 合并时**先合并到 develop 分支**，再在 develop 上验证编译
- 每个 phase 的 Pre-flight 包含 `npx tsc --noEmit` 检查
- Mock 接口应直接引用 `src/types/` 中的类型定义，不自行手写

## 7. 测试失败源于 Spec 误解

### 症状

- 测试本身通过，但实现的行为与 spec 不符
- 测试使用了错误的预期值
- 边界条件测试遗漏

### 排查步骤

1. **重新读 spec**：确认测试的预期值确实符合 spec 定义

   ```
   spec 中说：每个 Phase 固定 4 Beat
   测试中写：expect(phase.beats.length).toBe(3)  ← 错误
   ```

2. **检查 glossary**：确认测试中使用的术语与 glossary 一致

3. **检查 contract schema**：确认测试 mock 的数据结构与 schema 一致

4. **交叉验证**：用 `06_FIXTURES/sample-scene/` 中的数据做 sanity check

### 处理原则

- **修实现，不修测试**（除非测试本身违反了 spec）
- 如果测试和实现都正确但结果不符，检查是否是 spec 理解错误
- 如果发现 spec 本身有问题，STOP 报告给人类

## 8. Blocker 升级流程

### 何时升级

以下情况 Ralph **不能自行解决**，必须升级给人类：

| 类别                 | 示例                                   |
| -------------------- | -------------------------------------- |
| 作者控制模型变更     | "修复这个 bug 需要改变 Phase 的含义"   |
| 核心领域边界变更     | "这个需求要求 Beat 可以跨 Phase"       |
| 公共 API 语义变更    | "API 返回格式需要与 spec 不同"         |
| 不可调和的 spec 冲突 | "glossary 和 ADR 对这个概念的定义矛盾" |
| 缺少必要的设计决策   | "Spec 没有定义这种边界情况该怎么处理"  |

### 升级报告格式

```
BLOCKER REPORT
==============

Phase: [phase 标识符]
Task:  [当前 task 编号]
时间:  [timestamp]

问题描述:
  [一段话清楚描述遇到的问题]

相关 Spec:
  - [文件路径]: [相关章节]
  - [文件路径]: [相关章节]

已尝试:
  - [方案 1]: [为什么不行]
  - [方案 2]: [为什么不行]

影响范围:
  - [哪些文件/模块会受影响]

建议选项:
  A. [方案 A]
     影响: [描述]
     风险: [描述]

  B. [方案 B]
     影响: [描述]
     风险: [描述]

等待人类裁决。
Ralph 当前状态: PAUSED at Task [N]
```

### 人类回应后的恢复

收到人类裁决后，Ralph 按以下流程恢复：

1. 确认理解人类的决定
2. 如果决定涉及 spec 变更，等待人类先更新 spec
3. 重新加载受影响的 spec 文件
4. 从暂停的 Task 继续执行
5. 在 PR description 中记录此 blocker 及其处理方式

## 快速诊断表

| 现象                     | 首先检查                 | 参考章节                 |
| ------------------------ | ------------------------ | ------------------------ |
| Ralph 回复变短/变慢      | Context 是否溢出         | #1 Context Overflow      |
| `tsc` 编译失败           | types 与 schema 是否对齐 | #2 Type Mismatch         |
| 两份 spec 说法不同       | 裁决优先级顺序           | #3 Spec Conflict         |
| Ralph 做了 plan 以外的事 | 是否遗忘了 plan 约束     | #4 Ralph Drift           |
| 运行时数据为空           | story-package 路径和格式 | #5 Story Package         |
| 后期 phase 编译不过      | 合并冲突和接口签名       | #6 Build Errors          |
| 测试通过但行为错误       | 测试预期值是否符合 spec  | #7 Spec Misunderstanding |
| 遇到无法自行解决的问题   | 是否触发 STOP 条件       | #8 Blocker Escalation    |
