# Phase 3 plan: build the interface

**Goal:** `apps/web` serves the structure in `docs/refactor/phase-3-spec.md`,
on the real dataset.

**Read first:** the spec, then `docs/preview/index.html`, which is the
reference. `AGENTS.md` is binding, especially the traps list — six of its
entries are Lit and layout defects this application already paid for once.

## Constraints

- `main` deploys on push, so the branch merges only when the built site works.
- Phase 1 and 2 changed no component. This phase changes almost all of them.
- The engine gets no new functions. If a view seems to need one, that is a
  signal the view is asking the wrong question.
- One commit per task, English messages.

## What survives

| Keep | Why |
| --- | --- |
| `@hades/ui`: `hd-card`, `hd-checklist-item`, `hd-progress` | generic, no game knowledge, and slice 4 fixed real defects in them |
| `theme.css`, `applyDesignTokens`, `colorVar` | the token discipline `AGENTS.md` requires |
| `state-controller.ts`, the IndexedDB store, `transfer-controls.ts` | persistence is unaffected by the axis change |
| `requirement-tree.ts` | a prophecy's sub-items still render as a requirement tree |

## What is replaced

`hades-dashboard`, `achievement-list`, `collection-filter`, `achievement-detail`
and `search-box` are built on the collection axis. The new structure is by
subject, and no amount of prop-passing turns one into the other.

`next-steps-panel` is the open question: the new Characters index answers "what
next" by sorting, which is what the owner actually does. Decide in task 1
whether it survives, and record the decision.

## Task 1: the shell and the frozen page

**Files:** rewrite `hades-dashboard.ts`; create `app-shell.ts`, `app-nav.ts`;
test `apps/web/test/shell.browser.test.ts`.

- [ ] Write the failing browser tests first: five tabs in the spec's order;
      the active tab is exposed to assistive technology, not by colour alone;
      **`scrollHeight - clientHeight === 0` on every page at 1440px and at
      390px**; the header and footer stay put while an inner region scrolls.
- [ ] Build the shell: `body` a fixed-height flex column, `main` with
      `width: 100%` so `.wrap`'s auto margins do not collapse it.
- [ ] Route between index and detail without a sixth tab.
- [ ] Decide the fate of `next-steps-panel` and record it in `decisions.md`.

## Task 2: the Characters index

**Files:** create `character-table.ts`; test
`apps/web/test/character-table.browser.test.ts`.

- [ ] Failing tests: one row per character; a column sorts and re-sorts;
      sorting by Hearts ascending puts the lowest affinity first; a filter chip
      narrows and its count comes from the data; a tick toggles the fact and
      **does not** open the row; the tick is reachable by keyboard.
- [ ] Build it from `subjectsOfType(dataset, 'character')` and
      `subjectProgress`.
- [ ] Counts on the chips are computed, never written down.

## Task 3: the character page

**Files:** create `character-page.ts`, `capability-block.ts`; test
`apps/web/test/character-page.browser.test.ts`.

- [ ] Failing tests: Zeus shows Boons, Theseus does not; Theseus shows Combat;
      no empty block renders; the roll-up counts facts and its label says so;
      a fact's description appears on hover **and on keyboard focus**; a
      `spoiler` fact hides its label until a click.
- [ ] Dispatch each block on `subjectCapabilities`.
- [ ] **Dispatch a requirement control on the fact's own `kind`**, never on the
      node shape. `AGENTS.md` records this as a defect that destroyed a stored
      rank.

## Task 4: the Weapons index and page

**Files:** create `weapon-table.ts`, `weapon-page.ts`; test
`apps/web/test/weapon.browser.test.ts`.

- [ ] Failing tests: six rows; the aspect pips read the fact's `max`, not 5
      hard-coded; a header tooltip opens **downwards** and is not clipped;
      Milestones renders before Aspects; Stygius shows 21 facts and the others
      20.
- [ ] Reuse the table from task 2 if it generalises; do not force it if not.

## Task 5: the rail

**Files:** create `rail-view.ts`; test `apps/web/test/rail.browser.test.ts`.

- [ ] Failing tests: selecting a rail item swaps the pane and only the pane;
      the rail and the pane scroll independently; the page still does not
      scroll; below 860px the rail sits above the pane; a prophecy with one
      sub-item renders as one line.
- [ ] One component, three configurations: Fated List, The House, Collections.

## Task 6: the three rail pages

- [ ] Fated List from the 55 prophecies.
- [ ] The House from the six systems, with the Contractor and the Well as shops.
- [ ] Collections from fish, artifacts, boons by type, companions. **No Codex.**

## Task 7: search

**Files:** adapt `search-box.ts`; test.

- [ ] Failing tests: a query narrows the current view; it survives opening and
      closing a detail; **a narrowed view opens rather than staying collapsed**,
      which slice 4 had to fix once already.

## Task 8: the whole-branch check

- [ ] `corepack pnpm exec turbo run lint typecheck test build --force`.
- [ ] Load the built site and walk all five sections plus three detail pages.
- [ ] Confirm `scrollHeight - clientHeight === 0` on every page at both widths.
- [ ] Confirm no horizontal overflow at 390px: `scrollWidth === innerWidth`.
- [ ] Import a progress file exported before the branch and confirm it loads.

## Done when

- [ ] The four checks pass on a forced run.
- [ ] The five sections match the spec, and a reviewer comparing the built site
      against `docs/preview/index.html` finds no structural difference.
- [ ] Stored progress from before the branch still loads.
- [ ] Every decision taken without asking is in `docs/refactor/decisions.md`.
