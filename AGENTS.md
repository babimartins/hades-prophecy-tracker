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

**Annotate requirement literals. Never use `as const`.**
`as const` produces readonly tuples, which are not assignable to the mutable
array inside `RequirementChild`. Write `const node: RequirementChild = {...}`.
Vitest transpiles without type checking, so the test still runs and the error
only appears in `pnpm typecheck`.

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

**Run `pnpm typecheck` at the root after merging parallel branches.**
Two branches can each be green alone and red together. That is how the
`as const` failure above reached `main`: one branch added the test file, another
added the config that first type-checked it.

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

## Working method

- Write the failing test first. Run it. Watch it fail for the reason you expect.
- Tests assert real behaviour. A test that cannot fail is not coverage.
- Keep commits scoped to one change, with an English message.
- Match the surrounding code. Do not restructure code outside your task.
