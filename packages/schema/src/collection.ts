import { z } from 'zod'

export const collectionIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)

export const collectionSchema = z.object({
  id: collectionIdSchema,
  name: z.string().min(1),
})

export type Collection = z.infer<typeof collectionSchema>
