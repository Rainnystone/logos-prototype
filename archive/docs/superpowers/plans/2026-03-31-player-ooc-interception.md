# Player OOC Interception Implementation Plan

**Goal:** Add a fixed generate-system prompt rule that redirects severe player OOC/world-breaking input into internal thought instead of executed action.

**Architecture:** Keep this as a single fixed system-prompt instruction in prompt assembly. Do not add any new state, toggle, or runtime branch.

### Task 1: Add prompt coverage first

**Files:**
- Modify: `src/engine/api-adapter/__tests__/schema-mapper.test.ts`
- Modify: `src/engine/api-adapter/__tests__/prompt-templates.test.ts` if needed

- [ ] Add failing assertions that the generate system prompt contains the new interception rule and places it before `World Base`
- [ ] Run the targeted prompt tests and verify failure

### Task 2: Add the fixed rule to prompt assembly

**Files:**
- Modify: `src/engine/api-adapter/prompt-templates.ts`

- [ ] Add a concise fixed rule after the storyteller operating stance and before `World Base`
- [ ] Keep wording specific to severe violations only
- [ ] Ensure the rule says the impulse can appear as inner thought or self-directed complaint, but cannot become real action

### Task 3: Verify

**Files:**
- No new files

- [ ] Run targeted prompt tests
- [ ] Run `npm run type-check`
- [ ] Run full `npm test`
