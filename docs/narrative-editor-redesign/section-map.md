# Section Map

## 目的

`section-map.md` 是 `docs/narrative-editor-redesign/` 下的全局 section 导航文件。

它的作用不是重复每个 section 的细节，而是告诉 coding agent：

- 当前有哪些 section 文件夹
- 每个文件夹里应该放什么
- 每个 section 目前已经产出了哪些 active 文档
- 进入某个 section 前应该先读什么

如果一个 coding agent 已经读过：

- [master-record.md](master-record.md)
- [coordinator-agent.md](coordinator-agent.md)
- [authoring-runtime-bridge.md](authoring-runtime-bridge.md)
- [section-skills.md](section-skills.md)

接下来就应该读这份文件，确认 section 级文档的组织方式。

## 组织规则

从现在开始，每个 section 都应使用独立文件夹。

每个 section 文件夹应尽量包含：

- 对应 section 的 page 文档
- 对应 section 的 skill 文档
- 已批准的 section 参考图、草图或说明材料

除非后续另有明确决定，section 层面的导航不再单独放在每个 folder 内部；
全局 section 导航统一由本文件维护。

## 当前 Section 文件夹

当前已批准的 4 个 section 正式名称：

1. `世界与角色 (WorldBase & Cast)`
2. `故事结构 (Scene & Phase Authoring)`
3. `控制模块 (Control Modules)`
4. `组装与校验 (Package Wiring & Validation)`

### 1. `worldbase-and-cast/`

作用：

- 承载 `世界与角色 (WorldBase & Cast)` 这一页和对应 skill 的 active 文档

当前文件：

- [worldbase-and-cast/worldbase-cast-page.md](worldbase-and-cast/worldbase-cast-page.md)
- [worldbase-and-cast/worldbase-cast-skill.md](worldbase-and-cast/worldbase-cast-skill.md)
- [worldbase-and-cast/worlbase and cast UIUX参考图.png](worldbase-and-cast/worlbase%20and%20cast%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

当前结论：

- 这是第一组已经进入 section-folder 组织方式的 active 文档
- 左侧人物缩略卡只显示：姓名、性别、性格
- 主角单独一张缩略卡，但完整编辑仍然在右侧
- 核心角色和反派角色使用横向窄卡片卡带
- 页面右上是完整编辑区，右下是技术辅助块

### 2. `scene-phase-authoring/`

作用：

- 承载 `故事结构 (Scene & Phase Authoring)` 这一页和对应 skill 的 active 文档

当前文件：

- [scene-phase-authoring/scene-phase-authoring-page.md](scene-phase-authoring/scene-phase-authoring-page.md)
- [scene-phase-authoring/scene-phase-authoring-skill.md](scene-phase-authoring/scene-phase-authoring-skill.md)
- [scene-phase-authoring/scene-phase UIUX参考图.png](scene-phase-authoring/scene-phase%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

当前结论：

- 左上是固定 scene 配置块
- 左下是 phase 横向窄卡片卡带
- 右上是当前 phase 的详细编辑区
- 右下是 coordinator
- phase 的梯度等强相关控制项内嵌在右上，而不是整页跳去控制模块
- V1 保持 4 beat，不开放自定义 beat 数
- `gradientType` 与 `routerHint` 都是选择项，而不是自由文本
- `phaseId` 与 `phaseIndex` 继续由代码生成

### 3. `control-modules/`

作用：

- 承载 `控制模块 (Control Modules)` 这一组 active 文档

当前文件：

- [control-modules/control-modules-runtime-adaptation.md](control-modules/control-modules-runtime-adaptation.md)
- [control-modules/control-modules-page.md](control-modules/control-modules-page.md)
- [control-modules/control-modules-skill.md](control-modules/control-modules-skill.md)
- [control-modules/light-cone-customization-skill.md](control-modules/light-cone-customization-skill.md)
- [control-modules/director-note-additions-skill.md](control-modules/director-note-additions-skill.md)
- [control-modules/auditor-question-set-skill.md](control-modules/auditor-question-set-skill.md)
- [control-modules/beat-volume-definition-skill.md](control-modules/beat-volume-definition-skill.md)
- [control-modules/router-profile-skill.md](control-modules/router-profile-skill.md)
- [control-modules/control-modules UIUX 草图.png](control-modules/control-modules%20UIUX%20%E8%8D%89%E5%9B%BE.png)

当前结论：

- 该 section 现在已经有 runtime adaptation 文档和 page 文档
- 该 section 的 skill 层已拆成五个窄边界的小 skill，而不是一个大 skill
- 该 section 通过 bridge 的 `hybrid multi-target` 模式接入现有系统
- 页面结构参考 Prompt Assembler 的骨架，但不照抄
- 左侧是 `Layer 3 / Layer 4 / Parallel Audit` 的积木结构
- 右上是当前模块详细编辑区，右下是 coordinator
- 该 section 负责：
  - 光锥坍缩替换式自定义
  - Director Note Layer 附加式自定义
  - Auditor Question 结构化自定义
  - Beat Volume 低中高定义
  - Router Profile 结构化新增/编辑
- 该 section 不负责 scene / phase 的故事骨架编辑

### 4. `package-wiring-validation/`

作用：

- 承载 `组装与校验 (Package Wiring & Validation)` 这一页的 active 文档
- 作为整个 package 的全局诊断仪表盘设计入口

当前文件：

- [package-wiring-validation/package-wiring-validation-page.md](package-wiring-validation/package-wiring-validation-page.md)
- [package-wiring-validation/package-wiring-validation-skill.md](package-wiring-validation/package-wiring-validation-skill.md)
- [package-wiring-validation/组装与校验 UIUX 参考图.png](package-wiring-validation/%E7%BB%84%E8%A3%85%E4%B8%8E%E6%A0%A1%E9%AA%8C%20UIUX%20%E5%8F%82%E8%80%83%E5%9B%BE.png)

当前结论：

- 该 section 当前是 dashboard-first，而不是第四个内容编辑页
- 真正的组装与校验由后台自动完成，本页只展示结果与引导修复
- 该 section 的 skill 当前被定义为诊断解释器，而不是修复器
- 左侧是总览、section 健康状态、装配链路和问题队列
- 右上是当前选中问题或节点的详情说明
- 右下是全局诊断解释型 coordinator
- 本页的主要动作应是查看、跳转修复和重新检查，而不是直接重写前三页内容

## 推荐阅读顺序

当 coding agent 要进入某个 section 时，推荐顺序是：

1. [master-record.md](master-record.md)
2. [authoring-runtime-bridge.md](authoring-runtime-bridge.md)
3. [section-skills.md](section-skills.md)
4. [section-map.md](section-map.md)
5. 对应 section 文件夹中的 page 文档
6. 对应 section 文件夹中的 skill 文档
7. 对应 section 的参考图或附加材料

## 维护规则

后续每新增一个 section 文件夹，都要同步更新：

- [section-map.md](section-map.md)
- [master-record.md](master-record.md)
- [TODO.zh-CN.md](TODO.zh-CN.md)

如果某个 section 的组织方式发生变化，也要优先更新这里，避免 coding agent 读到旧路径。
