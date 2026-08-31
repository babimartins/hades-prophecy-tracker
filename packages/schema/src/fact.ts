import { z } from 'zod'
import { collectionIdSchema } from './collection.js'
import { subjectIdSchema } from './subject.js'

/** A fact id has colon separated segments, for example `aspect:varatha:guan-yu`. */
export const factIdSchema = z.string().regex(/^[a-z0-9]+(:[a-z0-9-]+)+$/)

export type FactId = string

export const factSchema = z.object({
  id: factIdSchema,
  label: z.string().min(1),
  kind: z.enum(['boolean', 'number']),
  max: z.number().int().positive().optional(),
  collection: collectionIdSchema,
  /**
   * The subjects this action belongs to. An array, because 28 duo boons belong
   * to two gods each and several conversations name three or more people.
   *
   * An empty array means the fact names a game system on purpose. A missing
   * key means nobody has established the subject yet. The two are different
   * and the integrity test relies on the difference.
   */
  subjects: z.array(subjectIdSchema).optional(),
  /** What the thing is or does, beyond the action the label states. */
  description: z.string().min(1).optional(),
  /** True when the description reveals something the player may not have reached. */
  spoiler: z.boolean().optional(),
})

export type Fact = z.infer<typeof factSchema>
