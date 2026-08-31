import type { Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { searchAchievements } from '../src/index.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  subjects: [],
  facts: [
    { id: 'nectar:dusa', label: 'Give Nectar to Dusa', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:other', label: 'Other step', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:colleagues',
      name: 'Chthonic Colleagues',
      description: 'Give Nectar to everyone.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['nectar:dusa'] },
    },
    {
      id: 'prophecy:other',
      name: 'Other prophecy',
      description: 'Something else.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:other'] },
    },
  ],
}

describe('searchAchievements', () => {
  it('returns every achievement for an empty query', () => {
    expect(searchAchievements(dataset, '   ').length).toBe(2)
  })

  it('matches the achievement name without case', () => {
    const result = searchAchievements(dataset, 'chthonic')
    expect(result.map((item) => item.id)).toEqual(['prophecy:colleagues'])
  })

  it('matches the label of a sub-item fact', () => {
    const result = searchAchievements(dataset, 'dusa')
    expect(result.map((item) => item.id)).toEqual(['prophecy:colleagues'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchAchievements(dataset, 'cerberus')).toEqual([])
  })
})
