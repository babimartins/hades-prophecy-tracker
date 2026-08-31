# Descriptions: what we have, what is missing, what to gather

> **Done, 2026-08-31.** 617 facts carry a description, 12 collections carry
> one, and 15 entries carry a spoiler flag. The House Contractor's 171
> purchases were added afterwards, in phase 2b. The counts below describe the
> state before phase 2 ran; the sections that follow are kept because the
> reasoning still governs any new entry.

Written 2026-08-31, after the owner asked why she could not recognise the Pact
of Punishment from the tracker.

## 1. What the dataset holds today

Measured against `packages/data/src/**`, not estimated.

| Level | Count | Field | What the text says |
| --- | ---: | --- | --- |
| Collection | 11 | none | Nothing. `collections.json` holds `id` and `name` only. |
| Achievement | 545 | `description` | The task. "Take the Breaching Slash Daedalus enchantment for Stygius." |
| Fact | 692 | `label` | The action. "Give Nectar to Zeus." |

Every achievement has a description. Not one description explains what the
thing **is**.

The two exceptions prove the point. The 24 Mirror talents and the 11 Perks
carry an effect in a parenthesis:

> Slay a foe with the Shifter Perk active (the foe teleports randomly).

That parenthesis is the missing information. 35 of 545 entries have it. The
other 510 do not.

## 2. Why an achievement description cannot become a fact tooltip

289 facts back exactly one achievement. Reusing that achievement's description
as the fact's tooltip looks free and is wrong.

`talk:persephone-returns-to-house-of-hades` would inherit:

> Max affinity with Hades by giving him Nectar, after Persephone returns to
> the House of Hades and he responds with gratitude.

That text describes the whole entry, not this one step. The description sits at
the achievement level because the achievement is what it describes.

**A fact needs its own `description` field.** There is no shortcut.

## 3. Which items need which text

Three buckets, by what the reader cannot work out alone.

### Bucket A — "What this is": a block on the page

For a system that owns a page or a rail item. The block explains the system in
two or three sentences, before any checkbox.

| Subject | Count |
| --- | ---: |
| Collections | 11 |
| Weapons | 6 |
| Characters | 29 |
| **Total blocks** | **46** |

This bucket is small and it is the one that answers the original complaint.
"Pact of Punishment" as a bare heading tells the player nothing.

### Bucket B — "What it does": a tooltip on the line

404 facts name a thing whose effect the label never states. "Earn the Blizzard
Shot Duo Boon" does not say what Blizzard Shot does.

| Namespace | Facts | Source of the effect text |
| --- | ---: | --- |
| `boon` | 149 | each god's own boon table |
| `daedalus` | 72 | the weapon's enchantment table |
| `wellofcharon` | 26 | the Well of Charon page |
| `keepsake` | 25 | the Keepsakes page |
| `aspect` | 24 | each weapon's page |
| `talent` | 24 | **already held** in the mirror descriptions |
| `catch` | 18 | the Fishing page |
| `artifact` | 15 | the Resources pages |
| `pact` | 15 | the Pact of Punishment page |
| `curse` + `blessing` | 25 | the Chaos page |
| `perk` | 11 | **already held** in the perk descriptions |

### Bucket C — "How you get it": a tooltip on the line

62 facts name a feat whose conditions the label compresses. The owner raised
this case with the weapon Milestones.

| Namespace | Facts | Example |
| --- | ---: | --- |
| `encounter` | 37 | first meeting with a foe, per region |
| `combat` | 13 | "Get past Cerberus with the Aspect of Rama in effect" |
| `miniboss` | 12 | named elite foes |

### The rest — the label is enough

226 facts need nothing. `codex` (120), `nectar` (24), `talk` (18), `meet` (16),
`invite` (9), and eleven smaller namespaces all state a plain action.

404 + 62 + 226 = 692. The buckets cover every fact.

**To gather: 431 fact descriptions.** 466 facts need text, 35 already have it
inside a Mirror or Perk description and only need moving to the fact.

## 4. The spoiler rule

The owner has not finished the game. Some descriptions in the repository
already spoil it.

A scan of the 545 descriptions found 43 that touch a story term. Most are
harmless: "Escape the Underworld" is the premise, not a reveal. Eight are real
spoilers:

| Entry | The reveal |
| --- | --- |
| `codex:hades` | Persephone returns to the House of Hades |
| `codex:demeter` | an Epilogue exists |
| `codex:nyx`, `codex:chaos` | Nyx and Chaos are reunited |
| `codex:achilles`, `codex:patroclus` | Achilles and Patroclus are reunited |
| `codex:sisyphus`, `codex:companion-shady` | Sisyphus's sentence is amended |

**The rule:** a description may repeat anything the game itself has already
shown the player. It must not state an outcome the player has not reached.

By that rule the 55 Fated List texts are safe. The game prints them in its own
menu, so they reveal nothing new. The Codex requirement notes above are not
safe, because we wrote them from the wiki.

**The mechanism:** mark a description `spoiler: true` and hide it behind a
click. The reader sees the entry name and the checkbox. The reader chooses to
see why it is gated.

Do not solve this by deleting the text. The player who has finished the game
needs it.

## 5. Order of work

1. **46 "What this is" blocks.** Small, and it fixes the reported problem.
2. **`description` on the fact schema, plus `spoiler` on both levels.** One
   schema change, no data yet.
3. **Hide the 8 known spoilers.** Cheap once the flag exists.
4. **431 fact descriptions**, by namespace, largest table first. `boon` (149)
   and `daedalus` (72) are 221 of the 431 and come from tables we have already
   read once.

Steps 1 to 3 are a slice. Step 4 is its own slice, and it splits by namespace.

## 6. Rules that still apply

`AGENTS.md` governs this work without change.

- Never write a description from memory. Every one traces to a page loaded in
  the same session.
- Store the effect and the condition. Never store Codex prose. The prose is
  Supergiant's and the wiki's CC BY-NC-SA does not cover it.
- Where a source is unclear, leave the description out and list the gap. A
  missing description is cheap. A wrong one sends the player to do the wrong
  thing.

The drafts in `docs/preview/index.html` are marked "Draft. Verify against
&lt;url&gt; before this ships." for exactly this reason. None of them is sourced yet.

## 7. The preview drafts, listed

Every text below was written for the mockup and has no source. Each one is a
gathering task, the same as the 431 fact descriptions. None may be copied into
`packages/data` as it stands.

| Where | Items | Source to read |
| --- | ---: | --- |
| "What this is" — Pact of Punishment | 1 | `/wiki/Pact_of_Punishment` |
| "What this is" — House Contractor | 1 | `/wiki/House_Contractor` |
| "What this is" — Wretched Broker | 1 | `/wiki/Wretched_Broker` |
| "How this counts" — Mirror, Well of Charon, Fish, keepsakes | 4 | the system's own page |
| Tooltip — Pact conditions | 7 | `/wiki/Pact_of_Punishment` |
| Tooltip — Coronacht Aspects | 4 | `/wiki/Coronacht` |
| Tooltip — Coronacht Milestones | 3 | the prophecy and the Temple of Styx pages |
| Tooltip — column headers "Aspect", "Daedalus enchantment" | 2 | `/wiki/Infernal_Arms`, `/wiki/Daedalus_Hammer` |

23 texts. The "What this is" block for platform achievements is the one
exception: it describes our own dataset, not the game, and needs no source.

The owner settled the count it states on 2026-08-31 — 49 achievements plus a
50th for earning all 49.
