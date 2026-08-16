import type { Achievement, Dataset } from '@hades/schema'
import { evaluate, isComplete, type Evaluation } from './evaluate.js'
import type { FactMap } from './facts.js'

export type Status = 'todo' | 'partial' | 'done'

export interface AchievementProgress extends Evaluation {
  id: string
  status: Status
  /** Completion between 0 and 1. */
  ratio: number
}

export function achievementProgress(
  achievement: Achievement,
  facts: FactMap,
): AchievementProgress {
  const result = evaluate(achievement.requirement, facts)
  const ratio = result.total === 0 ? 0 : result.done / result.total
  const status: Status = ratio >= 1 ? 'done' : ratio > 0 ? 'partial' : 'todo'
  return { ...result, id: achievement.id, ratio, status }
}

export interface CollectionProgress {
  done: number
  total: number
  ratio: number
}

export interface OverallProgress extends CollectionProgress {
  byCollection: Record<string, CollectionProgress>
}

/** Counts completed achievements, overall and per collection. */
export function overallProgress(dataset: Dataset, facts: FactMap): OverallProgress {
  const byCollection: Record<string, CollectionProgress> = {}
  for (const collection of dataset.collections) {
    byCollection[collection.id] = { done: 0, total: 0, ratio: 0 }
  }

  let done = 0
  for (const achievement of dataset.achievements) {
    const complete = isComplete(evaluate(achievement.requirement, facts))
    const bucket = byCollection[achievement.collection]
    if (bucket) {
      bucket.total += 1
      if (complete) bucket.done += 1
    }
    if (complete) done += 1
  }

  for (const bucket of Object.values(byCollection)) {
    bucket.ratio = bucket.total === 0 ? 0 : bucket.done / bucket.total
  }

  const total = dataset.achievements.length
  return { done, total, ratio: total === 0 ? 0 : done / total, byCollection }
}
