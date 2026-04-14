# Stack Research: Beautiful Simple TODO CLI

## Recommended 2026 Stack
- **Language**: TypeScript (Strong typing for task objects)
- **CLI Framework**: `commander` (Standard, handles subcommands easily)
- **Colors & Styling**: `chalk` + `figures` (for emojis/symbols)
- **Persistence**: `conf` or built-in `fs.promises` (keeping it simple with `tasks.json`)
- **Visuals**: `boxen` for header styling, `ora` for any spinners (optional)

## Rationale
- `commander` is self-documenting.
- `chalk` is lightweight and universal.
- `tasks.json` in the user's home or project root ensures permanence.
