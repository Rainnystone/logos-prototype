# Runbook

## Development Server

### Start

```bash
npm run dev
```

Default: `http://localhost:3000`

### Build & Run Production

```bash
npm run build
npm start
```

## Common Issues & Fixes

### "Failed to fetch" / CORS error when using third-party LLM providers

**Symptom**: Browser console shows `Failed to fetch` or CORS error when calling
non-Anthropic/non-OpenAI APIs (e.g., MiniMax).

**Cause**: Browser-side `fetch` to third-party APIs is blocked by CORS policy.

**Fix**: The app routes non-Anthropic/non-OpenAI requests through `/api/llm/proxy`
server-side. This is automatic — no user action needed. If the proxy route is missing,
ensure `src/app/api/llm/proxy/route.ts` exists.

### "Anthropic provider response did not include text content"

**Symptom**: LLM call returns only `thinking` blocks with no `text` block. Common
with MiniMax M2.7 when `maxOutputTokens` is too low.

**Cause**: Models with extended thinking use output tokens for both thinking and text.
If the token budget is exhausted during thinking, no text block is produced.

**Fix**: Increase `maxOutputTokens` via Advanced Parameters in Provider Setup.
The `audit` mode default was raised from 512 to 4096 for this reason.

### WorldBase & Cast saves dropping characters

**Symptom**: Editing a character field and saving causes the character to disappear.

**Cause**: Fixed in commit `964eb05`. Root causes were:
1. Regex `\Z` in `extractStructuredSection` (not valid in JavaScript)
2. A `pendingSectionReviews` interceptor that blocked cross-section saves

**Fix**: Already resolved. If symptoms reappear, check `src/authoring/sections/worldbase-cast.ts`
for the `extractStructuredSection` regex.

### Tests fail with "command not found: vitest"

**Symptom**: `npm test` fails because vitest is not installed.

**Fix**: Run `npm install` to install dependencies.

### Control Modules changes not appearing in Scene & Phase dropdowns

**Symptom**: New router profiles added in Control Modules don't show in the
Router Hint dropdown on Scene & Phase.

**Cause**: Router options update after saving. Unsaved draft changes are not
reflected across tabs.

**Fix**: Save the Control Modules section first, then navigate to Scene & Phase.
The router options will reflect the saved state.

### Weaver import returns incomplete payload

**Symptom**: Weaver import succeeds but fields are missing or malformed.

**Cause**: Reference file may be missing or the LLM is not following the output contract.

**Fix**:
1. Check `src/agents/weaver/references/import-reference.md` exists
2. Validate the response against `WeaverImportPayloadSchema` in `src/types/weaver.ts`

### Gossipelog bootstrap stuck in pending_bootstrap

**Symptom**: Agent surface shows "等待初始化" but never progresses.

**Cause**: Weaver import summary may be missing or bootstrap failed.

**Fix**:
1. Check `agents/weaver/import-summary.yaml` exists in the story package
2. Verify `bootstrapStatus` is not `failed` or `fallback_pending`
3. Try manual bootstrap via `POST /api/play/gossipelog/bootstrap`

### Sidecar reference file missing

**Symptom**: Sidecar skill fails with "Required reference could not be loaded".

**Cause**: Reference file path in definition does not match actual file location.

**Fix**:
1. Check `referenceManifestsByOperation` in the agent's `definition.ts`
2. Verify `relativePath` points to an existing file
3. Ensure the file is committed to the repository

## Quality Gates

Before marking work complete:

```bash
npm run lint          # Zero warnings
npm run type-check    # No type errors
npm test              # All tests pass (750+)
```

For simulation or sidecar work:

```bash
npm run type-check:simulation  # Simulation TypeScript check
npm run test:simulation        # Simulation regression tests
```

## Architecture Notes

### LLM Request Flow

```
Browser UI → Provider Config (localStorage)
  → createAPIAdapter(config)
  → Provider (Anthropic / OpenAI-compatible)
  → [if non-standard domain] /api/llm/proxy (server-side)
  → External LLM API
  → Response parsed → UI updated
```

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/llm/proxy` | Server-side proxy for third-party LLM APIs (CORS bypass) |
| `/api/authoring/packages` | List/create story packages |
| `/api/authoring/packages/[name]/sections/[id]` | Save section drafts |
| `/api/authoring/packages/[name]/coordinator` | Coordinator skill endpoint |
| `/api/authoring/packages/[name]/diagnostics` | Package diagnostics |
| `/api/authoring/packages/[name]/storylines/actions` | Storyline branching actions |
| `/api/play/packages/[name]/runtime-session` | Runtime session management |
| `/api/play/gossipelog` | Gossipelog runtime cycle |
| `/api/play/gossipelog/bootstrap` | Gossipelog bootstrap from Weaver summary |

### Authoring Save Flow

```
Page Draft → PATCH /api/authoring/packages/[name]/sections/[id]
  → saveSectionDraft() in bridge.ts
  → Validate → Write files → Reload → Return SaveResult
  → UI updates from reloadedSectionState
```

### Sidecar Agent Flow

```
runWeaverImport() / runGossipelogCycle()
  → resolveSidecarReferences() [if applicable]
  → buildXxxSystemPrompt() + buildXxxUserPrompt()
  → adapter.weaverImport() / adapter.gossipelogUpdate() / adapter.gossipelogInjection()
  → validateXxxResult() via Zod schema
  → repository.saveXxxState()
```

**Weaver**: Text import → structured bootstrap summary (`import-summary.yaml`)
**Gossipelog**: Relationship tracking across scenes (`character-relationships.yaml`)

Sidecar skills are NOT independent files — they are:
- Declared via `skillIds` + `skillDisplayMetadata` in definition
- Implemented as methods on `LLMAdapter` interface
- Orchestrated by deterministic code in `agent.ts`

### Runtime Session Flow

```
Play Workbench → /api/play/packages/[name]/runtime-session
  → loadRuntimeSession() from runtime-sessions.json
  → Checkpoint chain validation
  → Continuity views for UI
  → Orchestrator runs beat generation loop
```

### Storyline Workspace Flow

```
Story Package Management → /api/authoring/packages/[name]/storylines/actions
  → Branch / Merge / Switch variant
  → substrate.ts manages checkpoint references
  → repository.ts persists to storyline-repository.json
  → workspace-view.ts provides UI projection
```
