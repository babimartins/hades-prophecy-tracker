import { describe, expect, it } from 'vitest'
import { collectFactIds } from '../src/index.js'

describe('collectFactIds', () => {
  it('returns the single id of a bare fact id child', () => {
    expect(collectFactIds('a:one')).toEqual(['a:one'])
  })

  it('returns every fact id of a nested all/any tree, in encounter order', () => {
    const node = {
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two', 'a:three'] }],
    } as const
    expect(collectFactIds(node)).toEqual(['a:one', 'a:two', 'a:three'])
  })

  it('collects the fact id of an atLeast node', () => {
    const node = { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 } as const
    expect(collectFactIds(node)).toEqual(['pact:extreme-measures'])
  })

  it('lists a fact id once even when it appears twice in the tree', () => {
    const node = { kind: 'all', of: ['a:one', 'a:one'] } as const
    expect(collectFactIds(node)).toEqual(['a:one'])
  })

  it('lists a fact id once even when it appears via different node kinds', () => {
    const node = {
      kind: 'any',
      of: ['a:one', { kind: 'atLeast', fact: 'a:one', value: 2 }],
    } as const
    expect(collectFactIds(node)).toEqual(['a:one'])
  })

  it('reaches every leaf of a deeply nested mix of node kinds', () => {
    const node = {
      kind: 'all',
      of: [
        { kind: 'any', of: ['a:one', { kind: 'count', of: ['a:two', 'a:three'], n: 1 }] },
        { kind: 'atLeast', fact: 'a:four', value: 3 },
      ],
    } as const
    expect(collectFactIds(node)).toEqual(['a:one', 'a:two', 'a:three', 'a:four'])
  })
})
