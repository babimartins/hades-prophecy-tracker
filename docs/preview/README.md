# Structure preview

`index.html` is a static mockup of the proposed information architecture. It is
not built from `packages/data`. Every number in it is invented.

Open it in a browser:

```bash
open docs/preview/index.html
```

## What it demonstrates

- Five top-level sections: Characters, Weapons, Fated List, Collections, The House.
- The Characters index and the Weapons index are **comparison tables**, not menus.
  Sorting a column answers a question without opening a page.
- A character page has a shared spine (Affinity, Keepsake, Codex) plus blocks that
  appear only when the character has that capability. Zeus has Boons; Dusa has a
  Favor; Theseus has Combat and nothing else.
- The Codex dissolves into the subjects. There is no Codex section.
- Fated List, Collections and The House use a **vertical tab rail** with a detail
  pane, not stacked collapses.
- An entry with a single sub-item renders as one line, not as an expandable item.
- **The page never scrolls.** The header, the tab bar and the footer are fixed.
  The table body, the tab rail and the detail pane each scroll on their own.
- A **"What this is"** block explains a system before any checkbox. A **tooltip**
  explains a single checkable line. `docs/descriptions-plan.md` states which
  items get which, and what is still missing.

## Colour rules

- Green means done. Nothing else uses it.
- Gold is progress and selection.
- Violet is a preview note.
- An informational block is neutral, on the plain surface colour.

## When a system gets explaining text

Three levels, weakest first. Pick the weakest one that works.

| Level | Use it when | Example |
| --- | --- | --- |
| **Tooltip on the term** | one word is unfamiliar, but the page is not | "Aspect" on the Weapons column header |
| **"How this counts" line** | the game is familiar; only our counting rule is not | "Both sides of a Mirror pair count separately." |
| **"What this is" block** | the player may never have met the system | Pact of Punishment |

The test is whether the player sees the name in the game's own interface.
"Weapons" and "Keepsakes" pass, so they get no block. "Pact of Punishment"
and "Wretched Broker" do not, so they keep one.

Four blocks survive: Pact of Punishment, House Contractor, Wretched Broker,
Platform achievements. Everything else became a tooltip or a counting line.

## When an item gets a tag

A tag earns its place only if it varies across the index. Every weapon is
unlocked, escaped and in the Codex, so a weapon page carries no tags at all.
Affinity, Keepsake and Codex hold for 23 to 24 of the 29 characters, so they
are baseline and the blocks below already show them. What is left is what
distinguishes: Olympian, Fightable, Favor, Companion.

## Tooltips in this preview

Two places carry a working tooltip. Hover, or tab to the dotted label.

| Page | Items | Tooltip answers |
| --- | ---: | --- |
| The House → Pact of Punishment | 7 | what the Condition does |
| Weapons → Coronacht → Aspects | 4 | what the Aspect changes |
| Weapons → Coronacht → Milestones | 3 | how you get the milestone |

## Not production copy

The interface language is English, to match the game.

Every "What this is" block is a draft and says so. None is sourced yet.
