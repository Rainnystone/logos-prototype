# Reading Order

## 为什么需要固定阅读顺序

LOGOS 不是一个单纯的页面项目，也不是一个只靠接口表就能解释清楚的后端服务。它同时包含叙事控制逻辑、提示词组装规则、审计闭环和作者配置面，因此如果没有固定的阅读入口，新的协作者或 coding agent 很容易直接跳入局部文件，继而误把样例当规范、误把 UI 当核心、或者误把原稿中的描述性语言当成最终契约。

固定阅读顺序的目的，正是为了降低这种误读。先读导航层，再读定义层，再读运行层，最后才读局部模块和样例，这样可以让后续实现建立在稳定语义之上，而不是建立在碰运气的理解上。

## 通用阅读顺序

 **注意**：本文档面向通用读者。
> **Coding Agent 请先阅读 `00_META/agent-guide.md`，以其为准。**

1. `README.md`
2. `00_META/system-map.md`
3. `00_META/status-board.md`
4. `TODO.md`
5. `01_PRODUCT/` 下的产品边界文档
6. `02_DOMAIN/` 下的术语与实体文档
7. `03_ORCHESTRATION/` 下的运行循环文档
8. `04_MODULES/` 下的目标模块文档
9. `05_CONTRACTS/` 下的共享结构文件
10. `06_FIXTURES/` 下的样例数据
11. `07_AUTHORING/` 与 `08_UX/` 下的作者和界面文件

## 按任务类型选择阅读路径

如果任务是“理解整个系统”，就应该按上面的完整顺序阅读。  
如果任务是“实现某个模块”，那么在通用顺序之后，只需要继续读该模块对应的模块文档、相关契约文件和必要的 fixture。  
如果任务是“评估产品边界”，则应该回到 `01_PRODUCT`，不要直接从模块层开始。  
如果任务与 API 适配器有关，那么现在应先读仓库内的正式 API 模块文档，而不是再回到旧路径猜测哪一份才算最终版本。  
如果任务与 UI 设计有关，那么应先读 `08_UX/` 上层规范，再读 `08_UX/design-artifacts/` 中的设计轮次产物。若任务与当前主工作台布局直接相关，则继续读 `08_UX/design-artifacts/ui-round-1-wireframes.md` 与同目录 `assets/` 下的图像参考。  
如果任务与 sample 故事内容有关，那么应先读 `06_FIXTURES/sample-scene/story-source/README.md` 与相关作者源稿，再读同层结构化 fixture；不要把“作者原稿”和“系统实际吃的结构化输入”混读。

## API 相关阅读规则

API 模块现在已经完成内化，并且已经拆分为总览 + 子文档结构。因此 API 相关工作建议按下面的顺序阅读：

1. `04_MODULES/api-adapter-lite/overview.md`
2. `04_MODULES/api-adapter-lite/interface-contracts.md`
3. `05_CONTRACTS/prompt-object-schema.yaml`
4. `05_CONTRACTS/audit-packet-schema.yaml`
5. `05_CONTRACTS/phase-consequence-packet-schema.yaml`
6. `05_CONTRACTS/collapse-packet-schema.yaml`
7. `05_CONTRACTS/audit-question-set-schema.yaml`
8. `05_CONTRACTS/state-snapshot-schema.yaml`
9. `04_MODULES/api-adapter-lite/schema-mapper.md`
10. `04_MODULES/api-adapter-lite/runtime.md`
11. `04_MODULES/prompt-assembler.md`
12. `04_MODULES/phase-consequence-settlement.md`
13. `04_MODULES/auditor.md`
14. `04_MODULES/audit-resolver.md`

如果任务只需要确认 API 模块的系统位置与职责边界，读完 `overview.md` 即可。
如果任务涉及请求体、响应体和字段映射，则必须继续读 `interface-contracts.md` 与相关 schema。
如果任务涉及 provider 映射、结构化输出能力、Token 预检或 localhost 原型代理，则再读 `schema-mapper.md` 与 `runtime.md`。
`implementation-guide.md` 仍属于非规范性附录，应只在需要参考原型落地细节时按需加载，而不应作为通用首读正文。

旧路径（原为本机 OneDrive 绝对路径，已废弃） 现在只保留迁移说明，用来承接旧链接；它不再是可供实现或 review 依赖的正文来源。

## 当前阶段说明

当前仓库已经完成第一轮规格建模，并且已经把 API 正文收回仓库内部。同时，`08_UX/design-artifacts/` 已开始承载当前主工作台的 round-1 设计产物。因此，这份阅读顺序文件现在的重点不再只是“先知道怎么读”，而是确保不同角色在进入实现、UI 设计和故事包整理时，仍然从同一套权威文件出发，并且始终把设计轮次产物放在上层规范之后阅读。
