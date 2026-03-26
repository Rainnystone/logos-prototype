# LOGOS UI Enhancement: Hybrid Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the LOGOS Narrative Control workbench UI into a "Hybrid Logic" design—balancing a minimalist reading zone (slate/white) with a cyber/bento control zone (slate-900/monospace) using Tailwind CSS.

**Architecture:** We will progressively migrate from legacy custom CSS in `globals.css` to Tailwind utility classes. The grid layout remains identical. We classify components into "Reading Zone" (Minimalist) and "Control Zone" (Technical).

**Tech Stack:** Next.js 15, React 19, Tailwind CSS.

---

### Task 1: Foundation - Tailwind Config and Globals Cleanup

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write a snapshot test for `PlayWorkbench` rendering (Skip if complex, we rely on visual testing but we can ensure standard build passes)**
Run: `npm run type-check` to ensure current state is clean.

- [ ] **Step 2: Update `tailwind.config.js` to include standard fonts**
*Note: Merge these settings with the existing configuration rather than overwriting it entirely, preserving any existing plugins or corePlugins.*
Add custom font families for `sans`, `serif`, and `mono` to ensure we can easily switch them.
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  corePlugins: {
    preflight: false, // KEEP EXISTING
  },
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Iowan Old Style"', 'Palatino Linotype', '"Book Antiqua"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Clean up `globals.css` background and base text**
Remove the complex `body` background gradients and update to a clean slate-50.
```css
/* Replace the body rule in globals.css */
body {
  margin: 0;
  min-height: 100vh;
  background-color: #f8fafc; /* slate-50 */
  color: #0f172a; /* slate-900 */
}
```

- [ ] **Step 4: Update `.panel` base class in `globals.css` to act as a fallback**
Simplify `.panel` to remove heavy drop shadows, making it flatter. We will override this in specific components.
```css
.panel {
  border: 1px solid #e2e8f0; /* slate-200 */
  border-radius: 0.75rem; /* xl */
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
```

- [ ] **Step 5: Commit Foundation Changes**
```bash
git add tailwind.config.js src/app/globals.css
git commit -m "chore(ui): update tailwind config and clean global background"
```

---

### Task 2: Reading Zone Migration (Minimalist)

**Files:**
- Modify: `src/app/components/BeatDisplay.tsx`
- Modify: `src/app/components/BeatHistory.tsx`

- [ ] **Step 1: Update `BeatDisplay.tsx` to use inline Tailwind**
Remove `.beat-display` custom class logic and apply pure Tailwind for a clean reading experience.
```tsx
// Change the outer section to:
<section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 font-serif">
// Replace panel-heading and panel-eyebrow:
<div className="flex justify-between items-start">
  <div>
    <p className="text-xs tracking-wider uppercase text-slate-500 font-sans mb-1">GameView</p>
    <h2 className="text-2xl font-semibold text-slate-800 font-sans">Current Beat</h2>
  </div>
  // ... Keep status badge but update its classes
</div>
```

- [ ] **Step 2: Update `BeatHistory.tsx` to use inline Tailwind**
Apply the same reading zone aesthetics.
```tsx
// Change outer section:
<section className="bg-white border border-slate-200 rounded-xl shadow-sm font-serif">
// Change history-card inner elements to have subtle slate borders:
<article key={entry.beatNumber} className="p-4 border-b border-slate-100 last:border-0 bg-slate-50/50 rounded-lg mb-2">
```

- [ ] **Step 3: Verify build**
Run: `npm run build`
Expected: Passes successfully.

- [ ] **Step 4: Commit Reading Zone**
```bash
git add src/app/components/BeatDisplay.tsx src/app/components/BeatHistory.tsx
git commit -m "feat(ui): apply minimalist styling to reading zone components"
```

---

### Task 3: Control Zone Migration (Cyber/Bento)

**Files:**
- Modify: `src/app/components/StateInspector.tsx`
- Modify: `src/app/components/PromptStatusPanel.tsx`

- [ ] **Step 1: Update `StateInspector.tsx`**
Give it the dark, technical look.
```tsx
// Replace aside className:
<aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono text-slate-300 text-sm break-words">
// Replace panel-heading:
<div className="border-b border-slate-800 pb-4 mb-4">
  <p className="text-[10px] tracking-widest uppercase text-emerald-500 mb-1">[ Narrative State Dashboard ]</p>
  <h2 className="text-lg font-bold text-slate-100 tracking-tight">State Inspector</h2>
</div>
```

- [ ] **Step 2: Update metric grids and chips in `StateInspector.tsx`**
```tsx
// For metric grid items:
<div className="bg-slate-950 border border-slate-800 rounded-md p-3">
  <span className="block text-[10px] uppercase text-slate-500 mb-1">Phase</span>
  <strong className="text-slate-200">{...}</strong>
</div>
```

- [ ] **Step 3: Update `PromptStatusPanel.tsx`**
Match the dark technical style of the State Inspector.
```tsx
// Root section
<section className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-slate-300 text-sm">
```

- [ ] **Step 4: Verify build**
Run: `npm run build`
Expected: Passes successfully.

- [ ] **Step 5: Commit Control Zone**
```bash
git add src/app/components/StateInspector.tsx src/app/components/PromptStatusPanel.tsx
git commit -m "feat(ui): apply cyber-bento styling to control zone components"
```

---

### Task 4: Workbench Layout and Input Refinement

**Files:**
- Modify: `src/app/play/PlayWorkbench.tsx`
- Modify: `src/app/components/ConfigPanel.tsx`
- Modify: `src/app/components/PlayerInput.tsx`

- [ ] **Step 1: Refine `ConfigPanel.tsx` (Hybrid Bridge)**
Keep forms clean but structured.
```tsx
// Update root:
<section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 font-sans">
// Inputs:
<input className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-none" />
```

- [ ] **Step 2: Refine `PlayerInput.tsx` (Hybrid Bridge)**
Update the options and text area to match the clean, bridge styling.
```tsx
// For option-card:
<button className={`p-3 text-left w-full border rounded-lg transition-colors ${slot.value === null ? 'border-dashed border-slate-300 text-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}>
// For textarea:
<textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-none font-sans" />
```

- [ ] **Step 3: Update `PlayWorkbench.tsx` Workspace Panels**
**CRITICAL:** Preserve the 3-column `.play-grid` layout exactly as it is (do not modify the grid columns or remove the grid wrapper). Only update the panel styling classes.
```tsx
// Generation Workspace Panel
<section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col font-sans">
// Update Start Round button to an accent color (e.g. amber or slate-800)
<button className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors">
  Start Round
</button>
```

- [ ] **Step 4: Full End-to-End Build and Type Check**
Run: `npm run build && npm run test`
Expected: Build passes, tests pass.

- [ ] **Step 5: Commit Layout Polish**
```bash
git add src/app/play/PlayWorkbench.tsx src/app/components/ConfigPanel.tsx src/app/components/PlayerInput.tsx
git commit -m "style(ui): polish workbench layout and inputs for hybrid logic"
```
