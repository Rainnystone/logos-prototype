# Contributing Guide

## Development Workflow

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/talespark-global/logos-narrative-editor.git
cd logos-narrative-editor
git checkout branch/narrative-editor
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000` in your browser.

## Branch Convention

- Active development branch: `branch/narrative-editor`
- PRs target `branch/narrative-editor` unless explicitly stated otherwise
- Commit format: `<type>: <description>`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint . --max-warnings=0` | Lint all files (zero warnings allowed) |
| `format` | `prettier --write .` | Auto-format all files |
| `format:check` | `prettier --check .` | Check formatting without modifying |
| `test` | `vitest run` | Run all tests once |
| `test:core` | `vitest run src/__tests__ ...` | Run engine, types, and story package tests |
| `test:ui` | `vitest run src/app` | Run UI component and page tests |
| `test:e2e` | `vitest run src/engine/__tests__/e2e` | Run end-to-end engine tests |
| `test:simulation` | `vitest run --config simulation-toolset/vitest.config.ts` | Run simulation regression tests |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |
| `type-check` | `tsc --noEmit` | TypeScript type checking |
| `type-check:simulation` | `tsc --noEmit -p simulation-toolset/tsconfig.json` | Simulation TypeScript check |

## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Anthropic API key (optional; configured via UI) |
| `OPENAI_API_KEY` | No | OpenAI API key (optional; configured via UI) |
| `LOGOS_SPEC_PATH` | No | Path to LOGOS spec directory (default: `./vendor/LOGOS-SPEC`) |
| `STORY_PACKAGES_PATH` | No | Path to story packages (default: `./story-packages`) |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL (default: `http://localhost:3000`) |

API keys are primarily configured through the in-app Provider Setup UI and stored
in browser localStorage. Environment variables serve as optional server-side fallbacks.

## Testing

### Before Submitting

Run the full quality gate:

```bash
npm run lint
npm run type-check
npm test
```

### Iterating Quickly

Use split suites while working:

```bash
npm run test:core    # Engine and type tests
npm run test:ui      # UI component tests
npm run test:e2e     # End-to-end tests
npm run test:simulation  # Simulation regression tests
```

### Simulation Toolset

For simulation and regression testing, see:

- `simulation-toolset/README.md` - Overview and usage
- `simulation-toolset/agent-guide.md` - Guide for simulation development

### TDD Workflow

1. Write the test first (RED)
2. Run the test — it should fail
3. Write minimal implementation (GREEN)
4. Run the test — it should pass
5. Refactor (IMPROVE)
6. Verify 80%+ coverage

### Test Conventions

- Story package content must never appear in test assertions as hardcoded strings
- Load from test fixtures instead
- Do not assert on specific Chinese story text in unit tests

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js pages, components, API routes |
| `src/authoring/` | Author-side save, validate, reload pipeline |
| `src/engine/` | Runtime orchestrator, modules, API adapter |
| `src/agents/` | Sidecar agents (weaver, gossipelog) and registry |
| `src/runtime-sessions/` | Runtime session persistence and continuity views |
| `src/storylines/` | Storyline substrate, workspaces, and variants |
| `src/lib/` | Shared utilities (validation, ID helpers) |
| `src/types/` | Shared TypeScript types and Zod schemas |
| `src/testing/` | Test type definitions |
| `src/story-packages/` | Story package data files |
| `simulation-toolset/` | Simulation regression test harness |
| `archive/` | Archived specs, designs, and historical docs |

## Page Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `src/app/page.tsx` | Title Page - entry point |
| `/edit` | `src/app/edit/page.tsx` | Narrative Editor - authoring workbench |
| `/play` | `src/app/play/page.tsx` | Play Workbench - runtime testing |

## Sidecar Agent Development

When adding or modifying sidecar agents:

1. Register in `src/agents/registry.ts`
2. Create definition in `src/agents/<agent>/definition.ts`
3. Implement skill logic in `src/agents/<agent>/agent.ts`
4. Add prompts to `src/engine/api-adapter/prompt-templates.ts`
5. Place references in `src/agents/<agent>/references/`
6. Add Zod schemas to `src/types/`

### Skill Architecture

Sidecar skills are **NOT** independent files — they are:

- Declared via `skillIds` + `skillDisplayMetadata` in definition
- Implemented as methods on `LLMAdapter` interface
- Orchestrated by deterministic code in `agent.ts`

```
definition.ts          → skillIds, skillDisplayMetadata, referenceManifests
agent.ts               → deterministic shell, validation, persistence
prompt-templates.ts    → buildXxxSystemPrompt(), buildXxxUserPrompt()
LLMAdapter interface   → xxxSkill() method for semantic judgment
```

### Reference Files

References are static markdown files loaded at runtime:

- Defined in `referenceManifestsByOperation` in definition
- Loaded via `resolveSidecarReferences()` in `reference-loader.ts`
- Injected into user prompt under `[Resolved References]` section

### Current Sidecars

| Agent | Skills | State File | Reference |
|-------|--------|------------|-----------|
| Weaver | `weaver-import-skill` | `agents/weaver/import-summary.yaml` | `import-reference.md` |
| Gossipelog | `relationship-update-skill`, `relationship-injection-skill` | `agents/gossipelog/character-relationships.yaml` | None |
