import { collectFactIds } from '@hades/engine'
import { describe, expect, it } from 'vitest'
import { dataset } from '../src/index.js'

describe('dataset integrity', () => {
  it('passes schema validation', () => {
    expect(dataset.achievements.length).toBeGreaterThan(0)
  })

  it('has no duplicate fact id', () => {
    const ids = dataset.facts.map((fact) => fact.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no duplicate achievement id', () => {
    const ids = dataset.achievements.map((achievement) => achievement.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('references only declared facts', () => {
    const declared = new Set(dataset.facts.map((fact) => fact.id))
    const unknown: string[] = []
    for (const achievement of dataset.achievements) {
      for (const factId of collectFactIds(achievement.requirement)) {
        if (!declared.has(factId)) unknown.push(`${achievement.id} -> ${factId}`)
      }
    }
    expect(unknown).toEqual([])
  })

  it('declares no orphan fact', () => {
    const used = new Set(
      dataset.achievements.flatMap((achievement) => collectFactIds(achievement.requirement)),
    )
    const orphans = dataset.facts.filter((fact) => !used.has(fact.id)).map((fact) => fact.id)
    expect(orphans).toEqual([])
  })

  it('assigns every fact and achievement to a declared collection', () => {
    const collections = new Set(dataset.collections.map((collection) => collection.id))
    for (const fact of dataset.facts) expect(collections.has(fact.collection)).toBe(true)
    for (const item of dataset.achievements) expect(collections.has(item.collection)).toBe(true)
  })

  it('gives every number fact a max value', () => {
    const missing = dataset.facts
      .filter((fact) => fact.kind === 'number' && fact.max === undefined)
      .map((fact) => fact.id)
    expect(missing).toEqual([])
  })

  it('has no two facts whose labels normalize to the same string', () => {
    const normalize = (label: string): string => label.toLowerCase().trim().replace(/\s+/g, ' ')
    const idsByLabel = new Map<string, string[]>()
    for (const fact of dataset.facts) {
      const key = normalize(fact.label)
      const ids = idsByLabel.get(key) ?? []
      ids.push(fact.id)
      idsByLabel.set(key, ids)
    }
    const duplicates = [...idsByLabel.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ids.join(' vs. '))
    expect(duplicates).toEqual([])
  })

  it('exposes how many achievements reference each fact', () => {
    const referenceCount = new Map<string, number>()
    for (const fact of dataset.facts) referenceCount.set(fact.id, 0)
    for (const achievement of dataset.achievements) {
      for (const factId of collectFactIds(achievement.requirement)) {
        referenceCount.set(factId, (referenceCount.get(factId) ?? 0) + 1)
      }
    }

    const distribution = new Map<number, number>()
    for (const count of referenceCount.values()) {
      distribution.set(count, (distribution.get(count) ?? 0) + 1)
    }

    // Not an assertion that sharing exists: it may legitimately be zero, as it
    // was for the first 30 entries. This makes the number visible in test
    // output instead of it staying unmeasured.
    console.log(
      'Fact reference count distribution (referenced-by-N-achievements -> fact count):',
      Object.fromEntries([...distribution.entries()].sort((a, b) => a[0] - b[0])),
    )

    // Every fact must be counted exactly once, whatever its share count is.
    const totalFacts = [...distribution.entries()].reduce((sum, [, facts]) => sum + facts, 0)
    expect(totalFacts).toBe(dataset.facts.length)
  })
})
