import type { Achievement, Dataset, Fact, Subject, SubjectId, SubjectType } from '@hades/schema'
import { collectFactIds, isSatisfied, numericValue, type FactMap } from './facts.js'

/**
 * What a subject offers. A capability follows from the namespaces of the
 * subject's facts, so it is never stored. A stored list would be a second
 * source of truth: add a boon fact for a god who had none and the stored list
 * is silently wrong, while a derived one is right by construction.
 *
 * The interface labels are not capabilities. "Olympian" is `boons` plus type
 * `character`; "Fightable" is `combat`. The engine reports the capability and
 * the interface chooses the word.
 */
export const CAPABILITY_BY_NAMESPACE: Readonly<Record<string, string>> = {
  codex: 'codex',
  meet: 'introduction',
  nectar: 'affinity',
  boon: 'boons',
  blessing: 'boons',
  curse: 'boons',
  keepsake: 'keepsake',
  /**
   * `companion` will mean two opposite things once phase 2 adds the givers.
   * `companion:battie` already names Battie, so she derives "is a companion".
   * The same fact will also name Megaera, who derives "gives a companion" from
   * the same namespace. The engine cannot tell them apart from the namespace
   * alone; the interface must read the subject's type and its other
   * capabilities to choose the word.
   */
  companion: 'companion',
  combat: 'combat',
  encounter: 'combat',
  miniboss: 'combat',
  talk: 'dialogue',
  invite: 'invite',
  favor: 'quest',
  workorder: 'quest',
  lounge: 'quest',
  lyre: 'quest',
  aspect: 'aspect',
  daedalus: 'enchant',
  weapon: 'acquire',
  escape: 'escape',
  artifact: 'collect',
  catch: 'catch',
  reach: 'reach',
  pet: 'pet',
  spend: 'shop',
}

/**
 * Namespaces that name a game system or an aggregate counter rather than
 * something a subject owns. Their facts carry an empty `subjects` list, so
 * they never reach a subject page, and they have no capability by design.
 *
 * Listed rather than left implicit: `subjectProgress` counts a fact in `total`
 * and skips its capability bucket when the namespace is unmapped, which would
 * make the breakdown quietly stop summing to the whole.
 */
export const NAMESPACES_WITHOUT_CAPABILITY: readonly string[] = [
  'pact',
  'talent',
  'perk',
  'wellofcharon',
  'contractor',
  'fish',
  // A platform trophy is awarded by Steam, not owned by anything in the game.
  'achievement',
]

export function capabilityOf(factId: string): string | undefined {
  return CAPABILITY_BY_NAMESPACE[factId.split(':')[0] ?? '']
}

export function subjectsOfType(dataset: Dataset, type: SubjectType): Subject[] {
  return dataset.subjects.filter((subject) => subject.type === type)
}

/**
 * Every fact tagged with the subject, in dataset order.
 *
 * A fact with an empty `subjects` names a game system on purpose, and a fact
 * with no `subjects` key has no established owner yet. Neither belongs to any
 * subject, so both are absent from every result.
 */
export function subjectFacts(dataset: Dataset, subjectId: SubjectId): Fact[] {
  return dataset.facts.filter((fact) => fact.subjects.includes(subjectId))
}

/** The capabilities the subject's own facts imply, in first-seen order. */
export function subjectCapabilities(dataset: Dataset, subjectId: SubjectId): string[] {
  const found: string[] = []
  for (const fact of subjectFacts(dataset, subjectId)) {
    const capability = capabilityOf(fact.id)
    if (capability && !found.includes(capability)) found.push(capability)
  }
  return found
}

export interface FactCount {
  /** Facts fully met. */
  done: number
  /** Facts started but short of their threshold. */
  partial: number
  /** Facts in the group. */
  total: number
  /** `done / total`, and 0 when the group is empty. */
  ratio: number
}

export interface SubjectProgress extends FactCount {
  byCapability: Record<string, FactCount>
}

/**
 * Counts the subject's **facts**, where `overallProgress` counts
 * **achievements**. A subject page lists actions, and an action is a fact.
 * The two numbers are not comparable, and the names say so on purpose.
 *
 * A number fact counts as done only at its `max`. Without a `max` any positive
 * value counts, which matches `isSatisfied`.
 */
export function subjectProgress(
  dataset: Dataset,
  subjectId: SubjectId,
  facts: FactMap,
): SubjectProgress {
  const byCapability: Record<string, FactCount> = {}
  let done = 0
  let partial = 0
  let total = 0

  for (const fact of subjectFacts(dataset, subjectId)) {
    const state = factState(fact, facts)
    total += 1
    if (state === 'done') done += 1
    else if (state === 'partial') partial += 1

    const capability = capabilityOf(fact.id)
    if (!capability) continue
    const bucket = (byCapability[capability] ??= { done: 0, partial: 0, total: 0, ratio: 0 })
    bucket.total += 1
    if (state === 'done') bucket.done += 1
    else if (state === 'partial') bucket.partial += 1
  }

  for (const bucket of Object.values(byCapability)) {
    bucket.ratio = ratioOf(bucket.done, bucket.total)
  }

  return { done, partial, total, ratio: ratioOf(done, total), byCapability }
}

/**
 * The subjects an achievement's facts name, without repeats, in first-seen order.
 *
 * Both indexes are memoised per dataset. A list view calls this once per row,
 * and rebuilding a 692-entry map on every call turns a phone render into a
 * scan of hundreds of thousands of comparisons.
 *
 * **The caller must treat a `Dataset` as immutable once it has been passed
 * here.** Editing a fact object in place is seen, because the index holds
 * references. Replacing, pushing to or splicing `dataset.facts` or
 * `dataset.subjects` on an instance this function has already seen is not, and returns a stale
 * answer. Build a new dataset object instead; `packages/data` builds one once,
 * and every test mints a new one with a spread or a structuredClone.
 */
export function subjectsOfAchievement(dataset: Dataset, achievement: Achievement): Subject[] {
  const { factById, subjectById } = indexesFor(dataset)
  const found: Subject[] = []
  for (const factId of collectFactIds(achievement.requirement)) {
    for (const id of factById.get(factId)?.subjects ?? []) {
      const subject = subjectById.get(id)
      if (subject && !found.includes(subject)) found.push(subject)
    }
  }
  return found
}

interface DatasetIndexes {
  factById: Map<string, Fact>
  subjectById: Map<SubjectId, Subject>
}

const indexCache = new WeakMap<Dataset, DatasetIndexes>()

function indexesFor(dataset: Dataset): DatasetIndexes {
  const cached = indexCache.get(dataset)
  if (cached) return cached
  const built: DatasetIndexes = {
    factById: new Map(dataset.facts.map((fact) => [fact.id, fact])),
    subjectById: new Map(dataset.subjects.map((subject) => [subject.id, subject])),
  }
  indexCache.set(dataset, built)
  return built
}

type FactState = 'todo' | 'partial' | 'done'

/**
 * A number fact with no `max` has no completion threshold, so any positive
 * value reads as done, matching `isSatisfied` and the rest of the engine.
 * `partial` is unreachable for such a fact, on purpose. The data package
 * rejects a number fact with no `max`, so this only reaches a hand-written
 * fixture, and the test suite pins the behaviour so it cannot drift silently.
 */
function factState(fact: Fact, facts: FactMap): FactState {
  if (fact.kind === 'number' && fact.max !== undefined) {
    const value = numericValue(fact.id, facts)
    if (value >= fact.max) return 'done'
    return value > 0 ? 'partial' : 'todo'
  }
  return isSatisfied(fact.id, facts) ? 'done' : 'todo'
}

function ratioOf(done: number, total: number): number {
  return total === 0 ? 0 : done / total
}
