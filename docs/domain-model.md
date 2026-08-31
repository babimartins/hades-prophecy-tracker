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
- coverage across many runs, such as escaping once under each of the 15 Pact
  conditions. Note the requirement is to have the condition *active*, not to max
  it: the Fated List says "Even a single point in a Condition will check it off
  on the list", and the Pact page agrees. An earlier version of this line said
  "at maximum rank" and was wrong.

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
| Platform achievements | 50 |
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

All seven are settled from sources. Barbara had not reached the Heat mechanic
and did not recognise the statues, so she asked for research rather than
answering from the game.

1. ~~The Athena and Demeter duo boon is "Stubborn Bolts" on the Fated List
   page and "Stubborn Roots" on the Duo Boons page.~~ Settled: "Stubborn
   Roots". A god's own boon page is the primary source for a boon's name; the
   Fated List is an aggregating checklist. Both gods' own pages agree:
   https://hades.fandom.com/wiki/Athena/Boons_(Hades) and
   https://hades.fandom.com/wiki/Demeter/Boons_(Hades). The `boon:duo:stubborn-bolts`
   fact keeps its id for progress stability; its label now reads "Stubborn
   Roots" to match.
2. ~~The Codex prophecy counts to 70.~~ Settled: the label is right and the
   word means something other than the nine groupings. The Fated List page
   gives the goal as "Reveal 70 sections in the Codex", so "Codex sections
   revealed" is the wiki's own wording. The Codex page explains what a section
   is: "As Zagreus encounters, gathers, speaks to, or slays the subjects of the
   Codex, he is able to access Achilles' knowledge more deeply, and the entries
   become more complete." A section is a part of one entry, not one of the nine
   groupings. The fact now carries that as its description.
3. ~~Whether clearing at a given Heat is recorded per weapon or globally.~~
   Settled: globally. No source names a weapon anywhere Heat is required. The
   Fated List gives The Useless Trinket's "How to Complete" as "Beat Hades with
   at least 8 heat"; the Achievements page gives the two trophies as "set the
   Heat level to 8 minimum" and "to 16 minimum". Three boolean facts, one per
   Heat level, and none of them per weapon. See question 4: the first answer
   here said only one entry used Heat, and missed the other two statues.
4. ~~Whether the Skelly statues are per save or per weapon.~~ Settled: neither.
   They are three Heat challenges. Skelly's page: "Skelly will add 3 covered
   statues to the southwest of the courtyard which require you to complete runs
   at certain heat levels: **8, 16, and 32**."

   A first answer here said the statues were only a reveal condition and not
   tracked. That was wrong, and Barbara caught it by asking whether they were
   the weapons being revealed. The statues are three actions with three prizes,
   and only the first was in the dataset.

   - Heat 8 uncovers the first prize. It backs `prophecy:useless-trinket` and
     the trophy `achievement:the-useless-trinket`.
   - Heat 16 uncovers the second. It backs `achievement:skellys-last-lamentations`,
     which had been modelled as a checkbox reading "Earn the second of Skelly's
     prizes" — the reward, not the action.
   - Heat 32 uncovers the third. It backs no trophy and no prophecy, so the
     `statue` collection exists to hold all three.

   The bullet "Earn the first of Skelly's Prizes" does sit in the Fated List's
   **Description** cell rather than its How to Complete, so it is still not a
   separate step: it names what the prophecy gives.
5. ~~Whether Dionysus' "6 different characters" is the same counter as The
   Queen's Plan's "6 of the 9 Olympians".~~ Settled: **no**, they are different
   pools. Dionysus' page locks his final gauge until Zagreus "forges bonds with
   at least 6 different characters, and gifting a minimum of 10 Ambrosia to any
   number of characters" — any characters, all 24 with a gauge. The Queen's
   Plan asks for 6 of the 9 Olympians. Maxing six Olympians satisfies both;
   maxing six others satisfies only Dionysus.

   Two data errors came out of checking this.

   **"Forge a bond" is a full gauge, not one Nectar.** The Queen's Plan was
   modelled as `atLeast 1` for each of the nine, so it read as complete after
   nine gifts. The Epilogue Guide's Affinity Requirements section gives the
   real figures: Zeus 7, Poseidon 7, Athena 7, Aphrodite 7, Artemis 7, Ares 7,
   Dionysus 7, Hermes 8, Demeter 6. Demeter is 6 where her gauge holds 7; the
   source says 6, so the data says 6.

   **The prophecy's second half was missing.** Its How to Complete also asks to
   "See specific dialogue from Persephone, Hades, Zeus, and Demeter". The
   Epilogue Guide names nine conversations across those four, so each is a
   counter rather than nine checkboxes.

   Dionysus was also the only gated character whose gate was absent. Every
   other one already carried it: `talk:` facts for Zeus, Athena, Artemis,
   Demeter, Aphrodite and Hypnos, `pet:cerberus` at 20, `spend:charons-shop`
   at 10000, `keepsake:lambent-plume` at 3 for Hermes, `favor:megaera` and
   `favor:thanatos`, and the work orders for Nyx, Chaos, Sisyphus, Achilles,
   Patroclus and Eurydice.
6. ~~Whether Hades accepts Ambrosia.~~ Settled: no. The Ambrosia wiki page
   states "there are a few who cannot [receive Ambrosia]: Bouldy, Hades, and
   those unable to be gifted Nectar". Hades' `nectar:hades` fact stays a
   pure Nectar counter; the other 23 affinity facts are currency-neutral
   because every other character can receive both.
7. ~~Asphodel's enemy table says a Voidstone is never an Elite, while the Fated
   List names a "Dire Voidstone".~~ Settled: both are right, and the Voidstone
   page says so directly. The Voidstones on the Barge of Death in Asphodel
   "are considered Dire Voidstones by the Fated List of Minor Prophecies", yet
   "have no special qualities to them, not even armor". The Fated List counts
   them as Dire; the enemy table describes what they can do. No data change.

### Settled

- **How many platform achievements are there?** 50. There are 49 ordinary
  achievements, plus a 50th earned by completing the other 49. Steam shows
  only 49 publicly because the 50th is hidden. The wiki and Steam never
  disagreed; the apparent conflict was a hidden entry. Settled by the project
  owner from the game, 2026-08-31.

- **Does Persephone have a Codex entry?** Yes. This reverses an earlier answer
  here, which read only the Codex page's index and concluded she was correctly
  absent. Three things say otherwise, and none of them is her page alone.

  1. Her page carries a `== Codex entry ==` section with Achilles' prose about
     the Queen of the Underworld, in the same form as every other entry.
  2. Her page shows a 9-heart affinity gauge, laid out exactly like the other
     24, ending in "Bond Forged".
  3. The Codex page itself says the hearts live inside entries: it "serves as a
     reference of how many bottles of Nectar and Ambrosia have been gifted to
     certain characters, via a row of hearts in the top right corner of their
     entries". Hearts imply an entry.

  Against that stands one index list, which never names her at all and has no
  exclusion list either. She is a late-game story reveal, which is a plain
  reason for an index to be out of date. The owner chose to follow the three
  over the one.

  Her entry carries **no section**. The Codex page files every other entry
  under one of nine headings and does not mention her, so choosing between
  Chthonic Gods and Others of Note would be inventing a fact. The Characters
  index falls back to "Character" for her.

  This was found by auditing an old plan document that said "26 Nectar-eligible
  characters" against a dataset holding 24. The other two are Persephone and
  Bouldy; Bouldy can be gifted Nectar but, per his page, "lacks an Affinity
  level", so he has nothing to track.
