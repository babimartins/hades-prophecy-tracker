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
  /**
   * What the purchase costs, for a fact that is bought rather than earned.
   *
   * The House Contractor takes seven different currencies, so a bare number
   * would not say which. Absent for anything that is not a purchase.
   */
  cost: z
    .object({
      amount: z.number().int().nonnegative(),
      currency: z.enum([
        'Gemstones',
        'Diamond',
        'Darkness',
        'Ambrosia',
        'Nectar',
        'Chthonic Key',
        'Obol',
        'Titan Blood',
      ]),
    })
    .optional(),
  /**
   * True when this fact's own text states an outcome the player may not have
   * reached. The reveal can sit in the `label` as well as the `description`,
   * so the interface must hide both, not only the description.
   *
   * Naming a Work Order or a renovation is not a reveal: it names a purchase.
   * The bar is a stated outcome.
   */
  spoiler: z.boolean().optional(),
})

export type Fact = z.infer<typeof factSchema>
