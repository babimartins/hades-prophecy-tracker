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
asserting on a `hd-progress` caption through it silently reads an empty string.

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

## Game data

`packages/data` is the one place where being wrong is worse than being late.
A bad requirement tells a player to do the wrong thing for hours.

- Never write a name, description or requirement from memory.
- Every entry traces to a page fetched in the same session.
- `hades.fandom.com` returns HTTP 402 to automated fetchers. That is anti-bot
  blocking, not an outage. Read the pages through the real browser instead.
- If a requirement is ambiguous, leave the entry out and say so. A missing
  entry is cheap.
- Prophecies and platform achievements are separate collections with separate
  counts. The in-game Fated List holds 55 entries. The wiki's Achievements page
  lists 50, while Steam shows 49 publicly.

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
