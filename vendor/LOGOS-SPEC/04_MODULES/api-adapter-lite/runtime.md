---
module: api-adapter-lite/runtime
title: API Adapter Lite — 运行时组件
type: module
priority: support
depends_on:
  - api-adapter-lite/contracts
contracts:
  - 05_CONTRACTS/prompt-object-schema.yaml
  - 05_CONTRACTS/audit-packet-schema.yaml
  - 05_CONTRACTS/phase-consequence-packet-schema.yaml
  - 05_CONTRACTS/collapse-packet-schema.yaml
tokens_estimate: 6500
reading_context:
  - 04_MODULES/api-adapter-lite/overview.md
status: v1-complete
last_updated: 2026-03-20
---
## 5. TokenInspector（Token 预检层）

### 5.1 职责

在请求发出前，计算各段 Token 占比，反馈给：
1. **前端 Token 仪表盘**：实时显示占比
2. **上游调用方 / Orchestrator**：作为 warning 元数据参考是否需要后续记忆压缩

> TokenInspector 只产生 `tokenReport` 与 warning 元数据，本身不直接触发记忆压缩，也不反向主导编排层流程。

### 5.2 接口
以下为一个

```
TokenInspector.inspect(prompt, providerConfig, modelId) → TokenReport

// modelId 用于从 providerConfig.models 中查找对应的 contextWindow
// 例如 modelId = "kimi-k2.5" → 找到 contextWindow = 262144

TokenReport = {
  worldBase:    { tokens: 800,  percent: 23 },
  history:      { tokens: 1500, percent: 43 },
  narrative:    { tokens: 600,  percent: 17 },
  directorNote: { tokens: 600,  percent: 17 },
  generationControl: { tokens: 0, percent: 0 },
  total:        3500,
  limit:        262144,   // providerConfig.models.find(m => m.id === modelId).contextWindow
  warning:      null | "HISTORY_OVERFLOW" | "APPROACHING_LIMIT"
}
```

### 5.3 Token 计数方案（轻量版）

不引入 `tiktoken` 等重型库，用简单估算：
- **中文**：≈ 1.5 token/字
- **英文**：≈ 0.75 token/word
- **标点/空格**：≈ 0.5 token

对于 Sample 测试够用，精度不是关键。

### 5.4 Warning 触发规则

| Warning | 触发条件 | 含义 |
|---|---|---|
| `null` | 正常范围 | 无需处理 |
| `"APPROACHING_LIMIT"` | `total > limit * 0.7` | 接近上下文窗口上限 |
| `"HISTORY_OVERFLOW"` | `history.percent > 50` | 历史占比过高，向上游暴露压缩 warning，由编排层决定是否执行 Header 压缩 |

---

## 6. 供应商能力快照（`providers.js`，2026-03 Sample 附录）

本节描述的是本地原型在 `2026-03` 时点维护的一份 provider registry 示例。它的目标是收束认证方式、映射器类型与结构化输出能力要求，而不是把一组高漂移的 model 清单误写成长期稳定规范。因此，`provider` 标识与能力字段属于本文的设计范围，`models` 列表则只是 Sample 运行快照，后续应按官方控制台与条款实际情况维护。

```javascript
export const PROVIDERS = {

  "google": {
    "name": "Google AI Studio",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
    "endpointTemplate": "/models/{model}:generateContent",
    "authType": "header",
    "authHeader": "x-goog-api-key",
    "mapperType": "gemini",
    "supportLevel": "formal",
    "capabilities": {
      "generateStructuredOutput": "schema",
      "auditStructuredOutput": "schema",
      "settlementStructuredOutput": "schema",
      "collapseStructuredOutput": "schema"
    },
    "models": [
      { "id": "gemini-3.1-pro-preview", "contextWindow": 1048576, "label": "Gemini 3.1 Pro Preview", "status": "sample-snapshot" },
      { "id": "gemini-3-flash-preview", "contextWindow": 1048576, "label": "Gemini 3 Flash Preview", "status": "sample-snapshot" }
    ]
  },

  "minimax": {
    "name": "MiniMax",
    "baseUrl": "https://api.minimax.io/v1",
    "endpoint": "/chat/completions",
    "authType": "bearer",
    "mapperType": "openai",
    "supportLevel": "formal",
    "capabilities": {
      "generateStructuredOutput": "json_object_by_model",
      "auditStructuredOutput": "json_object_by_model",
      "settlementStructuredOutput": "json_object_by_model",
      "collapseStructuredOutput": "json_object_by_model"
    },
    "models": [
      { "id": "MiniMax-M2.5", "contextWindow": 200000, "label": "MiniMax M2.5", "status": "sample-snapshot" }
    ]
  },

  "kimi": {
    "name": "Kimi",
    "baseUrl": "https://api.moonshot.cn/v1",
    "endpoint": "/chat/completions",
    "authType": "bearer",
    "mapperType": "openai",
    "supportLevel": "formal",
    "capabilities": {
      "generateStructuredOutput": "json_object_by_model",
      "auditStructuredOutput": "json_object_by_model",
      "settlementStructuredOutput": "json_object_by_model",
      "collapseStructuredOutput": "json_object_by_model"
    },
    "models": [
      { "id": "kimi-k2.5", "contextWindow": 262144, "label": "Kimi K2.5", "status": "sample-snapshot" },
      { "id": "moonshot-v1-128k", "contextWindow": 131072, "label": "Moonshot 128K", "status": "sample-snapshot" }
    ]
  },

  "bailian": {
    "name": "阿里百炼",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "endpoint": "/chat/completions",
    "authType": "bearer",
    "mapperType": "openai",
    "supportLevel": "formal",
    "capabilities": {
      "generateStructuredOutput": "model_specific",
      "auditStructuredOutput": "model_specific",
      "settlementStructuredOutput": "model_specific",
      "collapseStructuredOutput": "model_specific"
    },
    "models": [
      { "id": "qwen3.5-plus", "contextWindow": 131072, "label": "Qwen 3.5 Plus", "status": "sample-snapshot" },
      { "id": "qwen-max", "contextWindow": 1048576, "label": "Qwen Max", "status": "sample-snapshot" },
      { "id": "qwen-turbo", "contextWindow": 131072, "label": "Qwen Turbo", "status": "sample-snapshot" }
    ]
  }

};
```

**关于正式支持边界**：
- 本文的正式 `provider` 标识只保留 `google`、`minimax`、`kimi`、`bailian` 四个条目，避免把套餐别名、灰度模型或条款敏感入口误写成规范正文。
- `capabilities.generateStructuredOutput`、`capabilities.auditStructuredOutput`、`capabilities.settlementStructuredOutput` 与 `capabilities.collapseStructuredOutput` 是后端放行的前置条件；如果某个 `model` 未被明确标记支持对应模式的结构化输出，就不应进入运行时可选列表。
- `models` 是 Sample 快照而非长期承诺，因此 UI 下拉与本地配置应允许按官方控制台更新，而不应把本文中的 model id 理解为仓库级别的永久协议字段。
- `generationConfig` 只是 provider-neutral 的输入抽象，真正落到各家 API 时仍需由后端按官方文档做参数清洗；尤其是结构化输出、schema 声明与 token 上界，并不存在跨供应商完全一致的一套固定写法。

**关于 runtime alias 与 Coding Plan**：
- 如果本地原型需要测试各家 Coding Plan / 套餐别名，应在未版本化的 runtime alias 配置中单独登记，而不是写入本文的正式注册表。
- `bailian-coding`、`minimax-coding`、`kimi-coding` 不再作为本文正式支持条目出现，其中尤其是 `bailian-coding` 涉及明显的条款适用风险，不能升格为 API 规范的一部分。

**关于 MiniMax 接口选择**：
- MiniMax 官方同时提供原生接口（`/v1/text/chatcompletion_v2`）和 OpenAI-compatible 接口（`/v1/chat/completions`）
- 本项目只使用 OpenAI-compatible 路径，不使用原生 `chatcompletion_v2` 接口
- 这样做的原因是统一映射逻辑，减少 SchemaMapper 的维护成本

---

## 7. 后端 LLM 代理（Vite 中间件核心逻辑）

### 7.1 中间件注册

在 `vite.config.js` 的 `configureServer` 中注册 3 个路由：

```javascript
// vite.config.js
export default {
  server: { port: 3000 },
  plugins: [
    vue(),
    {
      name: 'logos-api-middleware',
      configureServer(server) {
        // 路由 1: 保存配置到磁盘
        server.middlewares.use('/api/logos/save', async (req, res) => {
          // 读取 request body → fs.writeFileSync('./logos.config.json', body)
        });

        // 路由 2: 从磁盘读取配置
        server.middlewares.use('/api/logos/load', async (req, res) => {
          // fs.readFileSync('./logos.config.json') → 返回 JSON
        });

        // 路由 3: LLM 代理（核心）
        server.middlewares.use('/api/llm/chat', async (req, res) => {
          // 见 7.2 节详细流程
        });
      }
    }
  ]
};
```

### 7.2 `/api/llm/chat` 处理流程

```
1. 接收前端请求 body:
   {
     mode: "generate" | "audit" | "settlement" | "collapse",
     prompt: { ... },
     provider: "kimi",
     model: "kimi-k2.5",
     generationConfig: { ... }
   }

2. 配置权威来源与后端强制校验:
   - apiKey: 只从 logos.config.json 读取（请求体中不传 Key）
   - provider / model / generationConfig: 以请求体为准
   - provider 和 model 必须在 PROVIDERS 注册表中存在，否则返回 400
   - mode 对应的结构化输出能力必须在 providerConfig.capabilities 中被显式支持，否则返回 `STRUCTURED_OUTPUT_UNSUPPORTED`
     - `generate` → `capabilities.generateStructuredOutput`
     - `audit` → `capabilities.auditStructuredOutput`
     - `settlement` → `capabilities.settlementStructuredOutput`
     - `collapse` → `capabilities.collapseStructuredOutput`
   - audit 模式下，后端强制把 `temperature` 收束到 `0.1`，前端不得覆盖
   - settlement 模式下，后端强制把 `temperature` 收束到 `0.2`，前端不得覆盖
   - generate 模式下，后端只接受可校验为 `GenerateResult` 的结果；audit 模式下只接受可校验为 `AuditResult` 的结果；settlement 模式下只接受可校验为 `PhaseConsequenceResult` 的结果；collapse 模式下只接受可校验为 `CollapseResult` 的结果

3. 从 PROVIDERS 查找供应商配置:
   const providerConfig = PROVIDERS[provider]
   → 获取 baseUrl, endpoint / endpointTemplate, authType, mapperType, capabilities

4. 调用 SchemaMapper:
   if (mode === "generate") {
     if (mapperType === "gemini") {
       requestBody = toGeminiFormat_Generate(prompt, generationConfig, "GenerateResultSchema")
     } else {
       requestBody = toOpenAIFormat_Generate(prompt, model, generationConfig, "GenerateResult")
     }
   } else if (mode === "audit") {
     if (mapperType === "gemini") {
       requestBody = toGeminiFormat_Audit(prompt, generationConfig, "AuditResultSchema")
     } else {
       requestBody = toOpenAIFormat_Audit(prompt, model, generationConfig, "AuditResult")
     }
   } else if (mode === "settlement") {
      generationConfig.temperature = 0.2  // 后端强制收束
     if (mapperType === "gemini") {
       requestBody = toGeminiFormat_Settlement(prompt, generationConfig, "PhaseConsequenceResultSchema")
     } else {
       requestBody = toOpenAIFormat_Settlement(prompt, model, generationConfig, "PhaseConsequenceResult")
     }
   } else if (mode === "collapse") {
      generationConfig.temperature = 0.5  // 后端强制收束
     if (mapperType === "gemini") {
       requestBody = toGeminiFormat_Collapse(prompt, generationConfig, "CollapseResultSchema")
     } else {
       requestBody = toOpenAIFormat_Collapse(prompt, model, generationConfig, "CollapseResult")
     }
   }

5. 构建 HTTP 请求:
   Google:
     URL = baseUrl + endpointTemplate.replace('{model}', model)
     Headers = {
       'Content-Type': 'application/json',
       'x-goog-api-key': apiKey
     }
   
   其他 (MiniMax/Kimi/百炼):
     URL = baseUrl + endpoint
     Headers = {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + apiKey
     }

6. fetch 转发到 LLM 供应商

7. 解析供应商响应并做契约校验:
   - 抽取 provider 原始结构化 payload
   - mode === "generate"  → 校验为 `GenerateResult`
   - mode === "audit"     → 校验为 `AuditResult`
   - mode === "settlement"→ 校验为 `PhaseConsequenceResult`
   - mode === "collapse"  → 校验为 `CollapseResult`
   - usage 统一归一化为 `{ promptTokens, completionTokens, totalTokens }`
   - 只有在 localhost debug 打开时才附带 `raw`
   - 任一结构化校验失败都返回标准错误码，而不是退回自然语言拆包

8. 返回给前端:
   - generate   → `GenerateResult`
   - audit      → `AuditResult`
   - settlement → `PhaseConsequenceResult`
   - collapse   → `CollapseResult`
```

### 7.3 响应抽取与 usage 统一化映射

| 来源 | 结构化结果抽取方式 | 取 usage 的路径 |
|---|---|---|
| Google Gemini | 读取 `response.candidates[*]` 中的结构化 JSON 负载，再校验为 `GenerateResult` / `AuditResult` / `PhaseConsequenceResult` / `CollapseResult` | `response.usageMetadata` |
| OpenAI 兼容 | 读取 `response.choices[0].message` 中的结构化 JSON 负载，再校验为 `GenerateResult` / `AuditResult` / `PhaseConsequenceResult` / `CollapseResult` | `response.usage` |

### 7.4 结构化结果校验（后端职责）

后端的职责不再是把自由文本拆成 `beatText + options[]`，而是验证供应商是否已经按要求返回了结构化结果。这样做的原因是，文本分隔符和正则 fallback 只能作为原型调试手段存在，无法支撑本仓库要求的稳定契约。

**Generate 校验规则**：
- 结果必须能被解包为 `GenerateResult`
- `beatText` 必须是非空字符串
- `options` 必须存在且长度固定为 4
- `options` 中每一项都必须是非空字符串
- `usage` 必须统一归一化为 `{ promptTokens, completionTokens, totalTokens }`

**Audit 校验规则**：
- 结果必须能被解包为 `AuditResult`
- `answers` 必须是布尔数组
- `answers.length` 必须与 `auditQuestions.length` 完全一致
- 任何 provider 特有字段都必须在后端被吸收，不得泄漏为下游业务依赖

**Settlement 校验规则**：
- 结果必须能被解包为 `PhaseConsequenceResult`
- `phaseConsequences` 必须是非空字符串数组
- 每个条目都必须描述已发生事实，而不是建议或计划
- `settlementTrace` 必须是非空字符串
- `usage` 必须统一归一化

**Collapse 校验规则**：
- 结果必须能被解包为 `CollapseResult`
- `alpha` 必须是非空字符串
- `beta` 必须是非空字符串
- `inferenceTrace` 必须是非空字符串
- `usage` 统一归一化

**标准错误码建议**：
- `PROVIDER_UNSUPPORTED`
- `MODEL_UNSUPPORTED`
- `STRUCTURED_OUTPUT_UNSUPPORTED`
- `GENERATE_RESULT_INVALID`
- `AUDIT_RESULT_INVALID`
- `PHASE_CONSEQUENCE_RESULT_INVALID`
- `COLLAPSE_RESULT_INVALID`

**原型兜底说明**：
- 若本地测试阶段仍保留文本 fallback，必须显式标记为 `debug-only`，并且默认关闭。
- fallback 逻辑不得写入 `GenerateResult` / `AuditResult` 的规范性定义，也不得成为 Prompt Assembler、Auditor 或上游编排层的依赖前提。

---
