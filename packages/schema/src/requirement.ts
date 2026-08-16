import { z } from 'zod'
import { factIdSchema, type FactId } from './fact.js'

export type Requirement =
  | { kind: 'all'; of: RequirementChild[] }
  | { kind: 'any'; of: RequirementChild[] }
  | { kind: 'count'; of: RequirementChild[]; n: number }
  | { kind: 'atLeast'; fact: FactId; value: number }

export type RequirementChild = FactId | Requirement

export const requirementSchema: z.ZodType<Requirement> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('all'), of: z.array(requirementChildSchema).min(1) }),
    z.object({ kind: z.literal('any'), of: z.array(requirementChildSchema).min(1) }),
    z.object({
      kind: z.literal('count'),
      of: z.array(requirementChildSchema).min(1),
      n: z.number().int().positive(),
    }),
    z.object({
      kind: z.literal('atLeast'),
      fact: factIdSchema,
      value: z.number().int().positive(),
    }),
  ]),
)

export const requirementChildSchema: z.ZodType<RequirementChild> = z.lazy(() =>
  z.union([factIdSchema, requirementSchema]),
)

export function isFactChild(child: RequirementChild): child is FactId {
  return typeof child === 'string'
}
