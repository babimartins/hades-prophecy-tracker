import { z } from 'zod'
import { achievementSchema } from './achievement.js'
import { collectionSchema } from './collection.js'
import { factSchema } from './fact.js'
import { subjectSchema } from './subject.js'

export const datasetSchema = z.object({
  collections: z.array(collectionSchema).min(1),
  facts: z.array(factSchema),
  /** Defaults to empty so a dataset written before the subject axis still parses. */
  subjects: z.array(subjectSchema).default([]),
  achievements: z.array(achievementSchema),
})

export type Dataset = z.infer<typeof datasetSchema>

/** Parses and returns the dataset. Throws a ZodError when the input is invalid. */
export function validateDataset(input: unknown): Dataset {
  return datasetSchema.parse(input)
}
