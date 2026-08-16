import { z } from 'zod'
import { collectionIdSchema } from './collection.js'

/** A fact id has colon separated segments, for example `aspect:varatha:guan-yu`. */
export const factIdSchema = z.string().regex(/^[a-z0-9]+(:[a-z0-9-]+)+$/)

export type FactId = string

export const factSchema = z.object({
  id: factIdSchema,
  label: z.string().min(1),
  kind: z.enum(['boolean', 'number']),
  max: z.number().int().positive().optional(),
  collection: collectionIdSchema,
})

export type Fact = z.infer<typeof factSchema>
