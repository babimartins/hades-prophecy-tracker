import { z } from 'zod'

export const collectionIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)

export const collectionSchema = z.object({
  id: collectionIdSchema,
  name: z.string().min(1),
  /** What the system is, for a reader who does not recognise the name. */
  description: z.string().min(1).optional(),
})

export type Collection = z.infer<typeof collectionSchema>
