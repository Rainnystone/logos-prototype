---
module: api-adapter-lite/impl-guide
title: API Adapter Lite — 实现指引（非规范性附录）
type: module
priority: support
depends_on:
  - api-adapter-lite
contracts: []
tokens_estimate: 6500
reading_context:
  - 04_MODULES/api-adapter-lite/overview.md
status: v1-complete
last_updated: 2026-03-20
---
## 9. 非规范性附录 A：导演配置面板 (`ConfigPanel.vue`)

本节只服务 localhost 原型实现，用来说明一个最小可运行的配置壳如何组织。它作为本文件中的非规范性附录存在，因此任何 UI 细节都不应反向约束 Prompt Assembler、Auditor 或编排层的结构设计。

### 9.1 UI 布局

```
┌─ LOGOS 导演配置 ──────────────────────────────────┐
│                                                    │
│  供应商:  [Google AI Studio ▼]                      │
│                                                    │
│  API Key: [sk-xxxxxxxxxxxxx      ] [测试连接]      │
│           ● 已连接 (延迟: 320ms)                    │
│                                                    │
│  模型:    [gemini-3-flash-preview ▼]                 │
│                                                    │
│  ── 生成参数 ──                                     │
│  Temperature: [0.8]  Top-P: [0.95]                 │
│  Max Tokens:  [2048]                               │
│                                                    │
│  [保存配置]                                         │
│                                                    │
│  ── Token 仪表盘 ──                                 │
│  世界基础:  ████████░░ 800  (23%)                   │
│  记忆上下文: █████░░░░░ 1,500 (43%)                 │
│  叙事主轴:  ███░░░░░░░ 600  (17%)                   │
│  导演批注:  ███░░░░░░░ 600  (17%)                   │
│  ─────────────────────────────                     │
│  总计: 3,500 / 262,144 (1.3%)                      │
└────────────────────────────────────────────────────┘
```

### 9.2 供应商下拉选项

| 显示名 | provider 值 | 说明 |
|---|---|---|
| Google AI Studio | `google` | Gemini 系列 |
| MiniMax | `minimax` | 标准 API，结构化输出能力需按 model 校验 |
| Kimi | `kimi` | Moonshot 标准 |
| 阿里百炼 | `bailian` | DashScope 标准 |

### 9.3 交互逻辑

1. 选择供应商 → 模型下拉框自动更新为该供应商的可用模型列表
2. 填入 API Key → 点击"测试连接" → 发送一个最小请求验证 Key 有效性与结构化输出支持状态 → 显示连接状态和延迟
3. 点击"保存配置" → 调用 `StorageService.save()` → 写入 `logos.config.json`
4. Token 仪表盘在每次 `generate()` 调用后自动更新

### 9.4 持久化配置文件 (`logos.config.json`)

```json
{
  "provider": "kimi",
  "apiKey": "sk-xxxxxxxxxxxxxxxx",
  "model": "kimi-k2.5",
  "generationConfig": {
    "temperature": 0.8,
    "topP": 0.95,
    "maxOutputTokens": 2048
  },
  "debug": {
    "includeRawResponse": false
  }
}
```

> 说明：`logos.config.json` 只属于 localhost 原型存储，不应被误读为仓库级别的正式 API 契约；其中的 `apiKey` 与 `debug.includeRawResponse` 都是本地运行时细节。

---

## 10. 非规范性附录 B：存储层 (`StorageService` + Vite 中间件)

本节描述的是 Sample 原型所采用的最小化本地存储方案。它之所以被保留，是为了让 coding agent 能够快速打通 localhost 环境；然而这套方案天然带有本地文件、明文 Key 与调试响应的边界，因此不能直接升格为 LOGOS-SPEC 的跨环境规范。

### 10.1 前端 `storage.js`

```javascript
// 只有两个方法，极简
const StorageService = {
  async save(config) {
    await fetch('/api/logos/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  },

  async load() {
    const res = await fetch('/api/logos/load');
    return res.json();
  }
};
```

### 10.2 后端 Vite 中间件

```
路由:
  POST /api/logos/save  → fs.writeFileSync('./logos.config.json', body)
  GET  /api/logos/load  → fs.readFileSync('./logos.config.json') → 仅限 localhost 返回
  POST /api/llm/chat    → LLM 代理（见第 7 节）
```

### 10.3 为什么这样设计

- 配置保存在项目根目录 JSON 文件里，coding agent 可以直接读
- UI 里改了配置 → 自动写入磁盘 → 方便本地开发和调试
- 不需要 LocalStorage、不需要环境检测、不需要导出/导入
- 原版的 DEV/PROD 双轨存储在 localhost-only 场景下完全不需要

### 10.4 安全注意事项

- **`logos.config.json` 包含明文 API Key，必须加入 `.gitignore`**
- **`/api/logos/load` 返回完整配置只允许存在于 localhost Sample 场景，后续若要外化运行环境，必须先改成脱敏或服务端保管方案**
- **`raw` 响应只允许在 `debug.includeRawResponse === true` 时返回，默认关闭**
- 项目应提供 `logos.config.example.json` 作为配置模板（不含真实 Key）：

```json
{
  "provider": "kimi",
  "apiKey": "在此填入你的 API Key",
  "model": "kimi-k2.5",
  "generationConfig": {
    "temperature": 0.8,
    "topP": 0.95,
    "maxOutputTokens": 2048
  },
  "debug": {
    "includeRawResponse": false
  }
}
```

- `.gitignore` 中必须包含：
```
logos.config.json
```

---

## 11. 非规范性附录 C：面向 Coding Agent 的实现指引

本节是为了帮助 coding agent 在本地快速落地原型，因此它关注的是实现顺序与最小运行路径，而不是仓库级别的长期职责划分。也正因为如此，这里的建议必须服从前文的规范性契约，不能反过来修改 `GenerateResult`、`AuditResult` 或 API Adapter Lite 的边界定义。

### 11.1 技术栈

- **前端**：Vue 3 + Vite
- **后端**：Vite `configureServer` 中间件（不需要 Express/Koa，零额外依赖）
- **HTTP 请求**：Node.js 原生 `fetch`（Node 18+ 内置）
- **Token 计数**：纯数学估算（不引入 tiktoken）

### 11.2 实现顺序（严格按此顺序）

```
Phase 1: 数据层（无 UI，纯逻辑）
  ① providers.js        — 纯数据文件，零逻辑，直接抄第 6 节
  ② vite.config.js      — /api/logos/save + /api/logos/load 两个路由
  ③ storage.js           — 前端 StorageService，两个 fetch 方法

Phase 2: 映射层（核心逻辑）
  ④ mapper.js            — 6 个映射函数:
                            toOpenAIFormat_Generate()
                            toOpenAIFormat_Audit()
                            toOpenAIFormat_Settlement()
                            toOpenAIFormat_Collapse()
                            toGeminiFormat_Generate()
                            toGeminiFormat_Audit()
                            toGeminiFormat_Settlement()
                            toGeminiFormat_Collapse()
  ⑤ inspector.js         — TokenInspector.inspect()，字符数估算

Phase 3: 代理层（打通 API 调用）
  ⑥ vite.config.js       — 追加 /api/llm/chat 路由
                            读 config → 查 provider → 调 mapper
                            → fetch 转发 → 结构化校验后统一响应
  ⑦ adapter/index.js     — AdapterService 主入口
                            对外暴露: generate(prompt)、audit(auditPrompt)、settlePhaseConsequences(settlementPrompt)、collapse(collapsePrompt)
                            内部: 调 inspector → fetch /api/llm/chat → 只消费标准契约

Phase 4: 前端（UI 壳）
  ⑧ ConfigPanel.vue      — 供应商/Key/模型选择 + 保存按钮
  ⑨ TokenDashboard.vue   — 5 段 Token 占比条形图（含 retry 时的 generationControl）
  ⑩ GameView.vue         — 【PLACEHOLDER】只显示 Beat 文本和 4 个按钮
                            UI 将独立设计，此处仅需最小可交互界面
```

### 11.3 关键约束（coding agent 必须遵守）

1. **SchemaMapper 只改 JSON 结构，绝不修改叙事文本内容**
2. **API Key 安全边界**：Sample 版本中，前端参与配置录入（用户在 UI 输入 Key 并保存到 `logos.config.json`），但所有外部 LLM 调用只走后端 Vite 中间件代理——前端不直接向任何 LLM 供应商发送请求。这不是零信任安全模型，而是 localhost 开发工具的务实选择。
3. **所有 LLM 请求必须经过 Vite 中间件代理**，前端不直接调用外部 API
4. **审计模式的 temperature 必须由后端强制收束到 `0.1`**，前端即使传入更高值也不得生效
5. **重写循环最多 3 次**，超过强制放行
6. **GameView.vue 是 PLACEHOLDER**，只需能显示文本和按钮，UI 后续独立设计

### 11.4 AdapterService 对外接口

```javascript
// src/services/adapter/index.js

const AdapterService = {

  /**
   * 主生成模式 — 被 Prompt 组装器调用
   * @param {Object} prompt - PromptObject，来自 Prompt 组装器的结构化输出
   *   { worldBase, history, narrative, directorNote, generationControl? }
   * @returns {Object} GenerateResult + tokenReport
   */
  async generate(prompt) {
    const config = await StorageService.load();
    const providerConfig = PROVIDERS[config.provider];
    const tokenReport = TokenInspector.inspect(prompt, providerConfig, config.model);

    const res = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'generate',
        prompt: prompt,
        provider: config.provider,
        model: config.model,
        generationConfig: config.generationConfig
      })
    });

    const data = await res.json();
    return { ...data, tokenReport: tokenReport };
  },

  /**
   * 阶段后果结算模式 — 被 Phase Consequence Settlement 在 Phase 结束时调用
   * @param {Object} settlementPrompt - PhaseConsequencePacket，含阶段转录与上下文
   *   { context, phaseTranscript }
   * @returns {Object} PhaseConsequenceResult
   */
  async settlePhaseConsequences(settlementPrompt) {
    const config = await StorageService.load();

    const res = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'settlement',
        prompt: settlementPrompt,
        provider: config.provider,
        model: config.model,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 768
        }
      })
    });

    const data = await res.json();
    return data;
  },

  /**
   * 光锥坍缩模式 — 被 Orchestrator 在 Phase 结束时调用
   * @param {Object} collapsePrompt - CollapsePacket，含阶段后果与当前边界
   *   { context, phaseConsequences }
   * @returns {Object} CollapseResult
   */
  async collapse(collapsePrompt) {
    const config = await StorageService.load();

    const res = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'collapse',
        prompt: collapsePrompt,
        provider: config.provider,
        model: config.model,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024
        }
      })
    });

    const data = await res.json();
    return data;
  },

  /**
   * 审计模式 — 被审计员 (Auditor) 调用
   * @param {Object} auditPrompt - AuditPacket，审计员组装的审计包
   *   { context, generatedContent, auditQuestions }
   * @returns {Object} AuditResult
   */
  async audit(auditPrompt) {
    const config = await StorageService.load();

    const res = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'audit',
        prompt: auditPrompt,
        provider: config.provider,
        model: config.model,
        generationConfig: {
          temperature: 0.1, // 后端仍会再次强制收束
          maxOutputTokens: 512
        }
      })
    });

    const data = await res.json();
    // answers[] 由后端结构化校验后返回，前端不再处理自然语言 content
    return data;
  }

};
```

### 11.5 测试验证清单

```
□ 能在 ConfigPanel 选择 4 个正式 provider 中的任意一个
□ 填入 API Key 后点"测试连接"能显示延迟
□ 点"保存配置"后 logos.config.json 文件更新
□ 刷新页面后配置能从磁盘恢复
□ 调用 AdapterService.generate() 能收到可通过 `GenerateResult` 校验的结果
□ 调用 AdapterService.audit() 能收到可通过 `AuditResult` 校验的结果
□ 调用 AdapterService.settlePhaseConsequences() 能收到可通过 `PhaseConsequenceResult` 校验的结果
□ TokenDashboard 能显示 5 段占比（普通轮次 `generationControl` 可为 0）
□ 切换供应商后映射格式正确（Gemini vs OpenAI 兼容）
□ 结构化输出不支持时，后端会返回明确错误，而不是文本 fallback
□ 调用 AdapterService.collapse() 能收到可通过 `CollapseResult` 校验的结果
□ settlement 模式的 temperature 确实由后端收束为 0.2
□ collapse 模式的 temperature 确实由后端收束为 0.5
□ 审计模式的 temperature 确实由后端收束为 0.1
□ 连续调用不会出现 CORS 错误
□ GameView 能显示 Beat 文本和 4 个选项按钮（placeholder 级别即可）
```

---

## 附录：关键术语对照

| 术语 | 英文 | 本方案中的位置 |
|---|---|---|
| Beat（节） | Beat | 最小生成单位，2000-4000 字 + 4 选项 |
| Phase（段） | Phase | 4 个 Beat（见 ADR-002），作者控制叙事节奏的最小单位 |
| Scene（场） | Scene | 一个独立故事，包含 4-6 个 Phase |
| 声量 | Volume | Low / Med / High，控制叙事强度 |
| 段落梯度 | Phase Gradient | Rising / Falling / Static High 等 7 种 |
| 叙事路由 | Narrative Router | 行为词典选择器（动作/悬疑/浪漫等） |
| 光锥坍缩 | Light Cone Collapse | Alpha/Beta 边界的动态收缩机制 |
| 导演批注 | Director's Note | 每轮生成的局部控制指令 |
| 审计员 | Auditor | 生成后的是/否质量判定 |
| Prompt 组装器 | Prompt Assembler | 4 层结构的最终 Prompt 拼装器 |
