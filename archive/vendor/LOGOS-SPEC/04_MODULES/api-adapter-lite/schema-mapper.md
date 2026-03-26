---
module: api-adapter-lite/mapper
title: API Adapter Lite — SchemaMapper
type: module
priority: support
depends_on:
  - api-adapter-lite/contracts
contracts:
  - 05_CONTRACTS/prompt-object-schema.yaml
  - 05_CONTRACTS/audit-packet-schema.yaml
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/collapse-packet-schema.yaml
tokens_estimate: 4500
reading_context:
  - 04_MODULES/api-adapter-lite/overview.md
  - 04_MODULES/api-adapter-lite/interface-contracts.md
status: v1-complete
last_updated: 2026-03-20
---
## 4. SchemaMapper（协议映射层）

### 4.1 映射策略矩阵

SchemaMapper 需要处理 **2 种 API 格式 × 4 种调用模式 = 8 种映射路径**：

| API 格式 | 主生成模式 | 审计模式 | 阶段后果结算模式 | 光锥坍缩模式 |
|---|---|---|---|---|
| **OpenAI 兼容** (MiniMax/Kimi/百炼) | `toOpenAIFormat_Generate()` | `toOpenAIFormat_Audit()` | `toOpenAIFormat_Settlement()` | `toOpenAIFormat_Collapse()` |
| **Gemini** (Google AI Studio) | `toGeminiFormat_Generate()` | `toGeminiFormat_Audit()` | `toGeminiFormat_Settlement()` | `toGeminiFormat_Collapse()` |

**路由逻辑**：

```
SchemaMapper.map(mode, prompt, providerConfig, generationConfig)
  │
  ├── providerConfig.mapperType === "gemini"
  │   ├── mode === "generate"   → toGeminiFormat_Generate()
  │   ├── mode === "audit"      → toGeminiFormat_Audit()
  │   ├── mode === "settlement" → toGeminiFormat_Settlement()
  │   └── mode === "collapse"   → toGeminiFormat_Collapse()
  │
  └── providerConfig.mapperType === "openai"
      ├── mode === "generate"   → toOpenAIFormat_Generate()
      ├── mode === "audit"      → toOpenAIFormat_Audit()
      ├── mode === "settlement" → toOpenAIFormat_Settlement()
      └── mode === "collapse"   → toOpenAIFormat_Collapse()
```

### 4.2 OpenAI 兼容格式 — 主生成模式

**输入**：第 3.1 节的 `prompt` 对象

**输出**：

```json
{
  "model": "kimi-k2.5",
  "messages": [
    {
      "role": "system",
      "content": "【世界基础】\n{worldBase.mainCharacters}\n{worldBase.npcCharacters}\n{worldBase.locationPatch}\n\n【叙事主轴】\n主轴: {narrative.mainAxis}\n终点线: {narrative.endLine}\n当前Phase目标: {narrative.phaseGoal}\n光锥边界: Alpha={narrative.alpha} | Beta={narrative.beta}"
    },
    {
      "role": "assistant",
      "content": "（Beat 1 正文）"
    },
    {
      "role": "user",
      "content": "玩家选择了：追踪可疑人影"
    },
    {
      "role": "assistant",
      "content": "（Beat 2 正文）"
    },
    {
      "role": "user",
      "content": "玩家选择了：XXX\n\n---\n【运行态路由上下文】\n当前路由: 动作/战斗\n当前行为词典: [强攻, 牵制, 防御, 脱离]\n选项路由纪律: 4 个选项必须保持在当前路由内，并各自对应行为词典中的不同方向。\n\n【导演批注 - 本轮最高优先级指令】\n当前声量: High\n正文约束: {directorNote.beatConstraints}\n选项约束: {directorNote.optionConstraints}\n\n【重写控制 - 仅 retry 时出现】\n重试次数: {generationControl.retryCount}\n修正要求: {generationControl.rewriteFeedback}\n上一版失败正文: {generationControl.previousDraft.beatText}\n上一版失败选项: A. ... / B. ... / C. ... / D. ..."
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.8,
  "top_p": 0.95,
  "max_tokens": 2048
}
```

**映射规则**：
1. `worldBase` + `narrative` → 拼接为一条 `role: "system"` 消息
2. `history` 数组 → 直接展开为后续 `messages`（保持 `assistant`/`user` 交替）
3. `directorNote` → 追加到最后一条 `user` message 末尾（Recency Bias 原则：最后出现的指令对 LLM 影响最大）
4. 若 `generationControl.isRewrite === true`，则在 `directorNote` 后继续追加一段“重写控制”块，把 `retryCount`、`rewriteFeedback` 与 `previousDraft` 放在最终消息的最末尾；若无该字段，则完全不注入
5. `generationConfig` → 平铺为顶层参数
6. generate 的规范性返回契约是 `GenerateResult`；OpenAI 兼容 provider 至少要提供原生 JSON Object 输出能力，后端再用 `GenerateResult` 做二次校验
7. generate 路径的 system prompt 应与 `directorNote.beatConstraints` 一起重复强调段落纪律：`beatText` 必须拆成多个可读段落；单个超长段落或无自然断点的墙文本应被视为失败输出，而不是可接受的风格变体
8. 当前版本需要继续把 runtime router / verb lexicon 送入 generate 消息，但应放在独立的“运行态路由上下文”块中，而不是折叠进 Director Note 文本内部，以免局部批注反向锁死选项空间

### 4.3 OpenAI 兼容格式 — 审计模式

**输入**：第 3.2 节的 `prompt` 对象

**输出**：

```json
{
  "model": "kimi-k2.5",
  "messages": [
    {
      "role": "system",
      "content": "你是 LOGOS 叙事引擎的审计员。你的唯一任务是对生成的内容进行是/否判定。\n\n严格规则：\n1. 只回答 true 或 false\n2. 以 JSON 格式返回：{\"answers\": [true, false, true, ...]}\n3. 数组长度必须与问题数量一致\n4. 不要输出任何其他内容"
    },
    {
      "role": "user",
      "content": "【前序上下文】\n{context.precedingBeats 拼接为纯文本}\n\n---\n【待审计内容 - Beat 正文】\n{generatedContent.beatText}\n\n【待审计内容 - 4 个选项】\nA. {generatedContent.options[0]}\nB. {generatedContent.options[1]}\nC. {generatedContent.options[2]}\nD. {generatedContent.options[3]}\n\n---\n【审计问题清单】\n1. {auditQuestions[0]}\n2. {auditQuestions[1]}\n3. {auditQuestions[2]}\n4. {auditQuestions[3]}"
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.1,
  "max_tokens": 512
}
```

**映射规则**：
1. `system` 消息是固定的审计员指令模板（不含叙事内容）
2. 所有审计材料拼接为一条 `user` 消息
3. `temperature` 强制 0.1；`max_tokens` 只在供应商结构化输出文档允许时作为上界使用
4. audit 的规范性路径只接受原生结构化输出；若当前 provider / model 不支持结构化输出，后端应拒绝该调用而不是退回文本解析

### 4.4 Gemini 格式 — 主生成模式

**输入**：同 4.2 的输入

**输出**：

```json
{
  "systemInstruction": {
    "role": "system",
    "parts": [
      {
        "text": "【世界基础】\n{worldBase.mainCharacters}\n{worldBase.npcCharacters}\n{worldBase.locationPatch}\n\n【叙事主轴】\n主轴: {narrative.mainAxis}\n终点线: {narrative.endLine}\n当前Phase目标: {narrative.phaseGoal}\n光锥边界: Alpha={narrative.alpha} | Beta={narrative.beta}"
      }
    ]
  },
  "contents": [
    {
      "role": "model",
      "parts": [{ "text": "（Beat 1 正文）" }]
    },
    {
      "role": "user",
      "parts": [{ "text": "玩家选择了：追踪可疑人影" }]
    },
    {
      "role": "model",
      "parts": [{ "text": "（Beat 2 正文）" }]
    },
    {
      "role": "user",
      "parts": [{ "text": "玩家选择了：XXX\n\n---\n【运行态路由上下文】\n当前路由: 动作/战斗\n当前行为词典: [强攻, 牵制, 防御, 脱离]\n选项路由纪律: 4 个选项必须保持在当前路由内，并各自对应行为词典中的不同方向。\n\n【导演批注 - 本轮最高优先级指令】\n当前声量: High\n正文约束: {directorNote.beatConstraints}\n选项约束: {directorNote.optionConstraints}\n\n【重写控制 - 仅 retry 时出现】\n重试次数: {generationControl.retryCount}\n修正要求: {generationControl.rewriteFeedback}\n上一版失败正文: {generationControl.previousDraft.beatText}\n上一版失败选项: ..." }]
    }
  ],
  "generationConfig": {
    "temperature": 0.8,
    "topP": 0.95,
    "responseSchema": "GenerateResultSchema",
    "maxOutputTokens": 2048
  }
}
```

**Gemini 特殊映射规则**：
1. `role: "assistant"` → `role: "model"`（Gemini 用 `model` 而非 `assistant`）
2. 每条消息的 `content` 字符串 → `parts: [{ text: "..." }]` 数组
3. `systemInstruction` 是顶层字段，不放在 `contents` 里
4. `generationControl` 若存在，仍然追加到最后一条 `user.parts[0].text` 的最末尾，保持最高近因权重
5. `generationConfig` 是顶层对象，参数名用驼峰（`maxOutputTokens` 而非 `max_tokens`）
6. generate 的结构化返回依赖 `responseSchema: GenerateResultSchema`，不再依赖 `[OPTIONS]` 文本分隔

### 4.5 Gemini 格式 — 审计模式

**输入**：同 4.3 的输入

**输出**：

```json
{
  "systemInstruction": {
    "role": "system",
    "parts": [
      {
        "text": "你是 LOGOS 叙事引擎的审计员。你的唯一任务是对生成的内容进行是/否判定。\n\n严格规则：\n1. 只回答 true 或 false\n2. 以 JSON 格式返回：{\"answers\": [true, false, true, ...]}\n3. 数组长度必须与问题数量一致\n4. 不要输出任何其他内容"
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "【前序上下文】\n...\n\n---\n【待审计内容 - Beat 正文】\n...\n\n【待审计内容 - 4 个选项】\n...\n\n---\n【审计问题清单】\n1. ...\n2. ...\n3. ...\n4. ..."
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": "AuditResultSchema",
    "temperature": 0.1,
    "maxOutputTokens": 512
  }
}
```

### 4.6 映射层核心原则

**只改壳（协议包装），不改核（叙事负载）**：
- SchemaMapper 绝不修改、删减、重写任何来自 `PromptObject`、`AuditPacket`、`PhaseConsequencePacket` 的叙事负载文本
- 它可以添加 provider 所要求的协议包装字段，例如 `response_format`、`responseSchema`、`responseMimeType`
- generate / audit / settlement / collapse 的规范性输出都必须以原生结构化输出为前提，后端统一做契约校验
- 若 provider / model 不满足结构化输出能力，应在注册表层被排除，而不是在运行时退回脆弱文本解析
- 映射层的目标是保证叙事逻辑不因 API 切换而受损，同时把格式差异收束在协议层

### 4.6b OpenAI 兼容格式 — 阶段后果结算模式

**输入**：第 3.3 节的 `prompt` 对象

**输出**：

```json
{
  "model": "kimi-k2.5",
  "messages": [
    {
      "role": "system",
      "content": "你是 LOGOS 叙事引擎的阶段后果结算模块。你的任务是：基于当前 Phase 已经被接受的转录，提炼出后续光锥坍缩真正需要读取的 `phaseConsequences[]`。\n\n严格规则：\n1. 以 JSON 格式返回：{\"phaseConsequences\": [\"...\"], \"settlementTrace\": \"...\"}\n2. 只保留已经发生的事实，不写计划、建议或反事实\n3. phaseConsequences 的每项都必须是一句完整事实陈述\n4. 不要直接推演 Alpha/Beta"
    },
    {
      "role": "user",
      "content": "【Scene 方向】\n主轴: {context.mainAxis}\n终点线: {context.endLine}\n刚结束 Phase 目标: {context.phaseGoal}\n\n【当前 Phase 已接受转录】\n1. assistant: ...\n2. user: ...\n3. assistant: ...\n\n请把以上内容结算为 phaseConsequences[]。"
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.2,
  "max_tokens": 768
}
```

**映射规则**：
1. `system` 消息是固定的阶段后果结算指令模板
2. `phaseTranscript[]` 按顺序拼接为一条 `user` 消息
3. `temperature` 强制 0.2
4. settlement 的规范性返回契约是 `PhaseConsequenceResult`

### 4.6c Gemini 格式 — 阶段后果结算模式

**输入**：同 4.6b 的输入

**输出**：

```json
{
  "systemInstruction": {
    "role": "system",
    "parts": [
      {
        "text": "你是 LOGOS 叙事引擎的阶段后果结算模块。你的任务是：基于当前 Phase 已经被接受的转录，提炼出后续光锥坍缩真正需要读取的 `phaseConsequences[]`。..."
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "【Scene 方向】\n主轴: ...\n终点线: ...\n刚结束 Phase 目标: ...\n\n【当前 Phase 已接受转录】\n...\n\n请把以上内容结算为 phaseConsequences[]。"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": "PhaseConsequenceResultSchema",
    "temperature": 0.2,
    "maxOutputTokens": 768
  }
}
```

### 4.6d OpenAI 兼容格式 — 光锥坍缩模式

**输入**：第 3.4 节的 `prompt` 对象

**输出**：

```json
{
  "model": "kimi-k2.5",
  "messages": [
    {
      "role": "system",
      "content": "你是 LOGOS 叙事引擎的光锥坍缩推演模块。你的任务是：基于玩家在上一阶段造成的真实后果，重新面向 Scene 终点线，推演下一阶段仍然可达的最激进偏离（Alpha）和最消极偏离（Beta）边界。\n\n严格规则：\n1. 以 JSON 格式返回：{\"alpha\": \"...\", \"beta\": \"...\", \"inferenceTrace\": \"...\"}\n2. alpha 和 beta 必须是具体的边界描述，不是抽象原则\n3. inferenceTrace 必须说明推演逻辑\n4. 新边界必须比当前边界更收敛或等宽，不得扩张"
    },
    {
      "role": "user",
      "content": "【Scene 方向】\n主轴: {context.mainAxis}\n终点线: {context.endLine}\n\n【当前边界】\nAlpha: {context.currentAlpha}\nBeta: {context.currentBeta}\n\n【已完成 Phase 目标】\n{context.completedPhaseGoal}\n\n【阶段后果】\n1. {phaseConsequences[0]}\n2. {phaseConsequences[1]}\n...\n\n请基于以上后果，重新面向终点线推演下一阶段的 Alpha/Beta 边界。"
    }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.5,
  "max_tokens": 1024
}
```

**映射规则**：
1. `system` 消息是固定的光锥坍缩推演指令模板
2. 所有推演材料拼接为一条 `user` 消息
3. `temperature` 强制 0.5
4. collapse 的规范性返回契约是 `CollapseResult`

### 4.6e Gemini 格式 — 光锥坍缩模式

**输入**：同 4.6d 的输入

**输出**：

```json
{
  "systemInstruction": {
    "role": "system",
    "parts": [
      {
        "text": "你是 LOGOS 叙事引擎的光锥坍缩推演模块。你的任务是：基于玩家在上一阶段造成的真实后果，重新面向 Scene 终点线，推演下一阶段仍然可达的最激进偏离（Alpha）和最消极偏离（Beta）边界。..."
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "【Scene 方向】\n主轴: ...\n终点线: ...\n\n【当前边界】\n...\n\n【阶段后果】\n...\n\n请基于以上后果，重新面向终点线推演下一阶段的 Alpha/Beta 边界。"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": "CollapseResultSchema",
    "temperature": 0.5,
    "maxOutputTokens": 1024
  }
}
```

---
