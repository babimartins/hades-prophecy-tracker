import type { Dataset, FactId } from '@hades/schema'
import { evaluate, isComplete } from './evaluate.js'
import type { FactMap } from './facts.js'

export interface NextStep {
  fact: FactId
  /** Incomplete entries that still need this action. */
  blocks: number
}

/**
 * Every unmet action, ranked by how many incomplete entries still need it.
 *
 * Reads `missing` from `evaluate`, so it respects each node kind: an `atLeast`
 * fact that only partly meets its threshold still counts as missing, and a
 * satisfied branch of an `any` node does not. Ties break on the fact id, so the
 * order is stable.
 *
 * `ignore` exists because five entries are roll-ups over whole pools. God of
 * Blood reaches 692 facts and Had to Happen 460, so leaving them in adds one to
 * almost every count and puts their names on every row, which tells the reader
 * nothing. Which entries those are is game knowledge, so the caller supplies
 * them rather than this module knowing.
 */
export function nextSteps(
  dataset: Dataset,
  facts: FactMap,
  ignore: Iterable<string> = [],
): NextStep[] {
  const skip = new Set(ignore)
  const counts = new Map<FactId, number>()

  for (const achievement of dataset.achievements) {
    if (skip.has(achievement.id)) continue
    const result = evaluate(achievement.requirement, facts)
    if (isComplete(result)) continue
    for (const factId of result.missing) {
      counts.set(factId, (counts.get(factId) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([fact, blocks]) => ({ fact, blocks }))
    .sort((a, b) => b.blocks - a.blocks || a.fact.localeCompare(b.fact))
}

/**
 * The entries an action would advance, by name, with the same `ignore` rule.
 *
 * Names are deduplicated without regard to case. 18 names belong to more than
 * one entry: 13 trophies restate a prophecy and take the same name, sometimes
 * with different capitals, and four Contractor rugs are sold in two rooms. A
 * reader wants the distinct goals, not "End To Torment, End to Torment".
 */
export function unlockedBy(
  factId: FactId,
  dataset: Dataset,
  facts: FactMap,
  ignore: Iterable<string> = [],
): string[] {
  const skip = new Set(ignore)
  const seen = new Set<string>()
  const names: string[] = []
  for (const achievement of dataset.achievements) {
    if (skip.has(achievement.id)) continue
    const result = evaluate(achievement.requirement, facts)
    if (isComplete(result) || !result.missing.includes(factId)) continue
    const key = achievement.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(achievement.name)
  }
  return names
}
