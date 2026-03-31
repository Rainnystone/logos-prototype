# Player OOC Interception Prompt Design

## Goal

When the player submits free-form input that severely violates the established world base, the protagonist's fixed characterization, or the protagonist's OOC red lines, generation must not execute that input as an in-world action.

Instead, the generation prompt should require the model to:

- preserve the input as a fleeting impulse, stray thought, or self-directed inner complaint from the protagonist
- refuse to let that impulse become the protagonist's actual action
- infer the protagonist's next reasonable in-world behavior from the current context
- continue the beat forward without breaking story flow

## Non-Goals

- No new runtime flag
- No new audit question
- No author-facing toggle
- No hard rejection message to the player
- No attempt to classify mild or ambiguous deviation; this rule is for severe violations only

## Placement

This rule belongs in the fixed generate system prompt, not in Director Note.

It should appear:

1. after the fixed storyteller operating-stance prompt
2. before the `World Base` block

This keeps it globally active, easy to maintain, and high enough in prompt order to influence how player input is interpreted before world and phase material is consumed.

## Required Behavior

If player free input would severely break any of the following:

- world base
- protagonist characterization
- protagonist OOC red lines

then the model must:

1. treat the input as an internal impulse, fantasy, intrusive thought, or self-directed complaint
2. avoid executing it as a real action in the story world
3. generate the protagonist's actual outward behavior according to current context and existing constraints
4. continue beat progression naturally
5. allow the next beat to include internal monologue or self-commentary that reflects the blocked impulse

## Guardrails

The rule must not:

- override Director Note priority
- weaken existing world/cast constraints
- convert ordinary player freedom into over-blocking
- produce meta refusal language such as "request denied" or "invalid input"

## Testing

Add prompt-template tests that verify:

- the fixed system prompt contains the new interception rule
- the rule appears before `World Base`
- the rule explicitly says severe OOC/world-breaking input becomes internal thought rather than executed action
