# Hades Prophecy Tracker — Slice 2 Implementation Plan (Codex and affinity)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track all 119 Codex entries, grouped by section, and turn affinity into a counter so that one Nectar gift advances the prophecy, the keepsake and the Codex heart at once.

**Architecture:** One schema addition (`section`), one data migration (affinity from boolean to numeric), one UI change (filter by collection, group by section). No new packages.

**Tech Stack:** unchanged. See `AGENTS.md`.

## Scope rule for this project

Set by the project owner and binding from here on:

> Anything that needs sub-items, or needs actions from the player to achieve,
> must be listed.

So a system is in scope when the player must *do* something to complete it, even
when no prophecy asks for it. Depth is not optional. What stays out is run-scoped
state, which is not progress at all — see `docs/domain-model.md`, section 1.

## Global Constraints

`AGENTS.md` is binding — conventions, boundaries, and the traps list.
`docs/domain-model.md` is the domain reference; read section 4 (shared actions)
and section 5 (affinity) before touching data.

- Source of truth: `https://hades.fandom.com/wiki/`. It returns HTTP 402 to
  WebFetch; read it through the real browser.
- Never write an entry from memory. Copy names exactly.
- Do not copy Codex prose into the repository. Store the entry name and its
  section only. The prose is Supergiant's and the wiki's CC BY-NC-SA does not
  cover it.
- One commit per task, English messages.

## Verified counts

Codex: 119 entries. Chthonic Gods 10, Olympian Gods 9, Others of Note 10,
The Underworld 7, Infernal Arms 6, Perilous Foes 37, Artifacts 16,
River Denizens 18, Fables 6.

---

### Task 1: Add `section` to the achievement schema

**Files:**
- Modify: `packages/schema/src/achievement.ts`
- Test: `packages/schema/test/schema.test.ts`

A collection is a flat list today. 119 Codex entries in one list is unusable, and
the sections are meaningful in the game.

**Interfaces:**
- Produces: `Achievement` gains `section?: string`, validated with the same slug
  shape as a collection id. Absent means the entry has no section, which is the
  case for every existing prophecy.

- [ ] **Step 1: Write the failing tests** — an achievement with a valid section parses; one with a malformed section is rejected; one with no section still parses.
- [ ] **Step 2: Add the optional field.** Nothing else changes. Every existing entry stays valid, so no data migration is needed for this step.
- [ ] **Step 3:** Run `corepack pnpm --filter @hades/schema test`, then commit.

---

### Task 2: Affinity becomes a counter

**Files:**
- Modify: `packages/data/src/prophecies/facts.json`
- Modify: `packages/data/src/prophecies/achievements.json`
- Test: `packages/data/test/integrity.test.ts`

This is the change that makes the Codex worth building. Read
`docs/domain-model.md` section 5 first.

Today `nectar:<character>` is a boolean, because the only consumer is a prophecy
asking for a single gift. Codex hearts need the count.

**Migration safety, stated so nobody worries mid-task:** stored progress holds
`{"nectar:zeus": true}`. `numericValue` reads `true` as `1`, and `isSatisfied`
treats any positive number as met. A boolean value already saved therefore still
satisfies `atLeast 1` after the change. No transfer-format version bump, and no
data loss. Confirm this by reading `packages/engine/src/facts.ts` rather than
trusting this paragraph.

- [ ] **Step 1: Collect the heart counts.** For all 26 Nectar-eligible characters, get the number of hearts on the Codex entry from the wiki. The range is 5 to 10 and it differs per character. Every value must come from a page you loaded. Where a character's heart count cannot be established, leave that character boolean and list them in your report.
- [ ] **Step 2: Convert the 11 existing facts** to `kind: "number"` with `max` set to that character's hearts. Change every requirement that references them to `atLeast 1`, preserving the current meaning exactly.
- [ ] **Step 3: Add the 15 missing characters** as numeric affinity facts. They have no consumer yet; Task 4 will reference them, so expect the orphan-fact check to fail until then. Coordinate: add them in the same commit as the Codex entries that use them, or relax nothing — do not weaken the integrity test to get around this.
- [ ] **Step 4:** Run the data tests. Report the new sharing distribution.

---

### Task 3: Collection filter and section grouping

**Files:**
- Create: `apps/web/src/components/collection-filter.ts`
- Modify: `apps/web/src/components/achievement-list.ts`
- Modify: `apps/web/src/components/hades-dashboard.ts`
- Test: `apps/web/test/collection-filter.browser.test.ts`

**Interfaces:**
- `<collection-filter .collections=${Collection[]} .selected=${string | undefined}>` firing `collection-select` with `detail: { id: string | undefined }`, where `undefined` means all.
- `achievement-list` groups by `section` when entries carry one, and renders a flat list when they do not.

- [ ] **Step 1: Write the failing browser tests.** Cover: one control per collection plus "All"; the selection is exposed to assistive technology, not signalled by colour alone; entries with a section render under a section heading; entries without a section render flat, exactly as today; a section group can be collapsed and its state does not leak between sections.
- [ ] **Step 2: Implement.** Filter first, then search, so a query narrows within the chosen collection. Opening an entry and coming back preserves the filter, the query and the collapse state.
- [ ] **Step 3:** Run the web suite and the build, then commit.

---

### Tasks 4 to 9: the Codex sections

Each task adds one or two sections, runs `corepack pnpm --filter @hades/data test`, and commits.

Every entry is one achievement in the `codex` collection with its `section` set.
Every entry gets a boolean fact `codex:<slug>` meaning the entry is unlocked.

A character entry that shows hearts gets, in addition, an `atLeast` node over
that character's affinity fact from Task 2. **Reuse those ids. Never create a
second affinity fact for a character who already has one.**

- [ ] **Task 4:** Chthonic Gods (10) and Olympian Gods (9). Every entry here is a character, so this is where the affinity reuse from Task 2 is exercised. Report the reuse count.
- [ ] **Task 5:** Others of Note (10) and Fables (6). The Fables are the six Companions, which the dataset does not have yet — create `companion:<slug>` facts and record the Ambrosia prerequisite chain in the labels.
- [ ] **Task 6:** The Underworld (7) and Infernal Arms (6). The Infernal Arms entries must reuse the existing `weapon:*` facts where they describe the same action.
- [ ] **Task 7:** Artifacts (16).
- [ ] **Task 8:** River Denizens (18). Create one `fish:<species>` fact per species. The existing `fish:caught` counter stays as it is — it serves a different prophecy and is not replaced.
- [ ] **Task 9:** Perilous Foes (37). The largest and most mechanical. Reuse the existing `miniboss:*` facts where an entry names the same foe.

---

### Task 10: The remaining depth

The project owner asked for every system that needs actions to be listed, not
only the ones a prophecy names.

- [ ] **Step 1: Hidden aspect levels.** Six aspects have their Temple of Styx clear tracked but not their level. Add level facts for them, matching the shape of the 18 named aspects: numeric, `max: 5`.
- [ ] **Step 2: Keepsake ranks.** 25 keepsakes rank up at 25 and 50 encounters equipped. Add a numeric rank fact per keepsake, `max: 3`. Hermes' final Codex heart requires his keepsake at rank 3, so wire that dependency where the Codex entry needs it.
- [ ] **Step 3: The two missing keepsakes.** The dataset holds 23 of 25. Identify which two are absent — the wiki notes two obtainable only after the main story — and add them.
- [ ] **Step 4:** Run everything, then commit.

---

## Verification checklist for the slice

- [ ] `pnpm lint`, `typecheck`, `test` and `build` pass at the root.
- [ ] All 119 Codex entries are present, each with its section, across the 9 sections.
- [ ] Affinity is numeric for every character whose hearts could be established, and giving Nectar advances the prophecy and the Codex entry from one tick.
- [ ] The sharing distribution is recorded and is materially higher than the 2 facts it stood at before this slice.
- [ ] The filter narrows by collection, sections group and collapse, and both survive opening an entry.
- [ ] No Codex prose appears anywhere in the repository.
- [ ] Any character or entry left out is listed with its reason.
