# Weaver Import Rules

You are processing external author text for LOGOS narrative bootstrap.

## Extraction Scope

- Prefer fuller bounded extraction over sparse shells.
- Use name-only extraction only when the source truly cannot support richer detail.
- Do not invent setting canon, character facts, or causal links that are absent from the source.

## Field Expectations

- `sourceSummary`: one concise source-level summary.
- `importSummary`: one concise import-level summary focused on what can be bootstrapped now.
- suggestedPackageName is only a display-name suggestion, not the final persisted package identity or slug.
- `openingHook`: preserve the source opening hook text in minimally normalized form.
- `worldBase`: lightweight seed object with `settingSummary`, `worldRules`, `toneBaseline`, `locationPatch`, and `npcCharactersSummary`.
- `hero`, `coreCast`, `antagonists`, `npcCharacters`, `locations`: emit only evidence-backed entities.
- `warnings`: include bounded caveats that should not block deterministic persistence.
- `unresolvedGaps`: list concrete missing facts required for confident bootstrap completion.

## Output Discipline

- Return JSON only and satisfy the exact output contract.
- Keep summaries concise; prefer clear bounded statements over literary prose.
- When evidence is incomplete, fall back to the smallest truthful structure, but do not treat minimal shapes as the preferred target.

## Examples

Source excerpt:

> The harbor district never slept. Fog pressed against the quay, the lighthouse bell was silent, and Mara kept counting the distance between the tide and the warehouse door while Old Ellis refused to say who had cut the line. By the time the market stalls emptied, everyone knew the smuggling thread had moved closer than usual.

Expected lightweight payload shape:

```json
{
  "sourceSummary": "A harbor-district scene with Mara, Old Ellis, a silent lighthouse bell, and a smuggling thread.",
  "importSummary": "Bootstrap a harbor-district scene around Mara, Old Ellis, the quay, and the warehouse door.",
  "openingHook": "The harbor district never slept.",
  "worldBase": {
    "settingSummary": "A harbor district with a quay, a lighthouse, a warehouse door, and market stalls.",
    "locationPatch": "quay, lighthouse, warehouse door, and market stalls"
  },
  "hero": { "displayName": "Mara" },
  "coreCast": [{ "displayName": "Old Ellis" }],
  "npcCharacters": [{ "displayName": "Old Ellis" }],
  "locations": [{ "displayName": "quay" }, { "displayName": "lighthouse" }, { "displayName": "warehouse door" }, { "displayName": "market stalls" }],
  "warnings": ["The source does not say who cut the line."],
  "unresolvedGaps": ["The smuggling thread is mentioned but not explained."]
}
```

Minimal-fallback example:

Source excerpt:

> Mara. Old Ellis. Warehouse 9.

Expected lightweight payload shape:

```json
{
  "sourceSummary": "A name-only fragment with Mara, Old Ellis, and Warehouse 9.",
  "importSummary": "Bootstrap the named people and place without inventing unsupported details.",
  "openingHook": "Mara. Old Ellis. Warehouse 9.",
  "npcCharacters": [{ "displayName": "Mara" }, { "displayName": "Old Ellis" }],
  "locations": [{ "displayName": "Warehouse 9" }],
  "warnings": ["The source gives only identity-level evidence."],
  "unresolvedGaps": ["The relationship between Mara, Old Ellis, and Warehouse 9 is not stated."]
}
```
