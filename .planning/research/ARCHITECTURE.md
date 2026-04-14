# Architecture Research: Beautiful Simple TODO CLI

## Component Boundaries
- **CLI Adapter**: Handles command parsing (`commander`).
- **Logic Layer**: Manages the task list state (adding, toggling, removing).
- **Storage Adapter**: Handles JSON file reading/writing (`fs.promises`).
- **UI Logic**: Responsible for colorizing and formatting the output (`chalk`).

## Data Flow
1. User runs command (e.g., `bst add "Buy milk"`).
2. CLI Adapter parses arguments.
3. Storage Adapter reads `tasks.json`.
4. Logic Layer updates the task list.
5. Storage Adapter writes `tasks.json`.
6. UI Logic displays a success message with emojis.

## Build Order
1. Setup project (TS, package.json).
2. Implement Storage Adapter (JSON persistence).
3. Implement core Logic Layer.
4. Integrate CLI commands.
5. Apply styling and emojis.
