import { describe, expect, it } from 'vitest'
import { evaluate } from '../src/index.js'

describe('evaluate', () => {
  it('counts a single unmet fact', () => {
    expect(evaluate('nectar:dusa', {})).toEqual({ done: 0, total: 1, missing: ['nectar:dusa'] })
  })

  it('counts a single met fact', () => {
    expect(evaluate('nectar:dusa', { 'nectar:dusa': true })).toEqual({
      done: 1,
      total: 1,
      missing: [],
    })
  })

  it('treats a positive number fact as met', () => {
    expect(evaluate('aspect:varatha:guan-yu', { 'aspect:varatha:guan-yu': 3 }).done).toBe(1)
  })

  it('treats a zero number fact as unmet', () => {
    expect(evaluate('aspect:varatha:guan-yu', { 'aspect:varatha:guan-yu': 0 }).done).toBe(0)
  })

  it('sums an all node', () => {
    const node = { kind: 'all', of: ['a:one', 'a:two', 'a:three'] } as const
    expect(evaluate(node, { 'a:one': true })).toEqual({
      done: 1,
      total: 3,
      missing: ['a:two', 'a:three'],
    })
  })

  it('completes an any node when one child is met', () => {
    const node = { kind: 'any', of: ['a:one', 'a:two'] } as const
    expect(evaluate(node, { 'a:two': true })).toEqual({ done: 1, total: 1, missing: [] })
  })

  it('lists every child of an unmet any node as missing', () => {
    const node = { kind: 'any', of: ['a:one', 'a:two'] } as const
    expect(evaluate(node, {})).toEqual({ done: 0, total: 1, missing: ['a:one', 'a:two'] })
  })

  it('caps a count node at n', () => {
    const node = { kind: 'count', of: ['a:one', 'a:two', 'a:three'], n: 2 } as const
    const facts = { 'a:one': true, 'a:two': true, 'a:three': true }
    expect(evaluate(node, facts)).toEqual({ done: 2, total: 2, missing: [] })
  })

  it('reports the remaining children of an incomplete count node', () => {
    const node = { kind: 'count', of: ['a:one', 'a:two', 'a:three'], n: 2 } as const
    expect(evaluate(node, { 'a:one': true })).toEqual({
      done: 1,
      total: 2,
      missing: ['a:two', 'a:three'],
    })
  })

  it('measures an atLeast node against the threshold', () => {
    const node = { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 } as const
    expect(evaluate(node, { 'pact:extreme-measures': 3 })).toEqual({
      done: 3,
      total: 4,
      missing: ['pact:extreme-measures'],
    })
  })

  it('caps an atLeast node at the threshold', () => {
    const node = { kind: 'atLeast', fact: 'pact:extreme-measures', value: 4 } as const
    expect(evaluate(node, { 'pact:extreme-measures': 9 })).toEqual({
      done: 4,
      total: 4,
      missing: [],
    })
  })

  it('evaluates nested nodes', () => {
    const node = {
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two', 'a:three'] }],
    } as const
    expect(evaluate(node, { 'a:three': true })).toEqual({
      done: 1,
      total: 2,
      missing: ['a:one'],
    })
  })

  it('does not repeat a fact id in missing', () => {
    const node = { kind: 'all', of: ['a:one', 'a:one'] } as const
    expect(evaluate(node, {}).missing).toEqual(['a:one'])
  })
})
