# Narrative Editor Redesign TODO

## 说明

这是一份 redesign 专用的中文执行账本。

它不是 `vendor/LOGOS-SPEC/TODO.md` 的镜像副本，也不是临时便签。
它的作用是持续记录当前 active redesign 的推进状态，避免文档讨论很多，
但 coding agent 不知道现在该看什么、先做什么、哪些已经冻结。

当前维护规则：

1. 只记录当前 active redesign 路线，不记录 archive 中的旧方案拆解进度。
2. 只有产生了实际文档、计划或实现产物，相关条目才可以标记为完成。
3. 已冻结决策单独维护，不混进“待办项”里反复讨论。
4. coding agent 默认应先读 [master-record.md](master-record.md) 与 [coordinator-agent.md](coordinator-agent.md)，再读本账本。

## 已冻结决策

- [x] redesign 当前切换为 `coordinator-first`
- [x] active coordinator 名称固定为 `router-controller`
- [x] 架构采用 `1 coordinator + 4 section skills + cross-section-reconciler-skill + legacy-migration-skill`
- [x] 文件写回、校验、映射、reload 留在 deterministic code
- [x] 当前旧的 page-first 文档与 page-specific plans 已迁入 `archive/`
- [x] active 主索引已切换为 [master-record.md](master-record.md)

## 当前阶段

### Stage A：定义 coordinator-first 架构基线

- [x] 重写 active master record，明确 coordinator-first 路线
- [x] 建立 archive 规则，避免 coding agent 误读旧文档
- [x] 创建 `coordinator-agent.md`
- [ ] 创建 `section-skills.md`
- [ ] 如有必要，单独创建 validation/writeback 设计说明

状态：进行中

## 活跃任务

### A1. 收敛 coordinator contract

- [x] 明确 coordinator 的职责与非职责
- [x] 明确 invocation modes
- [x] 明确输入 contract
- [x] 明确输出 contract
- [x] 明确 patch candidate 结构
- [x] 明确 prompt skeleton
- [x] 明确 repair loop payload
- [x] 明确代码侧接口边界

### A2. 收敛 skill inventory

- [x] 锁定 4 个 section skills
- [x] 锁定 `cross-section-reconciler-skill`
- [x] 锁定 `legacy-migration-skill`
- [ ] 为每个 skill 写出职责边界与禁区
- [ ] 说明 section skill 与 section page 的关系

### A3. 收敛验证与写回边界

- [x] 锁定 schema / reference / package / round-trip 四层校验
- [x] 锁定 repairable / needs-human-decision / infra-failure 三类失败
- [ ] 明确 coordinator 与 repository / validator / projection / reload service 的推荐接口名
- [ ] 明确哪些错误可以自动 repair，哪些必须停下来问人

### A4. 建立 redesign 账本与阅读路径

- [x] 创建中文 TODO
- [x] 在 README 中补 active 文档入口
- [x] 在 master record 中补 active 文档索引
- [ ] 后续每新增一个 active 文档，同步更新 README 与本账本

## 下一阶段候选

### Stage B：section skills 设计

- [ ] 创建 `section-skills.md`
- [ ] 为 `worldbase-cast-skill` 写 contract 草案
- [ ] 为 `scene-phase-authoring-skill` 写 contract 草案
- [ ] 为 `control-modules-skill` 写 contract 草案
- [ ] 为 `package-wiring-validation-skill` 写 contract 草案
- [ ] 为 `cross-section-reconciler-skill` 写 contract 草案
- [ ] 为 `legacy-migration-skill` 写 contract 草案

### Stage C：validation / writeback 设计

- [ ] 细化 repository 写回边界
- [ ] 细化 runtime projection 策略
- [ ] 细化 round-trip reload 结果协议
- [ ] 细化 UI 如何接收 coordinator 结果

### Stage D：重新回到 section pages

- [ ] 在 coordinator 架构稳定后，重新定义 page surfaces
- [ ] 重新评估世界与角色页
- [ ] 重新评估故事结构页
- [ ] 重新评估控制模块页
- [ ] 重新评估组装与校验页

## 暂缓项

- [ ] 暂不恢复 archive 中的 page-first 计划
- [ ] 暂不直接写 section-specific coding plan
- [ ] 暂不设计高保真 UI
- [ ] 暂不把 coordinator 设计成 DOM 操作型 agent
- [ ] 暂不引入多 agent 自治协作系统

## 维护提醒

- 新增 active redesign 文档时，记得同步更新：
  - [README.md](README.md)
  - [master-record.md](master-record.md)
  - [TODO.zh-CN.md](TODO.zh-CN.md)

- 如果未来某项设计从 active 路线退出，应移动到 `archive/`，而不是继续留在 active 入口里。
