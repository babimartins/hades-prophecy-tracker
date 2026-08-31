# Hades Prophecy Tracker

Track completion of the Hades (Supergiant Games, 2020) Fated List, down to
each single action inside each prophecy.

## Status

Slice 3 is complete. The dataset now covers 10 populated collections: the
55 prophecies of the in-game Fated List, all 119 Codex entries, all 174
boons, all 72 Daedalus enchantments, all 26 Well of Charon purchases, all
25 keepsakes, all 24 weapon aspect thresholds, all 24 Mirror of Night
talents, all 15 Pact of Punishment conditions, and all 11 perks — 545
achievements in total, backed by 692 facts. An 11th collection, platform
achievements, is registered but holds no entries yet. The dashboard offers
a collection filter, search, and collapsible section grouping for the five
collections (Codex, weapon aspects, boons, Daedalus, Mirror of Night)
whose in-game tables have sections. `pnpm build` passes and produces a
working application.

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

Every achievement belongs to one collection — prophecies, Codex entries,
keepsakes, weapon aspects, boons, Daedalus enchantments, Mirror of Night
talents, Pact of Punishment conditions, perks, Well of Charon purchases, or
(once populated) platform achievements. A Codex, weapon-aspect, boon,
Daedalus or Mirror of Night achievement also carries a `section`, naming
its in-game table, weapon or side. The dashboard groups achievements by
section, with each section collapsible, and offers a collection filter and
a text search across names, descriptions and fact labels.

Progress stays in the browser, in IndexedDB. There is no account and no
server.

## Packages

This list is verified against the current state of the repository.

| Package            | Responsibility                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `packages/schema`  | Data model and Zod validation: facts, requirements, achievements, collections, dataset.                            |
| `packages/data`    | Curated game data as JSON, plus its integrity test. The source of truth for facts and achievements, across every collection. |
| `packages/engine`  | Pure functions that evaluate requirements against facts (`evaluate`, `achievementProgress`, `overallProgress`, `impact`, `nextSteps`, `searchAchievements`). No DOM, no I/O. |
| `packages/ui`      | Generic Lit web components: `hd-card`, `hd-checklist-item`, `hd-progress`, and shared design tokens (`colorVar`, `colorTokens`). No game knowledge. |
| `apps/web`         | Vite application. Holds the dashboard UI — collection filter, search, section grouping — the IndexedDB progress store, and the export/import transfer format. |

The curated dataset in `packages/data` holds 545 achievements across 10
populated collections, each broken into its sub-item facts:

| Collection                          | Entries | Notes                                             |
| ------------------------------------ | ------- | -------------------------------------------------- |
| Boons                                | 174     | 111 standard boons across 9 gods, 28 duo boons, the 10 legendary boons the Fated List asks for, and 25 Chaos blessings and curses. |
| Codex                                | 119     | Every entry, across the Codex's 9 in-game sections. |
| Daedalus                             | 72      | 12 enchantments tracked per weapon, across the 6 weapons. |
| Fated List of Minor Prophecies       | 55      | The full in-game Fated List.                       |
| Well of Charon                       | 26      | Every purchasable item, tracked as ever bought.     |
| Keepsakes                            | 25      | Every keepsake at max rank (`atLeast 3`). The same facts back the Fated List's "Close at Heart" at `atLeast 1`. |
| Weapon Aspects                       | 24      | Every aspect threshold, across the 6 weapons.       |
| Mirror of Night                      | 24      | 12 talent pairs, red and green side, per pair.      |
| Pact of Punishment                   | 15      | Every condition, tracked as active (`atLeast 1`), not maxed. |
| Perks                                | 11      | Every named perk from the Benefits Package condition. |

692 facts back these 545 achievements. Some are shared across collections —
for example, `aspect:stygius:zagreus` backs an achievement in the weapon
aspects collection, two in the Fated List, and two in the Codex — so marking
one action can advance entries in more than one collection at once.

`packages/data/src/collections.json` also defines a separate `achievement`
collection, for platform achievements. That collection holds no entries yet,
which is why the dataset covers 10 of its 11 registered collections. There
are 50 platform achievements: 49 ordinary ones, plus a 50th earned by
completing the other 49. Steam lists only 49 publicly because the 50th is
hidden.

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
- `pnpm test` passes: 135 tests across 5 packages.
- `pnpm build` passes. It produces `apps/web/dist/index.html`.

Browser tests run under Playwright's headless Chromium. Install the browser
once with `pnpm --filter @hades/web exec playwright install --with-deps
chromium` before the first run.

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

The heading typeface is [Cinzel](https://github.com/NDISCOVER/Cinzel), by The
Cinzel Project Authors, licensed under the **SIL Open Font License 1.1**. It
ships through the [`@fontsource/cinzel`](https://www.npmjs.com/package/@fontsource/cinzel)
npm package, version 5.3.0 (`apps/web/node_modules/@fontsource/cinzel/LICENSE`
carries the full text), self-hosted from `apps/web/dist` at build time. Only the
Latin subset, weight 600, is bundled. This is a third licence, distinct from the MIT
code and the CC BY-NC-SA data above.

## Disclaimer

This is a fan project. It has no link with Supergiant Games. Hades and all
game names are the property of Supergiant Games.
