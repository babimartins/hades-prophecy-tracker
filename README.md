# Hades Prophecy Tracker

Track completion of the Hades (Supergiant Games, 2020) Fated List, down to
each single action inside each prophecy.

## Status

Slice 1 is complete. The data model, the engine, the design system and the
dashboard are wired together. The dataset holds all 55 prophecies of the
in-game Fated List. `pnpm build` passes and produces a working application.

The site is not live yet. GitHub Pages deployment needs one manual step from a
repository owner. See "Deployment" below. Once that step runs, the site is at
https://babimartins.github.io/hades-prophecy-tracker/.

## Why it exists

The in-game Fated List shows what is left. It does not show how much of each
entry is left. This tracker breaks each prophecy into single verifiable
actions. It shares those actions between prophecies. Mark an action once, and
every prophecy that needs it advances.

## How it works

Progress is a map of facts to values. Nothing else.

```json
{ "invite:zeus": true, "aspect:stygius:zagreus": 3 }
```

A prophecy holds no progress. It holds an expression over facts. The
expression is built from four node kinds:

| Kind      | Meaning                                     |
| --------- | -------------------------------------------- |
| `all`     | every child node is complete                 |
| `any`     | at least one child node is complete          |
| `count`   | at least N of the child nodes are complete   |
| `atLeast` | a numeric fact reaches a threshold value     |

The schema supports `any`. The current dataset uses it zero times.

The engine evaluates the expression against the fact map. It reports what is
missing.

Progress stays in the browser, in IndexedDB. There is no account and no
server.

## Packages

This list is verified against the current state of the repository.

| Package            | Responsibility                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `packages/schema`  | Data model and Zod validation: facts, requirements, achievements, collections, dataset.                            |
| `packages/data`    | Curated game data as JSON, plus its integrity test. The source of truth for facts and prophecies. |
| `packages/engine`  | Pure functions that evaluate requirements against facts (`evaluate`, `achievementProgress`, `overallProgress`, `impact`, `nextSteps`). No DOM, no I/O. |
| `packages/ui`      | Generic Lit web components: `hd-card`, `hd-checklist-item`, `hd-progress`, and shared design tokens. No game knowledge. |
| `apps/web`         | Vite application. Holds the dashboard UI, the IndexedDB progress store, and the export/import transfer format. |

The in-game Fated List holds 55 prophecies. The curated dataset in
`packages/data` covers all 55, each broken into its sub-item facts.

`packages/data/src/collections.json` also defines a separate `achievement`
collection, for platform achievements. That collection holds no entries yet.
Two sources disagree on the achievement count: the Hades Wiki's Achievements
page lists 50, and Steam shows 49 publicly.

## Development

Requires Node 22 and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Verified state of each command today:

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes. It produces `apps/web/dist/index.html`.
- `pnpm test` passes. Browser tests run under Playwright's headless Chromium.
  Install the browser once with `pnpm --filter @hades/web exec playwright
  install --with-deps chromium` before the first run.

To run the app locally:

```bash
pnpm --filter @hades/web dev
```

## Deployment

`.github/workflows/ci.yml` runs lint, typecheck, build and test on every push
and pull request.

`.github/workflows/deploy.yml` builds the site and publishes `apps/web/dist`
to GitHub Pages on every push to `main`. The workflow alone does not make the
site live. A repository owner must open Settings, then Pages, then set the
source to "GitHub Actions". This is a one-time step. After that step, the
next push to `main` deploys the site to
https://babimartins.github.io/hades-prophecy-tracker/.

## Licence

Code: MIT. See `LICENSE`.

Game data derives from the [Hades Wiki](https://hades.fandom.com/), which
licenses its content under **CC BY-NC-SA**. The data in `packages/data` is
therefore CC BY-NC-SA, not MIT: it may not be used commercially, and an adapted
version must carry the same licence. See `packages/data/LICENSE`.

The repository stores entry names and requirement decompositions. It does not
store prose from the game, such as Codex entry text, which belongs to Supergiant
Games.

## Disclaimer

This is a fan project. It has no link with Supergiant Games. Hades and all
game names are the property of Supergiant Games.
