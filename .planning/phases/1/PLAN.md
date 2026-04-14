# Phase 1: Project Setup & Storage Layer

## Objective
Initialize the `bst` CLI project with a solid foundation and a robust, atomic storage layer for task persistence.

## Scope
- Initialize `package.json` and TypeScript config.
- Install core dependencies (`commander`, `chalk`, `figures`).
- Create typed `Task` interface.
- Implement `storage.ts` with `loadTasks()` and `saveTasks()` (atomic).

## Implementation Steps

### 1. Project Initialization
- Run `npm init -y`.
- Setup `tsconfig.json` for ESM support.
- Create `src/` directory.

### 2. Dependency Management
- Install production dependencies.
- Install `types/node` and `typescript` as dev dependencies.

### 3. Core Types
- Define `Task` interface in `src/types.ts`.

### 4. Storage Module
- Create `src/storage.ts`.
- Implement persistence logic with write-and-rename pattern.
- Verify storage with a simple test script.

## Verification Plan
1. Check that `package.json` exists and is configured correctly.
2. Run a script to save 5 tasks and verify `tasks.json` was created and is valid JSON.
3. Verify that the task data survives a read/write cycle.
