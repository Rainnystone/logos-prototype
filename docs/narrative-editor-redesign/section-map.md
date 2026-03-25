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

当前结论：

- 这是该 section 的第一份 active 文档
- 这一页暂不从 page 开始，而是先从系统适配边界开始
- 该 section 负责：
  - 光锥坍缩替换式自定义
  - Director Note Layer 附加式自定义
  - Auditor Question 结构化自定义
  - Beat Volume 低中高定义
  - Router Profile 结构化新增/编辑
- 该 section 不负责 scene / phase 的故事骨架编辑

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
