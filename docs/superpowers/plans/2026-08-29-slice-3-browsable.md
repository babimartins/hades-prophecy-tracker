# Slice 3 — Make every tracked system browsable

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give the ~300 facts that have no browsable home a collection of their own, so the user can open "Boons" or "Daedalus" and see what is left, instead of only meeting a fact inside the prophecy that needs it.

**Architecture:** No schema change, no new packages, no new sourcing for the bulk of it. Every entry is built from a fact that already exists and was already verified. Each new entry gives its fact a second consumer, which is the model working as intended.

## Global Constraints

`AGENTS.md` and `docs/domain-model.md` are binding. In particular:

- Reuse the existing fact. **Never create a second fact for an action that already has one.** This slice is almost entirely reuse; a high creation count means something went wrong.
- Entry names come from the source, not from prettifying a fact id. The fact label is a hint, not an authority.
- `hades.fandom.com` returns HTTP 402 to WebFetch. Use the real browser, create your own tab, and never close a tab.
- Commit per section or per batch, never hold a whole task uncommitted.
- One fact means one action. Do not pair an entry with a second fact that fires at the same instant.

## Current unbrowsable families

| Namespace | Facts | Destination |
| --- | --- | --- |
| `boon` | 149 | `boons` collection |
| `blessing` / `curse` | 25 | `boons` collection, Chaos sections |
| `daedalus` | 72 | `daedalus` collection, sectioned by weapon |
| `wellofcharon` | 26 | `well-of-charon` collection |
| `talent` | 24 | `mirror` collection |
| `pact` | 15 | `pact` collection |
| `perk` | 11 | folded into `mirror` or its own, decide from the source |

---

### Task 1: the boons collection

**Files:** `packages/data/src/boons/{achievements,facts}.json`, `collections.json`, `src/index.ts`, integrity test if needed.

174 entries: 111 standard boons sectioned by god, 28 duo, 10 legendary, 12 Chaos blessings, 13 Chaos curses.

- [ ] **Step 1** Read every `boon:*`, `blessing:*` and `curse:*` fact. Confirm the counts above against the data before writing anything; report any disagreement rather than adjusting silently.
- [ ] **Step 2** Build the sections. A god's section holds that god's standard boons. Duo, legendary, blessings and curses each get their own section.
- [ ] **Step 3** Each entry requires exactly its existing fact. No new facts. Verify entry names against the god's own wiki page — the fact labels were written for a different purpose and may abbreviate.
- [ ] **Step 4** Run `corepack pnpm --filter @hades/data test`. Report the sharing distribution before and after.

### Task 2: the daedalus collection

72 entries, sectioned by weapon, 12 per weapon. Each requires its existing `daedalus:<weapon>:<upgrade>` fact.

Remember `docs/domain-model.md` section 1: the hammer is a run item, the enchantment is permanent. These entries are the enchantments.

### Task 3: mirror, pact and perks

- `mirror`: 24 `talent:*` facts. The Mirror of Night pairs its talents; if the source presents them in pairs, use sections.
- `pact`: 15 `pact:*` facts, each a rank. An entry is complete at that condition's maximum rank — take the maximum from the source, they are not uniform.
- `perk`: 11 facts. Establish from the source what these are and whether they belong with the Mirror or stand alone.

### Task 4: well of charon

26 `wellofcharon:*` facts. Establish from the source whether these are one-time purchases or repeatable, and model accordingly — a repeatable purchase is not a completion target.

---

## Verification checklist

- [ ] `pnpm lint`, `typecheck`, `test`, `build` pass at the root, forced, not cache-replayed.
- [ ] Every new entry reuses an existing fact. Report the creation count; it should be near zero.
- [ ] The sharing distribution rises sharply — most of these facts go from one consumer to two.
- [ ] The collection filter handles the new collections, and the "All" view still labels each one.
- [ ] No entry pairs a fact with a second fact that fires at the same moment.
