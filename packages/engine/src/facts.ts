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

/**
 * What each fact must reach for this requirement, which is not always its max.
 *
 * "Something From Everyone" asks for 25 keepsakes at `atLeast 1`, while each
 * keepsake's own gauge holds 3. Reading the fact's max there marks a keepsake
 * you already own as partly done, and the row shows 1/3 as though two ranks
 * were still owed. 301 requirement nodes ask for less than the fact's max, and
 * 297 of them ask for exactly 1.
 *
 * A plain child is satisfied above zero, per `isSatisfied`, so its target is 1
 * however large the gauge is. A repeated fact takes the most demanding of its
 * targets: `god-of-blood` reaches `pet:cerberus` at both 1 and 10.
 */
export function factTargets(node: RequirementChild): Readonly<Record<FactId, number>> {
  const targets: Record<FactId, number> = {}
  collect(node, targets)
  return targets
}

function collect(node: RequirementChild, targets: Record<FactId, number>): void {
  if (isFactChild(node)) {
    targets[node] = Math.max(targets[node] ?? 0, 1)
    return
  }
  if (node.kind === 'atLeast') {
    targets[node.fact] = Math.max(targets[node.fact] ?? 0, node.value)
    return
  }
  for (const child of node.of) collect(child, targets)
}

export function unique(ids: readonly FactId[]): FactId[] {
  return [...new Set(ids)]
}
