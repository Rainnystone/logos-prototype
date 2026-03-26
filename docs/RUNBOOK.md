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

## Quality Gates

Before marking work complete:

```bash
npm run lint          # Zero warnings
npm run type-check    # No type errors
npm test              # All tests pass (318+)
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

### Authoring Save Flow

```
Page Draft → PATCH /api/authoring/packages/[name]/sections/[id]
  → saveSectionDraft() in bridge.ts
  → Validate → Write files → Reload → Return SaveResult
  → UI updates from reloadedSectionState
```
