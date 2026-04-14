# Phase 3: Visual Polish & UX

## Objective
Enhance the CLI output with colors, emojis, and better formatting to create a "beautiful" user experience as requested.

## Scope
- Integrate `chalk` for color-coded status and headers.
- Use `figures` for cross-platform symbols.
- Implement a structured `list` view (border, header).
- Add success/error messages with emojis.

## Implementation Steps

### 1. Theming System
- Define a small theme object in `src/ui.ts` or `src/index.ts` for colors (e.g., `success`, `dim`, `header`).

### 2. Optimized List View
- Update `list` command to show:
    - A stylized header (e.g., "BST TODO LIST").
    - Tasks with symbols (✓ for done, ○ for pending).
    - Completion percentage or task count.

### 3. Styled Command Feedback
- Update `add`, `done`, and `remove` to use `chalk` and symbols (e.g., "✨ Added: ...").

## Verification Plan
1. `bst list` should show a color-coded, well-formatted list.
2. `bst add`, `done`, and `remove` should provide visually distinct success messages.
3. Verify symbols display correctly in the current terminal.
