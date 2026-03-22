# Narrative Editor 改版设计稿

## 文档状态

- 日期：2026-03-22
- 状态：已完成第一轮 brainstorming，待后续拆解 coding plan
- 适用范围：当前实现仓 `branch/narrative-editor`
- 读者：人类作者、AI coding agent、后续实现/审阅者

## 1. 文档目的

这份设计稿用于定义 LOGOS Narrative Editor 下一版作者配置界面的核心信息架构与边界。

它不是视觉稿，也不是实现计划；它的作用是给后续 coding plan 和具体开发提供一个清晰、稳定、可执行的起点，避免 AI coding agent 在进入实现时重新猜测以下问题：

- 哪些对象属于内容资产，哪些属于叙事控制
- 哪些概念来自 LOGOS Spec 的原始定义，不能随意改写
- 哪些页面需要新增，哪些现有页面必须保留
- 哪些字段可编辑，哪些字段只应展示或校验
- 当前 Sample 阶段哪些能力是正式范围，哪些仍是占位

## 1.1 Section 文档索引

当前 section 细化文档：

- [世界与角色](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/docs/narrative-editor-redesign/01-worldbase-and-cast.md)

后续 coding agent 在进入具体 section 实现前，除了本主索引外，还必须读取对应 section 的独立 md。

## 2. 当前设计前提

本设计建立在以下前提之上：

1. `project = story package`
2. 当前改版目标是作者配置界面，不是替换现有 play/workbench 运行页面
3. 现有 provider/model/api key 配置继续保留在现有 workbench 页面中，不迁移到这次新增页面
4. 当前版本仍然不是完整产品，尤其尚未接入完整 memory system
5. `Memory Placeholder` 必须在信息架构中留出明确位置，方便后续无痛升级
6. `Director Note Layer` 继续遵循当前实现与 Spec 的混合抓取逻辑，但不向作者开放自定义编辑
7. `Light Cone Collapse`、`Director Note Layer`、`Memory Placeholder` 的定义必须服从 LOGOS Spec 当前概念，而不是用通用写作工具的常见说法替代
8. redesign 后的 webapp 需要具备受控的本地文件读写能力，但第一阶段只服务于仓库内 story package 文件

## 3. 明确保留不动的部分

以下内容本次不改：

- 现有 play/workbench 页面继续存在
- 现有 provider setup 位置继续存在
- provider/model/api key/runtime config 的交互路径继续保留在现有页面

参考当前页面示意：[example.png](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/docs/assets/example.png)

这意味着本次新增的作者配置页面，不应该试图吞并运行时配置面板，也不应该把系统中心重新定义为模型配置页。

## 4. 设计目标

本次改版的目标是把作者输入面从当前偏 sample/workbench 的结构，扩展成一套更适合长期 authoring 的页面体系，同时仍然保持 LOGOS 的核心原则：

- 作者配置的是控制结构，不是手写巨型 prompt
- 内容资产与控制模块分离
- 运行配置与叙事配置分离
- story package 是当前唯一工作单元
- 当前 Sample 的边界和未来完整产品的扩展位都要能在 IA 中看见

## 5. 非目标

当前版本明确不做以下事情：

- 不做多 project / 多 story package 管理
- 不做多 Scene 编排系统
- 不做完整长期记忆系统
- 不开放 `Director Note Layer` 的手写自定义编辑
- 不让作者直接逐 Beat 编写正文
- 不把 play/workbench 页面改造成新的作者配置中心

## 6. 本地文件读写能力架构决定

### 6.1 需求与判断结论

本次 redesign 不是只读浏览器壳，而是作者配置界面。因此，webapp 必须能够从页面发起对本地 story package 文件的读取与修改。

当前实现的架构结论如下：

- 已支持服务端读取本地文件
- 尚未支持浏览器触发的受控写回本地文件
- 浏览器本身不应直接拥有磁盘写权限
- 真正的文件读写必须由 Next.js 的 Node 侧代码负责

这意味着当前架构不是完全不支持本地文件能力，而是“读已具备，写的应用层通道尚未建立”。

### 6.2 已批准的方案

本项目采用轻便、易维护的 `方案 A`：

在现有 Next.js 应用内部增加一层受控的本地文件访问层，由该层统一负责 story package 文件的读取、校验、写回和错误处理。

这意味着：

- 不新增额外 daemon / companion 进程
- 不引入 Electron / Tauri 这类桌面壳
- 不让浏览器直接读写磁盘
- 不做“任意路径、任意文件”的自由文件管理器

### 6.3 第一阶段作用域

第一阶段只支持仓库内受控目录的读写，重点是：

- `src/story-packages/<package>/scene.yaml`
- `src/story-packages/<package>/phase-plans.yaml`
- `src/story-packages/<package>/world-base.yaml`
- `src/story-packages/<package>/audit-questions.yaml`
- `src/story-packages/<package>/router-lexicon.yaml`

是否扩展到更多本地文件，留待后续单独设计；当前不做“任意磁盘路径选择器”。

### 6.4 推荐架构形态

推荐给 coding agent 的实现形态如下：

1. `StoryPackageRepository`
   唯一负责 story package 文件系统读写的服务层。
2. `Section DTO / View Model`
   为“世界与角色 / 故事结构 / 控制模块 / 组装与校验”提供各自稳定的读写模型，不让页面直接操作底层 YAML 结构。
3. `Route Handlers` 或 `Server Actions`
   作为 Web UI 发起读取/保存时的受控入口。
4. `Schema Validation`
   利用现有类型和 schema，在写入前校验结构合法性。
5. `Atomic Write Utils`
   统一处理临时写入、替换、报错与回滚，避免半写入损坏文件。

### 6.5 推荐请求流

推荐的数据流如下：

`Section Page Form` -> `Server Entry` -> `StoryPackageRepository` -> `Schema Validation` -> `Atomic Write` -> `Reload StoryPackage Aggregate` -> `UI Result`

关键含义：

- 页面只提交结构化字段
- server entry 只做鉴权、参数检查、调用服务
- repository 负责路径解析、读写和聚合
- 写入完成后，应返回最新可读状态，而不是只返回“成功”

### 6.6 必须遵守的工程约束

后续实现这层能力时，必须遵守：

1. 所有本地文件写操作必须集中在同一个服务层，不得散落在页面组件中
2. 浏览器端不得直接持有任何原始文件系统能力
3. 只允许写入受控白名单路径，禁止任意路径穿透
4. 页面层不应直接拼接磁盘路径
5. 页面层不应直接操作原始 YAML 文本
6. schema 校验必须发生在写回前，而不是只在读入时校验
7. `Memory Placeholder` 的当前策略不能因为新增写能力而被复制成多处硬编码

### 6.7 为什么选这个方案

这个方案最适合当前阶段，原因是：

- 它与现有 Next.js 架构天然连续
- 当前系统已经有服务端本地读取逻辑，补写入层的心智成本最低
- 它不会引入额外长驻进程，维护负担小
- 它最适合后续讨论“四个新页面如何映射到现有页面和现有 story package 文件”
- 它给未来 memory system 升级留下了清晰的服务层扩展位

### 6.8 当前明确不做的事

这一阶段明确不做：

- 任意磁盘路径浏览与写入
- 独立本地 daemon
- Electron / Tauri 桌面化封装
- 面向整个仓库的自由文件编辑器

## 7. 推荐信息架构

本次改版新增 4 个核心 section，作为新的作者配置主入口：

1. 世界与角色
2. 故事结构
3. 控制模块
4. 组装与校验

这四个 section 分别承担不同职责，必须严格避免越权。

---

## 8. Section 1：世界与角色

### 8.1 目标

这一页负责管理 story package 中的静态内容资产，也就是运行前已经存在、不会在每一轮运行时临时重建的内容基础。

它回答的问题是：

- 这个故事世界里有什么
- 谁是主角、核心角色、反派、重要配角、普通配角
- 世界规则、风格边界、地点素材是什么

### 8.2 应包含内容

- 世界观基础设定
- 世界规则 / 世界禁令 / 异常性质
- 题材基调与文风基底
- 玩家角色 / 主角定义
- 核心角色定义
- 反派角色定义
- 重要配角定义
- 普通配角定义
- 地点词池 / 场景元素
- 可出场 / 禁出场角色范围

### 8.3 对应当前系统对象

- `WorldBase`
- 未来可扩展的人物与地点结构化字段

### 8.4 不应包含内容

- `mainAxis`
- `endLine`
- `Phase` 数量和顺序
- `Audit Questions`
- `Light Cone Collapse`
- `Alpha/Beta`
- `Director Note Layer`
- provider/runtime 配置

### 8.5 给 coding agent 的实现提示

- 这页优先落成内容资产编辑页，而不是控制页
- 即使当前底层类型仍较扁平，也应在 UI 结构上预留角色分组与世界分组
- 不要把具体故事正文硬编码进 TypeScript 文件
- 当前如果必须兼容 `WorldBase` 的字符串型字段，也要让 UI 的分块结构清晰，便于后续升级成更结构化的数据模型

---

## 9. Section 2：故事结构

### 9.1 目标

这一页负责定义当前 story package 的具体故事组织方式，也就是 `SceneSpec`、`PhasePlan` 和 `AuditQuestionSet` 中最贴近作者掌舵的部分。

它回答的问题是：

- 这个故事要往哪里走
- 会分几个 Phase
- 每个 Phase 要完成什么
- 审计系统当前要盯什么

### 9.2 应包含内容

- `sceneName`
- `mainAxis`
- `endLine`
- `openingHook`
- 当前 sample purpose / 测试意图
- Phase 数量与顺序
- 每个 Phase 的 `phaseGoal`
- 每个 Phase 选用的梯度类型
- 每个 Phase 的 `routerHint`
- 全局审计问题
- 阶段特定审计问题
- 审计问题选择策略

### 9.3 对应当前系统对象

- `SceneSpec`
- `PhasePlan`
- `AuditQuestionSet`

### 9.4 不应包含内容

- 梯度机制本身的定义
- `Light Cone Collapse` 的机制定义
- `Director Note Layer` 的规则定义
- 记忆窗口策略
- provider/runtime 配置

### 9.5 给 coding agent 的实现提示

- “选择某个梯度类型”属于本页
- “定义梯度类型如何映射成 beat volume”不属于本页
- 审计问题在这一页应被视为作者控制输入，而不是隐藏系统规则
- 页面结构应明显突出 `mainAxis` / `endLine` / `Phase`，不能让模型参数看起来比故事控制更核心

---

## 10. Section 3：控制模块

### 10.1 目标

这一页负责 story package 内与故事内容解耦、但直接参与控制链路的模块配置与说明。

它回答的问题是：

- 系统靠哪些控制模块来稳住当前故事
- 这些控制模块在这个 story package 中怎么被理解和配置
- 当前版本哪些控制模块还是占位能力

### 10.2 应包含内容

- `Phase Gradient` 的作者可理解定义
- `Beat Volume` 映射与展示
- `RouterProfile`
- `verbLexicon`
- `Light Cone Collapse` 的机制说明与边界配置入口
- `Alpha/Beta` 的可读表达
- `Director Note Layer` 的固定抓取逻辑说明
- `Memory Placeholder` 的当前窗口策略和扩展预留位

### 10.3 关于三个关键模块的明确约束

#### `Light Cone Collapse`

- 必须被视为 Scene/Phase 级的边界控制模块
- 不能被错误实现成简单的 UI 文案模板或“抽象写作术语”
- 需要让作者能理解 `mainAxis`、`endLine`、`Alpha/Beta` 的关系

#### `Director Note Layer`

- 保持当前系统实现逻辑：由系统从既有控制态自动抓取并压缩成本轮局部约束
- 本次不向作者开放自定义编辑
- 可以展示其来源和作用，但不应把它做成一块自由文本输入框

#### `Memory Placeholder`

- 当前仍是占位模块，不是假装完整记忆系统
- 需要明确展示当前策略是“最近 5 个 accepted beats”
- 必须为未来 header/recall/长期记忆留出自然扩展位置

### 10.4 对应当前系统对象

- `RouterProfile`
- `Light Cone Collapse`
- `Director Note Layer`
- `Memory Placeholder`
- 与 `Phase Gradient` / `Beat Volume` 有关的控制映射

### 10.5 不应包含内容

- 具体角色卡正文
- 具体 scene prose
- provider/runtime 配置
- 手写 director note

### 10.6 给 coding agent 的实现提示

- `Light Cone` 和 `Director Note` 必须出现在同一 section 中，避免概念被拆散
- `Director Note` 采用只读或解释型 UI，而非编辑型 UI
- `Memory Placeholder` 必须被建模成一个未来可替换的模块位，而不是一个散落在多个页面里的隐形硬编码规则
- 如果底层当前只有最小实现，页面也应该先把模块边界表达清楚

---

## 11. Section 4：组装与校验

### 11.1 目标

这一页不是故事编辑页，而是当前 story package 的装配地图和完整性检查页。

它回答的问题是：

- 当前 package 里的对象是怎么接起来的
- 哪些数据由作者输入，哪些由系统推导
- 当前 package 是否已具备可运行条件
- 某个模块如果未来升级，例如 memory，从哪里接进来

### 11.2 应包含内容

- `WorldBase` 的进入路径
- `SceneSpec` / `PhasePlan` 的消费关系
- `AuditQuestionSet` 的接入关系
- `Light Cone Collapse` 到 `Director Note` / `Prompt Assembler` / `Auditor` 的链路
- `Memory Placeholder` 到 `precedingBeats` 的链路
- 当前 package 的字段来源说明
- 当前 package 的运行前完整性检查
- 缺 producer / 缺绑定 / 缺必要输入 的可视提示

### 11.3 对应当前系统对象

- `StoryPackage`
- `PromptObject`
- 各模块之间的依赖链
- 运行前校验结果

### 11.4 不应包含内容

- 大量故事正文编辑
- provider/runtime 配置
- 与当前 package 无关的全局管理

### 11.5 给 coding agent 的实现提示

- 这一页更像“装配地图 + 校验台”，不是常规表单页
- 它的价值在于把隐藏在代码里的绑定规则显式化
- 未来 memory 系统升级时，应优先考虑在这里扩展接线关系与状态说明
- 如果某些信息目前只能从现有 story package 聚合得出，这一页可以先做成解释型/只读型界面

---

## 12. 四个 section 的最短定义

- 世界与角色：定义内容资产
- 故事结构：定义故事推进
- 控制模块：定义控制系统
- 组装与校验：定义接线关系与完整性

## 13. 与当前实现的映射

当前系统里已经存在一批可直接映射到新 IA 的对象和模块：

- `WorldBase` -> 世界与角色
- `SceneSpec` / `PhasePlan` / `AuditQuestionSet` -> 故事结构
- `RouterProfile` / `Light Cone Collapse` / `Director Note Layer` / `Memory Placeholder` -> 控制模块
- `StoryPackage` 聚合结果与模块依赖关系 -> 组装与校验

这意味着本次改版不是从零发明一套新概念，而是把现有 Spec 和实现里已经存在的对象边界，转译成更适合作者操作的页面结构。

## 14. 对 coding agent 的统一约束

后续任何 coding plan 或实现，都应遵守以下约束：

1. 不要引入 `project != story package` 的新层级
2. 不要把 provider/runtime 配置迁入新的作者配置页
3. 不要把 `Light Cone Collapse` 错做成一般性的创作术语模块
4. 不要把 `Director Note Layer` 做成作者自由输入框
5. 不要把 `Memory Placeholder` 的“最近 5 个 accepted beats”策略硬编码到多个页面或多个模块
6. 不要把角色、世界观或故事正文硬编码进 TypeScript 源码
7. 不要让页面组件直接读写磁盘路径或原始 YAML 文本
8. 本地文件修改能力必须收口到受控服务层和白名单路径策略
9. 如果实现改变了行为、对象边界、工作流或契约，必须同步更新 `vendor/LOGOS-SPEC/`

## 15. 推荐的后续 coding plan 拆解方向

为了方便后续 AI coding agent 执行，建议下一步 coding plan 按以下顺序拆解：

1. 建立受控的本地文件访问层，包括 repository、路径白名单、校验与原子写入
2. 为 webapp 提供受控的 server entry，用于页面读取和保存 story package 数据
3. 定义新的页面路由与导航骨架
4. 为四个 section 建立只读/半只读的结构壳，先验证 IA 与字段归属
5. 把现有 story package 数据映射到四个 section 的展示模型
6. 再逐步增加编辑能力，优先从“世界与角色”“故事结构”开始
7. 最后补“控制模块”“组装与校验”的解释型与校验型界面

这样拆的好处是：先验证页面边界和对象归属，再进入复杂编辑，不容易让 AI coding agent 一上来就把所有逻辑搅在一起。

## 16. 当前结论

本次改版的核心不是做一个更漂亮的工作台，而是把 LOGOS 当前已经存在的对象和控制逻辑，组织成一套作者真正能操作、AI coding agent 也能稳定实现的页面结构。

本设计稿确认以下最终结论：

- 新作者配置主入口采用 4 section 结构
- section 名称固定为“世界与角色 / 故事结构 / 控制模块 / 组装与校验”
- play/workbench 页面继续保留，provider setup 继续留在原位
- `Director Note Layer` 不开放作者自定义
- `Memory Placeholder` 必须明确保留升级空间
- redesign 后的 webapp 将采用受控的仓库内本地文件读写方案
- 这份设计稿将作为后续 coding plan 的起点
