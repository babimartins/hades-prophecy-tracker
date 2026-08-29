import { collectFactIds } from '@hades/engine'
import type { RequirementChild } from '@hades/schema'
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

  it('never asks an atLeast node for more than the fact allows', () => {
    const factsById = new Map(dataset.facts.map((fact) => [fact.id, fact]))
    const violations: string[] = []

    function walk(achievementId: string, node: RequirementChild): void {
      if (typeof node === 'string') return
      if (node.kind === 'atLeast') {
        const fact = factsById.get(node.fact)
        if (fact?.max !== undefined && node.value > fact.max) {
          violations.push(`${achievementId} -> ${node.fact} (atLeast ${node.value} > max ${fact.max})`)
        }
        return
      }
      for (const child of node.of) walk(achievementId, child)
    }

    for (const achievement of dataset.achievements) walk(achievement.id, achievement.requirement)
    expect(violations).toEqual([])
  })

  it('documents every number fact used as a plain (non-atLeast) requirement child', () => {
    // Before the Critical-1 fix, `requirement-tree` dispatched on the
    // requirement node shape, not on the fact's own `kind`: a number fact
    // reached as a plain child rendered as a lossy boolean checkbox that
    // could silently destroy a stored rank (untick, then re-tick, and a
    // stored 5 becomes a 1). The fix makes `requirement-tree` check
    // `fact.kind` for every plain child and render the same bounded numeric
    // control as an `atLeast` node whenever it is `number`
    // (apps/web/src/components/requirement-tree.ts,
    // apps/web/test/requirement-tree.browser.test.ts), so this pattern is
    // now safe by construction rather than forbidden.
    //
    // This test is a canary, not a ban: it pins the current, known-safe
    // shape so a change to it is a deliberate, reviewed edit, not a silent
    // one.
    const factsById = new Map(dataset.facts.map((fact) => [fact.id, fact]))
    const plainNumberFactIds = new Set<string>()
    let referenceCount = 0

    function walk(node: RequirementChild): void {
      if (typeof node === 'string') {
        const fact = factsById.get(node)
        if (fact?.kind === 'number') {
          plainNumberFactIds.add(node)
          referenceCount += 1
        }
        return
      }
      if (node.kind === 'atLeast') return
      for (const child of node.of) walk(child)
    }

    for (const achievement of dataset.achievements) walk(achievement.requirement)

    expect(referenceCount).toBe(16)
    expect(plainNumberFactIds.size).toBe(15)
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
