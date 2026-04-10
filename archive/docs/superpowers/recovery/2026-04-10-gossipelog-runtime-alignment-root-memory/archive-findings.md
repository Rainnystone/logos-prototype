# Findings

## Active Findings

### 作者端现状

- 当前 `/edit` 是分 section 的结构化作者端工作台，一次只激活一个主要编辑区，不是长文档或白板式编辑器。
- 现有作者输入主要由结构化字段与 `textarea` 组成，核心压力在数据建模与保存一致性，不在复杂文本排版。
- 作者端保存链路仍以 deterministic bridge 为中心，图形编辑必须最终回到结构化节点/边数据，而不是自由文本。

### `pretext` 阶段性判断

- `pretext` 的核心能力是精确文本测量与布局，不是图编辑框架，也不是富文本编辑器。
- 对当前作者端，`pretext` 的独立整合优先级偏低；它更适合作为未来图节点标签测量或复杂布局稳定性的增强件。
- 如果后续关系图节点需要多语言、多行标签、布局前精确测量，`pretext` 价值会上升，但它不是当前阶段主轴。

### 图编辑框架结论

- 主选：`XYFlow / React Flow`
  - 原因：React-first、节点/边受控状态自然、与 Next.js 作者端壳层最贴合、适合结构化图编辑。
  - 适用：人际关系图第一版；中等复杂度 scene graph。
- 备选：`AntV X6`
  - 原因：更像完整图编辑引擎，适合未来更重的 scene graph、组合/端口/嵌套等高级编辑语义。
  - 代价：更重、更像独立编辑器框架，接入与维护心智更高。
- 保留候选：
  - `AntV G6`：更偏图可视化与布局分析，可作为关系图偏分析展示路线的备选。
  - `Cytoscape.js`：图模型与分析强，但不是 React 作者端优先路线。
- 不建议作为当前主路线：
  - `vis-network`
  - `reagraph`
  - `D3` 自建
  - `projectstorm/react-diagrams` 仅适合作为次级备选

### `gossipelog` reference 相关发现

- 仓库已经有 sidecar reference manifest 与加载机制，见 `src/agents/registry.ts` 和 `src/agents/reference-loader.ts`。
- `weaver` 已完整使用该机制，并通过 `resolvedReferences` 把规则文本注入 provider 请求。
- `gossipelog` 当前 `referenceManifestsByOperation` 为空，说明 reference 接线尚未建立。
- `gossipelog` 当前 system prompt 只规定了输出 shape 和候选集边界，没有规定：
  - 什么算关系证据
  - baseline 与 recentDelta 的分界
  - 何时 invocationNoOp
  - 何时 highlightNextPrompt
  - 如何区分瞬时情绪波动与稳定关系沉淀
- 因此当前最优先的工作不是画关系图，而是先补齐 `gossipelog` 的 reference 与提取规则。

### `gossipelog` / sidecar skill 机制补充

- 这个仓库里的 sidecar `skill` 不是独立 prompt 文件，而是五层组合：
  - `definition.ts`：声明 `skillIds`、展示文案、reference manifest
  - `agent.ts`：负责 deterministic shell、边界裁剪、持久化与 fallback
  - `prompt-templates.ts`：拼系统提示和用户提示
  - `LLMAdapter`：提供具体的 skill 调用方法
  - 可选 `reference-loader.ts`：把静态 markdown reference 解析后注入 request
- `weaver` 已完整走通这套机制；`gossipelog` 目前只走通了 `definition + agent shell + adapter + prompt`，reference 仍未挂上。
- `gossipelog` 当前持久化的还不是“关系记忆”，而是 Phase 1 的方向性关系记录：
  - 每条边只有 `baseline`
  - 一个 `recentDelta`
  - 一个 `highlightNextPrompt`
- 这说明它当前更像“关系状态缓存”，还没有记住证据来源、长期演化轨迹、可回顾摘要或人物侧记忆视角。
- `agent-surface` 对 `gossipelog` 的“等待初始化”并不是它自己单独判断，而是结合 `weaver` 的 import summary 与 `gossipelog` 状态文件是否可读共同推导出来的。

### 已确认 bug

- `gossipelog` 的 runtime route 没有和 active storyline variant 对齐。
- 证据链是闭合的：
  - `/play/page.tsx` 会先 `resolveActiveStorylineContext(...)`，再把 `authoredRootOverride` 传给 `loadRuntimeStoryPackage(...)`，因此页面主工作台看到的是 active storyline 对应的 authored workspace。
  - 但 `/api/play/gossipelog/route.ts` 只拿 `storyPackageName`，直接调用 `loadRuntimeStoryPackage(storyPackageName)`，没有读取 storyline context，也没有 `authoredRootOverride`。
  - `runGossipelogCycle(...)` 的候选角色、scene cast framing、以及 injection request 全部依赖传入的 `storyPackage`。
- 结果是：只要 active storyline variant 的 `scene.yaml`、`world-base.yaml` 或其他 authored 内容和 package 基线不同，主 play runtime 与 gossipelog cycle 看到的就不是同一份运行时材料。
- 这不是单纯“未来要优化”的缺口，而是当前调用链里已经存在的数据源错位。
- 同时要注意：`gossipelog` 的关系状态文件仍然通过 `resolvePackageRoot(packageName)` 落在 package 根，这一层是 package-owned 设计；真正出错的是 runtime read-model 没有对齐 active storyline authored root。

- `PlayWorkbench` 在 `gossipelog` 同步或 finalize 长时间悬挂时，确实可能把输入永久锁住。
- 证据链也是闭合的：
  - 前端把每次 `gossipelogCycleRunner(...)` 包在 `trackedGossipelogCycleRunner` 里，创建一个 `PendingRelationshipSync`
  - [PlayWorkbench.tsx](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/app/play/PlayWorkbench.tsx) 里的 `isInputLoading` 明确把 `isRelationshipSyncPending` 并入输入禁用条件
  - [PlayerInput.tsx](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/src/app/components/PlayerInput.tsx) 的所有按钮和自由输入都直接受 `isLoading` / `disabled` 控制
  - 这个 pending sync 只有在 gossipelog cycle promise resolve / reject，或者 runtime-session `finalizeRelationshipLayer(...)` 返回后才会 settle
  - 前端自己没有 timeout 或 cancel；browser gossipelog bridge 也没有 fetch timeout
- engine 的 `waitForPendingRelationshipRefresh()` 虽然有 2 秒 timeout，但它发生在“下一次 runBeat 开始组 prompt 前”；一旦 UI 已经因为 `isRelationshipSyncPending` 禁止用户再次提交，engine timeout 不会主动把页面解锁。
- 因而，只要 `/api/play/gossipelog` 请求或后续 finalize 链路长时间悬挂，页面就会停在“accepted beat 已显示，但所有输入仍被禁用”的状态。
- 这不是单纯 UX 不佳，而是实际可见的运行时死锁面。
- 用户已明确确认该问题的修复方向：前端要对齐 engine 现有语义，即超时后允许继续使用上一份稳定 `relationshipLayer`，而不是把系统改成无限阻塞等待 gossipelog 完成。

- `orchestrator` 在“已超时的旧 refresh 晚到，且 finalization 持久化失败”这条并发路径上，可能把较新的关系真相错误回滚掉。
- 证据链目前可自洽：
  - `scheduleRelationshipRefresh(...)` 在 `src/engine/orchestrator.ts` 里会先计算一次 `matchesCurrentCheckpoint = isCurrentCheckpointBinding(refresh)`，然后才 `await finalizeRelationshipLayer(...)`
  - 如果旧 refresh 已经 timeout 解锁，后续 beat 已继续推进，那么 `currentCheckpointId` 和 `queuedRelationshipLayer` 可能在这段 `await` 期间前移到更新状态
  - 但一旦 finalization 在稍后失败，catch 仍会使用这次 await 之前缓存下来的 `matchesCurrentCheckpoint`
  - 结果是：旧 refresh 可能在已经不再代表当前 checkpoint 的情况下，仍把 `queuedRelationshipLayer` 回滚成它自己的 `fallbackLayer`
- 当前测试覆盖了“晚到成功不污染 live truth”和“finalization 失败后 accepted beat 仍然 durable”，但没有覆盖“晚到失败 + checkpoint 已前移”的交错分支。

### Task 2 复核备注

- 最新一轮只读 code quality reviewer 的输出与当前 worktree 实际状态不一致，不能整包采信。
- 主线程已确认其中两条结论属于误报：
  - `src/agents/gossipelog/runtime-contract.ts` 在当前 worktree 中实际存在
  - `src/engine/orchestrator.ts` 与 `src/engine/__tests__/orchestrator.test.ts` 已经改为引用共享 wait timeout 常量，而不是继续各自硬编码 `2_000`
- 因此当前真正新增、需要进入下一轮修复的是上面这条 `orchestrator` 并发回滚风险，而不是 reviewer 报出的“共享常量未落地”。
- 该并发回滚风险现已在当前 worktree 中完成修复，并新增回归测试锁定：
  - `scheduleRelationshipRefresh(...)` 不再在 `await finalizeRelationshipLayer(...)` 之前缓存 checkpoint 绑定判断
  - live truth 写入与 fallback 回滚都改为在真正执行时重新判断 `isCurrentCheckpointBinding(refresh)`
  - 已通过主线程 red → green、spec review、code quality review、`npm run test:core`、`npm run build` 与全量 `npm test`

### 外部调研来源范围

- 本轮框架判断优先基于 GitHub 官方仓库、README、官方 docs 入口与少量官方 discussion / issue 线索。
- 关键仓库：
  - `xyflow/xyflow`
  - `antvis/X6`
  - `antvis/G6`
  - `cytoscape/cytoscape.js`
  - `retejs/rete`
  - `visjs/vis-network`
  - `projectstorm/react-diagrams`
  - `reaviz/reagraph`
