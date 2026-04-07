# Progress

## 2026-04-07

- 已建立 `docs/superpowers/phase-4/` 独立工作记忆入口：
  - `task_plan.md`
  - `progress.md`
  - `findings.md`
- 当前 `Phase 4` 已冻结并写入独立入口的结论包括：
  - 新 agent 固定为 built-in `sidecar` 的 `weaver agent`
  - `控制台` 将改造成 `agent 管理页面`
  - `weaver` 作为 `新建故事包 -> 文本导入` 路径的一部分
  - `weaver` 不做导入预览，不切 `phase` / `beat`
  - `gossipelog` 采用 `创建后 bootstrap + 首次 Play 前 bounded fallback` 的双阶段初始化方向
- 仓库级恢复口径已从 `Phase 3` 收尾，切换为 `Phase 4` 准备态。
- 当前已记录的 `Phase 4` 准备结论只有这些：
  - 正式 `Phase 4` spec / implementation plan 还未落盘
  - 现有明确产品信号仍是 `new import agent` 与 `real agent management operations`
  - `gossipelog agent` 是当前代码库里已经落地的第一个真实 sidecar agent
  - `coordinator` 继续只是 authoring coordinator，不是 sidecar agent roster 的一员
- `Phase 3` 现在已经是主线基线，不再是待执行计划：
  - `PR #6` 合入了 `Part 1`
  - `PR #7` 合入了 `Part 2`
  - `PR #8` 合入了 `Part 3`
- 当前编辑器默认第一页已经切换为 `故事包管理`，并正式提供：
  - package selector
  - storyline workspace
  - checkpoint rail 分叉
  - safe delete storyline
  - local `new story package`
- `Phase 3` 最终验证基线已经冻结：
  - targeted `Part 3` 测试通过：`9` 个测试文件、`119` 个测试通过
  - `npm run type-check:simulation` 通过
  - `npm run test:simulation` 通过：`35` 个测试文件、`349` 个测试通过
  - `npm run build` 通过
  - `npm test` 全量通过：`84` 个测试文件、`686` 个测试通过
- 浏览器验收结论已经固定：
  - 左栏只显示 package 名称
  - `新建故事包` tile 为浅灰底、单层虚线
  - 创建新包后会切到新包的 `故事包管理`
  - 删除 active storyline 需要确认，并自动切换到相邻可用 line
  - 最后一条 storyline 不能删除
- 本轮仓库级文档整编已经完成：
  - 根目录三件套改成 `Phase 3` 已合并完成的口径
  - `docs/superpowers/phase-3/` 与根目录索引重新同步
  - 总 spec 已补齐 merged baseline 说明
  - `docs/codemaps` 已更新到 `Phase 3` 最终形态
  - `README.md` 已按当前页面与工作流重写
  - 新增 `coding-agent-guide.md`

## 2026-04-06

- `Phase 3 Part 2` 完成实现、验证、独立 review 与 PR 提交。
- `Phase 3 Part 3` 完成 spec、implementation plan 与执行，实现 safe delete storyline 与 local package scaffold。
- `故事包管理` 的最终 UI / UX 已冻结：
  - 左侧 package selector 只显示包名
  - 右侧 workspace 保持 restrained 信息密度
  - beat rail 横向增长，不换行
  - beat 节点点击后展开 `确认 / 取消`

## 2026-04-03

- `Phase 2` 完成 runtime continuity substrate，并为 `Phase 3` 提供 package-scoped checkpoint graph 与 active session 基础。

## 2026-04-02

- `Phase 1` 完成 editor surface 与 authoring model 第一轮重构。

## 2026-04-01

- 建立根目录三件套作为仓库级恢复入口，并把 roadmap 整理成 phase 化推进方式。
