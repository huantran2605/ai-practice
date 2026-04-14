# Project: Beautiful Simple TODO CLI (bst)

A polished, emoji-rich command-line interface for tracking simple tasks, designed for developers who want a beautiful workflow without the bloat.

## Context
The user wants to practice the GSD (Get Shit Done) workflow by building a real-world tool. We've chosen a TODO manager because it's a classic example that allows us to demonstrate spec-driven development, state management, and visual polish.

## Core Value
Frictionless, beautiful task tracking that feels "alive" through rich terminal formatting.

## Requirements

### Validated
(None yet — greenfield project)

### Active
- [ ] **CLI Framework**: Support command-line arguments (add, list, done, remove).
- [ ] **Persistence**: Store tasks in a local `tasks.json` file.
- [ ] **Visual Polish**: Use `chalk` and symbols/emojis for a premium look.
- [ ] **Task Lifecycle**:
    - `add`: Create new task.
    - `list`: Show all tasks with status.
    - `done`: Mark a task as completed without deleting it.
    - `remove`: Permanently delete a task.

### Out of Scope
- Syncing to cloud/web.
- Multiple lists/categories.
- Due dates and reminders (keeping it simple for practice).

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Node.js / TypeScript | Standard stack for CLI tools, easy to test. | Pending |
| Local JSON | Zero setup, human-readable storage. | Pending |
| HSL-based Colors | Premium look via hex constants or chalk. | Pending |

## Evolution
This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-15 after initialization*
