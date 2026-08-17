import { searchAchievements } from '@hades/engine'
import type { Achievement, Collection, Dataset } from '@hades/schema'

/** Only the collections that hold at least one achievement, in dataset order. */
export function collectionsWithEntries(dataset: Dataset): Collection[] {
  return dataset.collections.filter((collection) =>
    dataset.achievements.some((achievement) => achievement.collection === collection.id),
  )
}

/**
 * Narrows the dataset to one collection, then searches within it.
 * `selectedCollection` of `undefined` means every collection.
 */
export function visibleAchievements(
  dataset: Dataset,
  selectedCollection: string | undefined,
  query: string,
): Achievement[] {
  const scoped = selectedCollection
    ? dataset.achievements.filter((achievement) => achievement.collection === selectedCollection)
    : dataset.achievements
  return searchAchievements({ ...dataset, achievements: scoped }, query)
}
