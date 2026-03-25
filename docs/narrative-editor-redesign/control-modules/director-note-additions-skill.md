# Director Note Additions Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块` 下的 Director Note 附加式自定义

Related:

- [control-modules-skill.md](control-modules-skill.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)

## 1. Purpose

本 skill 负责解释作者对 Director Note Layer 的附加式输入。

它只处理作者新增的那一层，不接管系统自动抓取出的基底层。

## 2. Responsibilities

- 接收并整理作者的 Director Note 附加输入
- 把输入归位为可验证的附加层结构
- 保持与现有系统抓取层并存，而不是替换
- 返回模块级 patch candidate

## 3. Must Not Do

- 不替换系统自动抓取层
- 不删除系统已有的控制约束
- 不直接改 `directorNote.volume`
- 不越权修改 router、audit 或 scene / phase 字段

## 4. Invocation Rule

仅当请求明确在修改 Director Note 自定义附加层时调用。

如果作者实际在改 beat volume 或 router profile，应转给对应小 skill。

## 5. Output Rule

输出应是：

- 面向 Director Note 附加层的结构化 patch candidate
- 只描述作者新增部分
- 交给 bridge 后续并入 Director Note 构造路径

## 6. Author Intent Rule

默认保留作者对额外约束的说法和范围。

只修格式、分段和字段归位，不擅自扩写作者的控制要求。
