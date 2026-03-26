# Control Modules Skill Family

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块 (Control Modules)` 的 section skill 总说明

Related documents:

- [control-modules-page.md](control-modules-page.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)
- [../coordinator-agent.md](../coordinator-agent.md)
- [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)

## 1. Purpose

本文件定义 `控制模块 (Control Modules)` 这一页的 skill 组织方式。

这不是单个大 skill。
本 section 采用：

- 一个 section-local skill family
- 五个窄边界的小 skill

这样做的原因很直接：

- 五个模块的运行落点不同
- 五个模块的编辑模式不同
- 如果仍然做成一个大 skill，很容易把“替换式 / 附加式 / 结构化编辑”混在一起

## 2. Approved Skill Family

本 section 下的五个小 skill 是：

1. [light-cone-customization-skill.md](light-cone-customization-skill.md)
2. [director-note-additions-skill.md](director-note-additions-skill.md)
3. [auditor-question-set-skill.md](auditor-question-set-skill.md)
4. [beat-volume-definition-skill.md](beat-volume-definition-skill.md)
5. [router-profile-skill.md](router-profile-skill.md)

## 3. Invocation Model

推荐调用顺序是：

1. `coordinator` 先把请求识别为 `control-modules`
2. 应用层根据当前激活模块或表单目标，选择对应的小 skill
3. 小 skill 只返回自己那一块的结构化 patch candidate
4. bridge 再按模块目标决定写入和下游应用

如果同一次请求同时涉及多个控制模块：

- 允许在本 section 内顺序调用多个小 skill
- 但每次调用仍然只处理一个明确模块
- 不允许某个小 skill 顺手修改其它模块

## 4. Author Intent Preservation Rule

这五个小 skill 都必须遵守同一条硬规则：

- 默认不改作者本意
- 默认只做字段归位、结构化整理和最小修补

它们不得：

- 擅自润色控制语义
- 擅自替作者改写故事含义
- 为了保存成功去扩大修改范围
- 为了通过校验去改系统代码或运行规则

如果输入要想成立，必须改变作者原意，小 skill 应停下来并返回需要人工决定。

## 5. Shared Output Rule

这五个小 skill 都不直接写文件。

它们共同的输出要求是：

- 返回模块级结构化 patch candidate
- 明确自己的模块范围
- 不输出最终 YAML 作为唯一真相
- 不自行决定跨模块落地

## 6. Bridge Relation

`控制模块` 这一页使用 bridge 的 `hybrid multi-target` 模式。

这意味着：

- skill family 只负责解释输入
- bridge 负责按模块目标分发写入
- 任何一个小 skill 都不应该直接接触文件系统

Approved shared persistence note:

- `light-cone`
- `director-note-additions`
- `beat-volume-definitions`

all land in one shared section-owned control source:

- `control-modules.yaml`

while:

- `router-profile-set` continues to target `router-lexicon.yaml`
- `auditor-question-set` continues to target `audit-questions.yaml`

## 7. Reading Order For Coding Agents

实现这一组 skill 前，建议顺序阅读：

1. [../master-record.md](../master-record.md)
2. [../coordinator-agent.md](../coordinator-agent.md)
3. [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
4. [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)
5. [control-modules-page.md](control-modules-page.md)
6. 对应的小 skill 文档
