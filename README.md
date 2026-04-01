# LOGOS Narrative Editor

LOGOS Narrative Editor 是一个面向互动小说、文字冒险和文字 RPG 创作的叙事控制系统原型仓库。
它不是普通的聊天外壳，也不是把一大段 Prompt 塞给模型的试验页，而是把作者真正关心的东西拆成可编辑、可验证、可运行的结构：世界与角色、故事结构、控制模块、组装与校验，以及运行时的 Beat 级生成闭环。

当前这套仓库的核心目标，不是“做出最终产品”，而是先把 LOGOS 作为产品最重要的控制骨架做出来并跑通。用更直白的话说，它想解决的问题是：作者如何不用手写庞大 Prompt，也能对故事的方向、节奏、边界、选项和生成结果做结构化控制。

按照现在已经落地的状态，这个仓库已经完成了第一版可用闭环：

- 一个新的 Title 页面，负责统一入口和运行配置。
- 一个 Play Workbench，负责实际跑 Scene / Phase / Beat 的生成循环。
- 一个 LOGOS Narrative Editor，负责作者侧的四个正式页面编辑。
- 一条 coordinator-first 的保存与验证路径，用来把页面编辑安全地写回故事包。
- 一套 sample story package 和完整测试，用来验证这套控制结构确实可运行。
- 一套已经结构化的世界与角色写法，用来把主角、核心角色、反派和场景出场边界正式拆开。

从产品定位上看，LOGOS 可以理解成“面向文字叙事的 RPG Maker”，只是它的基本单位不是地图块和事件树，而是 `Scene`、`Phase`、`Beat`、`Volume`、`Router`、`Alpha/Beta` 和 `Director Note` 这些叙事控制对象。当前仓库已经把这套对象拆进了页面、模块、故事包和测试里，能够同时被人类作者和 AI coding agent 理解与使用。

## 文档位置

- `docs/`
  当前仍在使用的运行说明、贡献说明和代码地图。
- `docs/superpowers/`
  仅用于尚未完成、仍在推进中的 plan 和 spec。
- `archive/docs/superpowers/`
  已完成并合入主线的 superpowers 计划、设计稿、review notes 和过程记录。

## 当前已完成

### 1. 标题页与统一入口

- `localhost:3000` 默认进入新的 Title 页面。
- Title 页面内置 `Provider Setup`，并与 Workbench 共用同一份运行配置。
- Title 页面提供两个主入口：
  - `Play Workbench`
  - `Narrative Editor`

### 2. Play Workbench

- 支持从本地运行配置启动真实 provider，或在未配置时回落到 demo adapter。
- 支持 Scene 初始化、开场 Hook、Beat 推进、选项选择、自由输入、审计重写和状态更新。
- 支持查看 Prompt 状态、当前 Beat、历史记录、运行诊断和状态面板。
- 已经接入第一阶段 `gossipelog agent` 侧边流程，会在 accepted beat 之后刷新 story package 自己的关系状态，并把动态关系层送入下一轮生成。

### 3. LOGOS Narrative Editor

当前正式页已经固定为四个：

1. `WorldBase & Cast`
2. `Scene & Phase Authoring`
3. `Control Modules`
4. `Package Wiring Validation`

这四页已经统一接到同一个 editor shell 里，页面切换、返回入口和辅助说明区也已经收口到同一套结构。
其中 `WorldBase & Cast` 已经把世界信息、主角、核心角色和反派拆成独立结构；`Scene & Phase Authoring` 也已经能够直接编辑当前 Scene 的出场角色，而不需要作者手动改 YAML。

### 4. 作者保存与验证链路

- 页面编辑不是直接改文件，而是先走结构化保存请求。
- 保存之后会进入验证、写回、重载和诊断汇总。
- `Package Wiring Validation` 不是普通编辑页，而是整包的检查与解释页。

### 5. 样例故事包与回归测试

- 仓库内置 `sample-scene`，用于验证当前控制结构。
- 测试覆盖：50+ 测试文件，覆盖阈值 80%。
- 测试域：核心引擎、模块、API 适配、E2E、作者链路、UI 组件、页面。

### 6. Gossipelog Agent

- 第一阶段 `gossipelog agent` 已经合入主线。
- 它不是新的主引擎，而是运行在叙事引擎旁边的一条关系侧边流程。
- 每轮 accepted beat 之后，它会读取当前场景工作集、更新 story package 里的长期关系状态，并为下一轮生成准备动态关系层。
- 它当前已经具备等待后台刷新、no-op、失败回退和超时回退这些基础保护，不会把不确定关系状态直接带进下一轮。

## 版本历程

| 版本 | 发布日期 | 标志性进展 |
|------|----------|------------|
| v1.0.0-stable | 2026-03-21 | 运行时闭环稳定，首版可用系统 |
| v1.2.0-neue-brutalism | 2026-03-26 | Neue Brutalism 视觉重塑 |
| v1.3.0-narrative-editor-zh | 2026-03-29 | 编辑器全界面中文化 |
| v1.3.1 | 当前 | 已接入 gossipelog agent 第一阶段关系侧边流程 |

### 7. 角色结构与场景出场控制

- `world-base.yaml` 已经把主角、核心角色和反派拆成独立结构，而不是继续混在一整段人物文本里。
- 每个正式角色都有稳定身份标记，后续可以作为记忆系统和跨场景引用的锚点。
- `scene.yaml` 已经支持单独记录当前场景的出场角色名单。
- Narrative Editor 已经提供对应的场景出场角色编辑入口，作者默认不需要直接查看或手写 YAML。

## Roadmap

以下不是当前开发要求，而是后续迭代方向：

### 正在设计阶段

- **角色系统重构**：将 WorldBase 中的角色拆分为结构化对象，支持 stable character ID，为后续 memory system 做准备
- **Agent 管理页**：为后续多个 sidecar agent 提供统一管理入口
- **编辑器页面再拆分**：将当前 `WorldBase & Cast` 拆成两个更清晰的管理页面

### 新模块（未来）

1. 基于 Beat Volume 的轻量记忆系统
2. 角色关系可视化编辑
3. 存档系统（故事包存取）
4. 多 Scene 编排
5. Sparkii 创意写作助手（AI agent 辅助）
6. Agent 管理与观察能力

### 功能改进（未来）

1. 自定义 Phase 的 Beat 数
2. 自定义段落梯度
3. 人物角色系统进一步适配 RPG 的角色技能
4. 选项生成系统兼容 RPG 的技能
5. 叙事系统agent化

## 快速开始

### 环境要求

- Node.js 18+
- npm
- 可选：任一受支持模型供应商的 API Key

### 安装与启动

```bash
npm install
npm run dev
```

默认打开地址：

- Title 页面：`http://localhost:3000`
- Play Workbench：`http://localhost:3000/play`
- Narrative Editor：`http://localhost:3000/edit`

### 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm test
npm run test:core
npm run test:ui
npm run test:e2e
```

## 怎么使用

### 1. 从 Title 页面开始

打开首页后，先在 `Provider Setup` 中填写：

- `Provider` — 从预设中选择（Anthropic / MiniMax / OpenAI / Custom Provider）
- `API Key` — 对应供应商的 API 密钥
- `Model` — 从预设的模型列表中选择（Custom 模式下手动输入）
- `Base URL` — 预设模式下自动填充，Custom 模式下手动输入

支持的预设供应商：

| Provider | Base URL | 默认模型 |
|----------|----------|---------|
| Anthropic | `https://api.anthropic.com` | claude-sonnet-4-20250514 |
| MiniMax | `https://api.minimaxi.com/anthropic` | MiniMax-M2.7 |
| OpenAI | `https://api.openai.com/v1` | gpt-4o |
| Custom | (手动填写) | (手动填写) |

展开 `Advanced Parameters` 可以为每个操作模式（Collapse / Route / Generate / Audit / Settlement）独立调整 temperature 和 max tokens。

点击 `Save Runtime Config` 后，这份配置会同时被 Title 页面和 Workbench 读取。
非 Anthropic / OpenAI 域名的 API 请求会自动通过服务端代理转发，无需担心 CORS 限制。

### 2. 用 Play Workbench 跑故事

点击 `Play Workbench` 进入运行页后，你会看到三块主区域：

- 左侧：运行配置与 Prompt 状态
- 中间：当前 Beat、输入区和选项区
- 右侧：状态检查与当前 Scene 状态

标准使用方式：

1. 保存运行配置
2. 点击 `Start Round`
3. 选择选项或输入动作
4. 观察生成、审计、重写和接受结果

### 3. 用 Narrative Editor 写故事包

点击 `Narrative Editor` 后，你会进入四页编辑器：

#### WorldBase & Cast

用于定义世界基底、主角、核心角色、反派、配角和地点池。
这是作者先把“故事发生在什么世界、有哪些人”写清楚的地方。
当前版本里，主角、核心角色和反派已经分开保存和加载，新增角色也会自动获得稳定身份，便于后续跨场景引用和记忆系统接入。

#### Scene & Phase Authoring

用于定义 Scene 的整体骨架、出场角色，以及每个 Phase 的目标、终点、名称和附注。
这是作者控制“故事怎么推进、这一幕让谁上场、每一段做什么”的地方。

#### Control Modules

用于定义真正会影响生成控制的模块，包括：

- Light Cone
- Director Note Additions
- Auditor Question Set
- Beat Volume Definitions
- Router Profiles

这是作者控制“系统怎么写、怎么审、怎么收”的地方。

#### Package Wiring Validation

用于查看整个故事包的健康状态、装配结果和问题列表。
它不负责日常写作，而是负责告诉作者“哪里还没接好、哪里需要回去修”。

## 总体结构

这套系统可以分成两条主链：

1. 运行时链路：把故事包送进生成循环，产出 Beat 级文本和选项。
2. 作者链路：把页面编辑内容送进保存、验证和重载流程，更新故事包。

### 运行时链路

运行时的主干顺序是：

`Player Input → State Convergence → Routing → Director Note → Prompt Assembly → LLM Generation → Audit → Rewrite Loop → Output`

对应到仓库里的职责（11 个模块）：

- `orchestrator`：负责整条运行时主循环
- `light-cone-collapse`：收束当前叙事边界
- `narrative-router`：决定本轮走哪种叙事路径
- `director-note-layer`：为当前回合补充控制约束
- `option-generator`：生成玩家可选的交互选项
- `prompt-assembler`：拼出真正发给模型的 prompt 对象
- `auditor`：判断当前结果是否过线
- `audit-resolver`：决定通过、重写还是强制接受
- `phase-gradient`：把阶段梯度转成可运行的节奏变化
- `phase-consequence-settlement`：处理 Phase 结束后的结算结果
- `memory-placeholder`：预留给后续轻量记忆系统扩展

### 作者链路

作者链路的主干顺序是：

`Page Draft → Structured Save Request → Coordinator / Bridge → Validation → Writeback → Reload → Diagnostics`

当前已经落地的关键点：

- 页面上的编辑内容先整理成结构化字段，而不是直接写文件
- coordinator 负责解释请求和组织保存
- bridge / persistence 负责验证、写回和重载
- 失败时会返回阻塞信息，而不是静默写坏故事包
- 角色主档和场景出场边界已经分开写回，不再依赖一整段混合人物文本

## 项目结构

```text
LOGOS-Narrative-Editor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Title 页面
│   │   ├── play/               # Play Workbench
│   │   ├── edit/               # Narrative Editor (四页)
│   │   ├── components/         # 16 个可复用组件
│   │   ├── api/                # API routes (LLM 代理、coordinator)
│   │   ├── runtime-config.ts
│   │   └── story-package-catalog.ts
│   ├── engine/                 # 核心引擎
│   │   ├── orchestrator.ts     # 主循环
│   │   ├── modules/            # 11 个运行时控制模块
│   │   └── api-adapter/        # 模型适配层
│   ├── authoring/              # 作者编辑链路
│   │   ├── contracts.ts
│   │   ├── coordinator/
│   │   ├── persistence/
│   │   └── sections/           # 四页草稿逻辑
│   ├── lib/                    # 工具函数 (deep-freeze 等)
│   ├── testing/                # 测试工具
│   ├── story-packages/         # 嵌入样例包
│   └── types/                  # Zod schemas + TypeScript types
├── story-packages/             # 外层故事包目录
├── docs/                       # 当前设计文档
├── archive/                    # 归档材料
│   ├── docs/                   # 归档设计说明
│   └── vendor/LOGOS-SPEC/      # 归档规格快照
└── README.md
```

## 设计风格

LOGOS 使用 Neue Brutalism 设计风格：

- JetBrains Mono + Space Grotesk 字体组合
- brutal shadows (`4px 4px 0 #000000`)
- monospace-heavy aesthetic
- 强边框、高对比、信息密度优先

## 页面与模块说明

### 首页模块

#### TitleLandingSurface

作用：

- 承担 GitHub 以外、应用内部的第一个入口页
- 让作者先确认项目身份，再进入运行或编辑
- 把运行配置和入口动作放到同一张页面上

#### RuntimeConfigForm / ConfigPanel / CollapsiblePanel

作用：

- 统一管理 Provider 预设、API Key、Model 和 Base URL
- 支持 Advanced Parameters（per-operation temperature / max tokens 覆写）
- 保存到本地 localStorage
- 被 Title 页面和 Workbench 共用
- ConfigPanel 在 Workbench 中包含 Runtime Usage 诊断
- CollapsiblePanel 提供统一的展开/收起行为

### 运行页模块

#### PlayWorkbench

作用：

- 把故事包、运行配置和引擎连接起来
- 控制回合开始、输入提交、结果呈现和状态更新

#### AuthorControlPanel

作用：

- 显示当前 Scene、运行来源和顶部动作入口

#### PromptStatusPanel

作用：

- 显示当前运行环节的调用状态和用量

#### BeatDisplay / PlayerInput / BeatHistory

作用：

- 展示当前 Beat
- 承接玩家输入
- 展示历史回合

#### StateInspector

作用：

- 展示当前 Scene 的状态快照
- 帮助作者理解“系统现在认为故事走到了哪一步”

### 编辑页模块

#### EditWorkbench

作用：

- 承接四个正式编辑页
- 管理草稿、保存状态、重新加载和局部结果反馈

#### PageActionBar / SectionTabs / PageHelperPanel

作用：

- 提供统一的页面切换、返回入口和辅助说明
- 保持四页在同一个编辑器外壳里工作

#### 四个正式编辑页

- `WorldBaseCastSection`
- `ScenePhaseAuthoringSection`
- `ControlModulesSection`
- `PackageWiringValidationSection`

它们分别对应作者的四种工作：设定基底、编排结构、定义控制、检查整包。

## 面向 AI 的说明

如果你是 AI coding agent，理解这个仓库时可以先抓住三件事：

1. 运行时和作者编辑链路是分开的，不要把“生成故事”和“写回故事包”混成一套逻辑。
2. 故事内容必须留在 story package 里，代码不能写死具体故事文本。
3. `archive/` 里的材料现在是归档参考，不是高于当前人类要求、当前代码和当前测试的唯一主规范。

建议阅读顺序：

1. 本 README
2. [AGENTS.md](./AGENTS.md)
3. [archive/docs/narrative-editor-branch.md](./archive/docs/narrative-editor-branch.md)
4. 当前涉及页面或模块的实现代码
5. `archive/` 中对应的历史说明

## 相关材料

- 分支约定：[archive/docs/narrative-editor-branch.md](./archive/docs/narrative-editor-branch.md)
- 归档说明：[archive/README.md](./archive/README.md)
- 产品定位参考：[archive/vendor/LOGOS-SPEC/01_PRODUCT/vision-and-scope.md](./archive/vendor/LOGOS-SPEC/01_PRODUCT/vision-and-scope.md)
- 当前重构主记录：[archive/docs/narrative-editor-redesign/master-record.md](./archive/docs/narrative-editor-redesign/master-record.md)

## License

Private — All rights reserved.
