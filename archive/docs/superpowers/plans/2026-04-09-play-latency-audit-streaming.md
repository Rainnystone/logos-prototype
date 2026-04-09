# Play Latency Audit Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Narrow audit to current-beat content only and add true beat-body streaming on the `audit off` path without changing existing narrative control semantics.

**Architecture:** Keep the current buffered generate path as the source of truth, then add a second generate-stream path that is only eligible when no audit questions are selected. Audit contract narrowing stays isolated to the audit packet/prompt layer, while streaming stays isolated to provider/proxy/adapter/orchestrator/workbench wiring and must always fall back to the current buffered path when streaming support is unavailable.

**Tech Stack:** Next.js route handlers, React 19, TypeScript, Vitest, Testing Library, existing LOGOS runtime adapter/provider abstractions

---

## Scope Guardrails

- This plan only covers:
  - `audit` contract narrowing to current `beatText + options`
  - `audit off` beat-body streaming with options/input still gated
- This plan must not change:
  - `router` semantics
  - `memory placeholder` / history-window behavior
  - phase / beat orchestration meaning
  - `audit on` visible behavior
  - `routerHint`
- Stream preview and terminal final result must come from the same generate request.
- Unsupported streaming capability must fall back to the existing buffered generate path.

## File Structure

| File | Responsibility in this plan |
| --- | --- |
| `src/types/audit-packet.ts` | Shrink `AuditPacket` so it no longer models `precedingBeats` |
| `src/engine/modules/auditor.ts` | Build audit packets from current generated output only |
| `src/engine/api-adapter/prompt-templates.ts` | Remove `[Preceding Beats]` from audit prompt; keep generate wording unchanged |
| `src/engine/api-adapter/__tests__/fixtures.ts` | Update sample audit packet fixture to the narrowed contract |
| `src/story-packages/sample-scene/audit-questions.yaml` | Rewrite only the questions that no longer make sense without history |
| `src/engine/__tests__/fixtures/audit-loop-fixtures.ts` | Keep fixture questions aligned with the narrowed audit contract |
| `src/engine/types/adapter-interface.ts` | Add optional generate-stream contract for runtime-facing adapters |
| `src/engine/api-adapter/providers/provider-interface.ts` | Add provider-facing stream contract types and capability hooks |
| `src/engine/api-adapter/providers/openai-compatible.ts` | Implement provider streaming path and buffered fallback support |
| `src/engine/api-adapter/providers/anthropic.ts` | Implement provider streaming path and buffered fallback support |
| `src/app/api/llm/proxy/route.ts` | Preserve streamed responses instead of buffering the whole upstream JSON body |
| `src/engine/api-adapter/adapter.ts` | Map provider streaming to adapter streaming while keeping the buffered path intact |
| `src/app/play/runtime.ts` | Extend workbench tracking/reporting so streamed beat deltas can reach the UI |
| `src/app/play/runtime.test.ts` | Prove the browser-side `/play` runtime consumer can receive stream events and fall back cleanly |
| `src/engine/orchestrator.ts` | Use stream path only on `audit off`; keep accepted-state persistence tied to final result |
| `src/app/play/PlayWorkbench.tsx` | Render temporary streamed beat text, gate options/input, and roll back on error |
| `src/app/api/llm/proxy/route.test.ts` | New transport-level test for streamed proxy passthrough |
| `src/app/__tests__/play.test.tsx` | UI-level streaming, fallback, rollback, and scroll-follow behavior |
| `docs/superpowers/specs/2026-04-09-play-latency-audit-streaming-design.md` | Active spec already approved; update only if implementation reveals a necessary clarification |
| `archive/vendor/LOGOS-SPEC/04_MODULES/auditor.md` | Sync archive module contract after code lands |
| `archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml` | Sync archived audit packet contract after code lands |
| `archive/vendor/LOGOS-SPEC/04_MODULES/api-adapter-lite/interface-contracts.md` | Sync archived interface text that still says audit consumes preceding beats |

## Execution Order

1. Narrow the audit contract first. Do not start streaming work before audit tests and fixtures are green.
2. Fix only the audit questions/fixtures that conflict with the new contract.
3. Add streaming capability at the provider/proxy/adapter layer with deterministic buffered fallback.
4. Hook streaming into orchestrator + workbench on the `audit off` path only.
5. Sync the archived contract docs and run final verification.

### Task 1: Narrow The Audit Packet Contract

**Packet Goal:** Make audit consume only the current generated beat and its four options.

**Files:**
- Modify: `src/types/audit-packet.ts`
- Modify: `src/engine/modules/auditor.ts`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Modify: `src/engine/api-adapter/__tests__/fixtures.ts`
- Modify: `src/engine/modules/__tests__/auditor.test.ts`
- Modify: `src/engine/__tests__/schema-validator.test.ts`
- Modify: `src/types/__tests__/type-conformance.test.ts`
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`

**Verification:** `npm test -- src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/schema-validator.test.ts src/types/__tests__/type-conformance.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts`

**Parallel:** No. This packet changes the shared audit contract.

**Reviewer Focus:** Contract shrinkage only; no hidden fallback history path.

- [ ] **Step 1: Write the failing audit-contract tests**

```ts
it('builds AuditPacket without preceding beats', () => {
  const packet = buildAuditPacket('generated-beat', ['a', 'b', 'c', 'd'], selectedQuestions);
  expect(packet).not.toHaveProperty('context.precedingBeats');
});

it('renders audit prompt without a preceding-beats section', () => {
  const request = mapForAudit(sampleAuditPacket, 'openai-compatible');
  expect(request.messages[0]?.content).not.toContain('[Preceding Beats]');
});
```

- [ ] **Step 2: Run the targeted contract tests and confirm they fail**

Run: `npm test -- src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/schema-validator.test.ts src/types/__tests__/type-conformance.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts`

Expected: FAIL because `AuditPacket` still requires `context.precedingBeats` and the prompt still renders it.

- [ ] **Step 3: Implement the narrowed audit contract**

```ts
export const AuditPacketSchema = z.object({
  generatedContent: GeneratedContentSchema,
  auditQuestions: z.array(z.string()),
}).strict();

export function buildAuditPacket(
  beatText: string,
  options: readonly string[],
  selectedQuestions: readonly AuditQuestion[],
): AuditPacket {
  return validateAuditPacket({
    generatedContent: { beatText, options: [...options] },
    auditQuestions: selectedQuestions.map((question) => question.question),
  });
}
```

- [ ] **Step 4: Remove the old prompt section and update fixtures**

```ts
export function buildAuditUserPrompt(packet: AuditPacket): string {
  return [
    '[Generated Beat]',
    packet.generatedContent.beatText,
    '',
    '[Generated Options]',
    packet.generatedContent.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n'),
    '',
    '[Audit Questions]',
    packet.auditQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n'),
  ].join('\n');
}
```

- [ ] **Step 5: Re-run the targeted contract tests and confirm they pass**

Run: `npm test -- src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/schema-validator.test.ts src/types/__tests__/type-conformance.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the audit-contract packet**

```bash
git add src/types/audit-packet.ts src/engine/modules/auditor.ts src/engine/api-adapter/prompt-templates.ts src/engine/api-adapter/__tests__/fixtures.ts src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/schema-validator.test.ts src/types/__tests__/type-conformance.test.ts src/engine/api-adapter/__tests__/schema-mapper.test.ts
git commit -m "refactor: narrow audit packets to current beat output"
```

### Task 2: Align Audit Questions And Fixtures To Beat-Local Audit

**Packet Goal:** Rewrite only the audit questions and fixtures that no longer make sense without history.

**Files:**
- Modify: `src/story-packages/sample-scene/audit-questions.yaml`
- Modify: `src/engine/__tests__/fixtures/audit-loop-fixtures.ts`
- Modify: `src/engine/__tests__/e2e/audit-behavior.test.ts`

**Verification:** `npm test -- src/engine/__tests__/e2e/audit-behavior.test.ts src/engine/modules/__tests__/auditor.test.ts`

**Parallel:** No. This packet depends on Task 1’s new contract.

**Reviewer Focus:** Only fix questions that rely on cross-beat history; do not redesign the whole audit question set.

- [ ] **Step 1: Write or update failing assertions for beat-local wording**

```ts
expect(harness.generateCalls[1]?.generationControl?.rewriteFeedback).toContain(
  '本轮 Beat 是否提前把灰谷烈完整揭示为异常元凶？',
);
```

- [ ] **Step 2: Run the audit e2e suite and confirm it fails on stale question text**

Run: `npm test -- src/engine/__tests__/e2e/audit-behavior.test.ts src/engine/modules/__tests__/auditor.test.ts`

Expected: FAIL because rewrite feedback and fixtures still reference history-dependent audit wording.

- [ ] **Step 3: Rewrite only the conflicting questions**

```yaml
- id: AQ-P1-002
  question: 本轮 Beat 是否直接把灰谷烈完整揭示为异常元凶？
  expected: false
```

```ts
question: 'Does the current beat preserve the phase-two pressure shift?'
```

- [ ] **Step 4: Re-run the audit-focused tests and confirm they pass**

Run: `npm test -- src/engine/__tests__/e2e/audit-behavior.test.ts src/engine/modules/__tests__/auditor.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the audit-question cleanup**

```bash
git add src/story-packages/sample-scene/audit-questions.yaml src/engine/__tests__/fixtures/audit-loop-fixtures.ts src/engine/__tests__/e2e/audit-behavior.test.ts
git commit -m "test: align audit fixtures with beat-local contract"
```

### Task 3: Add Generate Streaming Transport And Buffered Fallback

**Packet Goal:** Teach the provider/proxy/adapter stack how to stream beat-body chunks on the generate path while preserving the current buffered path as a required fallback.

**Files:**
- Modify: `src/engine/types/adapter-interface.ts`
- Modify: `src/engine/api-adapter/providers/provider-interface.ts`
- Modify: `src/engine/api-adapter/adapter.ts`
- Modify: `src/engine/api-adapter/providers/openai-compatible.ts`
- Modify: `src/engine/api-adapter/providers/anthropic.ts`
- Modify: `src/app/api/llm/proxy/route.ts`
- Create: `src/app/api/llm/proxy/route.test.ts`
- Modify: `src/engine/api-adapter/__tests__/provider-interface.test.ts`
- Modify: `src/engine/api-adapter/__tests__/providers.test.ts`
- Modify: `src/engine/api-adapter/__tests__/adapter.test.ts`
- Modify: `src/app/play/runtime.test.ts`

**Verification:** `npm test -- src/engine/api-adapter/__tests__/provider-interface.test.ts src/engine/api-adapter/__tests__/providers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts src/app/api/llm/proxy/route.test.ts src/app/play/runtime.test.ts`

**Parallel:** No. This packet introduces new transport contracts.

**Reviewer Focus:** Single-request stream contract, deterministic fallback, no preview-only second request.

- [ ] **Step 1: Write the failing transport tests**

```ts
it('passes through a streamed proxy response without buffering it into JSON', async () => {
  const response = await POST(makeStreamingProxyRequest());
  expect(response.headers.get('content-type')).toContain('text/event-stream');
});

it('forwards streamed beat-text deltas through the browser runtime transport', async () => {
  const deltas: string[] = [];
  await adapter.streamGenerate?.(promptObject, (event) => {
    if (event.type === 'beatTextDelta') deltas.push(event.delta ?? '');
  });
  expect(deltas.length).toBeGreaterThan(0);
});

it('falls back to buffered generate when streamGenerate is unavailable', async () => {
  expect(adapter.streamGenerate).toBeUndefined();
});
```

- [ ] **Step 2: Run the transport-focused tests and confirm they fail**

Run: `npm test -- src/engine/api-adapter/__tests__/provider-interface.test.ts src/engine/api-adapter/__tests__/providers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts src/app/api/llm/proxy/route.test.ts src/app/play/runtime.test.ts`

Expected: FAIL because no streaming contract exists, the proxy always calls `response.json()`, and the browser runtime consumer has no streamed generate path.

- [ ] **Step 3: Add the provider/adapter stream contracts**

```ts
export interface GenerateStreamEvent {
  readonly type: 'beatTextDelta' | 'finalResult';
  readonly delta?: string;
  readonly result?: GenerateResult;
}

export interface LLMAdapter {
  generate?(request: PromptObject): Promise<GenerateResult>;
  streamGenerate?(
    request: PromptObject,
    onEvent: (event: GenerateStreamEvent) => Promise<void> | void,
  ): Promise<void>;
}
```

- [ ] **Step 4: Implement real buffered fallback and proxy passthrough**

```ts
if (!provider.streamGenerate) {
  return undefined;
}

return new Response(upstream.body, {
  status: upstream.status,
  headers: streamedHeaders,
});
```

- [ ] **Step 5: Re-run the transport-focused tests and confirm they pass**

Run: `npm test -- src/engine/api-adapter/__tests__/provider-interface.test.ts src/engine/api-adapter/__tests__/providers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts src/app/api/llm/proxy/route.test.ts src/app/play/runtime.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the transport packet**

```bash
git add src/engine/types/adapter-interface.ts src/engine/api-adapter/providers/provider-interface.ts src/engine/api-adapter/adapter.ts src/engine/api-adapter/providers/openai-compatible.ts src/engine/api-adapter/providers/anthropic.ts src/app/api/llm/proxy/route.ts src/app/api/llm/proxy/route.test.ts src/engine/api-adapter/__tests__/provider-interface.test.ts src/engine/api-adapter/__tests__/providers.test.ts src/engine/api-adapter/__tests__/adapter.test.ts src/app/play/runtime.test.ts
git commit -m "feat: add generate streaming transport with fallback"
```

### Task 4: Stream Non-Audited Beat Text Through Orchestrator And Play Workbench

**Packet Goal:** Use the new stream path only when audit is absent, render temporary streamed beat text in the workbench, and roll it back on failure.

**Files:**
- Modify: `src/app/play/runtime.ts`
- Modify: `src/engine/orchestrator.ts`
- Modify: `src/app/play/PlayWorkbench.tsx`
- Modify: `src/app/play/runtime.test.ts`
- Modify: `src/engine/__tests__/orchestrator.test.ts`
- Modify: `src/app/__tests__/play.test.tsx`

**Verification:** `npm test -- src/app/play/runtime.test.ts src/engine/__tests__/orchestrator.test.ts src/app/__tests__/play.test.tsx`

**Parallel:** No. This packet depends on Task 3’s stream contract.

**Reviewer Focus:** `audit on` unchanged, streamed body visible before options, rollback on failure, input never unlocks early.

- [ ] **Step 1: Write the failing orchestrator and UI tests**

```ts
it('streams beat text before options when no audit questions are selected', async () => {
  expect(screen.getByText(/Draft beat chunk/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Option 1/i })).not.toBeInTheDocument();
});

it('auto-follows streamed content only while the player stays near the bottom', async () => {
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  expect(scrollIntoView).not.toHaveBeenCalledTimes(2);
});

it('falls back to the buffered beat path when streaming support is unavailable', async () => {
  expect(screen.getByText(/Draft beat 1 for/i)).toBeInTheDocument();
  expect(screen.queryByText(/Draft beat chunk/i)).not.toBeInTheDocument();
});

it('keeps the audited path fully buffered even when streamGenerate exists', async () => {
  expect(streamGenerate).not.toHaveBeenCalled();
  expect(screen.getByText(/Auditing/i)).toBeInTheDocument();
});

it('removes temporary streamed text when the final generate request fails', async () => {
  expect(screen.queryByText(/Draft beat chunk/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Failed to run the next beat/i)).toBeInTheDocument();
  expect(recordAcceptedBeat).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the runtime/workbench tests and confirm they fail**

Run: `npm test -- src/app/play/runtime.test.ts src/engine/__tests__/orchestrator.test.ts src/app/__tests__/play.test.tsx`

Expected: FAIL because the orchestrator only returns fully buffered beats and the workbench has no temporary streaming state.

- [ ] **Step 3: Add minimal runtime/orchestrator streaming hooks**

```ts
if (selectedQuestions.length === 0 && config.adapter.streamGenerate) {
  await config.adapter.streamGenerate(promptObject, (event) => {
    if (event.type === 'beatTextDelta') {
      onBeatTextDelta?.(event.delta ?? '');
    }
    if (event.type === 'finalResult') {
      finalResult = event.result ?? null;
    }
  });
}
```

- [ ] **Step 4: Add temporary streamed beat UI state with rollback**

```tsx
const [streamingBeatText, setStreamingBeatText] = useState('');
const shouldFollowStreamRef = useRef(true);

onBeatTextDelta(delta) {
  setStreamingBeatText((current) => current + delta);
}

useLayoutEffect(() => {
  if (shouldFollowStreamRef.current) {
    streamAnchorRef.current?.scrollIntoView({ block: 'end' });
  }
}, [streamingBeatText]);

catch (error) {
  setStreamingBeatText('');
  setError(message);
}
```

- [ ] **Step 5: Keep options hidden and input locked until the final result lands**

```tsx
const displayedBeatText = streamingBeatText || currentState?.generationState.currentBeatText;
const showOptions = status !== 'generating' && currentOptions.length > 0;
```

- [ ] **Step 6: Re-run the runtime/workbench tests and confirm they pass**

Run: `npm test -- src/app/play/runtime.test.ts src/engine/__tests__/orchestrator.test.ts src/app/__tests__/play.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the workbench packet**

```bash
git add src/app/play/runtime.ts src/engine/orchestrator.ts src/app/play/PlayWorkbench.tsx src/app/play/runtime.test.ts src/engine/__tests__/orchestrator.test.ts src/app/__tests__/play.test.tsx
git commit -m "feat: stream non-audited beat text in play workbench"
```

### Task 5: Sync Contracts And Run Final Verification

**Packet Goal:** Bring the archived contract docs back into sync with the implemented audit behavior, then run the full verification loop.

**Files:**
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/auditor.md`
- Modify: `archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/api-adapter-lite/interface-contracts.md`
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md`

**Verification:** `npm test && npm run build`

**Parallel:** No. This packet depends on all code packets landing first.

**Reviewer Focus:** Archive sync only where the new contract directly contradicts the archived text; no unrelated spec churn.

- [ ] **Step 1: Update the archived audit contract docs**

```yaml
context:
  description: removed in the current runtime contract
generatedContent:
  beatText: string
  options: string[4]
```

- [ ] **Step 2: Update the worktree tracking files with what actually landed**

```md
- Packet 2 complete: audit packets no longer include preceding beats
- Packet 3 complete: generate streaming falls back to buffered mode when unsupported
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run the app build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit the doc sync and final verification packet**

```bash
git add archive/vendor/LOGOS-SPEC/04_MODULES/auditor.md archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml archive/vendor/LOGOS-SPEC/04_MODULES/api-adapter-lite/interface-contracts.md task_plan.md progress.md findings.md
git commit -m "docs: sync audit contract after latency streaming changes"
```

## Final Handoff Checklist

- [ ] Task 1 complete and committed
- [ ] Task 2 complete and committed
- [ ] Task 3 complete and committed
- [ ] Task 4 complete and committed
- [ ] Task 5 complete and committed
- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] No scope creep into router, memory, or broader runtime redesign
