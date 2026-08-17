# Contributing

## Data changes

1. Add or edit the JSON in `packages/data/src`.
2. Run `pnpm --filter @hades/data test`. The test checks the schema, duplicate
   ids, unknown fact references and orphan facts.
3. State the source of the change in the commit message.

Copy names and requirement text from the game or from the Hades Wiki. Do not
write an entry from memory.

## Code changes

1. Write the failing test first.
2. Run `pnpm lint`, `pnpm typecheck` and `pnpm test` before you commit.
3. Keep `packages/engine` free of DOM and I/O. Keep `packages/ui` free of game
   knowledge.
