# UIUX Rehaul Context

## 目的

这份文件用于给新的 UIUX 改版线程、并行 agent，或后续接手的人快速建立上下文。

它只负责说明：

- 当前 redesign 已经定下来的结构和边界
- 现有文档里哪些内容应继续视为有效约束
- 当前实现到了什么程度
- 新一轮 UIUX 重做时，哪些东西可以大胆改，哪些东西不要顺手改坏

这份文件不是新的实现计划，也不是新的产品需求文档。

如果后续要做真正的实现拆解，应回到：

- [../master-record.md](../master-record.md)
- [../coordinator-agent.md](../coordinator-agent.md)
- [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
- [../section-map.md](../section-map.md)
- [../../superpowers/plans/2026-03-25-coordinator-first-authoring-editor.md](../../superpowers/plans/2026-03-25-coordinator-first-authoring-editor.md)

## 当前主线

当前 active 路线不是旧的 page-first，而是 `coordinator-first`。

这意味着：

- 四个页面仍然存在
- 但页面不是系统真正的起点
- 真正的起点是统一保存通路、页面助手、bridge、以及各 section 的技能边界

换句话说，新一轮 UIUX 改版可以大胆重做布局、视觉、信息分区和交互呈现，但不要无意间改掉这些已经冻结的系统规则。

## 已冻结且不要随意重开的规则

### 1. 四个正式 section 名称

1. `世界与角色 (WorldBase & Cast)`
2. `故事结构 (Scene & Phase Authoring)`
3. `控制模块 (Control Modules)`
4. `组装与校验 (Package Wiring & Validation)`

### 2. 保存与运行是两件事

- 每个页面都有自己的 `提交` 和 `重置`
- 这两个动作只作用于当前页面
- `提交` 只负责保存当前页面
- `重置` 只撤回当前页面未提交的改动
- 页面提交不会直接启动运行
- 真正开始运行，仍然回到现有 opening hook / `Start Round` 流程

### 3. 页面右下角区域的职责

- 前三个主编辑页右下角是当前页面自己的解释和反馈区域
- 它负责解释当前页的大多数问题
- 它不是独立的全局系统角色，也不是新的保存按钮区
- 第四页右下角是全局诊断解释区，不承担前三页的日常局部反馈

### 4. 第四页不是第四个内容编辑页

`组装与校验` 当前定位是：

- 高级总览与诊断页
- 看整包健康状态
- 看跨页面和整包级问题
- 做跳转和复查

它不是普通作者每天频繁写内容的主工作页。

### 5. 提交成功后的默认打开规则

- 一旦作者提交成功
- 之后再次打开时
- 默认看到最近一次成功保存后的状态
- 不是反复回到最初示例内容

### 6. 当前不做的范围

以下内容已经明确移出当前轮次，不应在 UIUX 改版时被偷偷带回：

- 轻量记忆系统
- 自定义每个 phase 的 beat 数目
- 多 scene
- 人物关系可视化和管理
- 完整故事包保存 / 读取 / 归档管理流程
- 未提交草稿自动保留

详见 [../../../roadmap.md](../../../roadmap.md)。

## 四个页面当前的设计基线

### 1. 世界与角色

参考文档：

- [../worldbase-and-cast/worldbase-cast-page.md](../worldbase-and-cast/worldbase-cast-page.md)
- [../worldbase-and-cast/worldbase-cast-skill.md](../worldbase-and-cast/worldbase-cast-skill.md)
- [../worldbase-and-cast/worlbase and cast UIUX参考图.png](../worldbase-and-cast/worlbase%20and%20cast%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

结构基线：

- 左侧是世界文本块和人物摘要浏览
- 主角单独一张人物卡
- 核心角色和反派角色都是可增删的横向卡带
- 左侧卡带只显示人物缩略信息
- 点开后右上显示完整人物卡表单
- 右下是当前页解释区

当前最重要的约束：

- 世界观相关是文本块
- 主角 / 核心角色 / 反派必须是填表式人物卡
- 核心角色与反派支持新增和删除
- 横向卡带要保留

### 2. 故事结构

参考文档：

- [../scene-phase-authoring/scene-phase-authoring-page.md](../scene-phase-authoring/scene-phase-authoring-page.md)
- [../scene-phase-authoring/scene-phase-authoring-skill.md](../scene-phase-authoring/scene-phase-authoring-skill.md)
- [../scene-phase-authoring/scene-phase UIUX参考图.png](../scene-phase-authoring/scene-phase%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

结构基线：

- 左上是固定的 scene 配置块
- 左下是 phase 横向卡带
- phase 卡带必须有显式滑块
- 右上是当前 phase 的详细编辑区
- 右下是当前页解释区

当前最重要的约束：

- `phaseId` 与 `phaseIndex` 由代码生成，不是作者填写
- `gradientType` 与 `routerHint` 是选择项，不是自由文本
- 当前版固定 4 beat
- 页面主要使用 TailwindCSS，不要回退到额外普通 CSS 方案

### 3. 控制模块

参考文档：

- [../control-modules/control-modules-runtime-adaptation.md](../control-modules/control-modules-runtime-adaptation.md)
- [../control-modules/control-modules-page.md](../control-modules/control-modules-page.md)
- [../control-modules/control-modules-skill.md](../control-modules/control-modules-skill.md)
- [../control-modules/control-modules UIUX 草图.png](../control-modules/control-modules%20UIUX%20%E8%8D%89%E5%9B%BE.png)

结构基线：

- 左侧是控制链积木，而不是普通表单目录
- 参考 Prompt Assembler 的层级感
- 但 Auditor 不是 prompt layer，不能画错
- 右上是当前模块编辑区
- 右下是当前页解释区

当前负责的五块：

- 光锥坍缩自定义
- Director Note 附加层
- Auditor Question
- Beat Volume 定义
- Router Profile

### 4. 组装与校验

参考文档：

- [../package-wiring-validation/package-wiring-validation-page.md](../package-wiring-validation/package-wiring-validation-page.md)
- [../package-wiring-validation/package-wiring-validation-skill.md](../package-wiring-validation/package-wiring-validation-skill.md)
- [../package-wiring-validation/组装与校验 UIUX 参考图.png](../package-wiring-validation/%E7%BB%84%E8%A3%85%E4%B8%8E%E6%A0%A1%E9%AA%8C%20UIUX%20%E5%8F%82%E8%80%83%E5%9B%BE.png)

结构基线：

- 左侧是整包状态、section 健康情况、装配链路、问题队列
- 右上是当前问题或节点详情
- 右下是全局诊断解释区

这一页不是第四个主要创作页。

## 当前实现状态

当前仓库已经有一版可运行的编辑器实现，主要代码集中在：

- `src/app/edit/`
- `src/authoring/`
- `src/app/api/authoring/`

这一版已经把以下基础能力落下来了：

- 四个 section 都有实际页面
- 页面级 `提交 / 重置` 已经接进统一保存通路
- 提交成功后默认回到最近一次成功保存状态
- 页面右下角区域和全局诊断页已经有初步分工

但这不代表当前界面已经适合作为最终视觉标准。

更准确地说：

- 当前实现是“能工作的一版”
- 当前 UI 文档是“结构和交互边界的参考标准”
- 新一轮 UIUX rehaul 应该以文档定义的结构关系为准，而不是以当前页面长相为准

## 当前实现与文档的关系

新线程里需要默认带着这个判断：

- 现有实现可以当成可运行壳层
- 但不能默认把当前页面长相视为最终设计
- 重做时优先保留结构边界
- 再重做布局、视觉、层级、密度和动效

尤其不要误判为：

- 只改颜色就算 UIUX rehaul
- 只看当前页面截图，不看对应 section 文档
- 看到已经能保存，就顺手改掉动作规则和页面职责

## 这轮 UIUX 重做建议先看的文件

### 必看总文档

1. [../master-record.md](../master-record.md)
2. [../coordinator-agent.md](../coordinator-agent.md)
3. [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
4. [../section-map.md](../section-map.md)

### 必看 section 文档

1. [../worldbase-and-cast/worldbase-cast-page.md](../worldbase-and-cast/worldbase-cast-page.md)
2. [../scene-phase-authoring/scene-phase-authoring-page.md](../scene-phase-authoring/scene-phase-authoring-page.md)
3. [../control-modules/control-modules-page.md](../control-modules/control-modules-page.md)
4. [../package-wiring-validation/package-wiring-validation-page.md](../package-wiring-validation/package-wiring-validation-page.md)

### 必看计划

- [../../superpowers/plans/2026-03-25-coordinator-first-authoring-editor.md](../../superpowers/plans/2026-03-25-coordinator-first-authoring-editor.md)

## 新线程 / 新 agent 的建议切入方式

如果要开启一次“彻底从布局到视觉风格都大改”的 UIUX rehaul，推荐按这个顺序进入：

1. 先通读本文件与 `master-record.md`
2. 再按 section 阅读四个 page 文档和各自参考图
3. 明确哪些是结构冻结，哪些只是当前实现样貌
4. 先做新的全局视觉语言和页面壳层提案
5. 再分 section 重做页面骨架
6. 最后回到当前实现里逐页替换

## 最后的提醒

这份文件的目的不是减少设计标准，而是减少新线程重新摸索上下文的成本。

UIUX 可以大改，甚至应该大改，但不要无意间破坏这些已经冻结的事情：

- 页面职责边界
- 页面级提交与重置规则
- 提交成功后的默认恢复规则
- 右下角区域与全局诊断页的分工
- 当前轮次明确不做的范围
