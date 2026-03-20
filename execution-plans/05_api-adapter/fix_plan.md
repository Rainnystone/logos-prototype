# Phase 05 Fix Plan

## Pre-flight

### 1. Branch Setup
- [ ] Verify Phase 04 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/05-api-adapter`

### 2. Dependency Verification
- [ ] Verify `src/engine/types/adapter-interface.ts` exports `LLMAdapter` interface
- [ ] Verify `src/engine/modules/prompt-assembler.ts` exports `assemblePromptObject`
- [ ] Verify all contract types exist: `PromptObject`, `AuditPacket`, `CollapseRequest`, `CollapseResponse`, `PhaseConsequenceRequest`, `PhaseConsequenceResponse`
- [ ] Verify schema validators exist for all response types
- [ ] Run `npm test` -- all prior tests pass

### 3. Spec Context Load
- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~22,000 tokens): all api-adapter-lite/ docs + all 4 packet schemas
- [ ] Confirm total ~26,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Provider Interface and Types

#### 1.1 RED -- Write Tests
- Create `src/engine/api-adapter/__tests__/provider-interface.test.ts`
- Test: `ProviderConfig` type has `apiKey`, `baseUrl`, `model` fields
- Test: `ProviderType` includes `"anthropic"` and `"openai-compatible"`
- Test: `AdapterConfig` has `provider`, `providerConfig`, and optional mode-specific settings
- Expected: tests FAIL

#### 1.2 GREEN -- Implement
- Create `src/engine/api-adapter/providers/provider-interface.ts`:
  ```typescript
  export type ProviderType = "anthropic" | "openai-compatible";

  export interface ProviderConfig {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly model: string;
  }

  export interface ProviderRequest {
    readonly messages: readonly ProviderMessage[];
    readonly system?: string;
    readonly temperature: number;
    readonly maxOutputTokens: number;
    readonly model: string;
  }

  export interface ProviderMessage {
    readonly role: "system" | "user" | "assistant";
    readonly content: string;
  }

  export interface ProviderResponse {
    readonly content: string;
    readonly usage?: {
      readonly promptTokens: number;
      readonly completionTokens: number;
      readonly totalTokens: number;
    };
  }

  export interface Provider {
    call(request: ProviderRequest): Promise<ProviderResponse>;
  }

  export interface AdapterConfig {
    readonly provider: ProviderType;
    readonly providerConfig: ProviderConfig;
    readonly generateConfig?: { temperature?: number; maxOutputTokens?: number };
    readonly auditConfig?: { temperature?: number; maxOutputTokens?: number };
    readonly settlementConfig?: { temperature?: number; maxOutputTokens?: number };
    readonly collapseConfig?: { temperature?: number; maxOutputTokens?: number };
  }
  ```

#### 1.3 IMPROVE
- Verify config does not expose API keys via logging
- Add JSDoc documenting each provider type

---

### Task 2: Schema Mapper

#### 2.1 RED -- Write Tests
- Create `src/engine/api-adapter/__tests__/schema-mapper.test.ts`

**Generate mapping tests:**
- Test: `mapForGenerate` with a PromptObject produces a valid `ProviderRequest`
- Test: L1 worldBase maps into a system message with character + location info
- Test: L2 history maps into user/assistant messages preserving order
- Test: L3 narrative maps into a system section with mainAxis, endLine, alpha, beta, phaseGoal
- Test: L4 directorNote maps into the final user/system message with highest recency
- Test: generationControl (rewrite path) is included in messages when present
- Test: temperature defaults to 0.8 for generate mode

**Audit mapping tests:**
- Test: `mapForAudit` converts AuditPacket into a prompt asking for boolean answers
- Test: questions are listed clearly in the prompt
- Test: precedingBeats context is included
- Test: beatText and options are included
- Test: temperature defaults to 0.3 for audit (low creativity)

**Settlement mapping tests:**
- Test: `mapForSettlement` converts PhaseConsequenceRequest into structured prompt
- Test: phaseTranscript entries are included in chronological order
- Test: context (mainAxis, endLine, phaseGoal) is included
- Test: temperature is 0.2 (per spec: `phase-consequence-packet-schema.yaml` notes)

**Collapse mapping tests:**
- Test: `mapForCollapse` converts CollapseRequest into structured prompt
- Test: phaseConsequences are listed in the prompt
- Test: current boundaries (currentAlpha, currentBeta) are included
- Test: mainAxis and endLine are included
- Test: temperature is 0.5 (per spec: `collapse-packet-schema.yaml` notes)

- Expected: all tests FAIL

#### 2.2 GREEN -- Implement
- Create `src/engine/api-adapter/schema-mapper.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/api-adapter-lite/schema-mapper.md`
- Implementation for each mode:
  - **generate**: Convert 4-layer PromptObject into message array. System message = L1 (worldBase) + L3 (narrative). Conversation history = L2 (history). Final user message = L4 (directorNote) instructions. If generationControl present, append rewrite context.
  - **audit**: Build a system message explaining the audit task. User message contains precedingBeats, generatedContent (beatText + options), and auditQuestions list. Instruct model to respond with JSON array of booleans.
  - **settlement**: System message with settlement instructions (extract factual consequences). User message with phaseTranscript and context. Instruct model to respond with JSON containing `phaseConsequences[]` and `settlementTrace`.
  - **collapse**: System message explaining boundary re-inference (Causal Elasticity). User message with phaseConsequences, current boundaries, mainAxis, endLine. Instruct model to respond with JSON containing `alpha`, `beta`, `inferenceTrace`.

#### 2.3 IMPROVE
- Extract system prompt templates into a constants file (not hardcoded inline)
- Ensure all prompts request structured JSON output
- Verify temperature values match spec: generate=0.8, audit=0.3, settlement=0.2, collapse=0.5

---

### Task 3: Provider Implementations

#### 3.1 RED -- Write Tests
- Create `src/engine/api-adapter/__tests__/providers.test.ts`
- Test: Anthropic provider formats request correctly (system field + messages)
- Test: OpenAI-compatible provider formats request correctly (messages array only)
- Test: Both providers parse response content correctly
- Test: Both providers extract usage information
- Test: Provider call with network error throws descriptive error
- Use mock HTTP (e.g., `msw` or manual mock) -- do not make real API calls in tests

#### 3.2 GREEN -- Implement
- Create `src/engine/api-adapter/providers/anthropic.ts`:
  - Maps `ProviderRequest` to Anthropic API format (`system`, `messages`, `max_tokens`, `temperature`, `model`)
  - Parses response to extract `content` and `usage`
- Create `src/engine/api-adapter/providers/openai-compatible.ts`:
  - Maps `ProviderRequest` to OpenAI chat format (`messages`, `max_tokens`, `temperature`, `model`)
  - Handles OpenAI, MiniMax, Kimi, and similar providers via `baseUrl`
  - Parses response to extract `choices[0].message.content` and `usage`

#### 3.3 IMPROVE
- Add retry logic with exponential backoff for transient HTTP errors
- Add request timeout configuration
- Ensure API keys never appear in error messages or logs

---

### Task 4: API Adapter Main Entry

#### 4.1 RED -- Write Tests
- Create `src/engine/api-adapter/__tests__/adapter.test.ts`

**generate() tests:**
- Test: `generate()` accepts PromptObject and returns `GenerateResult` with beatText + 4 options
- Test: `GenerateResult` is validated against expected structure
- Test: invalid provider response (missing options) throws descriptive error

**audit() tests:**
- Test: `audit()` accepts AuditPacket and returns `AuditResult` with boolean answers
- Test: answers array length matches auditQuestions length
- Test: invalid response (non-boolean answers) throws error

**settlement() tests:**
- Test: `settlement()` accepts PhaseConsequenceRequest and returns PhaseConsequenceResponse
- Test: response contains `phaseConsequences` (1-6 items) and `settlementTrace`
- Test: response passes `validatePhaseConsequenceResponse` schema check

**collapse() tests:**
- Test: `collapse()` accepts CollapseRequest and returns CollapseResponse
- Test: response contains `alpha`, `beta`, `inferenceTrace`
- Test: response passes `validateCollapseResponse` schema check

**Integration:**
- Test: `createAPIAdapter(config)` returns object implementing full `LLMAdapter` interface
- Test: adapter uses correct temperature for each mode

- Expected: all tests FAIL

#### 4.2 GREEN -- Implement
- Create `src/engine/api-adapter/adapter.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/api-adapter-lite/interface-contracts.md`
- Implementation:
  ```typescript
  export function createAPIAdapter(config: AdapterConfig): LLMAdapter {
    const provider = createProvider(config.provider, config.providerConfig);
    const mapper = createSchemaMapper();

    return {
      async generate(promptObject: PromptObject): Promise<GenerateResult> {
        const request = mapper.mapForGenerate(promptObject, config.provider);
        const response = await provider.call(request);
        return parseGenerateResponse(response);
      },
      async audit(packet: AuditPacket): Promise<AuditResult> {
        const request = mapper.mapForAudit(packet, config.provider);
        const response = await provider.call(request);
        return parseAuditResponse(response);
      },
      async settlement(packet: PhaseConsequenceRequest): Promise<PhaseConsequenceResponse> {
        const request = mapper.mapForSettlement(packet, config.provider);
        const response = await provider.call(request);
        return parseSettlementResponse(response);
      },
      async collapse(request: CollapseRequest): Promise<CollapseResponse> {
        const providerRequest = mapper.mapForCollapse(request, config.provider);
        const response = await provider.call(providerRequest);
        return parseCollapseResponse(response);
      },
    };
  }
  ```
- Response parsers extract structured JSON from LLM text responses and validate

#### 4.3 IMPROVE
- Add comprehensive error handling for malformed LLM responses
- Add logging for API calls (request mode, response status, token usage) without leaking content
- Update Phase 02 to document how to swap mock adapter for real adapter

---

## Post-flight

### 1. Quality Gate
- [ ] `npm test` -- all tests pass (Phase 00-05)
- [ ] `npm run test:coverage` -- >= 80% coverage on api-adapter/, schema-mapper, providers
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR
- [ ] Stage: `src/engine/api-adapter/` (all files), test files
- [ ] `git commit -m "feat: add APIAdapterLite with Anthropic + OpenAI providers and 4-mode schema mapper"`
- [ ] `git push -u origin phase/05-api-adapter`
- [ ] Create PR against `main` with title: "Phase 05: API Adapter Lite"

### 3. STOP
Do not proceed to Phase 06 until this PR is reviewed and merged.
