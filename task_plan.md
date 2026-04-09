# Task Plan

## Goal

修复 `March Dev Update` 后 `/play` 链路上的一组运行时与交互问题，交付一轮可直接继续手测的小范围稳定性修补。

## Success Criteria

- `gossipelog` 运行期间页面不再出现明显跳动或布局回流。
- 当 `gossipelog` 尚未完成，四个选项按钮必须不可选。
- 用户点击任一选项后，四个选项立即全部禁用，直到下一轮有效选项返回。
- API 调用报错后，不保留未成功接受的半成品内容；重新加载后状态仍应一致。
- 至少补上能覆盖本轮回归点的针对性测试，并完成 `npm test` 与 `npm run build`。

## Scope

当前任务只处理你列出的这批小问题，不改 API adapter 兼容策略，不扩展新的运行时功能。

## Active Track

- 轨道：`/play` runtime 稳定性修补
- 当前状态：核心实现已完成，进入收尾验证与结果同步

## Parallel Investigation

- 并行讨论：`March Dev Update Phase 4` 的 `weaver` 导入成功率优化
- 当前状态：仅做定位与设计判断，不进入实现
- 关注点：
  - `weaver` reference 是否需要进一步明确 `worldBase`、角色、地点等中间输出结构
  - prompt 里的 `Output Contract` 是否需要从“仅列 key 名”升级为“列 key 名 + 类型/语义/约束”
  - 是否需要补充面向连续书稿/自由文本输入的 extraction examples，而不是继续依赖抽象原则描述
- 本线程暂不创建 implementation plan；等优化边界冻结后再决定是否落正式 spec / plan

## Work Packets

| 状态 | 任务块 | 说明 |
| --- | --- | --- |
| complete | Packet 1 | 恢复上下文、锁定相关模块、写明完成标准 |
| complete | Packet 2 | 根因排查与 UX 边界确认，形成正式 implementation plan |
| complete | Packet 3 | 串行执行 Task 1：补齐并校准 play workbench 失败测试 |
| complete | Packet 4 | 执行生产修补：锁住 gossipelog pending 输入、稳定静默重水合 surface |
| in_progress | Packet 5 | 收尾验证、同步三件套，并记录全量测试基线问题 |

## Current References

- [AGENTS.md](AGENTS.md)
- [coding-agent-guide.md](coding-agent-guide.md)
- [progress.md](progress.md)
- [findings.md](findings.md)
- [docs/codemaps/architecture.md](docs/codemaps/architecture.md)
- [docs/codemaps/frontend.md](docs/codemaps/frontend.md)
- [docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md](docs/superpowers/plans/2026-04-09-play-workbench-stability-fixes.md)
- [archive/docs/dev-updates/march-dev-update/README.md](archive/docs/dev-updates/march-dev-update/README.md)
