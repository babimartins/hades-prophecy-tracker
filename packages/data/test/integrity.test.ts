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
})
