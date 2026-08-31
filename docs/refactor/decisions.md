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

## 30. `requirement-tree` is deleted, not kept

**Chosen:** delete the component and its 13 tests.

**Alternative:** keep it. Decision 20 said it "carried over unchanged".

**Why:** it carried over into nothing — no file in `src/` imported it, so it
shipped in the bundle unreachable while its tests went on passing. Dead code
with a green test suite is worse than no code: it reads as covered.

Its one irreplaceable part, the bounded rank stepper, now lives in `fact-row`
with the comment explaining why the control dispatches on the fact's own
`kind`. Its other part, rendering a nested `all`/`any`/`count` tree, is not
what the approved design asks for: a prophecy pane is a flat list of actions
with one line stating a `count` node's rule, which is what the preview shows.

## 31. A section summary is computed once, not per render

**Chosen:** hoist the character counts to module scope.

**Why:** `buildRows({})` walks 73 characters, calling `subjectFacts`,
`subjectProgress` and `subjectCapabilities` on each — every one a filter over
692 facts — and `isFoe` calls `subjectCapabilities` again per row. Measured at
25ms per shell render on the Characters tab, against 0.2ms on The House, to
produce the number 34. It is called with an empty fact map, so the answer is a
dataset constant.

## 32. The Contractor was never the owner's deferral, and it is 171 items

**Corrected.** Three documents and a merge commit said the House Contractor
stock was "deferred by her choice". What she said was *"de primeira n busca oq
ta faltando nn, vamo so mapeando antes"* — not yet, map first. The mapping was
phase 1 and phase 2 was "buscar os dados faltantes". I turned a "not yet" into
a permanent deferral and then attributed the choice to her.

The estimate was wrong too. I had written "~28 missing items". The Contractor
sells **171**, across six rooms.

**Chosen:** one `contractor` collection, with each item's room in `section`,
the same mechanism the Codex and the boons already use for their in-game
tables.

**Why rooms and not one list:** the wiki keeps six separate tables and the game
sells from six separate menus. One 171-line pane would bury the 37 Work Orders,
which are the only purchases that unlock a character's story.

## 33. Seven ids are reused, not duplicated

**Chosen:** the five Work Orders and the two Lounge services keep the ids they
already had.

**Why:** those seven back nine Codex entries, five prophecies and Dusa's
favour. A second id for the same purchase would mean one action ticking two
boxes, which is the duplication `AGENTS.md` exists to prevent. 164 new facts,
seven reused, 171 achievements.

## 34. A cost is an amount and a currency, not a number

**Chosen:** `Fact.cost` is `{ amount, currency }`.

**Why:** the Contractor takes Gemstones for 110 purchases, Diamonds for 44, and
Ambrosia, Nectar or a Chthonic Key for the last four. A bare number would not
say which, and the shop view she asked for is a price list.

A first pass read the cost by pattern-matching the row for "number followed by
a currency", which found "+20 Obol" **inside a description** and called it the
price of an item that costs 3 Diamonds. The column is positional; the parser is
now too.

## 35. Four rugs are sold twice, so the label carries the room

**Chosen:** every Contractor label names its room — "Purchase Rug, Earthy for
the Lounge".

**Why:** the West Hall and the Lounge both sell an Earthy, Chthonic, Elysian
and Sanguine rug. They are different purchases with identical names, and the
integrity test that forbids two facts sharing a normalised label caught all
four.

## 36. Four Well wares stay uncosted, because a range is not an amount

**Chosen:** the Price of Midas, Life Essence, Tinge of Erebus and Gaea's
Treasure carry no `cost`.

**Why:** they are paid in Heart at a variable rate — the Price of Midas asks
10 to 50. `Fact.cost` holds one amount, so storing a number means storing a
wrong one. A missing price is cheap; a wrong price sends a player to a shop
they cannot afford. A test names all four and says why.

## 37. Two more stale claims, both mine, both corrected

`docs/refactor/phase-3-spec.md` §10 said "No shop prices. The schema has no
cost field." Both halves are now false, and were only true because I had not
done the work. 180 facts carry a price and the row shows it.

`docs/preview/index.html` still advertised "~28 items still missing" and
"Prices: deferred" on the Contractor card. The estimate was wrong by a factor
of six and the deferral was never the owner's.

The one out-of-scope claim that survives audit is the timestamp: she said
"vamo deixar o quando pra la, so valores ta bom".

## 38. The 50 platform trophies are data, not a placeholder

The owner said in this conversation that there are 50 trophies: 49 plus one for
completing the other 49. I wrote the number into three files and registered the
`achievement` collection with zero entries. That is the same mistake as the
House Contractor: an answer she gave me, filed as trivia instead of as work.

Harvested from `hades.fandom.com/wiki/Achievements`.

- 13 trophies restate a prophecy. Each takes that prophecy's own requirement,
  so the same actions satisfy both and there is no second checkbox.
- 10 more are expressed over facts that already exist.
- 26 need a new fact, in the `achievement:` namespace.
- 1 is God of Blood, which is the other 49.

Name collision caught during the work: the trophy `arms-collector` maps to
`prophecy:infernal-arms`, while the trophy *named* `infernal-arms` is about
aspects.

## 39. `achievement` is a namespace without a capability

A trophy is awarded by the platform. It belongs to no character, weapon,
collectible or region, so it joins `pact`, `talent`, `contractor` and `fish` in
`NAMESPACES_WITHOUT_CAPABILITY`.

## 40. God of Blood counts trophies, and reads last

Its requirement is the other 49 requirements, so `evaluate` sums every unit
inside them and returns 10283. The number is true and useless. The view counts
the trophies earned instead, and shows 0/49.

It also does not repeat its 207 distinct facts, because every one of them is
already listed under the trophy it belongs to. It shows one line saying where
its actions live.

The wiki lists it first. There its roll-up looks like the section total rather
than one more trophy, so the view sorts it last.

## 41. The trophies rail item counts a different unit, and says so

Every other rail item counts facts. This one counts trophies earned, because
that is what the player is asking. `rail-view` now prints the unit under the
bar whenever an item declares one, so two different units never look alike.

## 42. Four more trophies are derived, not new checkboxes

The first pass gave 26 trophies a fact of their own. A review of my own work
found five wrong.

- `blessed-by-the-gods` is 100 of the 149 boon facts.
- `tools-of-the-architect` is 50 of the 72 Daedalus facts.
- `home-makeover` is 50 of the 164 Contractor jobs.
- `had-to-happen` is any 15 of the 55 prophecies.

Each became a `count` node. Each was an opaque checkbox hiding work the
dataset already held, which is what the owner's rule forbids: anything that
needs sub-items must list them.

`skelly-slayer` ("Slay Skelly 15 times") and `day-or-night-trader` ("Trade 20
times") were booleans. Both are counts, so both became `number` facts with a
`max`. As booleans they read as untouched at 14, and the next tick would
overwrite the stored value. `AGENTS.md` records that defect.

22 trophies now have a fact of their own, not 26.

## 43. The Contractor pool is built by collection, not by id prefix

`contractor:renovation-tasks` carries the `contractor:` prefix but is the
prophecy's 0-30 counter, not one of the 164 jobs you buy. A prefix filter swept
it into `home-makeover`, where it would have counted as one job instead of 30.
Found by a canary that pins how many number facts reach a plain requirement
child: it moved from 15 to 16.

## 44. A trophy over a pool the app already lists says where the pool is

`had-to-happen` drew all 55 prophecies as 460 rows. With `home-makeover` (164),
`blessed-by-the-gods` (149) and `tools-of-the-architect` (72), one pane ran to
1129 rows.

Every one of those actions is already reachable: the Contractor rooms, the
Boons collection, the weapon pages, the Fated List. A second copy adds nothing.
Each of the five now shows its roll-up and one line naming where its items
live. The roll-up is the part that exists nowhere else: 0/50 of the 164 jobs.

The pane is 284 rows, and the largest single block is 25.

## 45. "Forge a bond" means a full affinity gauge

The Queen's Plan asks to "Forge a bond with any 6 of the 9 Olympians". This was
modelled as one Nectar for each of the nine, which read as complete after nine
gifts instead of after six full gauges.

The Epilogue Guide's Affinity Requirements section gives the figures: Zeus 7,
Poseidon 7, Athena 7, Aphrodite 7, Artemis 7, Ares 7, Dionysus 7, Hermes 8,
Demeter 6. Demeter is 6 where her gauge holds 7. Copy the source; do not tidy
it into a max.

The prophecy also asks to "See specific dialogue from Persephone, Hades, Zeus,
and Demeter", which was missing entirely. The guide names nine conversations
across those four people, so each person is a counter, not nine checkboxes.

## 46. A `count` node is explained wherever it sits, not only at the root

`rail-section` read only the root requirement to decide whether to print "Any 6
of these 9 satisfy it." The Queen's Plan now wraps its six-of-nine in an `all`
beside the dialogue, so the line vanished and the pane listed nine gods with no
statement that six are enough. The pane walks the whole tree now.

## 47. Dionysus was the only affinity gate missing

Every character with an affinity gauge has its last hearts locked behind a
named action, and 21 of the 22 were already in the dataset as `talk:` facts,
work orders, favors, `pet:cerberus` at 20, `spend:charons-shop` at 10000, or
`keepsake:lambent-plume` at 3.

Dionysus' gate is "forge bonds with at least 6 different characters, and gift
at least 10 Ambrosia to any number of characters". It needed a `count` of 6
over all 24 affinity gauges and a new `ambrosia:total-given` counter.

The wiki's per-character heart maximums were cross-checked against all 24
`nectar:` facts. 23 matched exactly. The 24th, Cerberus, only phrases it
differently on its page; the value matches too.

## 48. Skelly's three challenge statues are three actions, and two were missing

Skelly's page: "Skelly will add 3 covered statues to the southwest of the
courtyard which require you to complete runs at certain heat levels: 8, 16, and
32."

Only Heat 8 was in the dataset. Heat 16 existed as a checkbox labelled "Earn
the second of Skelly's prizes", which names the reward rather than the action,
so the player could not see what to do. Heat 32 was absent.

The third statue backs no trophy and no prophecy. Every fact must back an
achievement — an integrity test enforces it, and it caught the orphan — so the
three statues get a collection of their own. That is what they are in the game:
a closed list of three with three prizes.

Both trophies read "Earn the Nth of Skelly's prizes", so swapping which Heat
level each points at would change nothing visible. A test pins each one.

## 49. A wrong answer stood until Barbara asked a question about it

The first answer to the statues question said they were a reveal condition and
not a tracked step. It was reached by reading the Fated List's column headers,
which was the right method, and stopping there — Skelly's own page was never
opened. She asked whether the statues were the weapons being revealed. They are
not, but the question was enough to send the research back to a source that had
the answer.

Read the page for the thing itself, not only the page that mentions it.

## 50. A row's state is read against what the entry asks, not what the fact holds

301 requirement nodes ask for less than the fact's own max, and 297 of them ask
for exactly 1. "Something From Everyone" wants 25 keepsakes at `atLeast 1`,
while each keepsake's gauge holds 3, so a keepsake the player already owned
rendered amber with 1/3 beside it, as though two ranks were still owed.

Barbara picked the smallest of three designs offered. The number never changes:
it is always the rank actually held, out of the gauge's own size. Only the
tick moves, and it now reads against the entry's target.

The same keepsake at rank 1 is **done** under Something From Everyone and
**partial** under Friends Forever, which asks the same 25 at `atLeast 3`.

`factTargets` in the engine returns the target per fact. A plain child asks for
1, because `isSatisfied` counts a number fact above zero. A fact reached twice
takes the more demanding target: God of Blood reaches `pet:cerberus` at both 1
and 10.

Three rows in the whole app print a target, because theirs is neither 1 nor the
max: Cerberus at 10 of 20 pets, 18 of the 25 fish, and Demeter at 6 of her 7
hearts. An earlier draft printed one on every row; she rejected it.

A view with no entry behind it keeps the fact's own max. That is the subject
page, and the header's overall figure. The keepsake's own page still shows 1/3
as unfinished, because there the question is how far you took it.

## 51. Persephone gets a Codex entry, and the Codex holds 120

She was the only character with a keepsake and no affinity gauge, which is a
hole in the question the owner opens the app to answer: who gets the next
Ambrosia.

Her gauge is certain: 9 hearts, first Nectar earns the Pom Blossom, and the 6th
heart is locked until Zagreus assures her she is a good mother. Only the home
for it was in doubt, because every other affinity fact hangs off a Codex entry
and an earlier entry in `docs/domain-model.md` had settled that she has none.

That settlement read one source. Three others disagree: her page carries the
Codex prose, her page shows the gauge in the standard shape, and the Codex page
says the hearts live inside entries. The owner chose the three.

Her entry carries no section, because no source files her under one of the nine
headings and guessing would invent a fact.

Adding her also put her in the pool for Dionysus' last heart, which asks for
bonds with 6 different **characters**, not 6 Olympians.

Found by auditing an old plan document against the data: it said "26
Nectar-eligible characters" where the dataset held 24. The other missing one is
Bouldy, who can be gifted Nectar but "lacks an Affinity level", so he has
nothing to track.

## 52. A stale description survived four commits

`codex:dionysus` read "that gate is not yet wired" after the gate was wired.
Nothing tests description text against the requirement beside it, so it went
unnoticed until this audit read the file for another reason. Descriptions that
describe the state of the work rot; describe the game instead.
