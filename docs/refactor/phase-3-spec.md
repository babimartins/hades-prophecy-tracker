# Phase 3 specification: the interface

Derived from `docs/preview/index.html`, which the owner walked through and
approved. The preview is the reference for every detail below. Where this
document and the preview disagree, the preview is right and this document has a
bug.

The preview is a static mockup with invented numbers. Phase 3 builds the same
structure on the real dataset.

## 0. What must not be lost

Each of these was a decision the owner made during the walkthrough. None is a
default that can be quietly dropped.

| Decision | Where it shows |
| --- | --- |
| The page never scrolls. | The shell, section 2 |
| An index is a comparison table, not a menu. | Characters, Weapons |
| A rail with a detail pane beats stacked collapses. | Fated List, The House, Collections |
| Explaining text has three strengths; use the weakest that works. | Section 7 |
| A tag earns its place only if it varies. | Section 5 |
| The interface is in English. | Everywhere |
| Green means done, and nothing else uses it. | Section 8 |
| Collections is the last tab. | Section 1 |
| Next Steps is grouped by where you act, not sorted. | Section 11 |

## 1. The shell

Six sections, in this order: **Next Steps, Characters, Weapons, Fated List,
The House, Collections.**

Next Steps was added after the walkthrough, at the owner's request, and leads
because it answers the question she opens the app with. The other five keep the
order she approved, Collections last.

- A header holds the title, an overall figure, and the tab bar.
- The header and the footer are fixed. Neither scrolls.
- A detail page is reached from its index and returns with a back link. It is
  not a sixth tab.

## 2. The page never scrolls

`document.documentElement.scrollHeight - clientHeight` must be **0** on every
page, at every width. This is the owner's own phrasing: "se a tabela tem muitos
itens ela ganha um scroll, e a gente congela a altura da página".

- `body` is a fixed-height flex column with `overflow: hidden`.
- `main` fills what is left. It carries the `.wrap` class, so it needs
  `width: 100%`: a flex item with `margin: 0 auto` does not stretch, and
  without the width it collapses to its content and mis-centres. This cost a
  round in the preview.
- The scrolling region is the table body, the rail, or the detail pane —
  whichever is the page's main content.

## 3. Characters

**The index is a comparison table.** Sorting a column is the feature: by Hearts
ascending it is the Ambrosia queue; by Boons it is what to hunt next.

| Column | Content |
| --- | --- |
| Character | name, with the Codex section beneath |
| Hearts | filled pips out of the affinity fact's `max`, plus `n/max` |
| Keepsake | filled pips out of 3 |
| Boons | `n/total` and a bar |
| Favor | `n/total` and a bar, or `—` |
| Markers | only the tags that vary |

- `Unlocked` and `Escaped` style cells are **tickable in place**. A click
  toggles the fact and must not open the row's page.
- Filter chips: All, Olympians, With affinity, Fightable, With a favor,
  Companion. Counts come from the data, never hard-coded.
- 73 characters exist. The default view is the 29 with more than combat; a
  `Foes` chip adds the other 44.

**A character page** carries a shared spine and conditional blocks. A block
appears only when the character has that capability, so there is never an empty
one.

- Shared: Affinity, Keepsake, Codex.
- Conditional: Boons (Olympians and Chaos), Favor, Companion, Combat,
  Conversations, Invite.
- Affinity shows the hearts already given, as a bounded stepper. **What each
  remaining heart needs is not shown**: the dataset holds no per-heart gate, so
  the preview's "Heart 6 — locked until the Lounge favor is done" is mockup
  text. Data-blocked, not overlooked.
- The roll-up in the header counts **facts**, not achievements.

## 4. Weapons

**Also a comparison table.** Six rows.

| Column | Content |
| --- | --- |
| Weapon | true name, display name beneath |
| Unlocked | tickable |
| Escaped | tickable |
| Aspects | four pip groups of five |
| Daedalus | `n/12` and a bar |
| Aspect levels | `n/20` |

The `Aspects` and `Daedalus` column headers carry a tooltip explaining the term.
They open **downwards**: the header is sticky inside a scroll container, which
clips anything above it.

**A weapon page** shows Milestones first, then Aspects, then Daedalus.
Milestones is first because it is what the player ticks most often, and burying
it is why the owner could not find where to record an escape.

Stygius owns 21 facts where the others own 20: Skelly is slain with it.

## 5. Tags

A tag earns its place only if it varies across the index.

- A weapon page carries **no tags**: all six are unlocked, escaped and in the
  Codex.
- Affinity, Keepsake and Codex hold for 23 or 24 of 29 named characters, so they
  are baseline and the blocks below already show them.
- Invite belongs to exactly the nine Olympians, so it repeats Olympian.
- What is left: **Olympian, Grants boons, Fightable, Favor, Companion, Gives a
  companion.**

`companion` means two opposite things: a companion **is** one, its giver
**gives** one. The engine's own comment says the interface must read the
subject's other capabilities to choose the word, so the tag splits in two. Both
halves vary, so both earn their place. The preview showed one because it had no
companion subjects in view.

## 6. The rail pages

Fated List, The House and Collections use a vertical rail with a detail pane.
55 accordions lose the reader's place every time one opens.

- The rail lists every item with its own progress bar.
- The rail and the pane scroll independently, inside the frozen frame.
- Below 860px the rail sits above the pane, capped at 200px, and both still
  scroll inside the frame.

**Fated List.** One rail item per prophecy, all 55. A prophecy with one
sub-item renders as one line in the pane — it is not folded away and not padded
out. 392 entries are of that shape.

**The House.** Mirror of Night, Pact of Punishment, House Contractor, Well of
Charon, Wretched Broker, Platform achievements. The Contractor and the Well are
**shops, not subjects**: eleven of the Contractor's twelve facts belong to
characters.

**Collections.** Fish, Artifacts, Boons by type, Companions. The Codex is not
here: it dissolves into the subjects it describes.

## 7. Explaining text

Three strengths. Use the weakest that works. The test is whether the player sees
the name in the game's own interface.

| Level | Use when | Source |
| --- | --- | --- |
| Tooltip on a term | one word is unfamiliar | `Fact.description` |
| "How this counts" line | the game is familiar, our rule is not | hand-written per view |
| "What this is" block | the player may not have met the system | `Collection.description` |

- 452 facts carry a description. Show it as a tooltip on the line, on hover and
  on keyboard focus.
- 11 collections carry one. Show it as a block, and only for the four systems a
  player may not have met.
- **Spoilers.** 6 facts and 9 achievements carry `spoiler: true`. The reveal can
  be in the **label**, not only the description, so the interface hides the
  label too and offers a click to reveal. Nothing is deleted.

## 8. Colour

- **Green means done.** Nothing else uses it.
- Gold is progress and selection.
- An informational block is neutral, on the plain surface colour. Green read as
  success on something merely informative, which is why it is not used there.
- Read every colour through `colorVar`, per `AGENTS.md`.

## 9. What the engine already answers

No new engine work is expected. Phase 1 built these.

| Question | Function |
| --- | --- |
| Who is in this index? | `subjectsOfType` |
| What does this subject own? | `subjectFacts` |
| Which blocks does this page get? | `subjectCapabilities` |
| What is this subject's progress? | `subjectProgress` |
| Which subjects does this entry touch? | `subjectsOfAchievement` |

`subjectProgress` counts **facts**. `overallProgress` counts **achievements**.
The two are not comparable and no view may add them together.

## 10. Out of scope

- No timestamps. Progress stores values only, by the owner's decision.
- Shop prices are **in**. `Fact.cost` holds an amount and a currency, and the
  row shows it beside the purchase. 180 facts carry one: 158 Contractor items
  and 22 Well of Charon wares. Four Well wares are paid in Heart at a variable
  rate, so they carry none — a range is not an amount, and a wrong price is
  worse than no price.
- The preview's own tooltips are mockup text. The real ones come from
  `Fact.description`.


## 11. Next Steps

Every unfinished action, ranked by how many incomplete entries it would advance,
in three blocks: **House Contractor, House of Hades, During a run.** Each block
shows its top 12 and scrolls inside the frozen frame.

Grouped rather than sorted, by the owner's choice: a ranked list is not a plan
until it says where each action happens. She opens the app before a run, so
"what do I buy" and "what can I do on this run" are separate questions.

- A row shows the action, its control, how many entries it unblocks, and up to
  three of their names.
- Names are deduplicated without regard to case. 18 names belong to more than
  one entry, and "End To Torment, End to Torment" reads as a bug.
- The five roll-up entries are excluded from the count and the names. God of
  Blood reaches 692 facts and Had to Happen 460, so leaving them in adds one to
  almost every row and puts their names on all of them.
- A row's target is the **hardest** any unfinished entry sets. A keepsake wanted
  at rank 1 by one entry and rank 3 by another stays listed until rank 3.

**It is a ranking, not an order.** The dataset holds no prerequisites, so an
action gated behind story progress appears as readily as one available now. The
page says so in its own first line rather than implying a sequence.

`apps/web/src/lib/where.ts` names every namespace explicitly, with no default. A
prefix rule with a fallback is how `contractor:renovation-tasks` was once
counted as one of the 164 Contractor jobs.
