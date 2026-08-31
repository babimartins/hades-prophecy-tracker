import { describe, expect, it } from 'vitest'
import type { Achievement, Dataset, Subject } from '../src/index.js'
import { validateDataset } from '../src/index.js'

const validDataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Fated List of Minor Prophecies' }],
  facts: [
    { id: 'nectar:dusa', label: 'Give Nectar to Dusa', kind: 'boolean', collection: 'prophecy', subjects: [] },
    {
      id: 'pact:extreme-measures',
      label: 'Extreme Measures',
      kind: 'number',
      max: 4,
      collection: 'prophecy',
      subjects: [],
    },
  ],
  subjects: [{ id: 'dusa', name: 'Dusa', type: 'character' }],
  achievements: [
    {
      id: 'prophecy:example',
      name: 'Example',
      description: 'An example prophecy.',
      collection: 'prophecy',
      requirement: {
        kind: 'all',
        of: ['nectar:dusa', { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 }],
      },
    },
  ],
}

describe('validateDataset', () => {
  it('accepts a valid dataset', () => {
    const result = validateDataset(validDataset)
    expect(result.achievements[0]?.name).toBe('Example')
  })

  it('rejects a fact id with a bad shape', () => {
    const bad = structuredClone(validDataset)
    bad.facts[0]!.id = 'Nectar Dusa'
    expect(() => validateDataset(bad)).toThrow()
  })

  it('rejects an unknown node kind', () => {
    const bad = structuredClone(validDataset)
    // @ts-expect-error deliberate invalid input
    bad.achievements[0].requirement = { kind: 'most', of: ['nectar:dusa'] }
    expect(() => validateDataset(bad)).toThrow()
  })

  it('rejects a count node without n', () => {
    const bad = structuredClone(validDataset)
    // @ts-expect-error deliberate invalid input
    bad.achievements[0].requirement = { kind: 'count', of: ['nectar:dusa'] }
    expect(() => validateDataset(bad)).toThrow()
  })

  it('accepts an achievement with a valid section', () => {
    const withSection = structuredClone(validDataset)
    withSection.achievements[0]!.section = 'olympus'
    const result = validateDataset(withSection)
    expect(result.achievements[0]?.section).toBe('olympus')
  })

  it('rejects an achievement with a malformed section', () => {
    const bad = structuredClone(validDataset)
    bad.achievements[0]!.section = 'Olympus Section'
    expect(() => validateDataset(bad)).toThrow()
  })

  it('accepts an achievement with no section', () => {
    const result = validateDataset(validDataset)
    expect(result.achievements[0]?.section).toBeUndefined()
  })

  it('lets a consumer omit section on an Achievement literal without a cast', () => {
    const achievement: Achievement = {
      id: 'prophecy:example',
      name: 'Example',
      description: 'An example prophecy.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['nectar:dusa'] },
    }
    expect(achievement.section).toBeUndefined()
  })
})

describe('subjects', () => {
  it('accepts each of the four types', () => {
    const types: Subject['type'][] = ['character', 'weapon', 'collectible', 'region']
    for (const type of types) {
      const data = structuredClone(validDataset)
      data.subjects = [{ id: 'stygius', name: 'Stygian Blade', type }]
      expect(validateDataset(data).subjects[0]?.type).toBe(type)
    }
  })

  it('rejects a fifth type', () => {
    const bad = structuredClone(validDataset)
    // @ts-expect-error deliberate invalid input
    bad.subjects = [{ id: 'stygius', name: 'Stygian Blade', type: 'artifact' }]
    expect(() => validateDataset(bad)).toThrow()
  })

  it('rejects a subject id with a bad shape', () => {
    const bad = structuredClone(validDataset)
    bad.subjects = [{ id: 'Lord Hades', name: 'Lord Hades', type: 'character' }]
    expect(() => validateDataset(bad)).toThrow()
  })

  it('carries an optional description and spoiler flag', () => {
    const data = structuredClone(validDataset)
    data.subjects = [
      { id: 'hades', name: 'Lord Hades', type: 'character', description: 'The king.', spoiler: true },
    ]
    const parsed = validateDataset(data)
    expect(parsed.subjects[0]?.description).toBe('The king.')
    expect(parsed.subjects[0]?.spoiler).toBe(true)
  })

  it('defaults subjects to empty for a dataset written before the axis existed', () => {
    const withoutSubjects: Record<string, unknown> = structuredClone(validDataset)
    delete withoutSubjects.subjects
    expect(validateDataset(withoutSubjects).subjects).toEqual([])
  })
})

describe('the optional fields the subject axis adds', () => {
  it('accepts a fact tagged with two subjects', () => {
    const data = structuredClone(validDataset)
    data.facts[0]!.subjects = ['athena', 'demeter']
    expect(validateDataset(data).facts[0]?.subjects).toEqual(['athena', 'demeter'])
  })

  it('requires the subject list, and rejects a fact without one', () => {
    // Optional while phase 2 ran, so a missing key could mean "not established
    // yet". Every fact is resolved now, so a missing key would only ever be an
    // oversight. An empty list still means "belongs to no subject on purpose".
    const data: { facts: Record<string, unknown>[] } & Record<string, unknown> =
      structuredClone(validDataset)
    delete data.facts[1]!.subjects
    expect(() => validateDataset(data)).toThrow()

    const kept = structuredClone(validDataset)
    kept.facts[0]!.subjects = []
    expect(validateDataset(kept).facts[0]!.subjects).toEqual([])
  })

  it('rejects a subject id with a bad shape inside a fact', () => {
    const bad = structuredClone(validDataset)
    bad.facts[0]!.subjects = ['Lord Hades']
    expect(() => validateDataset(bad)).toThrow()
  })

  it('carries a description and a spoiler flag on a fact', () => {
    const data = structuredClone(validDataset)
    data.facts[0]!.description = 'Foes deal more damage.'
    data.facts[0]!.spoiler = false
    const parsed = validateDataset(data)
    expect(parsed.facts[0]?.description).toBe('Foes deal more damage.')
    expect(parsed.facts[0]?.spoiler).toBe(false)
  })

  it('carries a spoiler flag on an achievement', () => {
    const data = structuredClone(validDataset)
    data.achievements[0]!.spoiler = true
    expect(validateDataset(data).achievements[0]?.spoiler).toBe(true)
  })

  it('carries a description on a collection', () => {
    const data = structuredClone(validDataset)
    data.collections[0]!.description = 'The in-game list of minor prophecies.'
    expect(validateDataset(data).collections[0]?.description).toBe(
      'The in-game list of minor prophecies.',
    )
  })

  it('rejects an empty description rather than storing a blank one', () => {
    const bad = structuredClone(validDataset)
    bad.facts[0]!.description = ''
    expect(() => validateDataset(bad)).toThrow()
  })
})
