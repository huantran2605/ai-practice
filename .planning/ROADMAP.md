# Roadmap: Beautiful Simple TODO CLI (bst)

This roadmap outlines the phases of development for the `bst` tool.

## Milestone 1: Core Functionality (MVP)

### Phase 1: Project Setup & Storage Layer
Initialize the project and build the robust JSON persistence layer.
- **Depends on**: None
- **UAT**: Can save and load a list of tasks to/from a local file.

### Phase 2: CLI Interface & Logic
Implement the core `add`, `list`, `done`, and `remove` commands.
- **Depends on**: Phase 1
- **UAT**: Can perform all basic task operations from the terminal.

### Phase 3: Visual Polish & UX
Apply styling, emojis, and optimized status displays.
- **Depends on**: Phase 2
- **UAT**: The list output is beautiful, color-coded, and uses clear symbols.

## Milestone 2: Refinement (Optional)
- Error handling improvements.
- Support for clearing all tasks.

---
*Status: Initialized*
