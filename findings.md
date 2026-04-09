# Findings

## 2026-04-09 Final Verification Freeze

- 这轮 `weaver` import contract optimization 的边界在最终验证后保持不变：
  - 只做 reference / prompt / shared contract / provider schema / parser / deterministic seed-mapping 对齐
  - 不改 `weaver` sidecar 架构
  - 不拆 skill
  - 不改 UI / UX
  - 不新增 author-facing reminder 流程
- 最终验证结果已经确认：
  - targeted regression suite 通过
  - 全量 `npm test` 通过
  - `npm run build` 通过
  - `git diff --check` 通过
- 构建过程里出现的失败不是产品代码回归，而是本地 `@next/swc-darwin-arm64` 二进制损坏；重新安装同版本依赖后恢复正常。
- 当前没有发现需要继续扩大的设计缺口，后续只保留这条冻结边界：reference / contract alignment only。

## 2026-04-09 Weaver Implementation Planning

- 这轮 implementation planning 的边界已经再次冻结：
  - 只优化 `weaver` 的 reference / prompt / shared contract / provider schema / parser / deterministic seed-mapping 对齐
  - 不改 `weaver` sidecar 架构
  - 不拆 skill
  - 不改 UI / UX
  - 不新增 author-facing reminder 流程
- 当前最合适的 shared contract owner 仍然是：
  - [src/types/weaver.ts](src/types/weaver.ts)
- 当前实现层的真正风险不是“模型不会回 JSON”，而是六层对同一 payload 的描述没有完全对齐：
  - heavy reference
  - prompt `[Output Contract]`
  - shared `WeaverImportPayloadSchema`
  - provider response schema
  - parser validation schema
  - deterministic import-seed mapping
- `warnings` / `unresolvedGaps` 这轮不应作为主优化目标：
  - 它们可以作为兼容字段继续保留
  - 但不应在 reference 或 prompt 中被强调成主要输出目标
  - 这轮也不需要把它们转成作者界面提醒
- “最小可用结构”是保底，不是目标：
  - `weaver` 仍应尽可能多抽取有证据支持的字段
  - 但当证据不足时，name-only shape 必须在代码里真实可用，而不是只存在于文档里
- reviewer 最终确认的两个关键 guardrail 已写进 plan：
  - provider response schema 对齐必须覆盖 `hero`、`antagonists`、`locations`，不能只覆盖局部字段分支
  - prompt / reference 必须继续显式写出 `suggestedPackageName` 和 `openingHook` ownership 边界
- dedicated worktree 现在已经重新同步到最新 `branch/narrative-editor`，并在本地重新跑通了全量 `npm test`；因此后续执行 plan 时不再受先前依赖状态不一致的结论干扰

## 2026-04-09 Phase 4 Weaver 成功率优化讨论

- 当前 `weaver` 的主要短板不是“是否返回 JSON”，而是四层约束没有完全说同一种话：
  - reference 偏原则化
  - prompt 里的 `Output Contract` 只列顶层 key 名
  - provider response schema 对 `worldBase` / `hero` / `coreCast` / `locations` 仍是宽泛 passthrough object
  - `import-seed` 写盘时实际依赖的是更具体的中间字段名
- 当前代码里 `import-seed` 实际期待的中间导入字段比 reference 写得更具体：
  - `worldBase.settingSummary`
  - `worldBase.worldRules`
  - `worldBase.toneBaseline`
  - `worldBase.locationPatch`
  - `worldBase.npcCharactersSummary`（可选 fallback）
  - `hero.displayName` / `hero.roleSummary`
  - `coreCast[*].displayName` / `coreCast[*].roleSummary`
  - `antagonists[*].displayName` / `antagonists[*].roleSummary`
  - `locations[*].displayName` / `locations[*].summary`
- 这意味着 `weaver` 现在实际上已经有一个“中间导入 contract”，只是它主要藏在代码映射里，没有在 reference 和 prompt contract 里被明确冻结。
- 从成功率角度看，最值得进一步写清楚的是：
  - `worldBase` 的具体中间字段结构
  - `hero / coreCast / antagonists / npcCharacters / locations` 的最小输出 shape
  - `Output Contract` 中每个 key 的类型、是否可省略、何时应为空数组、何时应把不确定性放进 `warnings` / `unresolvedGaps`
- 相比之下，“输入一定长得像什么格式”不适合写得过硬；`weaver` 的产品前提就是接受自由文本。更合适的做法是：
  - 保持输入源自由
  - 在 reference 里增加 1 到 2 个贴近书稿/连续正文的 extraction examples
  - 用例子说明如何从长段文本抽取中间 contract，而不是强行定义输入语法
- 当前最明显的设计缺口是：
  - reference 说 `worldBase` 是 “structured world foundations inferred from explicit text evidence”
  - 但没有冻结具体子字段
  - prompt 只写 “Return JSON only with keys ...”
  - 却没有把每个 key 的 shape、allowed omissions 和 bounded fallback 讲明
- 当前独立判断：
  - 需要进一步写清楚
  - 优先级最高的是 `worldBase` 结构与完整 output contract
  - 次优先级是增加少量高质量 extraction examples
  - 最不值得做的是把输入文本格式硬编码成一种固定模板
- 新冻结的产品边界：
  - `weaver` 允许局部失败；抽不出来的结构可以留空，只要把不确定性沉到 `warnings` / `unresolvedGaps`
  - `weaver` 不应因为字段缺失而变成阻塞性失败，更不应把“现在请作者手动补完”作为默认主路径
  - `hero / coreCast / antagonists / npcCharacters / locations` 的最小可用 shape 可以压到“名称字段存在即可”；其它摘要字段按证据提供
- 因此优化方向应从“加强提取覆盖率”转成“让 contract 更轻、更稳、更容易命中”：
  - 顶层 contract 继续严格
  - 中间对象 shape 变轻
  - 缺失值默认走空对象 / 空数组 / 空字符串，而不是 provider 级失败
  - 但这不意味着鼓励稀疏输出；优化目标仍然是“尽可能多抽、但每个字段都有最小可用落点”
- 后续你又进一步明确：
  - 不需要额外设计新的 author-facing reminder / UX 机制
  - 如果 `warnings` / `unresolvedGaps` 最终为了兼容性被保留，它们也不应变成作者界面里的主要提醒内容

## 外部最佳实践摘录

- OpenAI Structured Outputs 文档明确建议：
  - key 命名要清楚直观
  - 为重要字段写清 `title` / `description`
  - 使用 `strict: true` 与明确 schema 约束来提高 adherence
- Anthropic Prompting Best Practices 明确建议：
  - 对输出格式和约束保持具体
  - 用清楚分段的 prompt 组织 instructions / context / examples
  - 对复杂高准确率任务，few-shot examples 能明显提升一致性
- Gemini Structured Output 文档明确建议：
  - `response_json_schema` 应真实描述目标输出
  - `title` / `description` 会帮助模型理解字段
  - schema 过深会带来复杂度成本，因此应优先保持“简洁但明确”的中间 schema，而不是把最终持久化 schema 全量直接塞给模型

## 当前产出

- 正式 spec：
  - [docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md](docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md)
- 已完成 spec review，并通过最终只读核对。

## Recovery Order

1. [docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md](docs/superpowers/specs/2026-04-09-phase-4-weaver-import-contract-optimization-design.md)
2. [task_plan.md](task_plan.md)
3. [progress.md](progress.md)
4. [findings.md](findings.md)
5. [docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md](docs/superpowers/plans/2026-04-09-weaver-import-contract-optimization-implementation.md)
