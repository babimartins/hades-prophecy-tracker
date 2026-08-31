# Decision log

Choices made without asking, during the three-phase refactor of 2026-08-31.
Each entry states the choice, the alternative, and why the alternative lost.

Ordered oldest first.

## 1. The subject roster is the Codex, not a new list

**Chosen:** build the 119 subjects from `codex/achievements.json`, mapping each
of the 9 Codex sections to a subject type.

**Alternative:** write a roster by hand from the taxonomy research.

**Why:** the Codex entries are already sourced and committed. A hand-written
roster would be a second list that can disagree with the first. Using the Codex
also means phase 1 needs no wiki reading at all, so the phases stay separate.

## 2. Four subject types, not the three the owner named

**Chosen:** `character`, `weapon`, `collectible`, `region`.

**Alternative:** fold the 7 regions into `collectible`, as the owner's wording
implied.

**Why:** a region can never have affinity, a keepsake or an Aspect. The
taxonomy's test for a real type is that it constrains which capabilities are
possible. Calling Tartarus a collectible would state that it is a thing you
collect, which is false. The cost is one extra type; the alternative costs a
lie in the model.

## 3. A fact carries an array of subjects, not one

**Chosen:** `subjects?: SubjectId[]`.

**Alternative:** a single `subject?: SubjectId`.

**Why:** 28 duo boons belong to two gods each, and several `talk:` facts name
three or more people. A single field would force a wrong primary choice on 28
entries at minimum.

## 4. Capabilities are derived, never stored

**Chosen:** compute a subject's capabilities from the namespaces of its facts,
using one exported map in the engine.

**Alternative:** store a `capabilities` array on each subject.

**Why:** a stored list is a second source of truth. Add a boon fact for a god
who had none and a stored list is silently wrong, while a derived one is right
by construction. Nothing in the interface needs a capability the facts do not
already imply.

## 5. An untagged fact keeps no `subjects` key; a system fact carries an empty array

**Chosen:** the 78 system facts get `"subjects": []`. The 113 unsourced facts
get no key at all.

**Alternative:** give both an empty array, or leave both missing.

**Why:** the two states mean different things. "This names no subject on
purpose" must be distinguishable from "nobody has sourced this yet", or the
integrity test cannot tell phase 2 what is left to do.

## 6. `subjectProgress` counts facts, `overallProgress` counts achievements

**Chosen:** keep the two units apart and say so in the names and the doc
comments.

**Alternative:** make both count achievements, for one comparable number.

**Why:** a subject page lists actions, and an action is a fact. Counting
achievements on a subject page would report Zeus as 3/5 when the player can see
22 unticked boons. The numbers are not comparable and pretending otherwise
produces the dishonest progress bar that slice 4 already had to fix once.

## 7. Phase 1 does not touch `apps/web`

**Chosen:** add capability to schema, data and engine; change no component.

**Alternative:** start migrating the interface in the same branch.

**Why:** `main` deploys to the live site on every push. A half-migrated
interface on `main` breaks a working site for the length of phase 2, which is
the longest phase. The verification step asserts an empty diff against
`apps/web`.
