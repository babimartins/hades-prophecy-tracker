# Hades Prophecy Tracker — Design

Date: 2026-08-16
Status: approved

## 1. Purpose

Track completion of Hades (2020) achievements in detail. The tracker shows what
the player completed and what the player must still do, down to each sub-item of
each achievement.

The project has two goals with equal weight:

1. A working tool for personal use.
2. A public portfolio piece for senior frontend roles.

Every technical decision serves both goals. The portfolio goal decides ties.

Repository: `hades-prophecy-tracker`, public on GitHub.

## 2. Scope

The tracker covers four collections:

1. Fated List of Minor Prophecies (the Steam achievements).
2. Codex entries: characters, enemies, bosses, boons, duo boons, legendary boons.
3. Weapons, weapon aspects and keepsakes.
4. Endgame progress: Pact of Punishment conditions, bounties, fishing, gifts.

Each item shows its sub-items. A sub-item is a single verifiable action in the
game.

Out of scope: reading the game save file, multi-device sync, user accounts,
support for Hades II.

## 3. Data model

### 3.1 The problem

One sub-item counts toward several achievements. Giving Nectar to Dusa advances a
prophecy, a Codex entry and the keepsake collection. A model that stores progress
per achievement duplicates state and drifts.

### 3.2 Facts and expressions

A **fact** is the smallest verifiable action in the game. Each fact has a stable
id and a value.

```
nectar:dusa              boolean
aspect:varatha:guan-yu   number   (level 1..5)
pact:extreme-measures    number   (rank 0..4)
duo:mirage-shot          boolean
```

An **achievement** stores no progress. It stores an expression over facts.

```jsonc
{
  "id": "prophecy:chthonic-colleagues",
  "name": "Chthonic Colleagues",
  "collection": "prophecy",
  "requirement": {
    "kind": "all",
    "of": ["nectar:dusa", "nectar:hypnos", "nectar:achilles"]
  }
}
```

Four node kinds cover every achievement in the game:

| Kind      | Meaning                                      |
| --------- | -------------------------------------------- |
| `all`     | every child node is complete                 |
| `any`     | at least one child node is complete          |
| `count`   | at least N of the child nodes are complete   |
| `atLeast` | a numeric fact reaches a threshold value     |

Nodes nest. A node child is a fact id or another node. The node shapes are:

```jsonc
{ "kind": "all",     "of": [<child>, ...] }
{ "kind": "any",     "of": [<child>, ...] }
{ "kind": "count",   "of": [<child>, ...], "n": 5 }      // at least n children
{ "kind": "atLeast", "fact": "pact:extreme-measures", "value": 4 }
```

A boolean fact is complete when the value is `true`. A numeric fact inside `all`,
`any` or `count` is complete when the value is greater than zero. Use `atLeast`
for a numeric threshold.

**Player progress is one map of facts to values.** Nothing else.

```json
{ "nectar:dusa": true, "pact:extreme-measures": 4 }
```

### 3.3 Consequences

- The user marks a fact once. Every achievement that depends on the fact updates.
- The "what is missing" list is the set of unmet facts in the expression tree.
  No extra logic.
- A pending fact that appears in five achievements ranks high in priority.
- Export and import produce a small readable JSON file.

### 3.4 Validation

`packages/schema` defines the model with Zod. TypeScript types come from the Zod
schemas by inference, so the data and the types cannot diverge.

A CI test validates all files in `packages/data` against the schema. The test
fails when an expression points to a fact id that does not exist.

## 4. Architecture

```
apps/web            dashboard application (Lit + Vite)
packages/schema     model types and Zod validation
packages/data       curated JSON, the source of truth
packages/scraper    Node scripts that read the Hades Wiki
packages/engine     progress evaluation, pure functions
packages/ui         design system in web components (Lit)
```

Boundaries:

- `engine` has no DOM access and no I/O.
- `ui` has no knowledge of Hades.
- `scraper` runs offline and never enters the browser bundle.
- `apps/web` is the only package that knows both the domain and the DOM.

### 4.1 Engine API

```ts
evaluate(requirement, facts) -> { done: number, total: number, missing: FactId[] }
achievementProgress(achievement, facts)
overallProgress(dataset, facts)
impact(factId, dataset) -> number      // achievements this fact advances
nextSteps(dataset, facts) -> FactId[]  // pending facts, ordered by impact
```

`nextSteps` answers the main question of the project. It sorts pending facts by
the number of achievements each fact unlocks.

Input is data and output is data. The tests need no mocks.

### 4.2 UI package

Generic components, no domain logic: `hd-card`, `hd-progress`, `hd-checklist-item`,
`hd-tabs`, `hd-badge`, `hd-dialog`, `hd-search`.

Each component uses Shadow DOM for isolation. Each component exposes CSS custom
properties for theme values. A consumer changes the palette without a change to
the component.

### 4.3 Web application

Domain components connect the engine and the UI package: `hades-dashboard`,
`prophecy-card`, `fact-checklist`, `next-steps-panel`.

Routing uses the URL hash. The application needs no server, because the deploy
target is GitHub Pages.

The dashboard has four blocks:

1. Overall progress.
2. Next steps panel.
3. Grid of collections, each with a progress bar.
4. Global search.

A click on an item opens the detail view with the sub-item tree. Each sub-item is
a checkbox that writes one fact.

### 4.4 Persistence

An interface `ProgressStore` declares one read method and one write method. The
implementation uses IndexedDB.

Export and import write JSON with a version number, to allow later migration.

A future backend replaces the implementation. The UI does not change.

### 4.5 Accessibility

Keyboard navigation, correct `aria-*` attributes on the checklists, and verified
colour contrast. Accessibility is part of every UI task, not a later pass.

## 5. Data pipeline

`packages/scraper` reads Hades Wiki pages through the Fandom API and writes raw
JSON to `packages/data/raw/`.

The scraper never overwrites curated data. The command `pnpm data:diff` compares
raw and curated files and prints the differences. The user approves each change
by hand.

Result: the wiki gives volume, the curated data stays correct, and an edit on the
wiki cannot break the build.

### 5.1 Licensing

Fandom content uses CC-BY-SA. The repository states this split:

- Code: MIT.
- Data: CC-BY-SA, with attribution to the Hades Wiki.

The README declares that the project is a fan project with no link to Supergiant
Games.

## 6. Tooling

- pnpm workspaces and Turborepo.
- TypeScript in strict mode with project references.
- Vitest for `schema`, `engine` and `scraper`.
- Vitest in browser mode with Playwright for the Lit components, because Shadow
  DOM needs a real browser.
- ESLint and Prettier.
- GitHub Actions: lint, typecheck, test, data validation, build, and deploy to
  GitHub Pages on each push to `main`.

## 7. Delivery slices

Each slice is usable on its own.

**Slice 1 — Foundation and prophecies.** Monorepo setup, schema, engine, storage,
minimal UI package, dashboard, CI, deploy. The prophecy data is written by hand in
this slice. The list is short, and hand authoring is the fastest way to prove that
the fact model handles the hard cases.

**Slice 2 — Scraper and Codex.** The scraper arrives after the schema is stable,
and handles the volume: Codex entries and boons.

**Slice 3 — Weapons, aspects and keepsakes.** The UI package grows to its full
component set.

**Slice 4 — Endgame.** Pact of Punishment, bounties, fishing, gifts. The next
steps panel gains impact weighting.

## 8. Decisions deferred to Slice 1

Both items below are decided inside Slice 1. Neither blocks the design.

- The prophecy count. The in-game list holds 49 entries. Data curation confirms
  the exact number and the exact names.
- The visual theme. The palette and the typography are decided before the first
  UI component is written.
