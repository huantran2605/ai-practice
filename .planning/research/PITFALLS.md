# Pitfalls Research: Beautiful Simple TODO CLI

## Common Mistakes
- **JSON Corruption**: If the app crashes during broad writing, the JSON could be left in an invalid state. *Prevention*: Use a temporary file and rename (atomic write) or use a library that handles this.
- **Index Sensitivity**: Deleting items by index can be tricky if the list isn't refreshed or if indexes shift. *Prevention*: Assign unique IDs or clearly map display index to internal array index.
- **Color Incompatibility**: Some terminals don't support hex colors. *Prevention*: Use standard `chalk` colors or provide a fallback.
- **Missing File**: `tasks.json` not existing on first run. *Prevention*: Ensure the storage layer checks and creates the file if missing.
