# Phase 2 plan: gather the data that is missing

> **Done, 2026-08-31.** All 692 facts name their subjects. 452 carry a
> description. 11 collections carry one, and 15 entries are spoiler-flagged. The one
> outstanding item was the Contractor stock and its prices, which phase 2b
> then gathered: 171 purchases across six rooms, with a cost each.

**Goal:** every fact names its subject, and every item a reader cannot work out
from its label carries a description. No interface work.

**Read first:** `docs/descriptions-plan.md` for what is missing and why,
`docs/refactor/mapping.md` for the subject rules, `AGENTS.md` for the game-data
rules. The game-data rules are binding here more than anywhere else in the
project.

## How to read the wiki

`hades.fandom.com` returns HTTP 402 to automated fetchers, so every page goes
through the real browser. Two ways in, and the second is far better:

- The rendered page. Its tables are often JavaScript tabs, so they do not
  extract as text, and several pages mix Hades I and Hades II content.
- **`?action=raw`.** Returns the page's wikitext, complete, with no tabs and no
  navigation. Verified working on 2026-08-31. Use this by default.

**The Hades II trap.** Several pages carry both games. `{{CustomTabs|tab1 =
Hades|tab2 = Hades II}}` at the top of the wikitext is the marker. The River
Denizens page already cost this project three wrong entries once. Check every
page for it and take only the Hades I section.

## What is missing

| Group | Items | Source |
| --- | ---: | --- |
| Fact subjects, unresolved | 113 | ten namespaces, listed below |
| Fact descriptions | 431 | one table per namespace |
| Preview draft texts | 23 | `docs/descriptions-plan.md` section 7 |
| Persephone, a subject with no Codex entry | 1 | her own page |
| Known spoilers to flag | 9 | already in the repository |

## Order

Largest first, one commit per namespace, so every commit is worth something on
its own.

### Task 1: the 113 unresolved subjects

| Namespace | Facts | What the id hides |
| --- | ---: | --- |
| `boon` duo and legendary | 38 | the god, or the pair |
| `keepsake` | 25 | the giver |
| `talk` | 18 | who takes part |
| `combat` | 13 | the foe or the weapon |
| `companion` | 6 | the giver |
| `workorder` | 5 | the beneficiary |
| `lounge` | 4 | Dusa |
| `fish` | 2 | an aggregate, may stay subject-less |
| `spend`, `lyre` | 2 | Charon, Orpheus |

- The 28 duo boons take **two** subjects each. That is the first real data to
  exercise the array, and `packages/data/test/axis-check.test.ts` asserts today
  that no fact has two. Update that test when it becomes false, do not delete it.
- A fact that turns out to name no subject takes `[]`, not a missing key.
- `subjects` becomes required in the schema only when all 113 are resolved.

### Task 2: descriptions, by namespace

`boon` 149, `daedalus` 72, `wellofcharon` 26, `keepsake` 25, `aspect` 24,
`catch` 18, `artifact` 15, `pact` 15, `curse` and `blessing` 25.

`talent` 24 and `perk` 11 already hold their effect inside an achievement
description. Move the text to the fact; do not re-research it.

### Task 3: the 23 preview drafts

Verify each against the page named in `docs/descriptions-plan.md` section 7.
A draft that the source does not support is deleted, not adjusted until it fits.

### Task 4: the spoiler flag

Set `spoiler: true` on these nine entries:

`codex:hades`, `codex:demeter`, `codex:nyx`, `codex:chaos`, `codex:achilles`,
`codex:patroclus`, `codex:sisyphus`, `codex:companion-shady`,
`codex:companion-antos`.

`docs/descriptions-plan.md` says eight. It missed `codex:companion-antos`,
whose text reveals the Achilles and Patroclus reunion exactly as
`codex:achilles` does. Correct the number there in the same commit. The rule: a description may
repeat what the game has already shown the player; it must not state an outcome
the player has not reached.

## Rules that decide a hard case

- Never write a description from memory. Every one traces to a page loaded in
  the same session.
- Store the effect and the condition. Never store Codex prose.
- Where a source is unclear, leave it out and list the gap. A missing
  description is cheap; a wrong one sends the player to do the wrong thing for
  hours.
- A label-derived check cannot prove a name was verified. Spot-check against the
  page and say which ones.

## Done when

- [ ] 0 facts without a `subjects` key, or every remaining one is listed with
      the reason no source could settle it.
- [ ] The integrity test asserts the new counts, and the old counts are updated
      rather than deleted.
- [ ] lint, typecheck, test and build pass on a forced run.
- [ ] Phase 3 has not started.
