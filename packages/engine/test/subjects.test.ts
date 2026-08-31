import type { Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_BY_NAMESPACE,
  subjectCapabilities,
  subjectFacts,
  subjectProgress,
  subjectsOfAchievement,
  subjectsOfType,
} from '../src/index.js'

const dataset: Dataset = {
  collections: [{ id: 'codex', name: 'Codex' }],
  subjects: [
    { id: 'zeus', name: 'Zeus', type: 'character' },
    { id: 'athena', name: 'Athena', type: 'character' },
    { id: 'stygius', name: 'Stygian Blade', type: 'weapon' },
    { id: 'tartarus', name: 'Tartarus', type: 'region' },
  ],
  facts: [
    { id: 'nectar:zeus', label: 'Affinity with Zeus', kind: 'number', max: 7, collection: 'codex', subjects: ['zeus'] },
    { id: 'boon:zeus:lightning-strike', label: 'Lightning Strike', kind: 'boolean', collection: 'codex', subjects: ['zeus'] },
    { id: 'boon:duo:lightning-phalanx', label: 'Lightning Phalanx', kind: 'boolean', collection: 'codex', subjects: ['zeus', 'athena'] },
    { id: 'aspect:stygius:zagreus', label: 'Aspect of Zagreus', kind: 'number', max: 5, collection: 'codex', subjects: ['stygius'] },
    { id: 'pact:hard-labor', label: 'Hard Labor', kind: 'number', max: 5, collection: 'codex', subjects: [] },
    { id: 'keepsake:thunder-signet', label: 'Thunder Signet rank', kind: 'number', max: 3, collection: 'codex' },
  ],
  achievements: [
    {
      id: 'codex:zeus',
      name: 'Zeus',
      description: 'Max affinity with Zeus.',
      collection: 'codex',
      requirement: {
        kind: 'all',
        of: [{ kind: 'atLeast', fact: 'nectar:zeus', value: 7 }, 'boon:duo:lightning-phalanx'],
      },
    },
  ],
}

describe('subjectsOfType', () => {
  it('returns only the subjects of that type', () => {
    expect(subjectsOfType(dataset, 'weapon').map((s) => s.id)).toEqual(['stygius'])
    expect(subjectsOfType(dataset, 'character').map((s) => s.id)).toEqual(['zeus', 'athena'])
  })

  it('returns an empty list for a type nobody has', () => {
    expect(subjectsOfType(dataset, 'collectible')).toEqual([])
  })
})

describe('subjectFacts', () => {
  it('returns every fact tagged with the subject', () => {
    expect(subjectFacts(dataset, 'zeus').map((f) => f.id)).toEqual([
      'nectar:zeus',
      'boon:zeus:lightning-strike',
      'boon:duo:lightning-phalanx',
    ])
  })

  it('counts a fact tagged with two subjects once for each of them', () => {
    expect(subjectFacts(dataset, 'athena').map((f) => f.id)).toEqual([
      'boon:duo:lightning-phalanx',
    ])
  })

  it('never returns a system fact, whose subject list is empty on purpose', () => {
    const everyTagged = dataset.subjects.flatMap((s) => subjectFacts(dataset, s.id))
    expect(everyTagged.map((f) => f.id)).not.toContain('pact:hard-labor')
  })

  it('never returns a fact whose subject nobody has established yet', () => {
    const everyTagged = dataset.subjects.flatMap((s) => subjectFacts(dataset, s.id))
    expect(everyTagged.map((f) => f.id)).not.toContain('keepsake:thunder-signet')
  })

  it('returns nothing for a subject with no facts', () => {
    expect(subjectFacts(dataset, 'tartarus')).toEqual([])
  })
})

describe('subjectCapabilities', () => {
  it('reports one capability per namespace the subject owns', () => {
    expect(subjectCapabilities(dataset, 'zeus')).toEqual(['affinity', 'boons'])
  })

  it('folds the three boon namespaces into one capability', () => {
    expect(CAPABILITY_BY_NAMESPACE.boon).toBe('boons')
    expect(CAPABILITY_BY_NAMESPACE.blessing).toBe('boons')
    expect(CAPABILITY_BY_NAMESPACE.curse).toBe('boons')
  })

  it('reports none for a subject with no facts', () => {
    expect(subjectCapabilities(dataset, 'tartarus')).toEqual([])
  })

  it('reports the weapon capabilities a character can never have', () => {
    expect(subjectCapabilities(dataset, 'stygius')).toEqual(['aspect'])
  })
})

describe('subjectProgress', () => {
  it('counts facts, not achievements', () => {
    // Zeus owns three facts and one achievement. A subject page lists actions,
    // so the unit is the fact.
    const result = subjectProgress(dataset, 'zeus', {})
    expect(result.total).toBe(3)
  })

  it('treats a number fact part way to its max as partial, not done', () => {
    const result = subjectProgress(dataset, 'zeus', { 'nectar:zeus': 4 })
    expect(result.done).toBe(0)
    expect(result.partial).toBe(1)
    expect(result.ratio).toBeCloseTo(0)
  })

  it('counts a number fact at its max as done', () => {
    const result = subjectProgress(dataset, 'zeus', { 'nectar:zeus': 7 })
    expect(result.done).toBe(1)
    expect(result.partial).toBe(0)
  })

  it('counts a boolean fact as done when true', () => {
    const result = subjectProgress(dataset, 'zeus', { 'boon:zeus:lightning-strike': true })
    expect(result.done).toBe(1)
    expect(result.ratio).toBeCloseTo(1 / 3)
  })

  it('breaks the count down by capability', () => {
    const result = subjectProgress(dataset, 'zeus', { 'boon:zeus:lightning-strike': true })
    expect(result.byCapability.boons).toEqual({ done: 1, total: 2, partial: 0, ratio: 0.5 })
    expect(result.byCapability.affinity).toEqual({ done: 0, total: 1, partial: 0, ratio: 0 })
  })

  it('reports zero for a subject with no facts, without dividing by zero', () => {
    const result = subjectProgress(dataset, 'tartarus', {})
    expect(result).toMatchObject({ done: 0, total: 0, ratio: 0 })
  })
})

describe('subjectsOfAchievement', () => {
  it('returns the subjects its facts name, without repeats', () => {
    expect(subjectsOfAchievement(dataset, dataset.achievements[0]!).map((s) => s.id)).toEqual([
      'zeus',
      'athena',
    ])
  })
})
