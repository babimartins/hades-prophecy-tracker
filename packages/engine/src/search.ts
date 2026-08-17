import type { Achievement, Dataset } from '@hades/schema'
import { collectFactIds } from './facts.js'

/**
 * Filters achievements by name, by description, or by the label of any fact in
 * the requirement tree. An empty query returns every achievement.
 */
export function searchAchievements(dataset: Dataset, query: string): Achievement[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return dataset.achievements

  const labels = new Map(dataset.facts.map((fact) => [fact.id, fact.label.toLowerCase()]))

  return dataset.achievements.filter((achievement) => {
    if (achievement.name.toLowerCase().includes(needle)) return true
    if (achievement.description.toLowerCase().includes(needle)) return true
    return collectFactIds(achievement.requirement).some((factId) =>
      (labels.get(factId) ?? '').includes(needle),
    )
  })
}
