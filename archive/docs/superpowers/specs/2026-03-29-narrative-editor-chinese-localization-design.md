# Narrative Editor Chinese Localization Design

## Goal

Improve usability in the Narrative Editor by replacing most author-facing English copy with Chinese while preserving the existing neue brutalism shell identity, spatial layout, and core English domain terms that function as product scaffolding.

## Scope

This design covers the Narrative Editor shell tabs and all four editor pages under `/edit`.

This design does **not** change:

- the top shell brand block (`LOGOS NARRATIVE EDITOR`, helper chrome, shell summary copy)
- workbench or title page copy
- layout, spacing model, component hierarchy, or page flow
- story package semantics, save logic, or coordinator behavior
- page-internal domain terms `Beat`, `Phase`, and `Volume`

## Product Intent

The current editor reads as stylish but abstract because too much of the working surface speaks in system English instead of author language. The goal is not "full translation." The goal is to make the editor easier to operate for Chinese-speaking authors while keeping the shell and terminology spine visually sharp and consistent with the current neue brutalism treatment.

## Localization Rules

### 1. English Shell Stays English

The top shell remains visually unchanged in language:

- `UNIFIED EDITOR SHELL`
- `LOGOS NARRATIVE EDITOR`
- shell summary copy
- `PAGE HELPER`
- `SHELL STATUS`
- helper fact labels like `PACKAGE`, `STATE SOURCE`, `ACTIVE SECTION`

This preserves brand identity and avoids turning the shell into a softer, more generic admin surface.

### 2. Author-Facing Working Surface Becomes Chinese

The content area below the shell should prioritize Chinese for clarity:

- top tabs
- page titles inside the working surface
- section titles
- field labels
- action buttons
- explanatory helper copy inside each page
- diagnostics page labels and descriptions

### 3. Keep Core Domain Terms in English

The following terms stay English wherever they already function as compact domain units:

- `Beat`
- `Phase`
- `Volume`

Related labels may become hybrid where needed:

- `Beat Count` -> `Beat 数`
- `Gradient Type` -> `Gradient 类型`
- `Router Hint` -> `Router 提示`

### 4. Rewrite, Do Not Mechanically Translate

Chinese should be rewritten into short, hard labels that fit the current visual language. Avoid long, explanatory direct translations when a shorter editorial label communicates the same meaning.

Examples:

- `Section Slice` -> `当前页`
- `Selected Character Editor` -> `当前角色`
- `Selected Phase Editor` -> `当前阶段`
- `State Inspector` is out of scope for this change because workbench stays unchanged

### 5. Typography Must Stay Visually Unified

Chinese copy must keep the same product feel as the current English UI:

- short labels over long prose
- heavy, structured, scan-friendly rhythm
- no extra decorative fonts
- no visual separation where Chinese feels like a different product layer
- mixed Chinese and English labels should still read as one interface

## Page Naming

Top tabs and corresponding editor page identities change to:

| Section Id | Current | New |
|------------|---------|-----|
| `worldbase-cast` | `WorldBase & Cast` | `世界与角色` |
| `scene-phase-authoring` | `SCENE & PHASE` | `场景与阶段` |
| `control-modules` | `Control Modules` | `控制模块` |
| `package-wiring-validation` | `Package Wiring Validation` | `控制台` |

The last page is intentionally renamed to `控制台`, not a literal validation phrase, because it behaves as an operational console rather than a normal authoring page.

## Shared Copy Mapping

### Action Bar

- `Return to Title` -> `返回标题`
- `Open Scene` -> `打开场景`

### Shared page copy inside editor surfaces

- `Section Slice` -> `当前页`
- package name display remains unchanged
- page descriptions become Chinese, but stay concise and utility-first

### Save / Reset

- `Save Section` -> `保存本页`
- `Reset Section` -> `重置本页`
- `Saving...` -> `保存中...`

### Dynamic status copy rules

All author-facing dynamic copy inside the Narrative Editor must follow the same language system as the static UI. The implementation should not stop at headings and fields.

Required coverage:

- save-in-progress copy
- save success copy
- save warning copy
- save blocked copy
- save failed copy
- reset-result copy
- empty-state copy
- selection-missing copy
- add/remove button copy
- diagnostics helper guidance
- diagnostics result titles
- diagnostics summaries and detail lines

Author-facing dynamic text should be Chinese-first. Only the preserved domain units remain English when they are part of a compact noun phrase.

Examples:

- `No character selected` -> `当前没有角色`
- `No phase selected` -> `当前没有 Phase`
- `No router selected.` -> `当前没有 Router`
- `Untitled Character` -> `未命名角色`
- `Saving...` -> `保存中...`
- save-result titles should become Chinese rather than `X save failed`

### Unique public name for the diagnostics page

`package-wiring-validation` has one and only one public-facing Chinese name in the editor: `控制台`.

That same name must be used consistently in:

- top tab label
- page title
- helper active-section label
- diagnostics issue titles when referring to that page
- jump / repair wording that points the author back to that page

Avoid mixing `控制台`, `组装与校验`, `Package Wiring Validation`, or other alternate public labels inside the working surface.

## Page-by-Page Copy Direction

### 1. 世界与角色

Page-level:

- `WorldBase & Cast` -> `世界与角色`
- description rewritten in Chinese to explain that this page edits world text blocks, cast rails, and the focused character card

Left column:

- `World Base` -> `世界基础`
- `World Blocks` -> `世界文本块`
- `World Base Setting` -> `世界基础设定`
- `World Rules / Prohibitions / Anomalous Properties` -> `世界规则 / 禁忌 / 异常性质`
- `Genre Tone & Prose Baseline` -> `文风基线`

Character rails:

- `Hero` -> `主角`
- `Core Cast` -> `核心角色`
- `Antagonists` -> `反派`
- add buttons become short Chinese labels such as `新增核心角色`, `新增反派`

Right editor:

- `Selected Character Editor` -> `当前角色`
- `Current Selection` -> `当前条目`
- `Full Card` -> `完整卡片`
- field labels become Chinese:
  - `Character Name` -> `角色名`
  - `Identity / Narrative Role` -> `身份 / 叙事定位`
  - `Light-Novel Trait` -> `轻小说特征`
  - `Gender` -> `性别`
  - `Personality` -> `性格`
  - `Age` -> `年龄`
  - `Occupation` -> `身份职业`
  - `Character Summary` -> `角色概述`
  - `Capability Boundary` -> `能力边界`
  - `Behavior Boundary` -> `行为边界`
  - `OOC Red Line` -> `OOC 红线`
  - `Clothing` -> `外观 / 穿着`
  - `Props / Weapon` -> `道具 / 武器`
  - `Fatal Weakness` -> `致命弱点`

### 2. 场景与阶段

Page-level:

- `SCENE & PHASE` -> `场景与阶段`
- description rewritten in Chinese while retaining `Phase` terminology

Phase rail:

- `Phase Rail` -> `Phase 轨道`
- `Phase Cards` -> `Phase 卡片`
- `Add Phase` -> `新增 Phase`
- `Rail Slider` -> `轨道滑块`

Scene frame:

- `Scene` -> `场景`
- `Scene Frame` -> `场景框架`
- `Scene Name` -> `场景名`
- `Opening Hook` -> `开场钩子`
- `Start Point` -> `起点`
- `End Line` -> `终点线`
- `Opening Situation` -> `开场情况`

Right editor:

- `Selected Phase Editor` -> `当前阶段`
- supporting description rewritten in Chinese
- `Current Phase` stays English
- `Beat Count` -> `Beat 数`
- `Gradient Type` -> `Gradient 类型`
- `Router Hint` -> `Router 提示`
- `Phase Name` -> `Phase 名`
- `Phase End Point` -> `Phase 终点`
- `Phase Goal` -> `Phase 目标`
- `Note` -> `备注`
- `Remove` -> `删除`

### 3. 控制模块

Page-level:

- `Control Modules` -> `控制模块`
- description rewritten in Chinese

Left column:

- `Control Stack` -> `控制栈`
- `Layered Modules` -> `模块层`
- module card descriptions rewritten in concise Chinese

Visible module-card labels are explicitly mapped:

- `Light Cone Collapse` -> `光锥收束`
- `Director Note Additions` -> `导演提示补充`
- `Beat Volume Definitions` -> `Beat Volume 定义`
- `Router Profile Set` -> `Router 配置组`
- `Auditor Question Set` -> `审查问题组`

Visible type chips are explicitly mapped:

- `Replacement` -> `替换型`
- `Additive` -> `补充型`
- `Definition` -> `定义型`
- `Structured` -> `结构型`
- `Parallel Control` -> `并行控制`

Visible group labels are explicitly mapped:

- `Layer 3` -> `第 3 层`
- `Layer 4` -> `第 4 层`
- `Parallel` -> `并行层`

Right editor:

- `Module Editor Column` -> `模块编辑`
- module descriptions rewritten in concise Chinese
- keep module identifiers in existing code untouched; only visible labels change

Field labels become Chinese, except preserved domain terms:

- `Boundary Guidance` -> `边界说明`
- `Convergence Guidance` -> `收束说明`
- `Phase Settlement Guidance` -> `Phase 收束说明`
- `Beat Constraint Additions` -> `Beat 限制补充`
- `Option Constraint Additions` -> `选项限制补充`
- `Volume Definition` -> `Volume 定义`
- `Beat Constraints` -> `Beat 限制`
- `Option Formatting` -> `选项格式`
- `Router Name` -> `Router 名`
- `Semantic Core` -> `语义核心`
- `Verb Lexicon` -> `动词词库`
- `Global Questions` -> `全局问题`
- `Control Questions` -> `控制问题`
- `Add Router` -> `新增 Router`
- `Delete` -> `删除`
- `Add Question` -> `新增问题`
- `Question` -> `问题`
- `Rationale` -> `理由`
- `Expected true` -> `期望为真`
- `Blocking` -> `阻断`
- `No questions in this bucket yet.` -> `当前分组还没有问题。`
- `Selection Policy` -> `选择策略`
- `Default and Phase Overrides` -> `默认项与 Phase 覆盖`
- `Default Questions` -> `默认问题`

The `Low / Med / High` volume tier headers remain English because they are part of the preserved `Volume` system. Supporting labels around them become Chinese:

- `Volume Definition` -> `Volume 定义`

### 4. 控制台

This page becomes a more readable operational console instead of a validation-heavy English surface.

Page-level:

- `Advanced Diagnostics` -> `高级诊断`
- `Package Wiring & Validation` -> `控制台`
- description rewritten in Chinese
- `Refreshing...` -> `刷新中...`
- `Re-check` -> `重新检查`

Blocks:

- `Overall Status` -> `整体状态`
- `Section Health` -> `页面状态`
- `Assembly Flow` -> `组装流程`
- `Unresolved Issue Queue` -> `未解决问题`
- `No unresolved package-level issues remain.` -> `当前没有未解决的整包问题。`
- `Selected Detail` -> `当前详情`

Status words such as `healthy`, `warning`, `blocked` may remain English if they are surfaced as compact badge tokens, but supporting summaries should be Chinese.

Dynamic diagnostics wording must also be localized. That includes:

- issue titles generated after save warnings or blocked saves
- per-section health summaries
- assembly flow summaries
- helper repair summary and repair order lines
- unresolved-issue empty state
- selected-detail detail lines

The page may keep compact badge tokens in English if needed for visual density, but every surrounding sentence should read naturally in Chinese.

When any diagnostics text refers to a destination page, the outward page names are locked to this set only:

- `世界与角色`
- `场景与阶段`
- `控制模块`
- `控制台`

Diagnostics must not surface older public labels such as `WorldBase & Cast`, `SCENE & PHASE`, `Control Modules`, `Package Wiring Validation`, `组装与校验`, or `故事结构` inside the editor working surface.

## Testing Requirements

Implementation must verify three things:

1. Existing shell English stays unchanged.
2. Narrative Editor tabs and page content switch to the approved Chinese labels.
3. Preserved English domain terms (`Beat`, `Phase`, `Volume`) remain visible where intended.

Tests should be updated at the UI surface level, not by snapshotting entire pages.

## Non-Goals

- no workbench localization
- no title-page localization
- no layout redesign
- no typography stack replacement
- no story content rewrites
- no behavior or persistence changes
