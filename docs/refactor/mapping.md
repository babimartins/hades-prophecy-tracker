# Phase 1 mapping: what changes and what the new structure is

Written 2026-08-31. Measured against the code and the data, not estimated.

The approved interface is organised by **subject**. The schema has no idea what
a subject is. This document states the gap and the shape that closes it.

## 1. What the data holds today

| Level | Count | Fields |
| --- | ---: | --- |
| Collection | 11 | `id`, `name` |
| Fact | 692 | `id`, `label`, `kind`, `max?`, `collection` |
| Achievement | 545 | `id`, `name`, `description`, `collection`, `requirement`, `section?` |

One axis exists: **collection**. `section` is a second axis but it holds a
collection id, so it cannot name a person or a weapon.

## 2. The subject roster comes from the Codex

The Codex is already a verified list of every named thing in the game. Its 119
entries are the roster, and its 9 sections give each one a type.

| Codex section | Entries | Subject type |
| --- | ---: | --- |
| Chthonic Gods | 10 | `character` |
| Olympian Gods | 9 | `character` |
| Others of Note | 10 | `character` |
| Fables | 6 | `character` |
| Perilous Foes | 37 | `character` |
| The Underworld | 7 | `region` |
| Infernal Arms | 6 | `weapon` |
| Artifacts | 16 | `collectible` |
| River Denizens | 18 | `collectible` |

**119 subjects: 72 characters, 34 collectibles, 7 regions, 6 weapons.**

This roster needs no new research. It restates data already in the repository,
which is why phase 1 can build it and phase 2 does not have to.

Persephone is the one known gap. She has facts and no Codex entry, so she needs
a subject entry that the Codex cannot supply. Phase 2 adds her.

## 3. Four types, not three

The owner named three: person, weapon, collectible. `region` is a fourth.

A region can never have affinity, a keepsake or an Aspect. That is the test for
a real type from the taxonomy research: it constrains which capabilities are
possible, not merely which ones happen to be filled in. Folding the seven
regions into `collectible` would state that a region is a thing you collect,
which is false.

`character` swallows god, character and foe. The research established that the
three differ only by which Codex section files them, so the schema keeps one
type and lets the capabilities distinguish them.

## 4. Fact to subject: 507 of 692 are provable from the id

A fact carries **an array** of subject ids, not one. 28 duo boons belong to two
gods each, and several conversations name three or more people.

| Group | Facts | Rule |
| --- | ---: | --- |
| Provable from the id | 507 | the second segment names a subject |
| A system or an aggregate, so deliberately empty | 80 | `pact`, `talent`, `perk`, `wellofcharon`, `contractor`, `fish`, and `codex:sections-revealed` |
| Needs a source | 105 | the id names the thing, not its owner |

Four mechanical rules beyond a plain split, each of them provable:

- **Weapon alias.** The Codex writes the display name, the facts write the true
  name: `stygian-blade` is `stygius`, `twin-fists` is `malphon`. Six weapons,
  and `weapon:twin-fists-of-malphon` uses a third spelling.
- **Elite prefix.** `miniboss:dire-inferno-bomber` is the Elite form of
  `inferno-bomber`. Strip `dire-`.
- **Namespace prefix.** A companion's own Codex entry is "Companion Battie", so
  its roster id is `companion-battie` while its fact id is `companion:battie`.
  Six facts resolve as `<namespace>-<segment>`, and nothing else in the dataset
  does. Missing this made the `companion` capability unreachable and reported
  Battie as complete for a player who had only unlocked her Codex entry.
- **System and aggregate facts.** Six namespaces name a game system or a
  lifetime counter, not a subject. Their subject list is empty on purpose, and
  the integrity test asserts it is empty rather than merely present.

### The 105 that phase 2 must source

| Namespace | Facts | What the id hides |
| --- | ---: | --- |
| `boon` (duo and legendary) | 38 | the god, or the pair of gods |
| `keepsake` | 25 | the giver, not the item |
| `talk` | 18 | who takes part |
| `combat` | 13 | which foe or which weapon |
| `workorder` | 5 | the beneficiary |
| `lounge` | 4 | Dusa, named nowhere in the id |
| `spend`, `lyre` | 2 | Charon, Orpheus |

The six `companion:*` facts also gain their **giver** in phase 2, on top of the
companion they already name. They are the second place, after the duo boons,
where one fact carries two subjects.

The research file holds a candidate for every one of these. It is analysis, not
sourced per entry, so phase 2 re-reads the page instead of copying it.

## 5. Capabilities are derived, never stored

A capability is what a subject offers. It follows from which fact namespaces the
subject owns, so storing it would create a second source of truth that drifts.

| Capability | Namespaces |
| --- | --- |
| `codex` | `codex` |
| `introduction` | `meet` |
| `affinity` | `nectar` |
| `boons` | `boon`, `blessing`, `curse` |
| `keepsake` | `keepsake` |
| `companion` | `companion` — see the note below |
| `combat` | `combat`, `encounter`, `miniboss` |
| `dialogue` | `talk` |
| `invite` | `invite` |
| `quest` | `favor`, `workorder`, `lounge`, `lyre` |
| `aspect` | `aspect` |
| `enchant` | `daedalus` |
| `acquire` | `weapon` |
| `escape` | `escape` |
| `collect` | `artifact` |
| `catch` | `catch` |
| `reach` | `reach` |
| `pet` | `pet` |
| `shop` | `spend` |

The interface labels are not capabilities. "Olympian" is `boons` plus type
`character`; "Fightable" is `combat`. The engine reports the capability and the
interface decides the word.

**`companion` is the one capability that will mean two opposite things.** A
companion derives it from its own fact, meaning "is a companion". Once phase 2
adds the giver to that same fact, the giver derives it too, meaning "gives a
companion". The namespace cannot separate them. The interface must read the
subject's type and its other capabilities to choose the word, and phase 3 has
to handle this.

## 6. New and changed shapes

```ts
// new
subjectSchema  = { id, name, type: 'character'|'weapon'|'collectible'|'region', description?, spoiler? }

// changed, every addition optional so the current dataset stays valid
factSchema        += { subjects?: SubjectId[], description?: string, spoiler?: boolean }
achievementSchema += { spoiler?: boolean }
collectionSchema  += { description?: string }
datasetSchema     += { subjects: Subject[] }
```

Every field is optional. The 545 achievements and 692 facts keep validating
while phase 2 fills the gaps, so every commit in between stays green.

`subjects` became required once all 105 were sourced. Every fact now names its
subjects or declares an empty list.

## 7. New engine functions

Pure, in `packages/engine`, alongside the existing five.

| Function | Returns |
| --- | --- |
| `subjectsOfType(dataset, type)` | the subjects of one type |
| `subjectFacts(dataset, subjectId)` | every fact tagged with the subject |
| `subjectCapabilities(dataset, subjectId)` | the capabilities the subject's facts imply |
| `subjectProgress(dataset, subjectId, facts)` | done, total and ratio **over facts**, plus a breakdown per capability |
| `subjectsOfAchievement(dataset, achievement)` | the subjects its facts name |

`subjectProgress` counts **facts**, where `overallProgress` counts
**achievements**. A subject page lists actions, so a fact is its unit. The two
numbers are not comparable and the names must keep saying so.

A dataset-wide total is still computed once over the 692 facts, never by summing
per-subject counts. No fact carries two subjects yet; once phase 2 tags the 28
duo boons, each will be counted twice and summing will overcount.

## 8. What phase 1 must not do

`main` deploys to the live site on every push. Phase 1 therefore leaves
`apps/web` untouched and working on the collection axis. The interface changes
in phase 3.

Nothing in phase 1 needs the wiki. Every rule above is provable from data
already in the repository.
