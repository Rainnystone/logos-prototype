# Story Package Schema

Every story package lives under `src/story-packages/<package-name>/` and must provide:

- `scene.yaml`: `SceneSpec`
- `phase-plans.yaml`: wrapped `PhasePlan[]`
- `router-lexicon.yaml`: wrapped `RouterProfile[]`
- `audit-questions.yaml`: `AuditQuestionSet`
- `world-base.yaml`: `WorldBase`
- `state-snapshots.yaml`: reference `StateSnapshot[]`

All files must be machine-parseable YAML and validate against the runtime schemas in `src/types/`.
