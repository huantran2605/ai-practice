# Requirements: Beautiful Simple TODO CLI (bst)

## User Profile
- Developer who wants a fast, pretty, and reliable CLI for daily tasks.

## 1. Functional Requirements

### 1.1 Task Management
- **Add**: Support adding tasks with a string description.
- **List**: Display all tasks (index, description, status).
- **Done**: Mark a task as completed by its display index.
- **Remove**: Delete a task by its display index.

### 1.2 Persistence
- **JSON Storage**: Save tasks to `tasks.json` in the project root.
- **Atomic Operations**: Ensure the file is not corrupted if the process exits unexpectedly.

## 2. Technical Requirements

### 2.1 Interface
- **Command Parsing**: Use `commander`.
- **Colors**: Use `chalk` for status colors (Green for done, Yellow for active).
- **Symbols**: Use `figures` for cross-platform symbols (✓, ✖, ⚪).
- **Layout**: Use `boxen` or simple line dividers for a clean UI.

### 2.2 Error Handling
- Handle missing `tasks.json` on first run.
- Validate indices (e.g., prevent marking task 99 as done if only 3 exist).
- Handle invalid JSON content.

## 3. Quality Requirements
- **Performance**: Near-instant startup and response.
- **Robustness**: Task list should survive crashes without data loss.
