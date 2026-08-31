# Phase 1 plan: the subject axis

**Goal:** the schema, the data and the engine can express "which facts belong to
Zeus" and "what does Zeus offer". The interface does not change.

**Read first:** `docs/refactor/mapping.md` for the shapes and the counts,
`AGENTS.md` for the conventions and the traps list.

## Constraints

- `main` deploys on push. `apps/web` must keep compiling and its 99 tests must
  keep passing. Phase 1 adds capability; it removes nothing.
- Every new field is optional, so the dataset stays valid through every commit.
- No wiki reading. Every rule here is provable from data already committed.
- One commit per task, English messages.

## Task 1: the subject schema

**Files:** create `packages/schema/src/subject.ts`; modify `index.ts`,
`dataset.ts`; test `packages/schema/test/schema.test.ts`.

- [ ] Write the failing tests: a valid subject parses; each of the four types
      parses; a fifth type is rejected; a malformed id is rejected.
- [ ] Add `subjectSchema` with `id`, `name`, `type`, optional `description` and
      `spoiler`. The id uses the same slug shape as a collection id.
- [ ] Add `subjects: Subject[]` to `datasetSchema`, defaulting to an empty array
      so an existing dataset object still parses.
- [ ] Run `pnpm --filter @hades/schema test`, then commit.

## Task 2: the new optional fields

**Files:** modify `packages/schema/src/fact.ts`, `achievement.ts`,
`collection.ts`; same test file.

- [ ] Write the failing tests: a fact with `subjects` parses; a fact with an
      empty `subjects` parses; a fact with no `subjects` parses; `description`
      and `spoiler` parse on a fact; `spoiler` parses on an achievement;
      `description` parses on a collection.
- [ ] Add the fields. Nothing becomes required.
- [ ] Run the schema tests, then commit.

## Task 3: the 119 subjects

**Files:** create `packages/data/src/subjects.json`; modify
`packages/data/src/index.ts`; test `packages/data/test/integrity.test.ts`.

The roster is the Codex. Build it from `codex/achievements.json` so it cannot
disagree with what is already committed.

- [ ] Generate one entry per Codex achievement: id is the slug, name is the
      entry name, type comes from the section, using the table in
      `mapping.md` section 2.
- [ ] Apply the weapon alias so the six weapons carry their true name:
      `stygian-blade` is `stygius`, `eternal-spear` is `varatha`,
      `shield-of-chaos` is `aegis`, `heart-seeking-bow` is `coronacht`,
      `twin-fists` is `malphon`, `adamant-rail` is `exagryph`.
- [ ] Spread `subjects` into `dataset`.
- [ ] Add integrity tests: 119 subjects; no duplicate id; the type counts are
      72 characters, 34 collectibles, 7 regions, 6 weapons.
- [ ] Run the data tests, then commit.

**Note:** generate once, review the output, commit the JSON. The JSON becomes
the source of truth. Do not commit a generator that could later overwrite a
hand-verified entry.

## Task 4: tag the 507 provable facts

**Files:** modify every `packages/data/src/*/facts.json`; same test file.

Apply only the rules in `mapping.md` section 4. A fact the rules cannot resolve
gets **no** `subjects` key, so the gap stays visible.

- [ ] Resolve the second segment against the roster.
- [ ] Apply the weapon alias, the `dire-` strip, and the system-namespace rule.
- [ ] Leave the 105 untagged. Do not guess.
- [ ] Add integrity tests: every id inside a `subjects` array exists in the
      roster; the 80 system facts carry an **empty** array, not merely a
      present one, so "no subject on purpose" and "not done yet" stay
      distinguishable; exactly 105 facts carry no `subjects` key; every one of
      the 119 subjects is named by at least one fact.
- [ ] Run the data tests. Report the counts, then commit.

## Task 5: capabilities and subject queries

**Files:** create `packages/engine/src/subjects.ts`; modify `index.ts`; test
`packages/engine/test/subjects.test.ts`.

- [ ] Write the failing tests first, over a fixture, not over the real dataset:
      a subject with facts in two namespaces reports both capabilities; a
      subject with no facts reports none; `subjectProgress` counts facts and not
      achievements; a fact tagged with two subjects counts once for each; a
      number fact part way to its `max` counts as partial, not done.
- [ ] Implement `subjectsOfType`, `subjectFacts`, `subjectCapabilities`,
      `subjectProgress`, `subjectsOfAchievement`.
- [ ] Keep the namespace-to-capability map in one exported constant, so the
      interface can name capabilities without repeating the mapping.
- [ ] Run the engine tests, then commit.

## Task 6: the whole-branch check

- [ ] `corepack pnpm exec turbo run lint typecheck test build --force`, with no
      cache. Report the real numbers.
- [ ] Confirm `apps/web` changed by exactly one line, the empty-catalog default
      in `next-steps-panel.ts`, and that no component behaviour changed.
- [ ] Confirm the built site still loads and the dashboard still works.

## Done when

- [ ] The four checks pass on a forced run.
- [ ] 119 subjects, 507 tagged facts, 80 empty, 105 untagged, and the integrity
      test asserts each number.
- [ ] `apps/web` differs from `main` by one line only.
- [ ] Every count in this plan matches what the test asserts. A number that
      drifted is a defect, not a rounding difference.
