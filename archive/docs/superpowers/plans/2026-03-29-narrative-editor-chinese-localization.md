# Narrative Editor Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Narrative Editor working surface to Chinese-first copy while preserving the English shell, preserving `Beat` / `Phase` / `Volume`, and keeping the current neue brutalism layout untouched.

**Architecture:** Shared editor copy is updated in one dedicated task, then each editor page gets its own localized surface task with matching UI tests. Console and diagnostics localization also owns lower-level validation and helper-message producers so blocked-save and warning flows are localized end to end, not just at the page layer.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

## File Map

- Shared editor working-surface copy:
  - `src/app/edit/EditWorkbench.tsx`
  - `src/app/edit/page.tsx`
  - `src/app/edit/shared/SectionTabs.tsx`
  - `src/app/edit/shared/PageActionBar.tsx`
  - `src/app/edit/shared/PageHelperPanel.tsx`
- Page surfaces:
  - `src/app/edit/sections/WorldBaseCastSection.tsx`
  - `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
  - `src/app/edit/sections/ControlModulesSection.tsx`
  - `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Diagnostics and helper message producers:
  - `src/authoring/sections/package-diagnostics.ts`
  - `src/authoring/coordinator/dispatch.ts`
  - `src/authoring/persistence/bridge.ts`
  - `src/authoring/sections/scene-phase-authoring.ts`
  - `src/authoring/sections/control-modules.ts`
- Tests:
  - `src/app/edit/__tests__/EditWorkbench.test.tsx`
  - `src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
  - `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
  - `src/app/edit/__tests__/ControlModulesSection.test.tsx`
  - `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
  - `src/app/edit/__tests__/page.test.tsx`
  - `src/authoring/sections/__tests__/package-diagnostics.test.ts`
  - `src/authoring/coordinator/__tests__/coordinator.test.ts`
  - `src/app/api/authoring/__tests__/coordinator-route.test.ts`
  - `src/authoring/persistence/__tests__/bridge.test.ts`
  - `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
  - `src/authoring/sections/__tests__/control-modules.test.ts`

## Parallelization Strategy

Use one shared-copy task plus four page tasks. Keep write scopes disjoint:

- Task 1 owns shared editor working-surface copy and shared save/reset messages.
- Task 2 owns `WorldBaseCastSection` and its test.
- Task 3 owns `ScenePhaseAuthoringSection` and its test.
- Task 4 owns `ControlModulesSection` and its test.
- Task 5 owns the console page, diagnostics text, coordinator guidance, validation-message producers, and their tests.

The controller integrates and runs final verification after all worker tasks complete.

### Task 1: Shared Editor Copy Contract

**Files:**
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Modify: `src/app/edit/shared/PageActionBar.tsx`
- Modify: `src/app/edit/shared/PageHelperPanel.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Test: `src/app/edit/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Update shared editor tests to expect:
- Chinese tab labels: `世界与角色` / `场景与阶段` / `控制模块` / `控制台`
- Chinese action bar labels: `返回标题` / `打开场景`
- Chinese page summary titles and descriptions for the active editor surface
- English shell helper chrome remains unchanged where required
- Chinese save / reset / helper-save / failure result text shown through the page helper
- Chinese copy on the `/edit` fallback and load-failure branches

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx`
Expected: FAIL because shared editor labels and status text still use old English copy.

- [ ] **Step 3: Write minimal implementation**

Update shared label maps and helper copy in:
- `EditWorkbench.tsx`
- `SectionTabs.tsx`
- `PageActionBar.tsx`
- `PageHelperPanel.tsx`

Keep the top shell branding English. Only change the editor working surface and active section labels. This task also owns the visible status strings emitted in `EditWorkbench.tsx` after save, warning, failure, helper-save, reset, and shared-save-path reachability failures, plus the `/edit` fallback page copy.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/EditWorkbench.tsx src/app/edit/page.tsx src/app/edit/shared/SectionTabs.tsx src/app/edit/shared/PageActionBar.tsx src/app/edit/shared/PageHelperPanel.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx
git commit -m "feat: localize shared narrative editor copy"
```

### Task 2: 世界与角色 Page Localization

**Files:**
- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx`
- Test: `src/app/edit/__tests__/WorldBaseCastSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Update the page test to expect:
- page title `世界与角色`
- left-column labels `世界基础`, `世界文本块`, `世界基础设定`, `世界规则 / 禁忌 / 异常性质`, `文风基线`
- Chinese field labels and section labels
- Chinese rail labels for hero, core cast, and antagonists
- right-column labels `当前角色`, `当前条目`, `完整卡片`
- Chinese fallback labels such as `性别 / 性格`
- Chinese group label for `Loose Blocks`
- Chinese save/reset button labels
- Chinese empty/default copy such as `未命名角色` and `当前没有角色`
- Chinese remove/add labels where visible
- English shell terms not asserted inside this page

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
Expected: FAIL because the page still exposes English copy.

- [ ] **Step 3: Write minimal implementation**

Translate only visible author-facing copy inside `WorldBaseCastSection.tsx`. This includes fixed labels, button text, empty states, fallback labels, and save-in-progress copy. Do not touch draft structure, selection logic, save handlers, or story data formatting.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/WorldBaseCastSection.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx
git commit -m "feat: localize worldbase cast editor copy"
```

### Task 3: 场景与阶段 Page Localization

**Files:**
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Test: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Update the page test to expect:
- page title `场景与阶段`
- Chinese scene-frame labels
- hybrid labels such as `Gradient 类型`, `Router 提示`, `Beat 数`
- preserved English `Phase` labels where the spec requires them
- Chinese save/reset/remove/add labels where required
- Chinese empty/default copy such as `当前没有 Phase` and `当前没有 Router`
- preserved default `PHASE 1` style rail markers where the spec keeps `Phase`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: FAIL because the page still exposes old English labels.

- [ ] **Step 3: Write minimal implementation**

Translate only visible copy in `ScenePhaseAuthoringSection.tsx`. This includes fixed labels, button text, explanatory copy, empty states, fallback labels, and save-in-progress copy. Do not alter responsive layout, rail behavior, selection state, or save wiring.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/ScenePhaseAuthoringSection.tsx src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx
git commit -m "feat: localize scene phase editor copy"
```

### Task 4: 控制模块 Page Localization

**Files:**
- Modify: `src/app/edit/sections/ControlModulesSection.tsx`
- Test: `src/app/edit/__tests__/ControlModulesSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Update the page test to expect:
- page title `控制模块`
- left-column labels `控制栈`, `模块层`
- Chinese module stack labels
- localized module-card titles, type chips, and group labels
- right-column labels `模块编辑`, `边界说明`, `收束说明`, `Phase 收束说明`, `Beat 限制补充`, `选项限制补充`, `Volume 定义`, `Beat 限制`, `选项格式`, `Router 名`, `语义核心`, `动词词库`, `选择策略`, `默认项与 Phase 覆盖`, `默认问题`
- preserved English `Low / Med / High` and `Volume`
- Chinese button labels such as `新增 Router`, `新增问题`, `删除`, `保存本页`, `重置本页`
- Chinese empty/default copy such as `当前分组还没有问题。` and `新问题`
- Chinese field-level supporting text and save-in-progress copy
- Chinese audit-bucket labels such as `全局问题`, `控制问题`
- Chinese question-card fallback labels such as `未命名问题`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/ControlModulesSection.test.tsx`
Expected: FAIL because visible module labels remain English.

- [ ] **Step 3: Write minimal implementation**

Translate only visible copy in `ControlModulesSection.tsx`. This includes fixed labels, module cards, chips, supporting text, empty states, fallback labels, and save-in-progress copy. Do not modify module keys, persistence fields, validation logic, or phase-routing behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/ControlModulesSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/ControlModulesSection.tsx src/app/edit/__tests__/ControlModulesSection.test.tsx
git commit -m "feat: localize control modules editor copy"
```

### Task 5: 控制台 + Diagnostics + Validation Messages

**Files:**
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Modify: `src/authoring/sections/package-diagnostics.ts`
- Modify: `src/authoring/coordinator/dispatch.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/sections/scene-phase-authoring.ts`
- Modify: `src/authoring/sections/control-modules.ts`
- Test: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
- Test: `src/authoring/sections/__tests__/package-diagnostics.test.ts`
- Test: `src/authoring/coordinator/__tests__/coordinator.test.ts`
- Test: `src/app/api/authoring/__tests__/coordinator-route.test.ts`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`
- Test: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Test: `src/authoring/sections/__tests__/control-modules.test.ts`

- [ ] **Step 1: Write the failing tests**

Update diagnostics-facing and validation-facing tests to expect:
- page title `控制台`
- Chinese diagnostics block labels
- Chinese save-result issue titles and summaries
- diagnostics repair guidance and selected-detail copy in Chinese
- page references use only `世界与角色` / `场景与阶段` / `控制模块` / `控制台`
- overall status, page health, assembly flow, unresolved queue, repair order, and detail-line prose all use Chinese-facing wording
- coordinator guidance returned to the page helper is Chinese-facing too
- blocked-save and validation messages surfaced from lower-level producers are Chinese-facing too

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/authoring/sections/__tests__/package-diagnostics.test.ts src/authoring/coordinator/__tests__/coordinator.test.ts src/app/api/authoring/__tests__/coordinator-route.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/sections/__tests__/control-modules.test.ts`
Expected: FAIL because diagnostics text, helper guidance, and validation messages still use mixed English and older labels.

- [ ] **Step 3: Write minimal implementation**

Translate diagnostics-facing text in:
- `PackageWiringValidationSection.tsx`
- `package-diagnostics.ts`
- `src/authoring/coordinator/dispatch.ts`
- `src/authoring/persistence/bridge.ts`
- `src/authoring/sections/scene-phase-authoring.ts`
- `src/authoring/sections/control-modules.ts`

Keep underlying statuses, validation rules, and logic unchanged. Only visible wording changes, including titles, summaries, helper guidance, empty states, detail lines, and validation / blocked-save messages that are shown back to authors.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/authoring/sections/__tests__/package-diagnostics.test.ts src/authoring/coordinator/__tests__/coordinator.test.ts src/app/api/authoring/__tests__/coordinator-route.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/sections/__tests__/control-modules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/PackageWiringValidationSection.tsx src/authoring/sections/package-diagnostics.ts src/authoring/coordinator/dispatch.ts src/authoring/persistence/bridge.ts src/authoring/sections/scene-phase-authoring.ts src/authoring/sections/control-modules.ts src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/authoring/sections/__tests__/package-diagnostics.test.ts src/authoring/coordinator/__tests__/coordinator.test.ts src/app/api/authoring/__tests__/coordinator-route.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/sections/__tests__/control-modules.test.ts
git commit -m "feat: localize editor diagnostics console copy"
```

### Task 6: Integration, Drift Sweep, and Acceptance

**Files:**
- Modify if needed: any of the files above for integration cleanup only

- [ ] **Step 1: Rebase or merge task outputs into one clean branch state**

Resolve any copy drift across the five task outputs. Preserve the approved shell English, preserved domain terms, and the new Chinese page names.

- [ ] **Step 2: Run focused integration tests**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx src/app/edit/__tests__/ControlModulesSection.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/authoring/sections/__tests__/package-diagnostics.test.ts src/authoring/coordinator/__tests__/coordinator.test.ts src/app/api/authoring/__tests__/coordinator-route.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/sections/__tests__/control-modules.test.ts src/app/edit/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 3: Run full quality gates**

Run:
- `npm run test:ui`
- `npm run lint`
- `npm run type-check`
- `npm test`

Expected: all PASS

- [ ] **Step 4: Run browser acceptance**

Start the app and manually verify on desktop 16:9:
- top shell remains English
- tabs are Chinese
- `Beat` / `Phase` / `Volume` stay English where intended
- page fields, descriptions, empty states, and buttons read naturally in Chinese
- diagnostics page shows `控制台` consistently
- no accidental layout break from longer Chinese labels
- editor save / reset still works normally after the copy changes
- workbench play flow still works normally and was not visually disturbed by this branch’s changes

- [ ] **Step 5: Final drift sweep**

Run a label-by-label scan for stray English author-facing copy inside `/edit`, excluding allowed shell terms and allowed domain units.

Check by file group, not only by one keyword list:

- shared editor shell-adjacent files
- `WorldBaseCastSection.tsx`
- `ScenePhaseAuthoringSection.tsx`
- `ControlModulesSection.tsx`
- `PackageWiringValidationSection.tsx`
- `package-diagnostics.ts`
- `src/authoring/coordinator/dispatch.ts`
- `src/authoring/persistence/bridge.ts`
- `src/authoring/sections/scene-phase-authoring.ts`
- `src/authoring/sections/control-modules.ts`

Suggested command:

```bash
rg -n "WorldBase & Cast|SCENE & PHASE|Control Modules|Package Wiring Validation|故事结构|组装与校验|Section Slice|Selected Character Editor|Selected Phase Editor|Save Section|Reset Section|Open Scene|Return to Title|World Base|Genre Tone|Boundary Guidance|Convergence Guidance|Section Outputs|Assembly Flow|Selected Detail|saved through the page helper|save failed|repair|is required|No deterministic" src/app/edit src/authoring/sections/package-diagnostics.ts src/authoring/coordinator/dispatch.ts src/authoring/persistence/bridge.ts src/authoring/sections/scene-phase-authoring.ts src/authoring/sections/control-modules.ts
```

Review each remaining hit and confirm it is either intentionally preserved or needs conversion.

- [ ] **Step 5a: Direct destination-name check**

Run a focused scan on diagnostics producers and tests to confirm destination page names only use:
- `世界与角色`
- `场景与阶段`
- `控制模块`
- `控制台`

- [ ] **Step 6: Commit**

```bash
git add src/app/edit src/authoring/sections/package-diagnostics.ts src/authoring/coordinator/dispatch.ts src/authoring/persistence/bridge.ts src/authoring/sections/scene-phase-authoring.ts src/authoring/sections/control-modules.ts
git commit -m "feat: localize narrative editor working surface"
```
