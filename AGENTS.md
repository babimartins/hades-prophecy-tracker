# Agent guide

Conventions for this repository. Read this before you change code.

`CLAUDE.md` points here. Keep the rules in this file only, so the two cannot
drift apart.

## Layout

| Path              | Responsibility                                           |
| ----------------- | -------------------------------------------------------- |
| `packages/schema` | Data model and Zod validation. The source of truth for types. |
| `packages/engine` | Pure evaluation of requirements against facts.            |
| `packages/data`   | Curated game data as JSON, plus its integrity test.       |
| `packages/ui`     | Generic Lit web components. No game knowledge.            |
| `apps/web`        | The application. Owns persistence and the dashboard.      |

Boundaries are enforced by review, not by a tool:

- `packages/engine` imports no DOM type and no I/O module. Pure functions only.
- `packages/ui` imports neither `@hades/schema` nor `@hades/data`. A component
  that knows what a prophecy is belongs in `apps/web`.
- `apps/web` is the only package that knows both the domain and the DOM.

## Environment

- Node 22. Use the version in `.nvmrc`.
- pnpm only. Never run `npm install` or `yarn`.
- If a bare `pnpm` is not on PATH, use `corepack pnpm`. Turborepo needs a real
  `pnpm` binary, so root scripts can fail where per-package commands work.

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build

pnpm --filter @hades/engine test    # one package
```

## TypeScript

- Strict mode. `any` is not allowed in committed code.
- ES modules only. Every relative import ends with `.js`, including in tests.
- Internal packages resolve to their TypeScript source, not to `dist`. Their
  `main`, `types` and `exports` all point at `./src/index.ts`. Vite and Vitest
  compile the source, so no build step is needed before a filtered test run.
- Every package with tests carries a `tsconfig.test.json` that extends its
  `tsconfig.json`, covers `src` and `test`, and emits nothing. The package
  `typecheck` script runs both projects. Without it `tsc` never reads the test
  files, and a `@ts-expect-error` in a test becomes a dead annotation.

## Traps that already cost time

Each of these was a real defect in this repository. Do not reintroduce them.

**Annotate requirement literals. Never write one with `as const`.**
`as const` produces readonly tuples, which are not assignable to the mutable
array inside `RequirementChild`. Write `const node: RequirementChild = {...}`.
Vitest transpiles without type checking, so the test still runs and the error
only appears in `pnpm typecheck`.

This rule is about requirement literals only. `as const` elsewhere is fine —
`packages/ui/src/tokens.css.ts` uses it on the colour map, where no readonly
array reaches `RequirementChild`. A reviewer read the old wording as a blanket
ban, which it was never meant to be.

**Rank next steps from `evaluate().missing`, never from a raw fact walk.**
Walking the tree with `collectFactIds` and filtering with `isSatisfied` looks
equivalent and is not. It drops a partially met `atLeast` fact, because any
positive number counts as satisfied. It also keeps the redundant siblings of an
`any` branch that is already complete.

**Clear the DOM in Lit tests with Lit.**
Use ``render(html``, document.body)`` in `beforeEach`. Setting
`document.body.innerHTML = ''` corrupts lit-html's render bookkeeping, and the
next `render()` throws `ChildPart has no parentNode`.

**Name browser tests `*.browser.test.ts`.**
`apps/web/vitest.config.ts` splits into a `node` and a `browser` project by that
suffix alone: the browser project includes it and runs under headless Playwright
chromium, and the node project must keep excluding it. A plain `*.test.ts` runs
in node and fails the moment it touches the DOM.

**Read text across a shadow boundary with a composed walk, not `textContent`.**
`Element.textContent` never crosses into a child component's shadow root, so
asserting on a `fact-row` label through it silently reads an empty string.

**Keep `useDefineForClassFields` set to `false`.**
Lit class fields break when it is true.

**Route every `ProgressState` write through the `#enqueue` chain.**
`#applyFact` copies `#facts` before writing, so two unserialized calls each
build from a stale snapshot and the second silently drops the first's fact.
Serializing also settles callers in call order, so a later success cannot clear
an earlier failure's error before it is shown. Keep new mutators as thin
wrappers over a private `#apply*` method.

**Read colour tokens with `colorVar`, imported from `@hades/ui`. Never
type a `var(--hd-color-*, #hex)` fallback by hand, and never redeclare one on
`:host`.** `packages/ui/src/tokens.css.ts` holds the only hand-typed copy of
the five hex values. Every other consumer — inside `@hades/ui` and inside
`apps/web` alike — calls `colorVar('--hd-color-name')` instead of retyping
`var(--hd-color-name, #hex)`, so a value change in `tokens.css.ts` reaches
every consumer without a matching hand-edit anywhere else. A design pass
that hand-edits a dozen files in lockstep to change one colour is the exact
failure this rule exists to prevent; if `colorVar` cannot reach a file — it
is plain CSS, not a Lit `css` template — say so in a comment next to the
literal instead of leaving the drift unexplained. `apps/web/src/theme.css`
is the one such file today. A literal `:host { --hd-color-*: ... }` always
beats an inherited `:root` value, so it silently breaks a consumer override.
`apps/web` applies the tokens via `applyDesignTokens`, which appends a
`<style>` element — an inline style on `documentElement` would block a
page-level override too.

**Run `pnpm typecheck` at the root after merging parallel branches.**
Two branches can each be green alone and red together. That is how the
`as const` failure above reached `main`: one branch added the test file, another
added the config that first type-checked it.

**Make a fixture's `atLeast` threshold differ from the fact's `max`.**
A test where the two are equal cannot tell a bound-confusion bug from correct
code: clamping to either value produces the same result. `aspect:stygius:zagreus`
has `max: 5` and is used at `atLeast 5` in one prophecy and `atLeast 1` in
another, and only a fixture with mismatched numbers catches a component that
clamps to the wrong one.

**Queue the initial load inside `ProgressState`, never run it outside `#enqueue`.**
A write issued before an unqueued load resolves reads the default empty
`#facts`, and the write-first save order then persists that one-fact map over
the stored one, discarding it in both IndexedDB and memory. Make the load
itself the first operation in the queue, so a first-paint write waits behind
it instead of racing it.

**Dispatch a requirement control on the fact's own `kind`, never on the node shape.**
The same fact appears as an `atLeast` node in one tree and a plain child in
another, so shape-based dispatch renders a `number` fact as `hd-checklist-item`,
which can only emit a boolean — and `#applyFact` reads `false` as delete and
`true` as 1, silently destroying a stored rank. `requirement-tree.ts` and
`next-steps-panel.ts` both need this guard; adding a control to one means
checking the other.

**Scroll a newly shown view after one animation frame, never inside the same
tick.** A `scrollIntoView` called the instant `updated()` fires measures a
near-empty element, because child components render themselves a microtask
later — the scroll lands short, and `theme.css`'s `overflow-anchor: none`
guards against the browser undoing even a correct scroll once that content
grows in afterward. Waiting one animation frame (which always runs after every
microtask-scheduled update has settled) fixes both. Assert the target's real
`rect.top`, not `top < innerHeight` — a 24px sliver at the very bottom edge of
the viewport satisfies that and let the bug through review once already.

**A view scrolled to the top needs either real room below it, or nothing tall
above it.** A browser cannot scroll an element's top flush with the viewport
top when the document does not extend at least one more viewport-height past
that point — a short `achievement-detail` (a handful of steps) is often
shorter than the viewport, and sits last in the document with nothing after
it. `min-height: 100dvh` on the wrapper is a correct, minimal fix wherever
something tall stays above the target (the list view, below the header
cards) — the reserved space exactly equals what flush-scrolling requires, no
more. It is the wrong fix where nothing needs to stay above the target: for
the detail view, `hades-dashboard.ts` hides the header cards outright while
an entry is open, so there is no long scroll — and no reserved void — needed
at all.

**A custom element's `:host` needs an explicit `display`, and a CSS grid
item needs `min-width: 0`, or one nowrap descendant can scroll the whole page
sideways.** The custom-element default is `display: inline`; hd-checklist-item
had no override, and a `white-space: nowrap` label inside it (added for
next-steps-panel, reached requirement-tree too — see the fact-kind-dispatch
rule above) sized the *host itself* to the label's full, unclamped
min-content width, not the width its flex layout would otherwise have
shrunk it to. A `repeat(auto-fit, minmax(260px, 1fr))` grid track then grew
to fit — even though the track's own minimum was an explicit 260px, not
`auto`, a grid item's automatic minimum size (its own content-based
minimum, from `min-width: auto`) is a separate mechanism layered underneath
and is not overridden by the track's `minmax()` on its own. Fix at both
ends: `:host { display: block }` on the component, and `min-width: 0` on
whatever sits directly in the grid. A component-level test in an isolated
`render()` call did not reproduce this — the failure needs the real grid
context to show up; test it where the grid actually is.

## Game data

`packages/data` is the one place where being wrong is worse than being late.
A bad requirement tells a player to do the wrong thing for hours.

- Never write a name, description or requirement from memory.
- Every entry traces to a page fetched in the same session.
- `hades.fandom.com` returns HTTP 402 to automated fetchers. That is anti-bot
  blocking, not an outage. Read the pages through the real browser instead.
- **Read the wiki as wikitext, with `?action=raw`.** The rendered page hides its
  tables behind JavaScript tabs, so they extract as empty text. Append
  `?action=raw` to any wiki URL and the browser returns the source, complete and
  untabbed. Verified working on 2026-08-31.
- **`{{CustomTabs|tab1 = Hades|tab2 = Hades II}}` at the top of the wikitext means
  the page carries both games.** Take only the Hades I section. The River
  Denizens page already put three Hades II fish into this dataset once.
- If a requirement is ambiguous, leave the entry out and say so. A missing
  entry is cheap.
- Prophecies and platform achievements are separate collections with separate
  counts. The in-game Fated List holds 55 entries. There are 50 platform
  achievements: 49 ordinary ones, plus a 50th for earning all 49. Steam shows
  only 49 publicly because the 50th is hidden. The two sources never disagreed.

Fact ids are namespace first, then target: `invite:zeus`,
`aspect:varatha:zagreus`, `pact:extreme-measures`. Lower case, hyphens inside a
segment, colons between segments.

One fact means one action in the game. Never one fact standing for a whole
achievement. **Reuse an existing fact id when two entries need the same
action** — shared facts are the entire point of the model, and they are what
lets one checkbox advance several entries at once.

The integrity test in `packages/data` rejects duplicate ids, unknown fact
references, orphan facts, unknown collections, and a number fact with no `max`.
Run it after every batch of data.

**A subject id may carry its namespace, so `<namespace>-<segment>` is a real
resolution rule.** A companion's Codex entry is "Companion Battie", so its
subject id is `companion-battie` while its fact id is `companion:battie`.
Resolving only the second segment leaves the fact untagged, which makes the
`companion` capability unreachable and reports the companion as complete from
its Codex entry alone. Six facts need this rule and nothing else does.

**Name every fact namespace in either `CAPABILITY_BY_NAMESPACE` or
`NAMESPACES_WITHOUT_CAPABILITY`.** `subjectProgress` counts a fact in `total`
and skips its capability bucket when the namespace is in neither, so the
per-capability breakdown silently stops summing to the whole. Two tests guard
this: the sum over all 120 real subjects, and the namespace-to-capability map
pinned entry by entry. Membership alone is not enough — re-pointing `catch` to
`collect` keeps every sum valid while a fish reads "Collect".

**A test over the real dataset can collapse into a tautology.** "Counts each
fact once per subject" was `summed === tagged`, true by construction while no
fact carries two subjects. Cover the behaviour in a fixture that has the shape,
and let the dataset test assert only what the dataset can prove.

**`Number.isFinite` on a guarded ratio cannot fail**, and neither can a
divide-by-zero test where no input reaches zero. `ratioOf` guards
`total === 0`, and every real subject owns at least one fact, so only the
engine fixture can cover that path. Assert the invariant that could break.

**Deleting a key is not the same as setting it to `undefined`.** A test that
writes `fact.subjects = undefined` creates the key, so it never covers the
absent-key shape. `subjects` is required now, so the schema test asserts the
deletion throws; the distinction still matters for any field that is optional.

**Read the file back after a scripted edit.** A patch script that throws part
way writes nothing, and an earlier success line says nothing about the final
state. Two claimed test rewrites reached a commit message without reaching the
file. Grep for the new text, or run the mutation that should now fail.

**A label-derived check cannot prove a name was verified.** When entry names are
built from facts that already exist, comparing the entry name against the fact
label always agrees — that is equally what careful sourcing and silent
label-stripping produce. The comparison is worth running, but only a direct
check against the page distinguishes the two. Spot-check a handful against the
source and say which ones.

A Codex entry carries a `section` slug naming its in-game table, and its
requirement is an `all` whose first member is the entry's own `codex:<slug>`
unlock fact. **Model a compound wiki condition as one fact per action.** "Finish
the favor and then give Ambrosia" is the favor's steps plus a separate
`companion:*` fact, never a single fact standing for the pair; the integrity
test cannot catch a chain collapsed into one node.

**One wiki name can be two subjects in two sections.** Chaos is a deity in
Chthonic Gods and a realm in The Underworld. Keep the display `name` as the wiki
writes it and qualify the id instead — `codex:chaos` and `codex:chaos-realm` —
so the duplicate-id check stays meaningful rather than being satisfied by a
rename that hides one entry behind the other.

**When two wiki pages disagree on a name, the subject's own page wins.** A god's
boon page beats the Fated List, which is an aggregating checklist. Fix the
`label` and leave the fact id alone — ids key stored user progress, so a
`stubborn-bolts` id keeping a "Stubborn Roots" label is correct, not a mistake.

**A new collection is wired in three places.** Register it in
`collections.json`, then spread both its `facts.json` and its
`achievements.json` into `dataset` in `packages/data/src/index.ts`. A collection
that adds no facts still ships an empty `facts.json` and still gets spread —
`aspect` does, because all 24 entries reuse existing `aspect:<weapon>:<name>`
facts at a second threshold. Nothing fails loudly if you spread the facts and
forget the achievements.

**A collection id need not match its fact namespace, and must not be "fixed" to.**
`well-of-charon` is the collection, `wellofcharon:*` the facts; `workorder:*` is
the same shape. The hyphen rule above governs new ids only — these predate it and
key stored user progress, so renaming them to agree silently discards a player's
saved checkboxes.

## Working method

- Write the failing test first. Run it. Watch it fail for the reason you expect.
- Tests assert real behaviour. A test that cannot fail is not coverage.
- Keep commits scoped to one change, with an English message.
- Match the surrounding code. Do not restructure code outside your task.

### A trophy that is a threshold over a pool is a `count` node

Four platform trophies read as one action and are not: "Choose 100 different
Olympian Boon effects", "Choose 50 different Daedalus Hammer enchantments",
"Pay for 50 jobs from the House Contractor", "Fulfill any 15 Prophecies". The
first pass gave each a fact of its own. Each was an opaque checkbox hiding work
the dataset already held.

Build the pool **by collection, not by id prefix**.
`contractor:renovation-tasks` carries the `contractor:` prefix and is the
prophecy's 0-30 counter, not one of the 164 jobs. A prefix filter counted it as
one job instead of 30. The canary that pins how many number facts reach a plain
requirement child caught it, by moving from 15 to 16.

A trophy whose pool the interface already lists in full shows its roll-up and
one line naming where the items live. Printing the pool twice cost 845 rows in
one pane and told the player nothing new.

### Read a row's state against the entry, not against the fact

`factState` takes an optional target. Pass it wherever an entry is the context:
`factTargets(achievement.requirement)` gives the target per fact.

Without it, 297 rows read as partly done when they were finished. The trap is
that the fact and the entry disagree on purpose. The same 25 keepsakes back
Something From Everyone at `atLeast 1` and Friends Forever at `atLeast 3`, and
one stored rank of 1 must render differently under each.

The displayed number is always the real rank out of the gauge's own size. Never
substitute the target for it. Print the target only when it is neither 1 nor
the max, which is true of three rows in the whole dataset.

### Bronze is progress, gold is done, and a full bar must turn gold

`--hd-color-accent` is bronze `#b57433`: the bar fill, the pips, the active
tab, the selected rail item, a price, an "unlocks N" count.
`--hd-color-done` is gold `#d8b34a`, and nothing else uses it.

The two are one warm scale. **A bar that reaches its total must carry the done
colour**, or a finished entry and a nearly finished one look identical and only
the number tells them apart. That was true of the whole app until it was
noticed on screen: the only component that painted the full state was
`hd-progress`, which nothing had used since phase 3 and which is now deleted.

A new accent must clear 4.5:1 on both `#150e19` and `#241627` **and** stay at
least 1.8 from the gold. Those pull against each other: the brighter, calmer
candidates all sit near the gold's luminance. `packages/ui/test/tokens.test.ts`
holds the floors.

### Check hue, not only contrast

Every pair in the palette passed AA while the secondary text still read as
dusty gold, because all four foreground colours sat between 30 and 44 degrees
on a background at 278. Contrast cannot see that.

The rule now: quiet colours take the background's hue, loud ones stay warm.
Secondary text sits within 30 degrees of the surface and more than 90 from the
accent and the gold. The accent and the gold stay within 30 of each other,
because they are one scale. `packages/ui/test/tokens.test.ts` pins all of it.

### A rank is pips up to ten, and one slider, not ten buttons

`fact-row` draws a rank of ten or less as clickable pips and anything larger as
a typed field. `PIP_LIMIT` holds the boundary; 94 of the 103 counted facts sit
below it.

The pip group carries `role="slider"` with `aria-valuenow`, and the pips
themselves are spans. **Do not make them buttons.** Ten buttons per row is ten
tab stops per row, and a button nested inside a control is what swallowed the
Space key on the Characters table once already.

Any test that reaches for `input[type="number"]` now needs to know which
control the fact gets. `pet:cerberus` stops at 20 and keeps the field, so the
clamp and rounding guards live there.

### No backticks inside a `css` template literal

A backtick in a comment ends the template. It has broken the build twice, both
times in a comment quoting a CSS selector. Write the selector plain.

### Never set `display` on another component's host from outside

An outer rule beats the component's own `:host`. `rail-view` declares
`:host { display: grid; grid-template-columns: 290px minmax(0, 1fr) }`, and a
`display: flex` written on `rail-view` from a parent silently deleted the
column: the rail rendered 119px wide against the 290px every other section
gets. Set only the properties the parent owns, which are the flex or grid child
properties, never the child's own layout mode.
