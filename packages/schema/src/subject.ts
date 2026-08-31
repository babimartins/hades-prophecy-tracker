import { z } from 'zod'

/**
 * A subject is a named thing the tracker organises around: a character, a
 * weapon, a collectible or a region. The roster is the Codex, whose nine
 * sections give each subject its type.
 */
export const subjectIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)

export type SubjectId = string

/**
 * The four types gate which capabilities are possible, rather than merely
 * describing which ones happen to be filled in. A region can never have
 * affinity; a character can never have a Daedalus enchantment.
 *
 * `character` covers god, character and foe alike. Those three differ only by
 * the Codex section that files them, so the capabilities distinguish them
 * instead of the type.
 */
export const subjectTypeSchema = z.enum(['character', 'weapon', 'collectible', 'region'])

export type SubjectType = z.infer<typeof subjectTypeSchema>

export const subjectSchema = z.object({
  id: subjectIdSchema,
  name: z.string().min(1),
  type: subjectTypeSchema,
  /** What the subject is, for a reader who does not recognise the name. */
  description: z.string().min(1).optional(),
  /** True when the description reveals something the player may not have reached. */
  spoiler: z.boolean().optional(),
})

export type Subject = z.infer<typeof subjectSchema>
