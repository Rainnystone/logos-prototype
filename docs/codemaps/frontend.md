# Frontend Codemap

> Generated: 2026-03-27 | Next.js 15 + React 19 + Tailwind 3

## Pages

| Route | File | Type | Purpose |
|-------|------|------|---------|
| `/` | `src/app/page.tsx` | Server | Title page — provider setup + entry points |
| `/play` | `src/app/play/page.tsx` | Server | Play Workbench — loads story package + config |
| `/edit` | `src/app/edit/page.tsx` | Server | Narrative Editor — 4-section editor shell |

## Play Workbench Component Tree

```
PlayWorkbench (client)
├── AuthorControlPanel — scene name, phase cards, meta bar
│   └── SceneOverview — phase rail at top
├── FixtureReferencePanel — toggleable story package viewer
├── play-grid (3-column CSS grid)
│   ├── LEFT: play-column--sidebar (sticky, scrollable)
│   │   ├── CollapsiblePanel "Provider Setup" (closed after config)
│   │   │   └── ConfigPanel
│   │   │       ├── RuntimeConfigForm — preset dropdown, API key, model, advanced params
│   │   │       └── Runtime Usage — token counts per operation
│   │   └── CollapsiblePanel "Prompt Status" (closed by default)
│   │       └── PromptStatusPanel — assembly layers, context entries
│   ├── CENTER: play-column
│   │   ├── Generation Workspace — phase/beat status, Start Round
│   │   └── BeatDisplay — current beat text + error/rewrite feedback
│   │       └── PlayerInput — 4 options + free text + submit
│   └── RIGHT: play-column--feedback
│       ├── StateInspector — scene state, boundaries, gradient, snapshots
│       └── CollapsiblePanel "Beat History" (open)
│           └── BeatHistory — accepted beat entries
```

## Edit Workbench Component Tree

```
EditWorkbench (client)
├── edit-shell — identity, PageHelperPanel, SectionTabs
├── PageActionBar — return to title, open scene
├── SectionTabs — 4 tab links (query param routing)
└── edit-layout (active section)
    ├── WorldBaseCastSection — world blocks + character editor
    ├── ScenePhaseAuthoringSection — phase rail + scene frame + phase editor
    ├── ControlModulesSection — module stack + module editor
    └── PackageWiringValidationSection — diagnostics dashboard
```

## Shared Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `CollapsiblePanel` | title, eyebrow, defaultOpen, variant | Reusable expand/collapse section |
| `RuntimeConfigForm` | initialConfig, onSave, actionSlot | Provider preset, API key, model, advanced params |
| `ConfigPanel` | initialConfig, onSave, diagnostics | RuntimeConfigForm + Runtime Usage |
| `TitleLandingSurface` | catalog, onSave | Title page landing with story package selector |
| `StoryPackageSelector` | catalog | Dropdown for selecting story packages |

## State Management

| State | Location | Persistence |
|-------|----------|-------------|
| AdapterConfig | PlayWorkbench useState | localStorage (`logos-adapter-config`) |
| Draft edits (worldbase, scene-phase, control-modules) | EditWorkbench useState | Lost on navigation (per-session) |
| Saved state | EditWorkbench currentState | Server-side YAML files |
| Beat history | PlayWorkbench useState | Lost on navigation (per-session) |
| Scene state snapshots | Orchestrator | In-memory during play session |

## CSS Architecture

| Class | Purpose |
|-------|---------|
| `.play-page` | Play workbench page container |
| `.play-grid` | 3-column grid: `18-24rem / 2fr / 18-26rem` |
| `.play-column` | Grid cell with `gap: 0.75rem` |
| `.play-column--sidebar` | Sticky, max-height viewport, overflow scroll |
| `.play-column--feedback` | Right column (order: -1 on mobile) |
| `.edit-page` | Editor page container |
| `.edit-shell` | Editor shell with identity + tabs |
| `.panel` | Generic panel container |
| `.shadow-brutal` | Neue brutalism drop shadow |
| `.panel-eyebrow` | Uppercase tracking label |
| `.panel-note` | Muted description text |
| `.form-field` / `.form-label` | Form input styling |
| `.primary-link` / `.secondary-link` | Button styles |

## Design System

- **Style**: Neue Brutalism — `rounded-none`, `border-2 border-black`, flat colors
- **Colors**: Black/white primary, `#f5f5f5` secondary bg, `#00ff00` accent
- **Typography**: `font-mono` throughout, uppercase labels
- **Responsive**: `@media (max-width: 1100px)` collapses to single column
