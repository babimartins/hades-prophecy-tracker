# Hades Prophecy Tracker

Track completion of the Hades (Supergiant Games, 2020) Fated List, down to
each single action inside each prophecy.

## Status: active construction

This project is under active construction. Slice 1 builds the foundation: the
data model, the engine, browser storage, and a first design system. That work
is in progress.

There is no running site yet. The application is not wired together. There is
no deployed URL.

## Why it exists

The in-game Fated List shows what is left. It does not show how much of each
entry is left. This tracker breaks each prophecy into single verifiable
actions. It shares those actions between prophecies. Mark an action once, and
every prophecy that needs it advances.

## How it works

Progress is a map of facts to values. Nothing else.

```json
{ "nectar:dusa": true, "pact:extreme-measures": 4 }
```

A prophecy holds no progress. It holds an expression over facts. The
expression is built from four node kinds:

| Kind      | Meaning                                     |
| --------- | -------------------------------------------- |
| `all`     | every child node is complete                 |
| `any`     | at least one child node is complete          |
| `count`   | at least N of the child nodes are complete   |
| `atLeast` | a numeric fact reaches a threshold value     |

The engine evaluates the expression against the fact map. It reports what is
missing.

Progress stays in the browser, in IndexedDB. There is no account and no
server.

## Packages

This list is verified against the current state of the repository.

| Package            | Responsibility                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `packages/schema`  | Data model and Zod validation: facts, requirements, achievements, collections, dataset.                            |
| `packages/engine`  | Pure functions that evaluate requirements against facts (`evaluate`, `achievementProgress`, `overallProgress`, `impact`, `nextSteps`). No DOM, no I/O. |
| `packages/ui`      | Generic Lit web components: `hd-card`, `hd-checklist-item`, `hd-progress`, and shared design tokens. No game knowledge. |
| `apps/web`         | Vite application. Holds the IndexedDB progress store, the export/import transfer format, and the progress state. The dashboard UI is not built yet.  |

The curated game dataset (`packages/data`) is under construction and is not
part of this branch yet. The in-game Fated List holds 49 prophecies. The
curated dataset does not cover all of them yet, and the final count is not
confirmed.

## Development

Requires Node 22 and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Licence

Code: MIT. See `LICENSE`.

Game data derives from the [Hades Wiki](https://hades.fandom.com/), under CC
BY-SA 3.0, with attribution. The data licence file arrives with the data
package, at `packages/data/LICENSE`.

## Disclaimer

This is a fan project. It has no link with Supergiant Games. Hades and all
game names are the property of Supergiant Games.
