# Audit Disable Empty Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authors to disable auditing by unselecting every audit question, with runtime skipping the audit call entirely when the effective selection is empty.

**Architecture:** Keep the existing audit-question selection model as the only source of truth. Remove minimum-count assumptions from contracts and authoring normalization, then add a single explicit short-circuit in the orchestrator when the selected question list is empty. Do not add any new `auditEnabled` flag, UI mode, fallback question, or fake audit result path.

**Tech Stack:** TypeScript, Zod, Vitest, React, Next.js, existing LOGOS engine/orchestrator.

---

### Task 1: Allow empty audit selections in contracts and normalization

**Files:**
- Modify: `src/types/audit-question-set.ts`
- Modify: `src/types/audit-packet.ts`
- Modify: `src/authoring/sections/control-modules.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/authoring/sections/__tests__/control-modules.test.ts`
- Test: `src/engine/__tests__/schema-validator.test.ts`

- [ ] **Step 1: Write the failing contract tests**

Add tests that prove:

- `selectionPolicy.default` may be an empty array
- `AuditPacket.auditQuestions` may be an empty array
- normalization keeps an empty default selection intact instead of restoring a minimum set

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/control-modules.test.ts src/engine/__tests__/schema-validator.test.ts`

Expected: the new empty-selection assertions fail under the current minimum-count rules.

- [ ] **Step 3: Write the minimal contract and normalization changes**

Implement only these changes:

- remove `.min(1)` from `SelectionPolicySchema.default`
- remove `.min(1)` from `AuditPacketSchema.auditQuestions`
- keep global question definitions required, but allow selected ID lists to be empty
- keep `normalizeAuditQuestionSet()` filtering invalid IDs, but do not reintroduce any fallback minimum

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/control-modules.test.ts src/engine/__tests__/schema-validator.test.ts`

Expected: all targeted contract and normalization tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/audit-question-set.ts src/types/audit-packet.ts src/authoring/sections/control-modules.ts src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/control-modules.test.ts src/engine/__tests__/schema-validator.test.ts
git commit -m "feat: allow empty audit selections"
```

### Task 2: Preserve empty selection through authoring save and reload

**Files:**
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/app/edit/sections/ControlModulesSection.tsx`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`
- Test: `src/app/edit/__tests__/ControlModulesSection.test.tsx`

- [ ] **Step 1: Write the failing authoring tests**

Add tests that prove:

- the editor can uncheck all default audit questions and keep the draft empty
- bridge extraction / normalization / save round-trip preserves the empty default selection

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/ControlModulesSection.test.tsx`

Expected: the new empty-selection persistence assertions fail before implementation.

- [ ] **Step 3: Write the minimal authoring changes**

Keep the UI checkbox model unchanged. Only ensure:

- empty default selections survive section draft updates
- bridge normalization keeps `selectionPolicy.default: []`
- no hidden fallback or warning state is introduced

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/ControlModulesSection.test.tsx`

Expected: both authoring suites pass with the empty-selection scenario.

- [ ] **Step 5: Commit**

```bash
git add src/authoring/persistence/bridge.ts src/app/edit/sections/ControlModulesSection.tsx src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/ControlModulesSection.test.tsx
git commit -m "feat: preserve empty audit selection in authoring"
```

### Task 3: Skip audit at runtime when no questions are selected

**Files:**
- Modify: `src/engine/modules/auditor.ts`
- Modify: `src/engine/orchestrator.ts`
- Modify: `src/app/play/runtime.ts`
- Test: `src/engine/modules/__tests__/auditor.test.ts`
- Test: `src/engine/__tests__/orchestrator.test.ts`
- Test: `src/engine/__tests__/e2e/audit-behavior.test.ts`
- Test: `src/app/__tests__/play.test.tsx`

- [ ] **Step 1: Write the failing runtime tests**

Add tests that prove:

- `selectAuditQuestions()` returns an empty selection when nothing is selected
- orchestrator does not call `adapter.audit` when the selected list is empty
- the beat is accepted directly with empty audit answers, zero retries, and no rewrite feedback
- workbench tracking does not enter `auditing` status for the empty-selection path

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/app/__tests__/play.test.tsx`

Expected: the new skip-audit assertions fail before the runtime short-circuit exists.

- [ ] **Step 3: Write the minimal runtime implementation**

Implement only this flow:

- keep `selectAuditQuestions()` capable of returning an empty list
- in the orchestrator, detect `selectedQuestions.length === 0` before calling audit
- when empty, accept the generated beat directly and keep audit-related state empty
- keep the existing audit path unchanged when questions are present
- avoid fake audit packets, fake audit results, or new runtime flags

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/app/__tests__/play.test.tsx`

Expected: all targeted runtime tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/modules/auditor.ts src/engine/orchestrator.ts src/app/play/runtime.ts src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/app/__tests__/play.test.tsx
git commit -m "feat: skip audit when no questions are selected"
```

### Task 4: Verify the integrated path

**Files:**
- No new files

- [ ] **Step 1: Run the focused end-to-end verification**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/control-modules.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/app/edit/__tests__/ControlModulesSection.test.tsx src/engine/modules/__tests__/auditor.test.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/audit-behavior.test.ts src/app/__tests__/play.test.tsx`

Expected: all changed-path suites pass together.

- [ ] **Step 2: Run type-check**

Run: `npm run type-check`

Expected: no type errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: no new failures introduced by this feature. If unrelated pre-existing failures remain, record them explicitly before closing the work.

- [ ] **Step 4: Confirm scope discipline**

Verify that the implementation:

- does not add `auditEnabled`
- does not add UI warning banners
- does not add fake audit pass packets
- does not change non-empty audit behavior
