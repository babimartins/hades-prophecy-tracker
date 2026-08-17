import { describe, expect, it } from 'vitest'
import type { Achievement, Dataset } from '../src/index.js'
import { validateDataset } from '../src/index.js'

const validDataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Fated List of Minor Prophecies' }],
  facts: [
    { id: 'nectar:dusa', label: 'Give Nectar to Dusa', kind: 'boolean', collection: 'prophecy' },
    {
      id: 'pact:extreme-measures',
      label: 'Extreme Measures',
      kind: 'number',
      max: 4,
      collection: 'prophecy',
    },
  ],
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
