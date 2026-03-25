# Light Cone Customization Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块` 下的光锥坍缩替换式自定义

Related:

- [control-modules-skill.md](control-modules-skill.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)

## 1. Purpose

本 skill 负责解释作者对光锥坍缩方式的替换式定义。

它处理的是：

- 光锥如何描述当前可达边界
- 光锥如何围绕 `endLine` 收束
- 光锥如何在 phase 结算后重新收缩

它不处理运行时的当前 `alpha / beta` 值本身。

## 2. Responsibilities

- 把作者输入整理成光锥自定义的结构化结果
- 保留“玩家当前状态是顶点、`endLine` 在远端、按 phase 结算收缩”的基本逻辑
- 识别替换式定义中的缺项并做最小修补
- 返回模块级 patch candidate

## 3. Must Not Do

- 不直接生成当前轮的 `alpha / beta`
- 不直接写运行时状态
- 不把光锥坍缩降级成普通提示词润色
- 不把这块误做成附加层
- 不改 scene / phase 骨架字段

## 4. Invocation Rule

仅当当前激活模块是“光锥坍缩”，或请求明确在修改光锥定义时调用。

如果请求同时涉及其它控制模块，应拆成顺序调用，不要在本 skill 内跨模块处理。

## 5. Output Rule

输出应是：

- 只属于光锥模块的结构化 patch candidate
- 面向 `control-modules.yaml` 中的 `lightConeCustomization`
- 交由 bridge 后续应用到 collapse 请求构造路径

## 6. Author Intent Rule

默认保留作者对边界收束方式的原意。

只允许修：

- 结构缺项
- 字段归位
- 局部格式问题

不允许擅自改变作者定义的收束方式和边界逻辑。
