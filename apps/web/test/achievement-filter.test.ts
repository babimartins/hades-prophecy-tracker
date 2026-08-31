import type { Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { collectionsWithEntries, visibleAchievements } from '../src/lib/achievement-filter.js'

const dataset: Dataset = {
  collections: [
    { id: 'prophecy', name: 'Prophecies' },
    { id: 'codex', name: 'Codex' },
    { id: 'achievement', name: 'Platform Achievements' },
  ],
  subjects: [],
  facts: [{ id: 'a:zeus', label: 'Invite Zeus', kind: 'boolean', collection: 'prophecy', subjects: [] }],
  achievements: [
    {
      id: 'prophecy:zeus',
      name: 'Court Zeus',
      description: 'Invite Zeus to the House.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:zeus'] },
    },
    {
      id: 'codex:zeus',
      name: 'Zeus',
      description: 'The king of the gods.',
      collection: 'codex',
      requirement: { kind: 'all', of: ['a:zeus'] },
    },
  ],
}

describe('collectionsWithEntries', () => {
  it('excludes a collection with no achievements', () => {
    const result = collectionsWithEntries(dataset)
    expect(result.map((collection) => collection.id)).toEqual(['prophecy', 'codex'])
  })
})

describe('visibleAchievements', () => {
  it('returns every achievement when no collection is selected and the query is empty', () => {
    expect(visibleAchievements(dataset, undefined, '')).toHaveLength(2)
  })

  it('narrows to one collection when selected', () => {
    const result = visibleAchievements(dataset, 'codex', '')
    expect(result.map((achievement) => achievement.id)).toEqual(['codex:zeus'])
  })

  it('filters by collection before searching, so a name match outside it is excluded', () => {
    // Both entries match "zeus" by name; scoping to prophecy must drop the codex one.
    const result = visibleAchievements(dataset, 'prophecy', 'zeus')
    expect(result.map((achievement) => achievement.id)).toEqual(['prophecy:zeus'])
  })

  it('searches within the selected collection', () => {
    const result = visibleAchievements(dataset, 'prophecy', 'court')
    expect(result.map((achievement) => achievement.id)).toEqual(['prophecy:zeus'])
  })
})
