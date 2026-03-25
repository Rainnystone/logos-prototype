# Router Profile Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: `控制模块` 下的路由档案新增与编辑

Related:

- [control-modules-skill.md](control-modules-skill.md)
- [control-modules-runtime-adaptation.md](control-modules-runtime-adaptation.md)

## 1. Purpose

本 skill 负责解释作者对 router profile 的新增与编辑。

它处理的是：

- 路由名
- 路由语义核心
- 动作词组

## 2. Responsibilities

- 把作者输入整理成 router profile 的结构化结果
- 维护 route profile 集合的清晰边界
- 为 `故事结构` 页中的 `routerHint` 下拉提供上游来源
- 返回模块级 patch candidate

## 3. Must Not Do

- 不修改 routing algorithm
- 不直接改 scene / phase 骨架
- 不把 `routerHint` 选择动作混进来
- 不直接写最终文件

## 4. Invocation Rule

仅当请求明确在新增或编辑 router profile 时调用。

如果请求只是给某个 phase 选择一个已有 router，应由 `故事结构` 页对应 skill 处理。

## 5. Output Rule

输出应是：

- 面向 router profile 集合的模块级 patch candidate
- 支持新增、更新、删除
- 交由 bridge 写回现有路由文件，并在成功保存 + 重载后立即刷新 `routerHint` 可选集合
- 如果某个 profile 仍被现有 `routerHint` 使用，删除应被阻止，而不是静默替换

## 6. Author Intent Rule

默认保留作者定义的路由名和语义方向。

只在必要时修动作词组的结构和去重，不擅自把路由改成另一种叙事类型。
