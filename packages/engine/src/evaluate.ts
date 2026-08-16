import { isFactChild, type FactId, type RequirementChild } from '@hades/schema'
import { isSatisfied, numericValue, unique, type FactMap } from './facts.js'

export interface Evaluation {
  /** Units completed. */
  done: number
  /** Units needed for completion. */
  total: number
  /** Fact ids that still block completion. */
  missing: FactId[]
}

export function evaluate(node: RequirementChild, facts: FactMap): Evaluation {
  if (isFactChild(node)) {
    return isSatisfied(node, facts)
      ? { done: 1, total: 1, missing: [] }
      : { done: 0, total: 1, missing: [node] }
  }

  switch (node.kind) {
    case 'all': {
      const results = node.of.map((child) => evaluate(child, facts))
      return {
        done: sum(results.map((r) => r.done)),
        total: sum(results.map((r) => r.total)),
        missing: unique(results.flatMap((r) => r.missing)),
      }
    }
    case 'any': {
      const results = node.of.map((child) => evaluate(child, facts))
      const met = results.some(isComplete)
      return met
        ? { done: 1, total: 1, missing: [] }
        : { done: 0, total: 1, missing: unique(results.flatMap((r) => r.missing)) }
    }
    case 'count': {
      const results = node.of.map((child) => evaluate(child, facts))
      const met = results.filter(isComplete).length
      const done = Math.min(met, node.n)
      return {
        done,
        total: node.n,
        missing:
          done >= node.n
            ? []
            : unique(results.filter((r) => !isComplete(r)).flatMap((r) => r.missing)),
      }
    }
    case 'atLeast': {
      const value = Math.min(numericValue(node.fact, facts), node.value)
      return {
        done: value,
        total: node.value,
        missing: value >= node.value ? [] : [node.fact],
      }
    }
  }
}

export function isComplete(result: Evaluation): boolean {
  return result.done >= result.total
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
