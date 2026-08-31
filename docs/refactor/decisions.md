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

**Chosen:** the system facts get `"subjects": []`. The unsourced facts get no
key at all. The split ended at 80 and 105 once decisions 9 and 10 landed; it
was 78 and 113 when this was written.

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

## 8. `subjects` is required on the Dataset type, so one line of `apps/web` changes

**Chosen:** `subjects: z.array(subjectSchema).default([])`. The parsed type
requires the key; the runtime tolerates its absence. One empty-catalog default
in `next-steps-panel.ts` gains `subjects: []`.

**Alternative:** make the field optional on the type too, so no consumer changes
at all and the phase-1 diff against `apps/web` is genuinely empty.

**Why:** an optional field forces every engine function, for the rest of the
project, to handle `undefined` for a field that is always present in the real
dataset. That is a permanent cost paid to keep one mechanical line out of one
diff. The phase-1 constraint means "do not migrate the interface", not "change
zero characters", so the verification step now asserts that `apps/web` changes
by exactly one line and no component behaviour changes.

## 9. The `<namespace>-<segment>` rule, added after review

**Chosen:** resolve `companion:battie` to the subject `companion-battie`.

**Alternative:** leave the six companion facts for phase 2, as the first pass
did.

**Why:** a review found this and it was a real defect, not a preference. The
companion's own Codex entry is "Companion Battie", so the roster id carries the
namespace. Leaving the fact untagged made two things wrong at once: the
`companion` capability was unreachable for every subject, so it was dead code
in the engine; and `companion-battie` owned one fact, its Codex entry, so a
player who had merely unlocked that entry read as **100% complete** on a
subject page. It now reads 1 of 2.

Six facts resolve this way and nothing else in the dataset does. Checked by
scanning all 113 previously untagged facts against every roster id in both the
plain and the prefixed form.

## 10. The two `fish:*` facts are aggregates, not subject facts

**Chosen:** `fish:caught` (a lifetime counter to 25) and `fish:very-rare-caught`
take an empty subject list, alongside the five system namespaces.

**Alternative:** leave them for phase 2 to assign to a subject.

**Why:** they count across every species rather than naming one, which is the
same shape as `codex:sections-revealed`. There is no subject to find, so
leaving them in the "needs a source" pile would have sent phase 2 looking for
an answer that does not exist.

`NAMESPACES_WITHOUT_CAPABILITY` now lists them explicitly. `subjectProgress`
counts a fact in `total` and skips its capability bucket when the namespace is
unmapped, so an unlisted namespace would make the breakdown quietly stop
summing to the whole. A test now asserts the sum for every subject.

## 11. A number fact with no `max` reads as done, and that is now pinned

**Chosen:** keep the behaviour, document it, and add a test that fixes it in
place.

**Alternative:** throw, or report `partial` for any positive value.

**Why:** such a fact has no completion threshold, so any positive value has to
mean something, and `isSatisfied` already answers "done" everywhere else in the
engine. Reporting `partial` instead would make the fact impossible to complete,
which is worse. Throwing would fail on a fixture rather than on the data. The
data package already rejects a number fact with no `max`, so only a
hand-written fixture reaches this, and the test now stops it drifting silently.

## 12. `subjectsOfAchievement` memoises its indexes per dataset

**Chosen:** a `WeakMap` from dataset to `{ factById, subjectById }`.

**Alternative:** leave the linear `find` inside the loop. Measured at 6.4ms for
all 545 achievements, which is not slow today.

**Why:** the measurement is on a laptop, and phase 3 calls this once per row in
a list of 545 on a phone. The repository already uses the map idiom in its own
integrity test. A `WeakMap` keyed on the dataset keeps the function pure from
the caller's point of view and lets the entry be collected with the dataset.

## 13. `subjects` is required now that nothing is unresolved

**Chosen:** make the field required on `Fact` once all 692 were resolved, and
retire the absent-key state.

**Alternative:** keep it optional, since the integrity test already asserts
that nothing is missing.

**Why:** the optional key carried a meaning — "nobody has established this
yet" — and that meaning is spent. Leaving it optional would let a new fact
ship with no subjects and no failure, and would keep every consumer handling an
`undefined` that cannot occur. The cost is one `subjects: []` on each test
fixture, paid once.

An empty list keeps its meaning: 81 facts belong to no subject on purpose.

## 14. `combat:foes-slain` is an aggregate, like the fish counters

**Chosen:** empty subject list.

**Alternative:** tag it to every foe, or leave it for someone to decide later.

**Why:** it counts every kill in the game rather than naming a foe. Tagging it
to 37 foes would put "slay 10,000 foes" on 37 subject pages as if each one
owned it. It is the same shape as `fish:caught`, which already takes an empty
list. Its namespace stays a capability namespace, because the other 12
`combat:*` facts do name subjects.

## 15. A weapon is a subject of its Cerberus milestone; a keepsake is not

**Chosen:** `combat:cerberus-coronacht-rama` takes `["cerberus", "coronacht"]`.
`combat:defeat-hades-with-cosmic-egg` takes `["hades"]` only.

**Why:** the first names two things the player acts on — a foe to get past and
a weapon to wield, and the weapon page should list it as a milestone. The
second names one, plus an instrument. The Cosmic Egg is how you do it, not what
you do it to, and putting it on Chaos's page would tell a reader that Chaos has
a combat milestone.

The same rule keeps `talk:nyx-in-chaos-realm` on Nyx alone. Chaos's realm is
where the conversation happens, not a participant.

## 16. `next-steps-panel` goes, and the Characters table replaces it

**Chosen:** drop the panel. The Characters and Weapons tables answer "what
next" by sorting.

**Alternative:** keep it as a sixth block on the shell.

**Why:** the owner opens the app before a run to decide a loadout, and what she
described wanting is comparison — "quantos corações tenho com cada personagem
pra decidir pra quem dou ambrosia". Sorting the Hearts column ascending *is*
the Ambrosia queue. The panel ranked facts by how many achievements they
unblock, which is a different question and not one she asked.

The engine's `nextSteps` stays. It is tested, pure, and a later view may want
it; deleting the view does not oblige us to delete the answer.

## 17. The shell owns the height, and `theme.css` gives up the body padding

**Chosen:** `app-shell` is `100dvh` with `overflow: hidden`, and `html, body`
are `height: 100%; overflow: hidden` with no padding.

**Alternative:** keep the body padding and let the shell be `calc(100dvh - 48px)`.

**Why:** the document must never be taller than the viewport, and body padding
guarantees it is. `100dvh` rather than `100vh` so a phone's collapsing address
bar does not leave a scrollable sliver — the exact failure the owner's rule
exists to prevent.

## 18. No backtick inside a `css` template's comments

**Chosen:** write CSS comments without backticks.

**Why:** not a preference. A backtick closes the tagged template, and the file
fails to transform with `Syntax error "d"` pointing at the middle of a comment.
It cost a build cycle on the first component of this phase.
