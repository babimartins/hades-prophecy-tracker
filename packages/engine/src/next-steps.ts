import type { Dataset, FactId } from '@hades/schema'
import { evaluate, isComplete } from './evaluate.js'
import { collectFactIds, isSatisfied, type FactMap } from './facts.js'

/** Counts the achievements that reference the fact. */
export function impact(factId: FactId, dataset: Dataset): number {
  return dataset.achievements.filter((achievement) =>
    collectFactIds(achievement.requirement).includes(factId),
  ).length
}

/**
 * Returns the unmet facts of every incomplete achievement.
 * The order runs from the highest number of incomplete achievements to the
 * lowest. Facts with the same count are ordered by id.
 */
export function nextSteps(dataset: Dataset, facts: FactMap): FactId[] {
  const counts = new Map<FactId, number>()

  for (const achievement of dataset.achievements) {
    const result = evaluate(achievement.requirement, facts)
    if (isComplete(result)) continue
    for (const factId of collectFactIds(achievement.requirement)) {
      if (isSatisfied(factId, facts)) continue
      counts.set(factId, (counts.get(factId) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([factId]) => factId)
}
