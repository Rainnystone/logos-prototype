# Auditor Question Set Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块` 下的审计问题与选择规则编辑

Related:

- [control-modules-skill.md](control-modules-skill.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)

## 1. Purpose

本 skill 负责解释作者对审计问题集的结构化修改。

它覆盖：

- 全局问题
- 控制问题
- phase 专属问题
- 选择规则

## 2. Responsibilities

- 把作者输入归位到正确的问题分组
- 维护问题与选择规则之间的结构关系
- 为新增问题返回可验证的结构化结果
- 保护 phase 关联关系不被打乱

## 3. Must Not Do

- 不把审计问题当成 prompt layer
- 不依赖问题原文做脆弱匹配
- 不直接改其它控制模块
- 不直接写最终文件

## 4. Invocation Rule

仅当请求明确在修改审计问题或选择规则时调用。

如果请求涉及 phase 骨架，应回到 `故事结构` 页对应 skill。

## 5. Output Rule

输出应是：

- 面向 `audit-questions` 结构的模块级 patch candidate
- 支持问题新增、更新、删除与选择规则变更
- 交由 bridge 写回现有审计文件并重新校验引用
- 新增问题需要生成新的稳定编号
- 编辑已有问题时应保留原有稳定编号
- 删除问题时应触发确定逻辑的引用清理或阻断检查

## 6. Author Intent Rule

默认保留作者问题的判断方向和约束含义。

只做结构整理，不擅自改变问题的真假判断、阻塞级别和语义目标。

## 7. Deterministic Boundary

稳定编号、去重和最终引用修复应留给确定逻辑处理。

本 skill 可以提出新增或修改的问题内容，但不应自由发明一套无法稳定追踪的编号体系。
