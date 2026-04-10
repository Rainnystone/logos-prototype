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
