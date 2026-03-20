# Phase 08 Fix Plan

## Pre-flight

### 1. Branch Setup

- [ ] Verify Phase 07 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/08-workbench-ui`

### 2. Dependency Verification

- [ ] Verify `src/engine/orchestrator.ts` exports `createOrchestrator`, `Orchestrator`, `BeatResult`
- [ ] Verify `src/engine/api-adapter/adapter.ts` exports `createAPIAdapter`, `AdapterConfig`
- [ ] Verify `src/engine/story-loader.ts` exports `loadStoryPackage`, `StoryPackage`
- [ ] Verify all types in `src/types/` are available
- [ ] Run `npm test` -- all Phase 00-07 tests pass
- [ ] Verify E2E tests pass with mock adapter

### 3. Spec Context Load

- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~14,000 tokens): UX docs (information-architecture.md, key-user-flows.md, screen-inventory.md) + runtime-loop.md + state-snapshot-schema.yaml + prompt-object-schema.yaml
- [ ] Confirm total ~18,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Layout and Navigation

#### 1.1 RED -- Write Tests

- Create `src/app/__tests__/layout.test.tsx`
- Test: root layout renders with header/navigation
- Test: navigation links to "/" (selector) and "/play" exist
- Test: layout renders children correctly
- Expected: tests FAIL

#### 1.2 GREEN -- Implement

- Update `src/app/layout.tsx`:
  - Root layout with global styles
  - Navigation header with links to story selector and play view
  - Sidebar slot for State Inspector
  - Responsive grid: main content (70%) + sidebar (30%)
- Add global CSS or Tailwind setup for styling
- Create `src/app/globals.css` with base styles

#### 1.3 IMPROVE

- Ensure layout is responsive (mobile: stack vertical, desktop: side-by-side)
- Add dark mode support (LOGOS is a narrative engine, dark theme fits)

---

### Task 2: Story Package Selector

#### 2.1 RED -- Write Tests

- Create `src/app/__tests__/select.test.tsx`
- Test: selector page renders a list of available story packages
- Test: clicking a package navigates to play view
- Test: scene overview (sceneId, sceneName, mainAxis) is displayed after selection
- Test: error state shown when story package fails to load
- Expected: tests FAIL

#### 2.2 GREEN -- Implement

- Create `src/app/page.tsx` (story package selector):
  ```tsx
  // List story packages from src/story-packages/
  // Display card for each with sceneName and brief description
  // On select: store package name in state/URL, navigate to /play
  ```
- Create `src/app/components/SceneOverview.tsx`:
  - Displays: sceneId, sceneName, mainAxis, endLine
  - Displays: number of Phases, total Beats
  - Read-only information panel

#### 2.3 IMPROVE

- Add loading state while story package loads
- Add error boundary for graceful error display

---

### Task 3: API Configuration Panel

#### 3.1 RED -- Write Tests

- Create `src/app/components/__tests__/ConfigPanel.test.tsx`
- Test: config panel renders provider dropdown, API key input, model input
- Test: provider options include "anthropic" and "openai-compatible"
- Test: when openai-compatible selected, base URL field appears
- Test: API key is stored in localStorage on save
- Test: API key is never rendered as plain text (input type=password)
- Test: config panel emits valid `AdapterConfig` on save
- Expected: tests FAIL

#### 3.2 GREEN -- Implement

- Create `src/app/components/ConfigPanel.tsx`:
  ```tsx
  // Provider selector: "anthropic" | "openai-compatible"
  // API key input (type=password)
  // Model name input
  // Base URL input (shown only for openai-compatible)
  // Save button -> store in localStorage
  // On save: construct AdapterConfig and pass to parent
  ```
- Use React state for form management
- Store config in localStorage under `logos-adapter-config`
- On load, restore previous config from localStorage

#### 3.3 IMPROVE

- Add "Test Connection" button that makes a minimal API call to verify config works
- Add visual indicator (green/red) for config status
- Ensure API key is never logged or sent to any endpoint except the LLM provider

---

### Task 4: Player Input Interface

#### 4.1 RED -- Write Tests

- Create `src/app/components/__tests__/PlayerInput.test.tsx`
- Test: displays 4 option buttons when options are provided
- Test: clicking an option button calls `onSubmit` with option text
- Test: free text input field is present
- Test: submitting free text calls `onSubmit` with text content
- Test: input is disabled during generation (isLoading=true)
- Test: options are disabled during generation
- Expected: tests FAIL

#### 4.2 GREEN -- Implement

- Create `src/app/components/PlayerInput.tsx`:

  ```tsx
  interface PlayerInputProps {
    options: readonly string[];
    isLoading: boolean;
    onSubmit: (input: string) => void;
  }

  // 4 option buttons in a grid
  // Free text area below with submit button
  // Disabled state during loading
  ```

- Style options as distinct clickable cards
- Free text area with placeholder: "Or type your own action..."
- Submit button or Enter key to submit free text

#### 4.3 IMPROVE

- Add keyboard shortcuts (1-4 for options)
- Add visual feedback on option hover/click
- Show which option is being submitted

---

### Task 5: Beat Generation View

#### 5.1 RED -- Write Tests

- Create `src/app/__tests__/play.test.tsx`
- Test: play page shows "Initializing Scene..." before init
- Test: after init, shows scene overview and first Beat prompt
- Test: during generation, shows loading indicator
- Test: after generation, shows beatText and 4 options
- Test: during audit, shows "Auditing..." status
- Test: on audit fail, shows rewrite feedback text
- Test: on force-accept, shows warning badge
- Test: player input triggers next Beat
- Expected: tests FAIL

#### 5.2 GREEN -- Implement

- Create `src/app/play/page.tsx`:
  ```tsx
  // State: orchestrator instance, current BeatResult, isLoading, generationStatus
  // On mount: load story package, create adapter from config, create orchestrator, init scene
  // Display flow:
  //   1. Scene overview header
  //   2. Beat history (scrollable list of past Beats)
  //   3. Current Beat output (beatText)
  //   4. Player input (options + free text)
  //   5. State inspector sidebar
  ```
- Create `src/app/components/BeatDisplay.tsx`:
  - Renders beatText as formatted narrative prose
  - Shows generation status badge (generating/auditing/rewriting/accepted/force-accepted)
  - Shows rewrite feedback when in rewrite state
- Create `src/app/components/BeatHistory.tsx`:
  - Scrollable list of accepted Beats
  - Each Beat shows: beatText excerpt, player input, Beat number
  - Auto-scrolls to latest Beat
- Wire up the orchestrator loop:
  ```tsx
  async function handlePlayerInput(input: string) {
    setIsLoading(true);
    setStatus('generating');
    try {
      const { beatResult, state } = await orchestrator.runBeat(input);
      setCurrentBeat(beatResult);
      setCurrentState(state);
      setBeatHistory((prev) => [...prev, { beatResult, playerInput: input }]);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
      setStatus('idle');
    }
  }
  ```

#### 5.3 IMPROVE

- Add streaming-like display (typewriter effect for beatText)
- Add transition animations between Beats
- Handle Phase-end transition with visual indicator

---

### Task 6: State Inspector

#### 6.1 RED -- Write Tests

- Create `src/app/components/__tests__/StateInspector.test.tsx`
- Test: displays Phase index and Beat index
- Test: displays Alpha and Beta text
- Test: displays current Volume with appropriate styling (Low=blue, Med=yellow, High=red)
- Test: displays current Router name
- Test: displays phase gradient as 4 bars with volume colors
- Test: displays phaseConsequences list after Phase end
- Test: expandable history window section
- Test: updates when state prop changes
- Expected: tests FAIL

#### 6.2 GREEN -- Implement

- Create `src/app/components/StateInspector.tsx`:

  ```tsx
  interface StateInspectorProps {
    state: StateSnapshot;
    gradientSequence: readonly Volume[];
  }

  // Scene State section:
  //   - Phase: {currentPhaseIndex} / {totalPhases}
  //   - Beat: {currentBeatIndexInPhase} / 4
  //   - Alpha: {alpha text, truncated with expand}
  //   - Beta: {beta text, truncated with expand}

  // Round State section:
  //   - Volume: {currentVolume} with color indicator
  //   - Router: {currentRouter}
  //   - Verb Lexicon: comma-separated list

  // Phase Gradient visualization:
  //   4 vertical bars, colored by volume level
  //   Current beat highlighted

  // Phase Consequences (collapsible):
  //   List of consequence strings after Phase end

  // History Window (collapsible):
  //   List of recent history entries with role badges
  ```

#### 6.3 IMPROVE

- Add gradient visualization as a small chart (bars with Low/Med/High colors)
- Add tooltips for boundary text (Alpha/Beta can be long)
- Make sections collapsible for space management

---

## Post-flight

### 1. Quality Gate

- [ ] `npm test` -- all tests pass (Phase 00-08)
- [ ] `npm run test:coverage` -- >= 80% on new UI components
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues
- [ ] `npm run build` -- Next.js build succeeds
- [ ] `npm run dev` -- workbench loads and is functional in browser

### 2. Commit and PR

- [ ] Stage: `src/app/` (all pages and components), `src/app/components/`, tests, styles
- [ ] `git commit -m "feat: add author workbench UI with story selector, beat view, state inspector, and player input"`
- [ ] `git push -u origin phase/08-workbench-ui`
- [ ] Create PR against `main` with title: "Phase 08: Workbench UI"

### 3. STOP -- HUMAN REVIEW CHECKPOINT (Release)

This is the final milestone. The complete system must be verified:

- [ ] Story package loads and Scene initializes
- [ ] Beats generate and display correctly
- [ ] Audit behavior works (pass, rewrite, force-accept)
- [ ] Phase-end processing produces new boundaries
- [ ] State inspector shows accurate real-time state
- [ ] API configuration works with real provider

Do not mark the project as complete until this PR is reviewed and merged.
