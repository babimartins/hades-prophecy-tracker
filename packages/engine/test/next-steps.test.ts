import type { Dataset } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { impact, nextSteps } from '../src/index.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  facts: [
    { id: 'a:shared', label: 'Shared', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:one', label: 'One', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Two', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:first',
      name: 'First',
      description: 'First.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:one'] },
    },
    {
      id: 'prophecy:second',
      name: 'Second',
      description: 'Second.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:two'] },
    },
  ],
}

describe('impact', () => {
  it('counts every achievement that uses the fact', () => {
    expect(impact('a:shared', dataset)).toBe(2)
    expect(impact('a:one', dataset)).toBe(1)
    expect(impact('a:absent', dataset)).toBe(0)
  })
})

describe('nextSteps', () => {
  it('ranks a shared fact above a single use fact', () => {
    expect(nextSteps(dataset, {})).toEqual(['a:shared', 'a:one', 'a:two'])
  })

  it('drops facts that are already met', () => {
    expect(nextSteps(dataset, { 'a:shared': true })).toEqual(['a:one', 'a:two'])
  })

  it('drops facts whose achievements are all complete', () => {
    const facts = { 'a:shared': true, 'a:one': true, 'a:two': true }
    expect(nextSteps(dataset, facts)).toEqual([])
  })

  it('breaks a tie by fact id', () => {
    expect(nextSteps(dataset, { 'a:shared': true })).toEqual(['a:one', 'a:two'])
  })
})
