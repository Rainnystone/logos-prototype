# Findings

## 2026-04-09 当前发现

- 这轮问题集中在 `/play` runtime，而不是 `/edit` authoring。
- 从 codemap 看，`gossipelog` 既影响运行时关系层，也会反馈到 `/play` 页面状态，所以页面跳动和选项可用性大概率不是单一 CSS 问题，而是运行状态切换触发的 UI 重新装配。
- `runtime usage` 已按你的要求移出本轮范围，不再作为当前修复目标。
- API 报错后的残留内容问题，风险点在于：
  - 客户端把未 accepted 的内容先写进了展示态
  - 或服务端在失败路径里保留了不该落盘的会话片段
- 当前代码里的 `gossipelog` 不是完全静默后台：
  - accepted beat 落盘后，关系层刷新会异步继续执行
  - 但 orchestrator 会在下一轮生成前等待上一次未完成的关系层刷新
  - 这意味着它虽然不直接改当前 beat 展示，却会影响下一轮输入何时真正可继续提交
- 这里出现了一个待确认的产品语义冲突：
  - 已确认不改 `gossipelog` 的既定流程，也不改它对后续 prompt 组装的真实作用
  - 当前要修的是 UI/UX 感受：不要让用户看到它“接管 workbench 状态”，但在它未完成前仍应锁住输入，避免误触与重复提交
- review 进一步确认了当前实现计划需要补足三件事：
  - 页面跳动必须单独落成可执行测试与实现，不应只放在最终手动验收里
  - 错误路径不仅要测“当前页面没脏内容”，还要测 reload 后 continuity 仍一致
  - 因为主战场文件高度重叠，实现 worker 只能串行 dispatch，不适合并行写代码
- 当前这轮 `/play` 修补已经验证出的直接根因是两条：
  - `gossipelog` 的关系层 pending 需要一层独立的前台输入锁；不能只依赖 `generating/auditing/rewriting` 这些显式状态
  - `runtime config save` 触发的 workbench 重建需要区分“首次空白初始化”和“已有 accepted surface 的静默重水合”，后者必须保住 current beat / history / state inspector，不该回退到 `Initializing Scene...` 或 `Click Start Round...`
- 只读 reviewer 在生产补丁后补充确认了一个真实缺口：
  - 保存 runtime config 的静默重水合窗口里，之前确实存在“界面保留但 orchestrator 已被拆掉”的静默交互风险
  - 现在已经通过生产修补 + 新增回归测试覆盖住
- 仍保留一个后续可再看的边界：
  - `gossipelogCycleRunner` 如果超时或永久不返回，当前线程没有重新定义“前台何时应强制解锁”的产品语义
  - 本次修补保持了你当前要求的 UX 边界：未完成前锁输入；但没有额外引入 timeout-based 解锁策略
- 这次复盘后，仓库级 agent 文档分工也进一步明确：
  - [AGENTS.md](AGENTS.md) 更适合保留高层纪律、完成标准、implementation packet / subagent packet 规则
  - [coding-agent-guide.md](coding-agent-guide.md) 更适合承接首轮任务路由、入口文件、默认验证和并行/串行提示
  - 静态系统地图如果继续放在 `AGENTS.md`，对 packet 拆分帮助有限，反而会稀释高层纪律的信号强度

## 2026-04-09 `/play` 体感延迟优化探索

- 这个 worktree 的实现目标已经冻结为两条，不再继续发散：
  - `audit` 只检查当前新生成的 beat 与本轮 options
  - `audit off` 时采用“正文先流、选项和输入后置”的 streaming 路径，`audit on` 时维持现状
- 你已进一步确认 streaming 路径的失败语义：
  - 如果 `audit off` 的正文流式生成过程中最终失败，前端应回退已流出的临时正文，并显示错误状态
  - 失败草稿不保留在 continuity，也不继续展示为可交互内容
- 你随后又补充确认了具体 UX 边界：
  - 流式正文按较粗 chunk 更新，不做 token 级逐字动画
  - 状态文案继续保持 `Generating...`
  - 只有用户仍停留在底部时才自动滚动跟随
  - options 必须等完整 `GenerateResult` 成功后一次性出现
  - 输入区从提交开始一直锁到最终 options 到齐
  - `audit on` 完全维持现有非流式路径
- 本轮 spec 的越界边界也已明确：
  - 目标是优化体感延迟，不改变现有叙事控制方式
  - `audit` 读取范围收窄与 `audit off` 的正文流式显示被视为本轮允许变动
  - `router`、记忆系统、phase/beat 叙事控制逻辑不属于本轮实现范围
- 对第 7 项“audit 收窄后题目语义”的推荐收口是：
  - 采用“受限的 B”：不仅改 audit 输入上下文，也要把少数明显依赖跨拍历史的 audit 问题改写成“可由当前 beat + options 判断”
  - 不做全局 audit 体系重构，不新增第二审计器；只修正与新 contract 直接冲突的题目、fixture 和相关测试
- 因此以下议题在本 worktree 中暂不进入实现：
  - 历史窗口裁剪 / `memory placeholder` 收缩
  - sticky router
  - per-mode model split
  - `routerHint` 删除
- 新 worktree 基线已经确认可用：
  - `npm install` 完成
  - `npm test` 在新 worktree 中 90 个测试文件、755 个测试全部通过
- 当前对实现切面的第一轮判断是：
  - `audit` 语义收窄是一个相对独立的收口项，主要影响 `AuditPacket` schema、`auditor` 组包、audit prompt 和相关测试
  - streaming 双路径是中等体量改动，至少会触及 provider、proxy、adapter 接口、runtime/orchestrator 和 play workbench；但最小实现可以只覆盖 generate 主链，不需要同步流式化 route / audit / settlement / collapse

- 这次线程的“延迟”必须按用户体感定义：
  - 从玩家完成选择，到下一段正文重新出现在 workbench 的时间
  - 不是单纯某一个 API route 的 server timing
- 从截图直接观察到的首轮事实是：
  - 多个 `POST /api/llm/proxy` 落在大约 `17s` 到 `111s`
  - 同一截图里 `POST /api/play/packages/.../runtime-session`、`POST /api/play/gossipelog`、`POST /api/play/gossipelog/bootstrap` 大多只有几十到几百毫秒
  - 因此当前最粗粒度的瓶颈更像是远端 LLM 往返，而不是本地 Next route 本身
- 代码链路已经确认：一次正常的用户选择，不是“只调一次生成”
  - `runBeat()` 先做 `route`
  - 再做 `generate`
  - 然后做 `audit`
  - 如果 audit 不通过，会继续进入 rewrite 循环，最多把 `generate` 放大到 4 次
  - 如果该 beat 刚好结束 phase，还会额外串上 `settlement`、`collapse` 和下一 phase 的 `route`
- 因此，“关闭 auditor 可以降延迟”这个判断成立，但只覆盖其中一段：
  - 关掉 audit 后，最少还能剩下 `route + generate`
  - phase 边界时还会有 `settlement / collapse / next route`
  - 所以仅关 audit 不是根治，而是删掉一段串行 LLM 往返
- 当前仓库还有两个非常直接的延迟放大器：
  - 历史窗口 `getHistoryWindow()` 默认直接返回全部 accepted history，没有默认裁剪；`route / generate / audit` 都会随着游玩轮次一起吃下更长上下文
  - `generate` prompt 明确要求正文目标长度约 `1500-2500` 中文字符，同时默认 `generate.maxOutputTokens = 36864`；`collapse.maxOutputTokens` 也同样高到 `36864`
- 当前 runtime config UI 只允许调这 5 类 mode：
  - `collapse / route / generate / audit / settlement`
  - 但 adapter 层其实还支持 `gossipelogUpdateConfig / gossipelogInjectionConfig`
  - 也就是说，和体感延迟有关的 sidecar LLM 模式已经有接口层支持，但现在没有在 workbench 配置面板里暴露出来
- `gossipelog` 在当前实现里属于“后置异步，但会影响下一轮”
  - accepted beat 已经返回后才 `scheduleRelationshipRefresh()`
  - 它不会阻塞当前这段正文显示
  - 但下一次 `generateAcceptedBeat()` 之前会先 `waitForPendingRelationshipRefresh()`
  - 当前等待上限是 `2000ms`
  - 所以它更像“下一轮前的额外门槛”，不是本轮正文首次出现的主瓶颈
- 初始化前还会额外执行一次 `bootstrapGossipelogBeforePlayInitialization()`
  - 这影响的是首次进入 play workbench / 首次开局体验
  - 不是每次玩家点击选项后的常规链路
- `/api/llm/proxy` 只会在 base URL 不是官方 `api.openai.com` / `api.anthropic.com` 时启用
  - 截图里出现了 `/api/llm/proxy`
  - 说明当时实际运行路径很可能是 MiniMax 或其他自定义兼容端点，而不是官方 OpenAI/Anthropic 直连
  - 这会多一个本地 proxy hop，但从现有代码看，这一 hop 的本地开销远小于几十秒级别的远端等待
- 当前 sample scene 的 audit 默认不是很轻：
  - 默认 9 条问题
  - phase 1 / 2 还会额外 append 3 条
  - 也就是每轮 audit 至少要让模型对 9-12 条问题给出布尔判断
- 已用现成测试再次压实关键行为：
  - `src/engine/__tests__/e2e/audit-behavior.test.ts` 通过，并确认 audit fail-once 会把 `generate` 从 1 次放大到 2 次，fail-always 会放大到 4 次
  - `src/app/play/runtime.test.ts` 通过，说明当前 runtime tracking / 状态切换相关基础测试仍然稳定
- 你已进一步冻结了这轮讨论的关键边界：
  - `branch/narrative-editor` baseline / worktree 清理已由别的线程处理，本线程不介入
  - 不接受通过缩小 `memory placeholder` / 历史窗口来换延迟，因为这会直接伤到编辑器与 workbench 的游戏属性和记忆体验
  - 因此“压缩记忆窗口”退出优先候选，后续只能考虑不丢语义的记忆工程方案，例如缓存、结构分层、或把下一拍准备工作后置，而不是直接少喂历史
  - 当前你认同的方向仍然是：
    - 当前 beat 正文尽早可见
    - 尽量不为下一拍准备工作继续阻塞当前 beat 首次显示
    - 尽量减少结构上不必要的串行 LLM 往返
- 你随后又进一步把 `route` 和 `streaming` 的边界说死了：
  - `router` 不能改成 sticky 或跨 beat 复用；它必须每个 beat 都重新判断，因为它直接参与选项生成与下文生成的控制
  - `routerHint` 目前反而是可疑项，后续如果要精简控制层，更值得复查它是否还应存在
  - 目前唯一仍可讨论的 `route` 轻量化方向，是“只吃最近两轮上文”，但这个结论必须等代码和 archive spec 一起核对完
  - `audit` 预计大多数时候会关闭；如果 streaming 对体感提升明显，可以接受双路径：`audit` 开时默认不 stream，`audit` 关时默认 stream
- 你这轮又新增并冻结了两个判断：
  - `audit` 的产品语义应当只看“当前新生成的这一轮 beat + 本轮 options”，而不是再读取 preceding beats / 全历史；当前代码还没落实，本线程先记录为明确待改边界
  - `routerHint` 你倾向于删除；现有代码阅读已显示它更像 phase-level prior / fallback 提示，而不是 router 计算的核心输入，因此它若被移除，主要价值更可能是控制层清理，而不是显著改善体感延迟
- 基于当前代码，`routerHint` 对延迟的直接帮助目前看几乎可以忽略：
  - 它不会减少一次 LLM round-trip
  - 在 route prompt 里只是一行 `Phase routing prior`
  - 真正的删除成本主要来自 schema、authoring bridge、编辑器表单、诊断与测试面一起收缩，而不是 runtime 热路径本身
- 已补充一轮外部只读检索，和你当前仓库链路最相关的新结论是：
  - VPN、跨境链路、代理和转发网关主要放大的是 RTT 与抖动；当 runtime 一回合要串多次 LLM 请求时，这类网络代价会被反复叠加
  - 即便后续引入 streaming，如果中间代理仍做 buffering，体感上也会看起来“没有真流式”
  - streaming 的主要收益是降低“首个可见 token / 首句时间”，不等于显著降低完整正文全部返回的总耗时
  - 对叙事 runtime，更稳的思路是把玩家可见正文链路与 sidecar / 长分析路径拆开，而不是把所有模式都往同一条拥塞链路里塞
  - 对长正文主输出，纯文本 streaming 通常比对象流或大 JSON schema 流更稳；后者更容易出现“最后一股脑吐出”的假流式
- 当前仍在等待一个专项只读结论：
  - subagent 正在结合现行 `narrative-router`、`director-note-layer`、`prompt-assembler` 与 archive runtime spec，确认“router 每 beat 重算”是否确属硬约束，以及“route 仅吃两轮上文”是否会伤到既有叙事控制语义
- 真实 API 测试已经补出两个不同层级的问题：
  - 第一类是我们自己的 proxy 透传问题：上游响应被本地 fetch 解压后，`/api/llm/proxy` 仍把原始 `content-encoding` / `content-length` / `transfer-encoding` 头继续往下游透传，浏览器因此报 `ERR_CONTENT_DECODING_FAILED`
  - 第二类是 MiniMax `MiniMax-M2.5` 在当前兼容链路下的结构化输出不稳定：同一条链路上 `collapse` / `route` 可以成功，但 `generate` 曾返回 `【beatText】...` 这种非 JSON 文本，导致结构化解析失败
- 因此这轮真实验证后的判断是：
  - 早先的 decoding failed 明确是我们的 bug，已经通过 proxy header 清理修复
  - 后续出现的“非 JSON 结构化输出”更像是 MiniMax 在当前模型/兼容端点/网络环境下的指令遵循波动，不像是 streaming transport 自身损坏
- 在你开启 VPN + TUN 的真实环境下，成功轮次的体感时间已经测出：
  - 从点击 `Start Round` 到正文开始出现，约 `79.7s`
  - 从点击 `Start Round` 到最终 options 出现，约 `102.7s`
  - 正文先出现到 options 最终出现之间，约 `23.1s`
- 这次成功轮次同时验证了当前实现链路的一个关键事实：
  - 正文与 options 仍然来自同一次 `generate / streamGenerate` 请求，不是两次独立生成
  - 正文结束后用户继续等待的主要原因，不是第二次生成 options，而是 `runBeat()` 在返回前还会继续计算下一拍的 `nextRouter`
- 你已明确记录但暂不推进的后续想法：
  - `nextRouter` 虽然会拖慢本拍 options 可见时间，但它又受到玩家本拍选择的影响，本轮先不改这一条
  - 如果未来关闭 VPN + TUN，体感时间可能会明显回落；这一点保留为后续环境侧验证项，而不是当前代码改动目标

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

## 2026-04-09 Baseline 修复结论

- `branch/narrative-editor` 的 baseline 问题分成两层：
  - 环境可复现性问题：fresh worktree 会因为缺少 lockfile 而装出与主工作区不同的依赖状态，直接触发大量 Testing Library matcher 异常
  - 测试夹具问题：`sample-scene` 已经被真实使用并保留 storyline / runtime / variant 痕迹，但若干 baseline 测试仍把它当成 legacy baseline
- 主工作区与 fresh worktree 不一致的直接原因已经确认：
  - `.gitignore` 忽略了 `package-lock.json`
  - 主工作区本地存在一个未纳管 `package-lock.json`
  - fresh worktree 不会带上这个未纳管文件，因此 `npm install` 后的依赖环境与主工作区不同
- baseline 真实红测并不是主实现全面失效，而是 fixture 角色错位后的连锁反应：
  - `views.test.ts` 在复制 `sample-scene` 后写入自己的 `runtime-sessions.json`，却没有同步移除原先的 `storyline-repository.json`，导致 active storyline 仍绑定到 `sess_mnqsc90c_1`
  - `bridge.test.ts` / `package-state.test.ts` 默认把复制后的包当成“未 materialize 的 legacy package”，但复制得到的实际上已经包含 `storyline-repository.json` 和 `variants/`
  - 因此这些测试读到的是 `sample-scene` 的真实使用状态，而不是它们想验证的 legacy baseline
- 用户已明确要求：
  - `sample-scene` 的真实使用痕迹要保留，不能为了让测试绿而把它改回“干净模板”
- 因此修复策略已经冻结为：
  - 不修改 `sample-scene` 的当前状态
  - 由测试自己在复制 fixture 后剥离 `runtime-sessions.json`、`storyline-repository.json` 和 `variants/`
  - 同时把 `package-lock.json` 纳入分支改动，恢复 fresh worktree 可复现性

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

1. [AGENTS.md](AGENTS.md)
2. [coding-agent-guide.md](coding-agent-guide.md)
3. [task_plan.md](task_plan.md)
4. [progress.md](progress.md)
5. [findings.md](findings.md)
6. [docs/codemaps/architecture.md](docs/codemaps/architecture.md)
7. 按需读取 `/play`、`runtime-sessions`、`gossipelog` 相关代码
