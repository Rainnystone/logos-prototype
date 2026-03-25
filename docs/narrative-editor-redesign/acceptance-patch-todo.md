# Acceptance Patch TODO

## 说明

这是当前这一轮 redesign 验收补丁的专项清单。

它的作用是帮助 coding agent 收口当前已经批准但还需要补清楚的设计边界。

它不是新的产品 roadmap，也不是新的长期账本。

当前维护规则：

1. 只记录这次验收补丁要补的 active 文档缺口。
2. 条目补进文档并完成交叉检查后，才可以标记为完成。
3. 条目一旦全部完成，本文件可以保留为历史记录，不继续扩展成新的长期 TODO。

## 本轮补丁目标

- [x] 统一 `worldbase-cast` 的最终写入归属表述，明确 bridge 拥有最终落盘
- [x] 锁定普通配角的轻量保存格式，不再保留模糊表述
- [x] 锁定 `scene-phase-authoring` 的字段命名为 `samplePurpose` 与 `note`
- [x] 锁定 `routerHint` 失效时要求作者重选，不做静默自动重映射
- [x] 锁定 `control-modules` 的固定 `moduleScope` 列表
- [x] 锁定 `dryRun` 为内部检查语义，不作为用户可见操作
- [x] 锁定 `control-modules.yaml` 作为 `光锥 / Director Note 附加层 / Beat Volume` 的共享控制源
- [x] 写清 `control-modules` 的读写顺序与运行侧消费顺序
- [x] 锁定审计问题的稳定编号、编辑保留编号、删除后引用处理规则
- [x] 为审计问题编辑区补充添加 / 删除按钮与纵向滚动要求
- [x] 锁定路由档案删除时如仍被引用则阻止删除
- [x] 锁定路由档案保存成功并重载后，下游 `routerHint` 选项立即刷新
- [x] 区分系统角色 `coordinator` 与页面右下角的用户可见区域命名
- [x] 补全第四页对四类保存结果的展示与升级规则
- [x] 全文交叉检查，确认 active 文档没有前后冲突
