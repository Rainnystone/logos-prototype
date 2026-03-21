---
module: api-adapter-lite/contracts
title: API Adapter Lite — 核心接口契约
type: module
priority: core
depends_on:
  - api-adapter-lite
contracts:
  - 05_CONTRACTS/prompt-object-schema.yaml
  - 05_CONTRACTS/audit-packet-schema.yaml
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/collapse-packet-schema.yaml
tokens_estimate: 4000
reading_context:
  - 04_MODULES/api-adapter-lite/overview.md
status: v1-complete
last_updated: 2026-03-20
---
## 3. 核心接口契约（生成 / 审计 / 阶段结算 / 光锥坍缩）

API 适配器对外暴露四个方法：`generate()`、`audit()`、`settlePhaseConsequences()` 和 `collapse()`，分别服务 Prompt 组装器、审计员、阶段后果结算模块，以及 Orchestrator 的光锥坍缩链路。

### 3.1 主生成模式（mode: "generate"）

**调用方**：Prompt 组装器（`promptAssembler.js`）

**请求格式**：

```json
{
  "mode": "generate",
  "prompt": {
    "worldBase": {
      "mainCharacters": "主角团人物设定全文...",
      "npcCharacters": "按需加载的配角设定...",
      "locationPatch": "当前地点环境词池..."
    },
    "history": [
      { "role": "assistant", "content": "（Beat 1 正文）" },
      { "role": "user", "content": "玩家选择了：追踪可疑人影" },
      { "role": "assistant", "content": "（Beat 2 正文）" }
    ],
    "narrative": {
      "mainAxis": "Scene 叙事主轴...",
      "endLine": "Scene 终点线...",
      "phaseGoal": "当前 Phase 目标...",
      "alpha": "激进极边界描述...",
      "beta": "消极极边界描述..."
    },
    "directorNote": {
      "volume": "High",
      "router": "动作/战斗",
      "verbLexicon": ["强攻", "牵制", "防御", "脱离"],
      "beatConstraints": "本轮正文生成约束文本...",
      "optionConstraints": "本轮选项生成约束文本..."
    }
  },
  "provider": "kimi",
  "model": "kimi-k2.5",
  "generationConfig": {
    "temperature": 0.8,
    "topP": 0.95,
    "maxOutputTokens": 2048
  }
}
```

**重写路径上的附加字段（仅 retry 时出现）**：

```json
{
  "generationControl": {
    "isRewrite": true,
    "retryCount": 1,
    "rewriteFeedback": "必须修复阻塞项：4 个选项要保持正交，并移除越出 Alpha/Beta 的动作。",
    "previousDraft": {
      "beatText": "（上一版失败正文）",
      "options": [
        "上一版选项 1",
        "上一版选项 2",
        "上一版选项 3",
        "上一版选项 4"
      ]
    }
  }
}
```

**字段说明**：
- `prompt.worldBase`：对应 Prompt 组装器 Layer 1（世界基础）
- `prompt.history`：对应 Prompt 组装器 Layer 2（记忆上下文，前序 5 个 Beat）
- `prompt.narrative`：对应 Prompt 组装器 Layer 3（叙事主轴 + 光锥参数）
- `prompt.directorNote`：对应 Prompt 组装器 Layer 4（导演批注，最高优先级）
- `prompt.generationControl`：retry-only 的显式控制包，不属于第五层叙事语义；只在重写路径上回传 `retryCount`、`rewriteFeedback` 与上一版失败草稿
- `provider` / `model` / `generationConfig`：由前端从 `logos.config.json` 读取后放入请求体传给后端（后端以请求体为准，apiKey 则只从 config 文件读取）

**与上游状态契约的字段映射（整合时对照用）**：

| API 输入字段 | 上游来源 | 映射说明 |
|---|---|---|
| `prompt.narrative.endLine` | `StateSnapshot.sceneState.endLine` → `PromptObject.narrative.endLine` | 全链路统一使用 `endLine`，不再使用 `endState` 别名。 |
| `prompt.history[]` | `StateSnapshot.roundState.historyWindow` → `PromptObject.history` | 历史窗口先由 Prompt Assembler 规整为对话数组，再交给适配器。 |
| `prompt.directorNote.volume` | `StateSnapshot.roundState.currentVolume` → `PromptObject.directorNote.volume` | 声量属于编排层状态，API 适配层只消费收束后的导演批注结果。 |
| `prompt.directorNote.router` | `StateSnapshot.roundState.currentRouter` → `PromptObject.directorNote.router` | 运行态路由会继续进入生成链路，但不应再被 Director Note 文本重复包装成硬锁。 |
| `prompt.directorNote.verbLexicon` | `StateSnapshot.roundState.verbLexicon` → `PromptObject.directorNote.verbLexicon` | 运行态行为词典会继续进入生成链路，但不应再被 Director Note 文本改写成固定选项模板。 |
| `prompt.directorNote.beatConstraints` | `Director Note Layer.beatConstraints` → `PromptObject.directorNote.beatConstraints` | 面向正文的约束文本由导演批注层生成，必须保留其段落纪律要求；SchemaMapper 不得稀释“多段输出、墙文本视为失败”的控制语义。 |
| `prompt.directorNote.optionConstraints` | `Director Note Layer.optionConstraints` → `PromptObject.directorNote.optionConstraints` | 面向选项的约束文本由导演批注层生成，重点约束正交性与 OOC 检查；当前版本不再把 runtime router / verb lexicon 写进该文本块作为硬锁。 |
| `prompt.generationControl.retryCount` | `StateSnapshot.evaluationState.retryCount` → `PromptObject.generationControl.retryCount` | 只在 retry 路径上挂载。 |
| `prompt.generationControl.rewriteFeedback` | `Audit Resolver.RewriteFeedback` → `PromptObject.generationControl.rewriteFeedback` | 由 Orchestrator 负责收束并交给 Prompt Assembler。 |
| `prompt.generationControl.previousDraft.beatText` | `StateSnapshot.generationState.currentBeatText` → `PromptObject.generationControl.previousDraft.beatText` | 明确把上一版失败正文回传给生成链路。 |
| `prompt.generationControl.previousDraft.options[]` | `StateSnapshot.generationState.currentOptions` → `PromptObject.generationControl.previousDraft.options[]` | 明确把上一版失败选项回传给生成链路。 |
| `prompt.context.precedingBeats[]` | `StateSnapshot.roundState.historyWindow` → `AuditPacket.context.precedingBeats` | 审计包复用同一历史窗口，但以审计视角命名为 `precedingBeats`。 |

**响应格式（规范性契约：`GenerateResult`）**：

```json
{
  "beatText": "（Beat 正文 2000-4000 字）",
  "options": [
    "追踪可疑人影进入小巷",
    "返回安全区域重新部署",
    "联系队友请求支援",
    "就地隐蔽观察动向"
  ],
  "usage": {
    "promptTokens": 3500,
    "completionTokens": 1200,
    "totalTokens": 4700
  },
  "tokenReport": {
    "worldBase": { "tokens": 800, "percent": 23 },
    "history": { "tokens": 1500, "percent": 43 },
    "narrative": { "tokens": 600, "percent": 17 },
    "directorNote": { "tokens": 600, "percent": 17 },
    "generationControl": { "tokens": 0, "percent": 0 },
    "total": 3500,
    "limit": 262144,
    "warning": null
  },
  "raw": {}
}
```

> 说明：本结构是 generate 模式的唯一规范性返回契约。后续章节中不再使用 `{ content, usage, raw }` 作为 generate 的中间返回表示；如果原型实现需要保留 `raw`，它也只属于 `debug-only` 调试字段，不属于下游业务逻辑可依赖的稳定字段。

**`tokenReport.warning` 可能的值**：
- `null`：正常
- `"APPROACHING_LIMIT"`：总 Token > 模型上下文窗口的 70%
- `"HISTORY_OVERFLOW"`：history 占比 > 50%（提示叙事控制中心该做 Header 压缩）

### 3.2 审计模式（mode: "audit"）

**调用方**：审计员（`auditor.js`）

**请求格式**：

```json
{
  "mode": "audit",
  "prompt": {
    "context": {
      "precedingBeats": [
        { "role": "assistant", "content": "（Beat 1 正文）" },
        { "role": "user", "content": "玩家选择..." },
        { "role": "assistant", "content": "（Beat 2 正文）" }
      ]
    },
    "generatedContent": {
      "beatText": "（本轮生成的 Beat 正文）",
      "options": [
        "A. 选项 1 文本",
        "B. 选项 2 文本",
        "C. 选项 3 文本",
        "D. 选项 4 文本"
      ]
    },
    "auditQuestions": [
      "Beat 正文是否符合当前声量（High）的要求？",
      "4 个选项是否具有明显区分度？",
      "选项是否都在光锥边界内？",
      "是否出现角色 OOC 行为？"
    ]
  },
  "provider": "kimi",
  "model": "kimi-k2.5",
  "generationConfig": {
    "temperature": 0.1,
    "maxOutputTokens": 512
  }
}
```

**关键差异**：
- `temperature` 必须 ≤ 0.1（审计需要确定性，不需要创造力）
- `maxOutputTokens` 只需 512（只返回是/否）
- prompt 结构完全不同于主生成模式

**响应格式（规范性契约：`AuditResult`）**：

```json
{
  "answers": [true, true, false, true],
  "usage": {
    "promptTokens": 2800,
    "completionTokens": 50,
    "totalTokens": 2850
  },
  "raw": {}
}
```

**`answers` 字段由后端统一校验后生成，前端/审计员不解析自然语言 `content`**：
- **后端职责**：Vite 中间件在 audit 模式下，只接受供应商返回的原生结构化结果；后端负责把 provider 响应解包、校验为 `AuditResult`，再返回给前端。前端拿到的永远是标准化后的 `answers[]`。
- **规范性要求**：正式支持的 provider / model 组合必须声明 audit 结构化输出能力。若当前模型不支持结构化输出，后端直接返回 `{ "answers": null, "error": "STRUCTURED_OUTPUT_UNSUPPORTED" }`，而不是退回脆弱文本解析。
- **防御性检查**：如果结构化结果无法通过 `AuditResult` 校验，例如 `answers` 数量与 `auditQuestions` 数量不一致，后端返回 `{ "answers": null, "error": "STRUCTURED_OUTPUT_INVALID" }`，审计裁决器视为审计失败，触发重写。
- **原型兜底说明**：文本 fallback 只允许作为 prototype debug 手段存在，不构成本文档的规范性契约，也不应成为本仓库其他模块的默认依赖路径。

---

### 3.3 阶段后果结算模式（mode: "settlement"）

**调用方**：Phase Consequence Settlement（Phase 结束处理时）

**请求格式**：

```json
{
  "mode": "settlement",
  "prompt": {
    "context": {
      "mainAxis": "Scene 叙事主轴...",
      "endLine": "Scene 终点线...",
      "phaseGoal": "刚结束的 Phase 目标...",
      "sceneProgress": "当前 Scene 推进摘要..."
    },
    "phaseTranscript": [
      { "role": "assistant", "content": "（本 Phase 已接受的 Beat 1 正文）" },
      { "role": "user", "content": "玩家选择了：追踪异常来源" },
      { "role": "assistant", "content": "（本 Phase 已接受的 Beat 2 正文）" }
    ]
  },
  "provider": "kimi",
  "model": "kimi-k2.5",
  "generationConfig": {
    "temperature": 0.2,
    "maxOutputTokens": 768
  }
}
```

**字段说明**：
- `prompt.context`：阶段后果结算所需的 Scene / Phase 上下文
- `prompt.phaseTranscript`：当前 Phase 已接受的 `user / assistant` 转录，不得混入失败草稿
- `temperature` 应收束到 `0.2`，因为该步骤应偏向稳定抽取而不是创造性扩写
- `maxOutputTokens` 设为 `768`，输出只包含少量后果条目与一段结算说明

**响应格式（规范性契约：`PhaseConsequenceResult`）**：

```json
{
  "phaseConsequences": [
    "雾间凪已确认异常并非偶发，而是可追踪的外部操控。",
    "藤花仍未察觉异常全貌，队伍认知开始出现不对称。",
    "走廊电子噪声范围缩小，异常影响从扩散转入收束。"
  ],
  "settlementTrace": "结算依据：提取了本阶段中已经被接受的角色认知变化、关系差异与环境变化，过滤掉尚未发生的计划性表述。",
  "usage": {
    "promptTokens": 1500,
    "completionTokens": 220,
    "totalTokens": 1720
  }
}
```

**`PhaseConsequenceResult` 校验规则**：
- `phaseConsequences` 必须是非空字符串数组
- 每个后果条目都必须是已发生事实，而不是建议、目标或假设
- `settlementTrace` 必须是非空字符串
- `usage` 统一归一化为 `{ promptTokens, completionTokens, totalTokens }`

> 说明：settlement 模式的规范性契约定义见 `05_CONTRACTS/phase-consequence-packet-schema.yaml`。该模式只在 Phase 结束处理时被调用，用来生成 `CollapsePacket.phaseConsequences` 的规范性来源。

### 3.4 光锥坍缩模式（mode: "collapse"）

**调用方**：Orchestrator Control Hub（Phase 结束处理时）

**请求格式**：

```json
{
  "mode": "collapse",
  "prompt": {
    "context": {
      "mainAxis": "Scene 叙事主轴...",
      "endLine": "Scene 终点线...",
      "currentAlpha": "当前激进极边界描述...",
      "currentBeta": "当前消极极边界描述...",
      "sceneProgress": "当前 Scene 推进摘要...",
      "completedPhaseGoal": "刚结束的 Phase 局部目标..."
    },
    "phaseConsequences": [
      "后果条目 1：角色状态变化...",
      "后果条目 2：环境变化...",
      "后果条目 3：NPC 关系变化..."
    ]
  },
  "provider": "kimi",
  "model": "kimi-k2.5",
  "generationConfig": {
    "temperature": 0.5,
    "maxOutputTokens": 1024
  }
}
```

**字段说明**：
- `prompt.context`：当前 Scene 的方向信息与现有边界，供 LLM 理解推演起点
- `prompt.phaseConsequences`：由 settlement 模式结算出的真实后果条目，是推演的核心输入
- `temperature` 应收束到 `0.5`，因为边界推演需要确定性推理与适度发散的平衡
- `maxOutputTokens` 设为 `1024`，输出只包含两段边界描述和一段推演说明

**响应格式（规范性契约：`CollapseResult`）**：

```json
{
  "alpha": "下一阶段的激进极边界描述...",
  "beta": "下一阶段的消极极边界描述...",
  "inferenceTrace": "从阶段后果到新边界的推演说明...",
  "usage": {
    "promptTokens": 1800,
    "completionTokens": 400,
    "totalTokens": 2200
  }
}
```

**`CollapseResult` 校验规则**：
- `alpha` 必须是非空字符串
- `beta` 必须是非空字符串
- `inferenceTrace` 必须是非空字符串
- `usage` 统一归一化为 `{ promptTokens, completionTokens, totalTokens }`

> 说明：collapse 模式的规范性契约定义见 `05_CONTRACTS/collapse-packet-schema.yaml`。该模式只在 Phase 结束处理时被 Orchestrator 触发，不参与每轮 Beat 生成循环。
