# Hades domain model

What the game actually tracks, and how it maps onto facts. Written after four
research passes over the Hades Wiki. Every count here came from a page loaded in
that session; the reports live in `.superpowers/research/` (not committed).

Read this before adding a new collection. It exists to stop the same three
mistakes: modelling a run-scoped thing as progress, splitting one action into
several facts, and inventing a system that does not exist.

## 0. Scope rule

Set by the project owner:

> Anything that needs sub-items, or needs actions from the player to achieve,
> must be listed.

A system is in scope when the player must *do* something to complete it, even
when no prophecy asks for it. Keepsake ranks, hidden aspect levels and individual
fish species all qualify. Depth is not optional.

The only thing this rule does not reach is run-scoped state, which is not
progress at all. That boundary is section 1.

## 1. The boundary: what is progress

**Only what survives Zagreus's death is progress.**

| Persists | Run-scoped |
| --- | --- |
| Chthonic Keys, Darkness, Gemstones, Nectar | Pom of Power, Centaur Heart |
| Ambrosia, Diamonds, Titan Blood | Charon's Obol, Loyalty Card, Red Onion |
| Which Daedalus enchantments you have ever taken | The Daedalus Hammer item itself |
| Which boons you have ever obtained | Every boon you currently hold |

The Daedalus case is the one that misleads. The hammer is a run item and is not
progress. The enchantments it grants are recorded for life, and the Fated List
has one prophecy per weapon over them. Track the enchantment, never the hammer.

The same split applies to boons. A boon you hold is run state. A boon you have
ever obtained is progress.

## 2. Boon prerequisites are not unlock edges

Duo and Legendary boons require prerequisite boons. That requirement is a check
on what Zagreus **currently holds during a run**, not on what he has ever
obtained. The wiki is explicit that boons are lost on death.

So the tracker must not model boon prerequisites as a dependency graph. Only the
terminal fact matters: "ever obtained boon X". A prerequisite chain here would be
elaborate, plausible, and wrong.

## 3. Shapes

Not everything is a checkbox. The four node kinds cover these shapes:

| Shape | Example | Model |
| --- | --- | --- |
| Single action | Unlock the Adamant Rail | boolean fact |
| Rank or level | Pact condition, aspect level, Mirror talent | number fact + `atLeast` |
| Lifetime counter | 10,000 foes, 210 lyre plays, 25 fish | number fact + `atLeast` |
| N of M | The Queen's Plan, any 6 of 9 Olympians | `count` node |
| Per-weapon matrix | Bounties by weapon and Heat | one fact per cell |

Four things resist decomposition and stay as one labelled boolean, with the whole
condition in the label:

- consecutive results, such as defeating Charon twice in a row
- state plus action in the same moment, such as slaying Skelly with Stygius while
  its Zagreus aspect is at level 5
- clearing a region while wielding a specific weapon and aspect
- coverage across many runs, such as the 15 Pact conditions at maximum rank

## 4. Shared actions

This is why the fact model exists. Each line is ONE action that several systems
need.

**Giving Nectar to a character for the first time** unlocks that character's
keepsake and fills the first heart of their Codex entry. One action, two systems.

Equipping a keepsake is a **different** action. The prophecy "Close at Heart"
asks you to equip each keepsake at least once, not to obtain it. Do not merge
those two.

Other confirmed overlaps:

- Slaying 10,000 foes completes a prophecy and unlocks Ares' final heart.
- Renovating the Lounge and talking to Dusa completes a prophecy and unlocks her
  sixth heart and her Ambrosia track.
- Slaying Skelly with the level 5 Stygius aspect completes "Eternal Rest" and
  unlocks his Companion heart.
- The Achilles and Patroclus reunion is one favor that unlocks both their gated
  hearts. The same holds for Nyx and Chaos.
- Catching 18 fish gates Poseidon's final heart, and fishing also feeds the
  Nectar and Ambrosia economy.
- Hermes' final heart needs his keepsake at rank 3, which is the only crossing
  between the keepsake-rank system and affinity.
- Unlocking an aspect spends Titan Blood, which feeds a cross-weapon counter used
  as a precondition for hidden aspects.

## 5. Affinity should be one numeric fact per character

Today `nectar:<character>` is a boolean, because the only consumer so far is a
prophecy that asks for a single gift.

The Codex needs the count. Characters hold between 5 and 10 hearts, and hearts
advance with each gift.

Model it as **one numeric fact per character**, with `max` set to that
character's heart count:

- the prophecy that wants one gift becomes `atLeast 1`
- the Codex entry wants `atLeast <hearts>`

The dataset already proves this pattern works. `aspect:stygius:zagreus` has
`max: 5` and is referenced at `atLeast 5` by one prophecy and `atLeast 1` by
another. Affinity is the same shape at a larger scale, and it is the single
change that makes the Codex collection pay off.

## 6. Counts

Verified during research. Where two wiki pages disagree, both numbers appear.

| System | Count |
| --- | --- |
| Fated List of Minor Prophecies | 55 |
| Platform achievements | 50 on the wiki, 49 shown publicly on Steam |
| Codex entries | 119 across 9 sections |
| Standard boons | 111 across 9 gods |
| Duo boons | 28, which is every pair of the 8 eligible gods |
| Legendary boons | 12 exist; the Fated List asks for 10 |
| Chaos | 11 blessings, 1 legendary blessing, 13 curses |
| Weapons and aspects | 6 weapons, 4 aspects each, maximum level 5 |
| Daedalus enchantments | 12 tracked per weapon, 72 total |
| Keepsakes | 25, plus Bouldy who takes Nectar without giving one |
| Nectar-eligible characters | 26 |
| Companions | 6 |
| Pact conditions | 15, or 16 in Hell Mode; 63 Heat, or 64 |
| Mirror of Night | about 24 talents in 12 pairs |
| Fish | 18 |

## 7. Corrections to earlier assumptions

- **Chaos bounties do not exist.** The original design spec named them. There are
  per-weapon bounties and the Skelly statues. Nothing else.
- **Mirror talents are not mutually exclusive.** The red and green sides switch
  freely, so completing everything is expensive, not impossible.
- **Asterius cannot be killed.** He withdraws at 20% health, which is why the
  mini-boss prophecy excludes him.
- **The eight "Shot to Flare" boon renames under the Aspect of Beowulf are the
  same boon.** One fact, not two.

## 8. Open questions that reading cannot settle

These need someone with the game open.

1. The Athena and Demeter duo boon is "Stubborn Bolts" on the Fated List page and
   "Stubborn Roots" on the Duo Boons page. The dataset uses the Fated List name.
2. The Codex prophecy counts to 70. The Codex holds 119 entries and 9 sections,
   so 70 counts something else. The current fact is labelled "Codex sections
   revealed", which is probably wrong.
3. Whether clearing at a given Heat is recorded per weapon or globally.
4. Whether the Skelly statues are per save or per weapon.
5. Whether Dionysus' "6 different characters" is the same counter as The Queen's
   Plan's "6 of the 9 Olympians".
6. ~~Whether Hades accepts Ambrosia.~~ Settled: no. The Ambrosia wiki page
   states "there are a few who cannot [receive Ambrosia]: Bouldy, Hades, and
   those unable to be gifted Nectar". Hades' `nectar:hades` fact stays a
   pure Nectar counter; the other 23 affinity facts are currency-neutral
   because every other character can receive both.
7. Asphodel's enemy table says a Voidstone is never an Elite, while the Fated
   List names a "Dire Voidstone".

### Settled

- **Does Persephone have a Codex entry?** No, and this is a genuine wiki
  inconsistency, not a gap in our data. Persephone's own wiki page shows a
  Codex entry section, but the Codex page itself lists her in neither its
  nine section tables nor its "Not in the Codex" exclusion list. Our 119
  entries follow the Codex page, so Persephone is correctly absent. Do not
  add her on the strength of her own page alone.
