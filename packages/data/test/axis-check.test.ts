import {
  CAPABILITY_BY_NAMESPACE,
  NAMESPACES_WITHOUT_CAPABILITY,
  subjectCapabilities,
  subjectFacts,
  subjectProgress,
  subjectsOfType,
} from '@hades/engine'
import { describe, expect, it } from 'vitest'
import { dataset } from '../src/index.js'

describe('the subject axis against the real dataset', () => {
  it('gives every weapon the same five capabilities', () => {
    const expected = ['acquire', 'aspect', 'codex', 'enchant', 'escape']
    for (const weapon of subjectsOfType(dataset, 'weapon')) {
      expect([weapon.id, subjectCapabilities(dataset, weapon.id).sort()]).toEqual([
        weapon.id,
        expected,
      ])
      expect(subjectFacts(dataset, weapon.id)).toHaveLength(19)
    }
  })

  it('gives Zeus the capabilities his tagged facts imply', () => {
    // `dialogue` is absent because the 18 `talk:` facts are among the 42 that
    // phase 2 still has to source. It appears once they carry a subject.
    expect(subjectCapabilities(dataset, 'zeus').sort()).toEqual([
      'affinity',
      'boons',
      'codex',
      'introduction',
      'invite',
      'keepsake',
    ])
  })

  it('keeps every capability bucket summing to the subject total', () => {
    // subjectProgress counts a fact in `total` and skips its capability bucket
    // when the namespace is in neither list. A per-capability breakdown would
    // then quietly stop summing to the whole, with no error anywhere. This runs
    // over all 119 real subjects, not a fixture, because the fixture only
    // covers five of the dataset's namespaces.
    for (const subject of dataset.subjects) {
      const progress = subjectProgress(dataset, subject.id, {})
      const summed = Object.values(progress.byCapability).reduce(
        (running, bucket) => running + bucket.total,
        0,
      )
      expect([subject.id, summed]).toEqual([subject.id, progress.total])
    }
  })

  it('maps each namespace to the capability it is meant to mean', () => {
    // Membership in one of the two lists is not enough: re-pointing
    // `catch` to `collect` or `miniboss` to `quest` keeps every sum valid and
    // every namespace classified, while a fish reads "Collect" and an Elite
    // foe reads "Quest". This pins the value, not just the presence.
    const derived: Record<string, string> = {}
    for (const fact of dataset.facts) {
      const namespace = fact.id.split(':')[0]!
      const capability = CAPABILITY_BY_NAMESPACE[namespace]
      if (capability) derived[namespace] = capability
    }
    expect(derived).toEqual({
      aspect: 'aspect',
      artifact: 'collect',
      blessing: 'boons',
      boon: 'boons',
      catch: 'catch',
      codex: 'codex',
      combat: 'combat',
      companion: 'companion',
      curse: 'boons',
      daedalus: 'enchant',
      encounter: 'combat',
      escape: 'escape',
      favor: 'quest',
      invite: 'invite',
      keepsake: 'keepsake',
      lounge: 'quest',
      lyre: 'quest',
      meet: 'introduction',
      miniboss: 'combat',
      nectar: 'affinity',
      pet: 'pet',
      reach: 'reach',
      spend: 'shop',
      talk: 'dialogue',
      weapon: 'acquire',
      workorder: 'quest',
    })
  })

  it('partly completes a capability bucket, rather than reporting nothing started', () => {
    // 49 tagged number facts can be partial: 24 nectar and 24 aspect plus one
    // more. A subject page reads these per capability, so the bucket counter
    // needs a non-zero assertion over real data, not only over a fixture.
    const zeus = subjectProgress(dataset, 'zeus', { 'nectar:zeus': 4 })
    expect(zeus.byCapability.affinity).toMatchObject({ done: 0, partial: 1, total: 1 })
    const stygius = subjectProgress(dataset, 'stygius', { 'aspect:stygius:zagreus': 2 })
    expect(stygius.byCapability.aspect).toMatchObject({ done: 0, partial: 1, total: 4 })
  })

  it('classifies every namespace in the dataset, not only the fixture ones', () => {
    const unclassified = [
      ...new Set(dataset.facts.map((fact) => fact.id.split(':')[0]!)),
    ].filter(
      (namespace) =>
        !(namespace in CAPABILITY_BY_NAMESPACE) &&
        !NAMESPACES_WITHOUT_CAPABILITY.includes(namespace),
    )
    expect(unclassified).toEqual([])
  })

  it('gives the six companions the capability their own facts imply', () => {
    // Each companion is a Codex Fable, so its roster id carries the namespace:
    // `companion:battie` belongs to `companion-battie`. Missing this made the
    // `companion` capability unreachable and reported Battie as complete for a
    // player who had only unlocked her Codex entry.
    const companions = dataset.subjects.filter((s) => s.id.startsWith('companion-'))
    expect(companions).toHaveLength(6)
    for (const companion of companions) {
      expect([companion.id, subjectCapabilities(dataset, companion.id).sort()]).toEqual([
        companion.id,
        ['codex', 'companion'],
      ])
    }
    expect(subjectProgress(dataset, 'companion-battie', { 'codex:companion-battie': true }))
      .toMatchObject({ done: 1, total: 2 })
  })

  it('gives each duo boon both of its gods', () => {
    // This is what the array was for. Every pair of the 8 boon-granting gods
    // has exactly one duo boon, so 28 facts carry two subjects and the pairs
    // must cover all 28 combinations without repeating one.
    const shared = dataset.facts.filter((fact) => (fact.subjects?.length ?? 0) > 1)
    expect(shared).toHaveLength(28)
    expect(shared.every((fact) => fact.id.startsWith('boon:duo:'))).toBe(true)

    const pairs = shared.map((fact) => [...fact.subjects!].sort().join('|'))
    expect(new Set(pairs).size).toBe(28)

    const gods = [...new Set(shared.flatMap((fact) => fact.subjects!))].sort()
    expect(gods).toEqual([
      'aphrodite',
      'ares',
      'artemis',
      'athena',
      'demeter',
      'dionysus',
      'poseidon',
      'zeus',
    ])
  })

  it('counts a shared fact once under each subject that names it', () => {
    // Summing per subject now exceeds the tagged count by exactly the 28 duo
    // boons, because each is reached from both of its gods. This is why a
    // dataset-wide total is computed once over the facts and never by summing
    // per-subject counts.
    const summed = dataset.subjects.reduce(
      (running, subject) => running + subjectFacts(dataset, subject.id).length,
      0,
    )
    const tagged = dataset.facts.filter((fact) => (fact.subjects?.length ?? 0) > 0)
    const tagInstances = tagged.reduce((running, fact) => running + fact.subjects!.length, 0)
    expect(tagged).toHaveLength(570)
    expect(summed).toBe(tagInstances)
    expect(summed).toBe(570 + 28)
  })
})
