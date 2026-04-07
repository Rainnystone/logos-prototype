# Findings

## 最终恢复点

当前 `branch/narrative-editor` 已包含合并后的 `Phase 1`、`Phase 2` 与 `Phase 3 Part 1 / Part 2 / Part 3`。后续恢复上下文时，不应再把这些能力看成“待执行 spec”。

最短恢复顺序应是：

1. [AGENTS.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/AGENTS.md)
2. [task_plan.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/task_plan.md)
3. [progress.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/progress.md)
4. [findings.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/findings.md)
5. [docs/superpowers/specs/2026-04-06-phase-3-master-design.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/specs/2026-04-06-phase-3-master-design.md)
6. `docs/codemaps/*.md`
7. [README.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/README.md)
8. [coding-agent-guide.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/coding-agent-guide.md)

如果当前任务是 `Phase 4` 准备，还应额外补读：

9. [archive/docs/narrative-editor-redesign/master-record.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/archive/docs/narrative-editor-redesign/master-record.md)
10. [docs/superpowers/specs/2026-04-02-phase-1-model-surface-design.md](/Users/tachikoma/Desktop/DEV/logos-narrative-editor/docs/superpowers/specs/2026-04-02-phase-1-model-surface-design.md)

## Phase 4 准备入口

- 当前 `docs/superpowers/specs/` 与 `docs/superpowers/plans/` 里还没有正式的 `Phase 4` 文档。
- 现阶段最明确的 `Phase 4` 产品信号仍来自已有设计文档里的 deferred scope：
  - `new import agent`
  - `real agent management operations`
- 架构入口边界已经很明确：
  - `coordinator` 不是 first-class sidecar agent
  - 当前仓库里第一个真实落地的 sidecar agent 是 `gossipelog agent`
- 因此，`Phase 4` 准备应默认建立在现有 `Phase 3` substrate、deterministic bridge、以及已有 agent seam 之上，而不是重新打开 `Phase 3` 的基础设计。

## 当前冻结产品结论

- `checkpoint` 继续是 package-scoped immutable node。
- `storyline` 是作者比较、继续与分叉的主边界。
- `storyline-repository.json`、`runtime-sessions.json` 与 `variants/<variantId>/...` 已组成 `Phase 3` 的正式 substrate。
- `故事包管理` 是 editor 默认第一页。
- `create from source` 已覆盖大部分作者对“复制一条线再继续改”的真实需求。
- `archive` 与独立 `duplicate` 已从 `Phase 3` 主线移出。
- `Part 3` 的最终主线是：
  - safe `delete storyline`
  - local `new story package`
  - destructive-action UX
  - final verification

## 当前最值得记住的工程边界

- 页面不能直接写 YAML；authoring 保存必须走 deterministic bridge。
- package creation 必须走服务端 scaffold，不允许浏览器直接写文件。
- 新建 story package 必须直接创建显式 `Phase 3` scaffold，而不是 legacy 空壳。
- 删除 storyline 时不删除 package-scoped checkpoint graph；删除的是 storyline 管理对象及其私有绑定。

## 文档角色分工

- 根目录三件套：
  - 仓库级总控索引
  - 当前真实状态摘要
  - 恢复入口
- `docs/superpowers/phase-3/`：
  - `Phase 3` 的主工作记忆
- `docs/superpowers/specs/` 与 `docs/superpowers/plans/`：
  - 正式 spec / implementation plan
- `docs/codemaps/`：
  - 当前代码地图
