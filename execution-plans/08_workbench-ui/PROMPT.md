---
phase: '08'
title: 'Workbench UI'
branch: 'phase/08-workbench-ui'
depends_on: ['07']
spec_context_load:
  phase_0:
    - 'LOGOS-SPEC/00_META/agent-guide.md'
    - 'LOGOS-SPEC/00_META/system-map.md'
    - 'LOGOS-SPEC/02_DOMAIN/glossary.md'
    - 'LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md'
  phase_specific:
    - 'LOGOS-SPEC/08_UX/information-architecture.md'
    - 'LOGOS-SPEC/08_UX/key-user-flows.md'
    - 'LOGOS-SPEC/08_UX/screen-inventory.md'
    - 'LOGOS-SPEC/03_ORCHESTRATION/runtime-loop.md'
    - 'LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml'
estimated_tokens:
  phase_0: 4500
  phase_specific: 14000
  total: 18500
---

# Phase 08: Workbench UI

## Objective

Build the author workbench UI using Next.js App Router. This is the visual interface for running and inspecting the LOGOS engine. It includes a story package selector, beat generation view with real-time output, a state inspector, and a player input interface. The UI connects to the Orchestrator from Phase 06 and displays the engine's operation in real time.

## Spec Context

| File                                      | Tokens | Purpose                                               |
| ----------------------------------------- | ------ | ----------------------------------------------------- |
| `00_META/agent-guide.md`                  | ~2,800 | Blocker protocol                                      |
| `00_META/system-map.md`                   | ~1,000 | Architecture                                          |
| `02_DOMAIN/glossary.md`                   | ~1,100 | UI-relevant terms                                     |
| `05_CONTRACTS/module-dependency-map.md`   | ~900   | UI has no module dependencies (consumes Orchestrator) |
| `08_UX/information-architecture.md`       | ~3,000 | Page structure, navigation model                      |
| `08_UX/key-user-flows.md`                 | ~3,000 | User journey: load -> play -> inspect                 |
| `08_UX/screen-inventory.md`               | ~3,000 | Screen list, component breakdown                      |
| `03_ORCHESTRATION/runtime-loop.md`        | ~2,500 | What the UI must visualize                            |
| `05_CONTRACTS/state-snapshot-schema.yaml` | ~3,000 | State fields displayed in inspector                   |
| `05_CONTRACTS/prompt-object-schema.yaml`  | ~2,500 | PromptObject fields for debug view                    |

## Deliverables

1. **Story Package Selector** (`src/app/page.tsx` or `src/app/select/page.tsx`)
   - Lists available story packages
   - Loads selected package and initializes Orchestrator
   - Displays scene overview (sceneId, sceneName, mainAxis, endLine)

2. **Beat Generation View** (`src/app/play/page.tsx`)
   - Displays current Beat output (beatText + 4 options)
   - Shows generation status (generating, auditing, rewriting, accepted)
   - Displays rewrite feedback when audit fails
   - Shows force-accept warning when applicable

3. **State Inspector Panel** (`src/app/components/StateInspector.tsx`)
   - Displays current Phase index and Beat index
   - Shows current Alpha/Beta boundaries
   - Shows current Volume and Router
   - Shows phase gradient visualization (4-bar volume sequence)
   - Displays phaseConsequences after Phase end
   - Expandable history window view

4. **Player Input Interface** (`src/app/components/PlayerInput.tsx`)
   - 4 option buttons (from current Beat's options)
   - Free text input field
   - Submit triggers next `orchestrator.runBeat()`

5. **API Configuration Panel** (`src/app/components/ConfigPanel.tsx`)
   - Provider selection (Anthropic / OpenAI-compatible)
   - API key input (stored in localStorage, never transmitted except to adapter)
   - Model selection
   - Base URL configuration for OpenAI-compatible providers

6. **Layout** (`src/app/layout.tsx`)
   - Split layout: main content (Beat view) + sidebar (State Inspector)
   - Navigation between selector and play views

## Dependencies

- Phase 06: `createOrchestrator`, `Orchestrator` interface
- Phase 05: `createAPIAdapter`, `AdapterConfig`
- Phase 00: Story loader, all types
- All contract types for state display

## Acceptance Criteria

- [ ] Story package selector lists available packages and loads selection
- [ ] Scene overview displays sceneId, sceneName, mainAxis, endLine
- [ ] Beat generation view shows beatText and 4 options after generation
- [ ] Generation status updates in real-time (loading -> auditing -> accepted)
- [ ] Rewrite feedback is displayed when audit fails
- [ ] Force-accept warning is visible when applicable
- [ ] State inspector shows current Phase, Beat, Volume, Router, Alpha, Beta
- [ ] Phase gradient is visualized as a 4-bar sequence
- [ ] History window is viewable (expandable/collapsible)
- [ ] Player can select one of 4 options or enter free text
- [ ] Player input triggers next Beat generation
- [ ] API configuration panel allows provider/key/model setup
- [ ] API key is stored in localStorage only, never hardcoded
- [ ] UI is responsive and functional in modern browsers
- [ ] No engine module logic is duplicated in UI code (UI only calls Orchestrator)
