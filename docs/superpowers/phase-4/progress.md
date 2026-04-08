# Phase 4 Progress

## 2026-04-08

- `Phase 4` implementation plan 已在当前分支执行到最终同步阶段，`Task 1` 到 `Task 6` 的代码切片已经落地。
- `Task 7` 验证已经执行过：
  - 指定 targeted suite 结果为 `14` 个测试文件通过、`1` 个测试文件失败、`180` 个测试通过、`1` 个测试失败。
  - `npm run build` 通过，只有既存的 ESLint warning。
  - `npm test` 结果为 `88` 个测试文件通过、`2` 个测试文件失败、`743` 个测试通过、`2` 个测试失败。
  - 两个失败都来自 `gossipelog responsibilitySummary` 仍按英文文案断言。
- Phase 4 相关文档、spec、implementation plan 的相对链接检查已用 `python3` 通过；当前环境不存在 `python` 命令。
- 浏览器验收本次没有完成：
  - Playwright MCP 因 `/.playwright-mcp` 无法创建而失败。
  - `playwright-cli open http://127.0.0.1:3001/edit` 没有返回可继续交互的可用输出。

## 2026-04-07

- 建立 `docs/superpowers/phase-4/` 作为 `Phase 4` 的独立工作记忆入口。
- 记录当前已经冻结的方向：
  - 新增 built-in、`always-on` 的 `weaver agent`
  - `控制台` 页面将改造成 `agent 管理页面`
  - `Phase 4` 暂不引入 `extension agent`
  - `weaver` 作为 `文本导入创建新故事包` 的主入口能力
- 冻结 `weaver` 的主链路方向：
  - 入口位于 `故事包管理 -> 新建故事包`
  - 先选 `空白创建 / 文本导入`
  - 文本导入不做预览
  - `weaver` 解析后尽量复用现有服务端建包链路落盘
- 冻结 `weaver` 的 sidecar 架构方向：
  - `weaver` 应复用 `gossipelog` 的统一 sidecar 骨架
  - 不新增私有 `AGENTS.md` / `CLAUDE.md` / 独立 prompt markdown
  - 身份提示应放在代码里的 system prompt / static instruction
  - 当前推荐 `1` 个 `weaver-import-skill`，不按 world/cast/location 拆成多个 skill
  - 当前推荐为 `weaver-import-skill` 配置 `1` 份按需披露的重 reference
  - sidecar 架构本身应支持统一 reference 装载，供 `weaver` 与后续 `gossipelog` 共用
  - 当前推荐不是“每个 sidecar 各写一套 loader 基础设施”，而是“统一 loader 框架 + sidecar 自己声明 manifest / resolver”
  - 如果需要强调 sidecar 的独立性，独立点应放在 resolver / loader spec，而不是缓存、注入、权限或 token budget 的底层实现
  - `prompt assembly` 继续作为统一对外 prompt 边界；reference 先由 sidecar manifest / resolver 完成解析，再交给 assembly 统一拼装
  - 主 skill 应保持精简，重 reference 不默认常驻，只在 sidecar 调用时按需装载
  - `SKILL.md` 与重 reference 分工应明确：前者写触发条件与边界，后者承载字段映射与细则
  - sidecar prompt 继续使用清晰分段 / 标签化上下文和结构化 JSON 输出
  - reviewer 已补充冻结：`weaver` heavy reference 是 repo 内静态 reference asset；其装载在 `Phase 4` 为 required，失败时在模型调用前 hard fail
  - reviewer 已补充冻结：`text_import` 的 package naming 优先级为“作者显式命名 > weaver suggestion > 否则失败并要求人工命名”
  - reviewer 已补充冻结：`12,000` 字符输入上限与 `4,000` token reference budget 不再只是建议，而是 `Phase 4` 默认值
- 冻结导入内容边界：
  - 重点解析 `worldbase`、`hero`、`core cast`、`antagonists`、`npc`、`locations`
  - 不切 `phase` / `beat`
  - 作者原始整段文本默认沉淀为 `opening hook`
- 冻结 `gossipelog` 的接入方向：
  - `weaver` 创建 package 后立即触发一次 bootstrap
  - 如果状态缺失或损坏，则在第一次 Play 前再执行一次 bounded fallback
- 基于以上冻结结论，新增正式 spec 草案：
- 基于以上冻结结论，新增正式 spec 草案：
  - [../specs/2026-04-07-phase-4-weaver-agent-management-design.md](../specs/2026-04-07-phase-4-weaver-agent-management-design.md)
  - spec 已收敛 `weaver` 导入边界、共享 sidecar reference loader、统一 prompt assembly 边界、agent 管理页形态与 `gossipelog` bootstrap 语义
  - spec 已完成一轮 reviewer 修订并通过第二轮 spec review，当前状态为“等待用户确认”
- 基于已确认 spec，新增 implementation plan：
  - [../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md](../plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md)
  - plan 已按 `writing-plans` 工作流完成 reviewer 修订，并通过最终 plan review
  - plan 已冻结 `text_import` contract、shared sidecar loader、`operationalHint` / `latestStateLine` 生产边界、`openingHook` ownership、以及 `gossipelog bootstrap/fallback` 的 authoring/play ownership
- 根目录三件套将退回仓库级总索引，只做最小引用与恢复入口维护。
