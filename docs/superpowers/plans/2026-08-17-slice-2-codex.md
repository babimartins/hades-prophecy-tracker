# Hades Prophecy Tracker — Slice 2 Implementation Plan (Codex)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track the 119 Codex entries alongside the 55 prophecies, and let the user browse one collection at a time.

**Architecture:** No new packages. The Codex is a second collection in `@hades/data`. The engine, storage, detail view and search already work for any collection. The only application change is a collection filter, because a flat list of 174 rows is unusable.

**Tech Stack:** unchanged. See `AGENTS.md`.

## Global Constraints

`AGENTS.md` at the repository root is binding — conventions, boundaries, and the "Traps that already cost time" list. Every task inherits it. In addition:

- Source of truth for entry names and sections: `https://hades.fandom.com/wiki/Codex`, tables 0 to 8.
- `hades.fandom.com` returns HTTP 402 to WebFetch. Read it through the real browser.
- Never write an entry from memory. Copy names exactly.
- Do not copy Codex prose into the repository. The entry text is Supergiant's, not wiki-authored, and the repository's CC BY-SA attribution does not cover it. Store the entry NAME and its section only.
- One commit per task, English messages.

## Verified source counts

| Section | Entries |
| --- | --- |
| Chthonic Gods | 10 |
| Olympian Gods | 9 |
| Others of Note | 10 |
| The Underworld | 7 |
| Infernal Arms | 6 |
| Perilous Foes | 37 |
| Artifacts | 16 |
| River Denizens | 18 |
| Fables | 6 |
| **Total** | **119** |

Counted from the live page by the controller. Re-verify per section as you build it.

## Data model decision

Each Codex entry is one achievement in a new `codex` collection.

- Every entry gets a boolean fact `codex:<slug>` — the entry is unlocked.
- A character entry that shows hearts also gets a numeric fact for affinity, with an `atLeast` node. The in-game hearts range from 5 to 10 depending on the character, so the fact's `max` is per character and must come from the source, not from a guess.
- **Affinity facts reuse the existing `nectar:*` ids where one already exists.** The dataset already holds 11 of them. Giving Nectar to a character must advance both the prophecy that needs it and that character's Codex entry, from a single tick. This is the sharing the model exists for, and this slice is where it finally pays off.

Where the hearts maximum for a character cannot be established from a page you actually loaded, model that entry as unlocked-only and list it in your report.

---

### Task 1: Codex collection and the first section

**Files:**
- Modify: `packages/data/src/collections.json`
- Create: `packages/data/src/codex/facts.json`
- Create: `packages/data/src/codex/achievements.json`
- Modify: `packages/data/src/index.ts`
- Modify: `packages/data/test/integrity.test.ts`

**Interfaces:**
- Consumes: `validateDataset` from `@hades/schema`, `collectFactIds` from `@hades/engine`.
- Produces: the `codex` collection inside the exported `dataset`, with the 10 Chthonic Gods entries.

- [ ] **Step 1: Extend the loader and the integrity test**

Add the `codex` collection to `collections.json`. Load the two new JSON files in `src/index.ts` and concatenate them into the validated dataset, following the pattern the prophecy files already use.

The integrity test currently asserts on the whole dataset. Confirm every existing assertion still holds with two collections carrying entries, and add one: every fact id starting with `codex:` belongs to an entry in the `codex` collection. Run it and watch it pass before you add data.

- [ ] **Step 2: Build the 10 Chthonic Gods entries**

Load `https://hades.fandom.com/wiki/Codex` in the browser. Table index 0 is Chthonic Gods. Take the entry names from the links in that table.

For each of the ten, create `codex:<slug>` as a boolean fact and one achievement whose requirement is that fact.

- [ ] **Step 3: Add affinity to the character entries that have hearts**

For each of the ten, establish from its own wiki page whether the character accepts Nectar and how many hearts the entry holds. Then:

- If a `nectar:<character>` fact already exists in `packages/data/src/prophecies/facts.json`, reuse that id. Do not create a second one.
- If the character accepts Nectar but has no fact yet, create one following the existing naming.
- Give the entry an `all` requirement over the unlock fact and an `atLeast` node on the affinity fact at its hearts maximum.

Report every id you reused. Reuse is the point of this step.

- [ ] **Step 4: Verify and commit**

Run `corepack pnpm --filter @hades/data test`. The near-duplicate-label guard and the sharing distribution both matter here: the distribution must now show facts referenced twice. Report the new distribution.

```bash
git add packages/data
git commit -m "feat(data): add the codex collection with the chthonic gods entries"
```

---

### Task 2: Collection filter in the dashboard

**Files:**
- Create: `apps/web/src/components/collection-filter.ts`
- Modify: `apps/web/src/components/hades-dashboard.ts`
- Test: `apps/web/test/collection-filter.browser.test.ts`

**Interfaces:**
- Produces: `<collection-filter .collections=${Collection[]} .selected=${string | undefined}>`, firing `collection-select` with `detail: { id: string | undefined }`, where `undefined` means every collection.

The dashboard currently renders `searchAchievements(dataset, this.query)` as one flat list. With the Codex loaded that is 174 rows.

- [ ] **Step 1: Write the failing browser test**

Cover: one control per collection plus an "All" control; the selected one is marked as such for assistive technology, not by colour alone; selecting fires the event with the collection id; selecting "All" fires it with `undefined`.

- [ ] **Step 2: Implement the component and wire it**

The filter renders above the list. The dashboard holds the selected collection in reactive state and applies it to the list, composing with the existing search rather than replacing it. Filter, then search, so a query narrows within the chosen collection.

Opening an entry and returning must preserve both the filter and the query.

- [ ] **Step 3: Verify and commit**

Run the web suite and `corepack pnpm --filter @hades/web build`.

---

### Tasks 3 to 6: the remaining sections, in batches

Each task adds one group of sections, then runs `corepack pnpm --filter @hades/data test` and commits. Same rules as Task 1: names from the live page, no prose, reuse existing fact ids, report what you reused and what you left out.

- [ ] **Task 3:** Olympian Gods (9) and Others of Note (10). Both are character-heavy, so this is where affinity reuse matters most. The `nectar:*` facts for the Olympians already exist.
- [ ] **Task 4:** The Underworld (7), Infernal Arms (6), Fables (6). The Infernal Arms entries should reuse the existing `weapon:*` facts where they describe the same action.
- [ ] **Task 5:** Artifacts (16) and River Denizens (18). The fish overlap with the existing `fish:*` facts.
- [ ] **Task 6:** Perilous Foes (37). The largest and the most mechanical. Several overlap with the existing `miniboss:*` facts.

---

## Verification checklist for the slice

- [ ] `pnpm lint`, `typecheck`, `test` and `build` pass at the root.
- [ ] The dataset holds all 119 Codex entries across the 9 sections, plus the 55 prophecies.
- [ ] Giving Nectar to a character advances both the prophecy that needs it and that character's Codex entry, from one tick.
- [ ] The sharing distribution shows a meaningful number of facts referenced more than once. Record the figure.
- [ ] The collection filter narrows the list, composes with search, and survives opening and closing an entry.
- [ ] No Codex prose appears anywhere in the repository.
