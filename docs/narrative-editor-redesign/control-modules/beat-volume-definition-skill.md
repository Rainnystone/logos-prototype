# Beat Volume Definition Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块` 下的 `Low / Med / High` 定义编辑

Related:

- [control-modules-skill.md](control-modules-skill.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)

## 1. Purpose

本 skill 负责解释作者对 `Low / Med / High` 三档节奏定义的输入。

它不是 beat 数编辑，也不是 phase 梯度编辑。

## 2. Responsibilities

- 整理 `Low / Med / High` 的作者定义
- 区分正文节奏定义与选项表达定义
- 返回可验证的结构化结果
- 保持现有三档标签不变

## 3. Must Not Do

- 不改 beat 数
- 不新增第四档或更多档
- 不越权修改 gradient 类型集合
- 不把这块误做成普通 Director Note 文本附加

## 4. Invocation Rule

仅当请求明确在修改 `Low / Med / High` 的含义时调用。

如果请求实际上在改 phase 的梯度选择，应回到 `故事结构` 页对应 skill。

## 5. Output Rule

输出应是：

- 面向 beat volume 定义的模块级 patch candidate
- 至少覆盖正文节奏与选项表达两个子面向
- 交给 bridge 写入 `control-modules.yaml`，再注入 Director Note 构造链

## 6. Author Intent Rule

默认保留作者对三档节奏差异的定义。

只修结构和字段归位，不擅自把作者的节奏意图改得更激进或更保守。
