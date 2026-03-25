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
5. 当前这轮验收补丁的收口清单见 [acceptance-patch-todo.md](acceptance-patch-todo.md)。

## 已冻结决策

- [x] redesign 当前切换为 `coordinator-first`
- [x] active coordinator 名称固定为 `coordinator`
- [x] 架构采用 `1 coordinator + 4 section skills / skill families`
- [x] 跨 section 协调已降级为 `coordinator` 的内建规则，而不是独立 skill
- [x] `authoring runtime bridge` 明确定义为 deterministic 基础设施，而不是 skill
- [x] 文件写回、校验、映射、reload 留在 deterministic code
- [x] coordinator 默认不改作者原意，只做结构化搬运与最小修复
- [x] `legacy-migration-skill` 不再作为 active redesign skill 保留
- [x] 作者一旦提交成功，之后默认看到的是最新保存状态，而不是反复回到初始示例内容
- [x] 草稿自动保留不在当前 redesign 范围，已移入根目录 `roadmap.md`
- [x] 当前旧的 page-first 文档与 page-specific plans 已迁入 `archive/`
- [x] active 主索引已切换为 [master-record.md](master-record.md)
- [x] section active 文档采用“每个 section 一个独立文件夹”的组织方式
- [x] 页面右下角用户可见区域与系统角色 `coordinator` 需要分开命名

## 当前阶段

### Stage A：定义 coordinator-first 架构基线

- [x] 重写 active master record，明确 coordinator-first 路线
- [x] 建立 archive 规则，避免 coding agent 误读旧文档
- [x] 创建 `coordinator-agent.md`
- [x] 创建 `authoring-runtime-bridge.md`
- [x] 创建 `section-skills.md`

当前阶段补充说明：

- 现有 webapp 仍缺 coordinator 可调用的 server-side write entry
- 因此“补齐 webapp 持久化入口”属于 redesign 基础设施任务，而不是后置实现细节

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

- [x] 锁定 4 个 section skills / skill families
- [x] 取消 `legacy-migration-skill` 作为 active redesign skill
- [x] 锁定跨 section 协调作为 `coordinator` 的内建规则
- [x] 为每个 skill 写出职责边界与禁区
- [x] 为 `worldbase-cast-skill` 写出职责边界与禁区
- [x] 说明 `worldbase-cast-skill` 与 `WorldBase & Cast` page 的关系
- [x] 锁定 `worldbase-cast-skill` 的固定目标映射与块顺序
- [x] 锁定普通配角的轻量切分与统一分段规则
- [x] 为 `scene-phase-authoring-skill` 写出职责边界与禁区
- [x] 说明 `scene-phase-authoring-skill` 与 `Scene & Phase Authoring` page 的关系
- [x] 锁定 `scene-phase-authoring-skill` 的字段编排定位
- [x] 锁定本 skill 保护 `scene start + mainAxis + phaseGoal + endLine` 的叙事主干
- [x] 锁定 `gradientType` 与 `routerHint` 作为选择项进入 skill，而不是自由文本
- [x] 锁定 `phaseId` 与 `phaseIndex` 继续由代码生成
- [x] 锁定 `故事结构` 页的 `routerHint` 选项来自有效 router-profile 集合，而不是页面本地定义
- [x] 为 `control-modules` skill family 写出总边界与调用方式
- [x] 为 `light-cone-customization-skill` 写出职责边界与禁区
- [x] 为 `director-note-additions-skill` 写出职责边界与禁区
- [x] 为 `auditor-question-set-skill` 写出职责边界与禁区
- [x] 为 `beat-volume-definition-skill` 写出职责边界与禁区
- [x] 为 `router-profile-skill` 写出职责边界与禁区
- [x] 为 `package-wiring-validation-skill` 写出职责边界与禁区

### A3. 收敛验证与写回边界

- [x] 锁定 schema / reference / package / round-trip 四层校验
- [x] 锁定 repairable / needs-human-decision / infra-failure 三类失败
- [x] 明确 coordinator 与 repository / validator / projection / reload service 的推荐接口名
- [x] 明确哪些错误可以自动 repair，哪些必须停下来问人
- [x] 明确 active bridge 文档承接 archive 中已有的本地写回经验
- [x] 明确 bridge 不是 skill，而是 deterministic service layer
- [x] 明确现有 webapp 仍缺 server-side section write entry
- [x] 明确 repair 应优先修输入，不应为了过校验去改系统规则
- [x] 细化 direct-runtime section 与 projected section 的适用边界
- [x] 为 bridge 补充 `hybrid multi-target section` 模式
- [x] 锁定 `worldbase-cast` v1 先直接写 `world-base.yaml`
- [x] 明确 page save / coordinator save 共享的服务端入口协议
- [x] 为 `控制模块 (Control Modules)` 建立 section-local runtime adaptation 文档
- [x] 锁定这份文档不并入全局 `bridge`
- [x] 明确 `Prompt Assembler` 对 `控制模块` 页面设计与运行接线的影响
- [x] 锁定 `控制模块` 通过 hybrid multi-target 模式接入 bridge

### A4. 建立 redesign 账本与阅读路径

- [x] 创建中文 TODO
- [x] 在 README 中补 active 文档入口
- [x] 在 master record 中补 active 文档索引
- [x] 已为第一组 active section 文档同步更新 README 与本账本
- [x] 创建全局 `section-map.md`
- [x] 为 `WorldBase & Cast` 创建独立 section 文件夹
- [x] 为 `Control Modules` 创建独立 section 文件夹
- [x] 为 `Package Wiring & Validation` 创建独立 section 文件夹

## 下一阶段候选

### Stage B：section skills 设计

- [x] 创建 `section-skills.md`
- [x] 为 `worldbase-cast-skill` 写 contract 草案
- [x] 将 `worldbase-cast-skill` 细化到可执行的 V1 规则
- [x] 将第一组 section 文档迁入独立文件夹
- [x] 为 `scene-phase-authoring-skill` 写 contract 草案
- [x] 为 `control-modules` skill family 写 contract 草案
- [x] 为五个 `control-modules` 小 skill 写 contract 草案
- [x] 为 `package-wiring-validation-skill` 写 contract 草案

### Stage C：validation / writeback 设计

- [x] 创建 `authoring-runtime-bridge.md`
- [x] 在 active 文档中记录当前 webapp 写入口缺口
- [x] 细化 repository 写回边界
- [x] 细化 `worldbase-cast` 的轻量 runtime 渲染策略
- [x] 细化 round-trip reload 结果协议
- [x] 细化 UI 如何接收 coordinator 结果
- [x] 细化 coordinator 可调用的 server-side write entry 形式
- [x] 为 `控制模块` 写出 section-local runtime adaptation 边界
- [x] 锁定成功提交后默认恢复最近一次成功保存状态，而不是反复回到初始示例内容
- [x] 锁定 `control-modules.yaml` 作为 `光锥 / Director Note 附加层 / Beat Volume` 的共享控制源
- [x] 锁定 `moduleScope` 固定值与 `dryRun` 的内部语义
- [x] 锁定 `control-modules` 的读写顺序与运行侧消费顺序
- [x] 锁定四类保存结果在页面与全局诊断页之间的提升规则

### Stage D：重新回到 section pages

- [x] 锁定 4 个 section 的正式名称：
  - `世界与角色 (WorldBase & Cast)`
  - `故事结构 (Scene & Phase Authoring)`
  - `控制模块 (Control Modules)`
  - `组装与校验 (Package Wiring & Validation)`
- [x] 在 coordinator 架构稳定后，重新定义 page surfaces
- [x] 重新评估世界与角色页
- [x] 产出 `worldbase-and-cast/worldbase-cast-page.md`
- [x] 产出 `worldbase-and-cast/worldbase-cast-skill.md`
- [x] 锁定 `WorldBase & Cast` 的页面骨架
- [x] 锁定“左侧摘要浏览 / 右上完整编辑 / 右下技术辅助”的布局
- [x] 锁定主角单卡、核心角色横向卡带、反派横向卡带
- [x] 锁定左侧人物缩略卡只显示“姓名 / 性别 / 性格”
- [x] 锁定页面需要 `提交` 与 `重置` 动作
- [x] 锁定三大编辑页统一使用页面级 `提交 / 重置` 动作条
- [x] 锁定 `提交 / 重置` 只作用于当前页面
- [x] 锁定 `提交` 进入保存 / 校验 / 回读通路，而不是直接启动 runtime
- [x] 锁定 `重置` 只撤回当前页未保存改动，恢复到最近成功保存状态或当前加载状态
- [x] 锁定真正运行仍回到现有 opening hook / `Start Round` 流程
- [x] 重新评估故事结构页
- [x] 产出 `scene-phase-authoring/scene-phase-authoring-page.md`
- [x] 锁定 `故事结构 (Scene & Phase Authoring)` 的页面骨架
- [x] 锁定“左上 scene / 左下 phase 卡带 / 右上 phase 编辑 / 右下 coordinator”的布局
- [x] 锁定 phase 卡片显示 note 摘要
- [x] 锁定 `phaseId` 与 `phaseIndex` 由代码生成
- [x] 锁定 V1 维持固定 4 beat
- [x] 锁定本页使用 TailwindCSS，而不是自定义普通 CSS
- [x] 锁定 `gradientType` 与 `routerHint` 使用点选，不使用自由文本
- [x] 锁定本页要显式表达“scene 起点 + mainAxis + 每个 phaseGoal + endLine”的叙事主干
- [x] 为故事结构页补充对应 skill 文档
- [x] 先收敛 `控制模块` 的 runtime adaptation 边界
- [x] 补充 `控制模块` 与 `故事结构` 之间的 router-profile 依赖关系
- [x] 重新评估控制模块页
- [x] 产出 `control-modules/control-modules-page.md`
- [x] 锁定左侧 `Layer 3 / Layer 4 / Parallel Audit` 的积木结构
- [x] 锁定右上当前模块编辑、右下 coordinator 的布局
- [x] 锁定本页参考 Prompt Assembler 骨架，但不把 Auditor 伪装成 prompt layer
- [x] 为控制模块页补充 skill family 与五个小 skill 文档
- [x] 为审计问题编辑区补充添加 / 删除按钮与纵向滚动要求
- [x] 重新评估组装与校验页
- [x] 产出 `package-wiring-validation/package-wiring-validation-page.md`
- [x] 产出 `package-wiring-validation/package-wiring-validation-skill.md`
- [x] 锁定本页为全局诊断仪表盘，而不是第四个内容编辑页
- [x] 锁定“左侧总览 / 右上详情 / 右下 coordinator”的布局
- [x] 锁定后台自动组装与校验，本页只展示结果与引导修复
- [x] 锁定本页的 skill 为诊断解释器，而不是修复器

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
