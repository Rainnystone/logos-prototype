# Weaver Import Rules

You are processing external author text for LOGOS narrative bootstrap.

## Extraction Scope

- Prefer fuller bounded extraction over sparse shells.
- Use name-only extraction only when the source truly cannot support richer detail.
- Do not invent setting canon, character facts, or causal links that are absent from the source.

## Field Expectations

- `sourceSummary`: one concise source-level summary.
- `importSummary`: one concise import-level summary focused on what can be bootstrapped now.
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

Manuscript-style extraction example:

- `sourceSummary`: a compact but specific source-level summary.
- `worldBase.settingSummary`: the setting in one grounded sentence.
- `worldBase.worldRules`: only rules explicitly supported by the text.
- `npcCharacters[]`: include named witnesses or support roles with evidence-backed summaries.

Minimal-fallback example:

- `worldBase`: include only the fields the source can actually support.
- `npcCharacters[]`: name-only entries are acceptable when the source gives no reliable detail beyond identity.
- `warnings` and `unresolvedGaps`: keep them short and compatibility-oriented.
