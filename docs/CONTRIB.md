# Contributing Guide

## Development Workflow

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/Rainnystone/LOGOS-Narrative-Editor.git
cd LOGOS-Narrative-Editor
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
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |
| `type-check` | `tsc --noEmit` | TypeScript type checking |

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
```

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
| `src/types/` | Shared TypeScript types and Zod schemas |
| `story-packages/` | Story package data files |
| `archive/` | Archived specs, designs, and historical docs |
