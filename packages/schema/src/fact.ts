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
   * An empty array means the fact names a game system or a lifetime counter,
   * so it belongs to no subject on purpose.
   *
   * Required since every fact was resolved. It was optional while phase 2 ran,
   * so that a missing key could mean "nobody has established this yet" and the
   * integrity test could say how much was left. Nothing is left, so a missing
   * key would now only ever be an oversight.
   */
  subjects: z.array(subjectIdSchema),
  /** What the thing is or does, beyond the action the label states. */
  description: z.string().min(1).optional(),
  /** True when the description reveals something the player may not have reached. */
  spoiler: z.boolean().optional(),
})

export type Fact = z.infer<typeof factSchema>
