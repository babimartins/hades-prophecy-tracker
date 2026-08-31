import type { RequirementChild } from '@hades/schema'
import { describe, expect, it } from 'vitest'
import { collectFactIds, factTargets } from '../src/index.js'

describe('collectFactIds', () => {
  it('returns the single id of a bare fact id child', () => {
    expect(collectFactIds('a:one')).toEqual(['a:one'])
  })

  it('returns every fact id of a nested all/any tree, in encounter order', () => {
    const node: RequirementChild = {
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two', 'a:three'] }],
    }
    expect(collectFactIds(node)).toEqual(['a:one', 'a:two', 'a:three'])
  })

  it('collects the fact id of an atLeast node', () => {
    const node = { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 } as const
    expect(collectFactIds(node)).toEqual(['pact:extreme-measures'])
  })

  it('lists a fact id once even when it appears twice in the tree', () => {
    const node: RequirementChild = { kind: 'all', of: ['a:one', 'a:one'] }
    expect(collectFactIds(node)).toEqual(['a:one'])
  })

  it('lists a fact id once even when it appears via different node kinds', () => {
    const node: RequirementChild = {
      kind: 'any',
      of: ['a:one', { kind: 'atLeast', fact: 'a:one', value: 2 }],
    }
    expect(collectFactIds(node)).toEqual(['a:one'])
  })

  it('reaches every leaf of a deeply nested mix of node kinds', () => {
    const node: RequirementChild = {
      kind: 'all',
      of: [
        { kind: 'any', of: ['a:one', { kind: 'count', of: ['a:two', 'a:three'], n: 1 }] },
        { kind: 'atLeast', fact: 'a:four', value: 3 },
      ],
    }
    expect(collectFactIds(node)).toEqual(['a:one', 'a:two', 'a:three', 'a:four'])
  })
})


describe('factTargets', () => {
  it('reads a plain child as 1, however large its gauge is', () => {
    // `isSatisfied` counts a number fact above zero, so a plain child asks for
    // one, not for the max. Reading the max marked 297 finished rows partial.
    expect(factTargets('keepsake:cosmic-egg')).toEqual({ 'keepsake:cosmic-egg': 1 })
  })

  it('reads an atLeast node as the value it names', () => {
    const node: RequirementChild = { kind: 'atLeast', fact: 'nectar:demeter', value: 6 }
    expect(factTargets(node)).toEqual({ 'nectar:demeter': 6 })
  })

  it('takes the most demanding target when a fact is reached twice', () => {
    // God of Blood nests the other 49, and reaches pet:cerberus at 1 through
    // one of them and at 10 through Three-Headed Boy.
    //
    // Both orders, because keeping whichever came last gives 10 for one of
    // them and would pass a test that only tried that one.
    const demandingLast: RequirementChild = {
      kind: 'all',
      of: ['pet:cerberus', { kind: 'atLeast', fact: 'pet:cerberus', value: 10 }],
    }
    const demandingFirst: RequirementChild = {
      kind: 'all',
      of: [{ kind: 'atLeast', fact: 'pet:cerberus', value: 10 }, 'pet:cerberus'],
    }
    expect(factTargets(demandingLast)).toEqual({ 'pet:cerberus': 10 })
    expect(factTargets(demandingFirst)).toEqual({ 'pet:cerberus': 10 })
  })

  it('walks every branch of a nested tree', () => {
    const node: RequirementChild = {
      kind: 'all',
      of: [
        { kind: 'count', n: 2, of: [{ kind: 'atLeast', fact: 'nectar:zeus', value: 7 }] },
        { kind: 'any', of: ['catch:hellfish'] },
      ],
    }
    expect(factTargets(node)).toEqual({ 'nectar:zeus': 7, 'catch:hellfish': 1 })
  })
})
