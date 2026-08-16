import type { Achievement, Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { achievementProgress, overallProgress } from '../src/index.js'

const achievement: Achievement = {
  id: 'prophecy:example',
  name: 'Example',
  description: 'An example.',
  collection: 'prophecy',
  requirement: { kind: 'all', of: ['a:one', 'a:two'] },
}

const dataset: Dataset = {
  collections: [
    { id: 'prophecy', name: 'Prophecies' },
    { id: 'codex', name: 'Codex' },
  ],
  facts: [
    { id: 'a:one', label: 'One', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Two', kind: 'boolean', collection: 'prophecy' },
    { id: 'b:one', label: 'Three', kind: 'boolean', collection: 'codex' },
  ],
  achievements: [
    achievement,
    {
      id: 'codex:example',
      name: 'Codex example',
      description: 'Another example.',
      collection: 'codex',
      requirement: { kind: 'all', of: ['b:one'] },
    },
  ],
}

describe('achievementProgress', () => {
  it('reports todo when nothing is done', () => {
    const result = achievementProgress(achievement, {})
    expect(result.status).toBe('todo')
    expect(result.ratio).toBe(0)
    expect(result.id).toBe('prophecy:example')
  })

  it('reports partial when some of the work is done', () => {
    const result = achievementProgress(achievement, { 'a:one': true })
    expect(result.status).toBe('partial')
    expect(result.ratio).toBe(0.5)
    expect(result.missing).toEqual(['a:two'])
  })

  it('reports done when every fact is met', () => {
    const result = achievementProgress(achievement, { 'a:one': true, 'a:two': true })
    expect(result.status).toBe('done')
    expect(result.ratio).toBe(1)
  })
})

describe('overallProgress', () => {
  it('counts completed achievements, not facts', () => {
    const result = overallProgress(dataset, { 'a:one': true, 'a:two': true })
    expect(result).toMatchObject({ done: 1, total: 2, ratio: 0.5 })
  })

  it('splits progress by collection', () => {
    const result = overallProgress(dataset, { 'b:one': true })
    expect(result.byCollection['prophecy']).toEqual({ done: 0, total: 1, ratio: 0 })
    expect(result.byCollection['codex']).toEqual({ done: 1, total: 1, ratio: 1 })
  })

  it('reports a ratio of 0 for a collection with no achievements', () => {
    const empty: Dataset = { ...dataset, achievements: [] }
    expect(empty.collections.length).toBe(2)
    expect(overallProgress(empty, {})).toMatchObject({ done: 0, total: 0, ratio: 0 })
  })
})
