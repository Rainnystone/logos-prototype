# LOGOS UI Visual Enhancement: Hybrid Logic

## 1. Overview
The goal of this project is to enhance the visual identity of the LOGOS Narrative Control workbench without altering the existing component layout or underlying React/engine logic. The chosen design direction is **"Hybrid Logic"**, which balances a minimalist, immersive reading experience with a technical, high-density "Bento/Cyber" aesthetic for control panels.

## 2. Design Philosophy: Hybrid Logic
The workspace is conceptually divided into two zones:
*   **The Reading Zone (Narrative Flow):** Follows a "Linear" minimalist style. High contrast text on clean backgrounds (`slate-50`), extremely thin borders, and generous whitespace. The goal is immersion.
*   **The Control Zone (State Inspector, Provider Setup):** Follows a "Cyber/Bento" style. Technical, dense, and distinct from the narrative. Uses monospace fonts for data, darker or more distinct panel backgrounds, and subtle glow or structural grid effects to imply "machinery."

## 3. Implementation Strategy (Tailwind-First)
The implementation will heavily rely on Tailwind CSS, progressively replacing the custom CSS currently found in `globals.css`.

### 3.1 Color Palette & Typography
*   **Reading Surface:** White or `slate-50` backgrounds, `slate-200` borders.
*   **Control Surface:** `slate-900` or distinct technical backgrounds with subtle `ring` borders.
*   **Typography:** Retain the serif font (Iowan Old Style) for narrative text, but enforce strict monospace (`font-mono`) for all engine states, JSON outputs, and logs.
*   **Accents:** Use a refined accent color (e.g., a muted blue or amber) for primary actions (like "Start Round").

### 3.2 Component Updates
We will target components in `src/app/components/` and `src/app/play/`:
*   **`BeatDisplay.tsx` / `BeatHistory.tsx`:** Apply the Minimalist reading style. Remove heavy drop shadows.
*   **`StateInspector.tsx` / `PromptStatusPanel.tsx`:** Apply the technical Bento style.
*   **`ConfigPanel.tsx` / `PlayerInput.tsx`:** Bridge components, keeping forms clean but highly structured.

## 4. Execution Steps
1.  **Tailwind Configuration:** Update `tailwind.config.js` (or `.ts`) to include specific design tokens (custom colors, border radii) if necessary.
2.  **Global CSS Cleanup:** Remove legacy background gradients and heavy shadows from `globals.css` that conflict with the new Tailwind direction.
3.  **Component Migration:** Iteratively update the `className` strings in the React components to use the new Tailwind utility classes.
4.  **Verification:** Ensure no layouts are broken and the workbench remains fully responsive.

## 5. Non-Goals
*   No changes to the grid layout structure (the 3-column play grid remains).
*   No changes to the core engine, orchestrator, or API adapter logic.
*   No new functional features added to the UI.
