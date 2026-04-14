# Research: Atomic Storage for TODO CLI

## Pattern: Write-and-Rename
To avoid JSON corruption (e.g., if the user kills the process mid-write), we should:
1. Write the new JSON string to a temporary file (e.g., `tasks.json.tmp`).
2. Use `fs.promises.rename(temp, final)` to replace the original file.

## Libraries
- `write-file-atomic`: A popular library if we want to outsource this.
- `fs-extra`: Provides `writeJson` but doesn't guarantee atomicity by default without extra steps.
- **Manual Implementation**: Since this is a simple practice project, we can implement the rename pattern manually to keep dependencies low.

## Task Schema
```typescript
interface Task {
  id: string; // nanoid or uuid
  text: string;
  completed: boolean;
  createdAt: string;
}
```
Using unique IDs is better than array indices for internal storage to avoid shifting issues.
