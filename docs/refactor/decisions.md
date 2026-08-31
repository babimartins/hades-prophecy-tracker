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

## 19. No search box, because the approved design has none

**Chosen:** drop `search-box` with the rest of the collection-axis components.

**Alternative:** carry it over and make it narrow the current index.

**Why:** the plan listed search as task 7, carried over from the old
application. The preview the owner walked through and approved has no search
box anywhere. The indexes sort and filter, and the rail lists every item at
once, which is what the structure was designed to make possible. Adding a
control she did not ask for and did not see would be scope, not fidelity.

The engine's `searchAchievements` stays, untouched and tested, for whenever a
view wants it.

## 20. Six components deleted rather than adapted

**Chosen:** delete `hades-dashboard`, `achievement-list`, `collection-filter`,
`achievement-detail`, `search-box`, `next-steps-panel` and
`lib/achievement-filter`.

**Alternative:** keep them behind the new shell.

**Why:** each is built on the collection axis — its props, its grouping and its
state are "which collection, which section". The new structure asks "which
subject, which capability". Keeping them would leave two answers to the same
question in one application, and the tests would go on asserting the old one.

`requirement-tree`, `transfer-controls`, `state-controller`, the store and
`@hades/ui` all carried over unchanged.

## 21. A rank gets a bounded stepper, not a checkbox

**Chosen:** `fact-row` dispatches on the fact's own `kind`. A number fact with
a `max` renders `<input type="number">` clamped to that max; everything else
renders `hd-checklist-item`.

**Alternative:** the first pass, which rendered all 692 facts as a checkbox and
toggled a number fact between 0 and its max.

**Why:** a review found it and it was the defect that would have hurt most. 96
of 692 facts are ranks. As a checkbox, four of seven Nectar with Zeus reads as
untouched, and the next tick overwrites the stored 4. `AGENTS.md` records this
as a defect that already destroyed a stored rank once, and I reintroduced it in
the file that replaced the component carrying the guard.

It also broke the reason the redesign exists. The Hearts column could only read
0/7 or 7/7, so sorting it ascending was not an Ambrosia queue.

## 22. `hd-toggle`, not `toggle`

**Chosen:** listen for `hd-toggle`, the event `hd-checklist-item` documents on
its first line and dispatches.

**Why:** I bound `@toggle` in two components, so **680 of 692 facts could not
be recorded**. The box ticked and the value vanished on the next render. The
only writes that worked were the twelve weapon ticks, which use a hand-rolled
button.

Worse, three tests covered that path by dispatching a synthetic `toggle` event
the application never fires. They passed while no player could reach the
handler, and one of them was the test written specifically to guard the rank
trap above. **A test that constructs the event under test proves only that the
handler exists.** Every one of them now clicks the real control.

## 23. A subject's Codex section is looked up by id, never by name

**Chosen:** `codex:${subject.id}`, falling back to the display name for the six
weapons whose subject id is their true name.

**Why:** two Codex entries are named "Chaos" — the deity in Chthonic Gods and
the realm in The Underworld. A name-keyed `Map` keeps the last, so Chaos the
god was filed as a realm. `AGENTS.md` records this trap by name.

## 24. A filter narrows the default population, it does not replace it

**Chosen:** every chip except All and Foes counts within the non-foe view.

**Why:** counting across all 73 characters gave "Fightable · 42" beside
"All · 34", and clicking it surfaced 37 bare foes the default view hides on
purpose. A count larger than the whole is a count of something else.

## 25. The Weapons table does not sort, and that is deliberate

**Chosen:** no sort controls on the six weapon rows.

**Alternative:** mark Aspects and Daedalus sortable, as the preview does.

**Why:** sorting earns its place when a list is too long to scan and the order
answers a question. The spec names that question for Characters — Hearts
ascending is the Ambrosia queue — and names none for Weapons. Six rows are on
screen at once with no scrolling, so the eye does the sort. The preview marked
those headers sortable while demonstrating the table pattern; it is not one of
the owner's decisions.

The two headers carry `cursor: help` and a dotted underline, so they read as
"explain", not "click to sort". No false affordance.

## 26. A row is a row, and the name cell carries the affordance

**Chosen:** `<tr tabindex="0">` with a `<button>` in the name cell, and Enter
on the row when the row itself has focus.

**Alternative:** the first pass, `<tr role="link" aria-label="Open Zeus">`.

**Why:** a review found both halves of that wrong. `role="link"` overrides the
implicit `role="row"`, which orphans the six cells, and a link takes its name
from `aria-label`, so the row announced "Open Zeus, link" and the Hearts,
Keepsake, Boons and Favor values were never read. The comparison table stopped
being one for exactly the reader who most needs it to be.

And the row's `keydown` treated Space as activation, which is the native
activation key of the tick buttons inside the row. A keyboard user pressing
Space on Escaped navigated to the weapon page and recorded nothing — the
owner's original complaint, reproduced by the fix meant to make rows reachable.
The handler now ignores any event that did not start on the row itself.

## 27. A rejected entry must not stay on screen

**Chosen:** `live()` on the stepper's value, plus a `requestUpdate()` after
emitting.

**Why:** a property binding dirty-checks against the last committed value, not
against the DOM. Typing 99 into a rank stored at 7 clamps to 7, which is what
was already there, so `facts` never changes, nothing re-renders, and the field
goes on reading "99 / 7". `live()` compares against the live DOM — but only if
an update runs, which is why both are needed.

## 28. A rank is rounded as well as clamped

**Chosen:** `step="1"` on the input and `Math.round` before the clamp.

**Why:** the clamp bounded the range and never touched precision, so `2.7`
passed straight through to IndexedDB and into the export file. The index then
drew three filled pips beside a stored 2.7 — the store and the view disagreeing
again, which is the class of defect this whole phase kept producing. A rank
counts gifts or levels; 2.7 is not a smaller 3, it is not a value.

The browser already knew: `validity.valid` was false the whole time. Nothing
was asking it.

## 29. The row is not a focus stop; the name cell is

**Chosen:** `<tr>` keeps its click handler for the mouse and nothing else. The
button in the name cell is the only focus stop in a row.

**Why:** leaving `tabindex="0"` on the row after the button took over the job
made every row two stops — 68 in the Characters table — and one of them was a
focusable element with no role and no accessible name, which announces nothing
when it receives focus.
