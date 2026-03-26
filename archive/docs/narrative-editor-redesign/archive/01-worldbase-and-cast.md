# 世界与角色（WorldBase and Cast）

## 文档状态

- 日期：2026-03-22
- 状态：draft / brainstorming in progress
- 上级索引：`archive/docs/narrative-editor-redesign/redesign-design-recorder.md`
- 目标：细化 redesign 中“世界与角色”这一页的字段、边界与页面结构

## 1. 页面目标

这一页负责 story package 的静态内容资产，也就是在运行前已经存在、不会在每一轮生成时重建的世界与角色基础。

它回答的问题是：

- 这个故事世界里有什么
- 玩家角色是谁
- 核心角色、反派、重要配角、普通配角分别是谁
- 世界规则、风格边界、地点素材是什么

## 2. 当前已确认范围

本页当前保留这些内容：

- 世界观基础设定
- 世界规则 / 世界禁令 / 异常性质
- 题材基调与文风基底
- 玩家角色 / 主角定义
- 核心角色定义
- 反派角色定义
- 重要配角定义
- 普通配角定义
- 地点词池 / 场景元素

本页已删除以下内容：

- 角色关系、立场、目标、秘密、约束
- 可出场 / 禁出场角色范围

## 3. 当前已确认的输入方式

### 3.1 文本框类输入

以下内容当前按大文本框处理：

- 世界规则 / 世界禁令 / 异常性质
- 题材基调与文风基底
- 地点词池 / 场景元素

这三块当前更适合保持高自由度文本输入，不必过早拆成很多结构化小字段。

### 3.2 角色类输入

#### 玩家角色 / 主角

当前已确认字段：

- 人物姓名
- 身份定位
- 性别
- 性格
- 年龄
- 职业
- 人物简介
- 能力边界
- 行为边界
- OOC 红线
- 着装
- 道具 / 武器

#### 核心角色

当前已确认字段：

- 人物姓名
- 身份定位
- 性别
- 性格
- 年龄
- 职业
- 人物简介
- 能力边界
- 行为边界
- OOC 红线
- 着装
- 道具 / 武器

#### 反派角色

当前已确认字段：

- 人物姓名
- 身份定位
- 性别
- 性格
- 年龄
- 职业
- 人物简介
- 能力边界
- 行为边界
- OOC 红线
- 着装
- 道具 / 武器

#### 重要配角

当前已确认字段：

- 人物姓名
- 身份定位
- 性别
- 性格
- 年龄
- 职业
- 人物简介
- 能力边界
- 行为边界
- OOC 红线
- 着装
- 道具 / 武器

#### 普通配角

当前已确认字段：

- 人物姓名
- 性别
- 性格
- 年龄
- 职业

## 4. 字段设计结论

基于当前讨论，本页的角色字段设计结论是：

- 玩家角色 / 主角：采用完整角色卡
- 核心角色：采用完整角色卡
- 反派角色：采用完整角色卡
- 重要配角：采用完整角色卡
- 普通配角：采用精简角色卡

完整角色卡的必要字段为：

- 人物姓名
- 身份定位
- 性别
- 性格
- 年龄
- 职业
- 人物简介
- 能力边界
- 行为边界
- OOC 红线
- 着装
- 道具 / 武器

精简角色卡的字段为：

- 人物姓名
- 性别
- 性格
- 年龄
- 职业

这意味着本页不是普通人物百科页，而是带有 LOGOS 控制意图的角色输入面。

## 5. 与现有 webapp / 运行时结构的映射关系

这一部分是给 coding agent 的关键执行说明。

当前仓库中的 `WorldBase` 不是结构化角色模型，而是一个运行时扁平 schema：

- `mainCharacters: string`
- `npcCharacters: string`
- `locationPatch: string`

对应文件见：

- [prompt-object.ts](../../../src/types/prompt-object.ts)
- [world-base.yaml](../../../src/story-packages/sample-scene/world-base.yaml)

这意味着：

- 新页面想要的结构化字段，不能直接一比一落到当前 runtime `WorldBaseSchema`
- 现有运行链路依赖的是扁平字符串，不是结构化角色对象

### 5.1 当前页面字段到现有 `WorldBase` 的推荐过渡映射

在不立即重写整个运行时链路的前提下，推荐先采用“结构化 authoring model -> 扁平 runtime worldBase”的过渡映射：

- 世界观基础设定 -> `mainCharacters`
- 世界规则 / 世界禁令 / 异常性质 -> `mainCharacters`
- 题材基调与文风基底 -> `mainCharacters`
- 玩家角色 / 主角 -> `mainCharacters`
- 核心角色 -> `mainCharacters`
- 反派角色 -> `mainCharacters`
- 重要配角 -> `mainCharacters`
- 普通配角 -> `npcCharacters`
- 地点词池 / 场景元素 -> `locationPatch`

原因不是这三列天然合理，而是当前 runtime 只认识这三块：

- 主角色与核心世界信息
- NPC / 配角信息
- 地点补丁信息

所以如果要低风险接入 redesign 页面，最稳的做法不是立即重写 runtime prompt 契约，而是先让 authoring 页生成这三块兼容字符串。

### 5.2 对现有组件的映射关系

#### 新页面本身

当前仓库里还没有“世界与角色”这一页的正式组件。后续应新增新的 section page / section component，而不是直接把现有 play 页改造成编辑器。

#### `FixtureReferencePanel`

当前最直接相关的 UI 是：

- [FixtureReferencePanel.tsx](../../../src/app/components/FixtureReferencePanel.tsx)

它目前只做 read-only 展示，直接显示：

- `storyPackage.worldBase.mainCharacters`
- `storyPackage.worldBase.npcCharacters`
- `storyPackage.worldBase.locationPatch`

这意味着：

- 如果 redesign 页面先做结构化 authoring，而 runtime 仍保持三段字符串，这个组件可以暂时继续存在
- 但如果未来要把新页面的结构化字段反映到这里，需新增“结构化视图到只读摘要视图”的转换，而不是让这个组件直接吃新的复杂对象

#### `PlayWorkbench`

相关文件：

- [PlayWorkbench.tsx](../../../src/app/play/PlayWorkbench.tsx)

它通过 fixture drawer 间接消费 `WorldBase`。本次 redesign 不应让这一页承担 authoring 编辑职责，但任何 `WorldBase` 形状变动都必须确认这里的 fixture reference 仍能正常显示。

### 5.3 对现有运行链路的映射关系

#### `story-loader`

相关文件：

- [story-loader.ts](../../../src/engine/story-loader.ts)

它会从 `world-base.yaml` 读取并用 `WorldBaseSchema` 校验。只要 redesign 页面改写了 `world-base.yaml` 的输出格式，这里就必须同步处理。

#### `director-note-layer`

相关文件：

- [director-note-layer.ts](../../../src/engine/modules/director-note-layer.ts)

这里当前直接把 `worldBase.mainCharacters` 作为 option constraint 的角色资料来源之一。也就是说：

- 主角色 / 核心角色 / 反派 / 重要配角相关信息最终必须还能被稳定汇总进 `mainCharacters`
- 否则这里会丢失当前 prompt control 所依赖的角色边界信息

#### `prompt-assembler`

相关文件：

- [prompt-assembler.ts](../../../src/engine/modules/prompt-assembler.ts)

这里会原样把 `worldBase` 三个字段塞进 `PromptObject`。所以 redesign 页如果采用结构化角色卡，必须先有一层 serializer / mapper，把结构化 authoring 数据重新拼装成当前 runtime worldBase。

#### `prompt-templates`

相关文件：

- [prompt-templates.ts](../../../src/engine/api-adapter/prompt-templates.ts)

这里直接把：

- `Main characters`
- `NPC characters`
- `Location patch`

写进最终 system prompt。也就是说，任何字段拆分都不能让这三块在 prompt 中突然变空、变短、或丢掉关键控制语义。

## 6. 推荐给 coding agent 的实施方式

如果要低风险实现“世界与角色”页，我建议这样做：

1. 不要一上来直接重写 runtime `WorldBaseSchema`
2. 先为本页建立结构化 authoring model
3. 再建立 `WorldBaseAuthoring -> WorldBase` 的 mapper / serializer
4. 页面保存时，先写 authoring 数据，再生成兼容当前 runtime 的 `world-base.yaml`
5. 直到运行时下游模块完成改造前，都继续保证 `mainCharacters / npcCharacters / locationPatch` 三段输出存在

换句话说：

- 页面层可以先进化
- runtime 契约先保持兼容
- 中间靠 mapper 过渡

这是当前最安全、最适合 AI coding agent 逐步落地的路线。

## 7. 需要同步修改和特别留意的地方

### 7.1 必改文件类别

如果这一页进入实现，至少要检查或修改以下类别：

- 页面路由和 section page 组件
- section 对应的 server entry
- story package repository / 本地文件访问层
- worldbase authoring model / DTO
- `WorldBase` runtime schema 或其兼容输出层
- `world-base.yaml` 的读写逻辑
- fixture reference 的展示逻辑
- 相关单元测试与 UI 测试

### 7.2 当前强关联文件

优先检查这些文件：

- [prompt-object.ts](../../../src/types/prompt-object.ts)
- [story-package.ts](../../../src/types/story-package.ts)
- [story-loader.ts](../../../src/engine/story-loader.ts)
- [world-base.yaml](../../../src/story-packages/sample-scene/world-base.yaml)
- [story-package.schema.md](../../../src/story-packages/story-package.schema.md)
- [FixtureReferencePanel.tsx](../../../src/app/components/FixtureReferencePanel.tsx)
- [PlayWorkbench.tsx](../../../src/app/play/PlayWorkbench.tsx)
- [director-note-layer.ts](../../../src/engine/modules/director-note-layer.ts)
- [prompt-assembler.ts](../../../src/engine/modules/prompt-assembler.ts)
- [prompt-templates.ts](../../../src/engine/api-adapter/prompt-templates.ts)

### 7.3 当前强关联测试

优先检查这些测试：

- [sample-scene.test.ts](../../../src/story-packages/__tests__/sample-scene.test.ts)
- [story-loader.test.ts](../../../src/engine/__tests__/story-loader.test.ts)
- [FixtureReferencePanel.test.tsx](../../../src/app/components/__tests__/FixtureReferencePanel.test.tsx)
- [play.test.tsx](../../../src/app/__tests__/play.test.tsx)
- `prompt-assembler` / `director-note-layer` / `schema-mapper` 相关测试

## 8. 如何检索潜在关联文件

给 coding agent 的推荐检索方式：

### 8.1 从字段名反查

优先搜索这些关键词：

- `worldBase`
- `mainCharacters`
- `npcCharacters`
- `locationPatch`
- `WorldBaseSchema`
- `world-base.yaml`

推荐命令：

```bash
rg -n "worldBase|mainCharacters|npcCharacters|locationPatch|WorldBaseSchema|world-base"
```

### 8.2 从页面组件反查

如果要找现有 UI 消费点，优先搜索：

- `FixtureReferencePanel`
- `PlayWorkbench`

推荐命令：

```bash
rg -n "FixtureReferencePanel|PlayWorkbench" src
```

### 8.3 从 prompt 链路反查

如果要确认 worldBase 最终如何影响生成，优先搜索：

- `buildDirectorNote`
- `assemblePromptObject`
- `buildGenerateSystemPrompt`

推荐命令：

```bash
rg -n "buildDirectorNote|assemblePromptObject|buildGenerateSystemPrompt" src
```

## 9. 最终测试建议

这一页进入实现后，至少应验证以下几层：

1. 类型与 schema
   - 新的 authoring 数据能否稳定映射到 runtime `WorldBase`
2. loader 层
   - 保存后的 `world-base.yaml` 能否被 `story-loader` 正常读取
3. UI 层
   - 新页面能否正确显示、编辑、保存、回显
4. 兼容层
   - `FixtureReferencePanel` 和 play 页面不应因为 worldBase 改造而失效
5. prompt 链路
   - `director-note-layer`、`prompt-assembler`、`prompt-templates` 仍能读到完整角色/地点信息

推荐测试命令：

```bash
npm run test:ui
npm run test:core
npm run type-check
```

在宣称这一页可用之前，至少要保证：

- story package 仍可加载
- play/workbench 不崩
- 新页面读写后的内容能重新进入当前 prompt 链路

## 10. 我暂时不建议放回来的内容

当前不建议把这些内容重新塞回本页：

- 角色关系
- 立场矩阵
- 长期目标
- 秘密
- 约束图谱

这些内容以后如果确实需要，更适合在更明确的关系页、图谱页，或其它独立输入面中处理，而不是先把“世界与角色”页重新撑肿。

## 11. 对 coding agent 的约束

后续实现这一页时，coding agent 应遵守：

1. 这页优先服务内容资产建模，不承担 story control 的字段
2. 不要把 `mainAxis`、`endLine`、`Phase`、`Audit Questions` 混入本页
3. 世界规则 / 文风 / 地点词池先采用大文本框，不要过早过度结构化
4. 角色输入应按角色分组清晰分层，而不是塞进一个巨大文本框
5. 如果底层暂时仍要兼容 `WorldBase` 的字符串型 schema，页面层也应保留未来结构化升级空间

## 12. 当前结论

本页当前已确认：

- 已删除“角色关系、立场、目标、秘密、约束”
- 世界规则 / 文风 / 地点词池先用大文本框
- 玩家角色 / 核心角色 / 反派 / 重要配角使用完整角色卡
- 普通配角使用精简角色卡
- `身份定位 / 能力边界 / 行为边界 / OOC 红线` 已确定为结构化字段
- 实现时必须明确处理本页结构化 authoring 数据与现有扁平 runtime `WorldBase` 的映射
