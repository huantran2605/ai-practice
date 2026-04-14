# Phase 2: CLI Interface & Logic

## Objective
Implement the command-line interface and the core logic for managing tasks (add, list, done, remove).

## Scope
- Implement the main CLI entry point using `commander`.
- Connect CLI commands to the storage layer.
- Add basic logic for identifying tasks by ID or index.

## Implementation Steps

### 1. Main Entry Point
- Create `src/index.ts`.
- Setup the `bst` program with `commander`.

### 2. Command Implementations
- **Add**: `add <description>` - Generates a new task with a unique ID (using `crypto.randomUUID()`).
- **List**: `list` - Loads and prints tasks.
- **Done**: `done <index>` - Toggles the `completed` status of a task by its display index.
- **Remove**: `remove <index>` - Deletes a task by its display index.

### 3. CLI Helper Registry
- (Optional) Create `src/cli.ts` or keep it in `index.ts` for now.

## Verification Plan
1. `bst add "Test Task"` should create a task in `tasks.json`.
2. `bst list` should show the task.
3. `bst done 1` should mark it as completed in the file.
4. `bst remove 1` should empty the file.
