import { z } from 'zod'
import { collectionIdSchema } from './collection.js'
import { requirementSchema } from './requirement.js'

export const achievementSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(:[a-z0-9-]+)+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  collection: collectionIdSchema,
  requirement: requirementSchema,
})

export type Achievement = z.infer<typeof achievementSchema>
