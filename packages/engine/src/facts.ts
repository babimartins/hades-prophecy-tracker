import type { FactId, RequirementChild } from '@hades/schema'
import { isFactChild } from '@hades/schema'

export type FactValue = boolean | number

export type FactMap = Readonly<Record<FactId, FactValue | undefined>>

/** A boolean fact counts when true. A number fact counts when greater than zero. */
export function isSatisfied(factId: FactId, facts: FactMap): boolean {
  const value = facts[factId]
  if (typeof value === 'number') return value > 0
  return value === true
}

/** Reads a fact as a number. A true boolean reads as 1. A missing fact reads as 0. */
export function numericValue(factId: FactId, facts: FactMap): number {
  const value = facts[factId]
  if (typeof value === 'number') return value
  return value === true ? 1 : 0
}

/** Returns every fact id used in the node, in order, without repeats. */
export function collectFactIds(node: RequirementChild): FactId[] {
  const found: FactId[] = []
  walk(node, found)
  return unique(found)
}

function walk(node: RequirementChild, found: FactId[]): void {
  if (isFactChild(node)) {
    found.push(node)
    return
  }
  if (node.kind === 'atLeast') {
    found.push(node.fact)
    return
  }
  for (const child of node.of) walk(child, found)
}

export function unique(ids: readonly FactId[]): FactId[] {
  return [...new Set(ids)]
}
