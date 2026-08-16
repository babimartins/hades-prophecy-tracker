import type { FactMap, FactValue } from '@hades/engine'

export interface TransferFile {
  version: 1
  facts: FactMap
}

export function toTransfer(facts: FactMap): TransferFile {
  return { version: 1, facts }
}

/** Reads an exported file. Throws when the shape or the version is wrong. */
export function parseTransfer(input: unknown): FactMap {
  if (typeof input !== 'object' || input === null) throw new Error('The file is not an object.')
  const file = input as { version?: unknown; facts?: unknown }
  if (file.version !== 1) throw new Error(`Unsupported file version: ${String(file.version)}`)
  if (typeof file.facts !== 'object' || file.facts === null) {
    throw new Error('The file has no facts object.')
  }

  const result: Record<string, FactValue> = {}
  for (const [key, value] of Object.entries(file.facts)) {
    if (typeof value !== 'boolean' && typeof value !== 'number') {
      throw new Error(`Bad value for fact ${key}.`)
    }
    result[key] = value
  }
  return result
}
