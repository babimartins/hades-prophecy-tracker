import type { FactMap } from '@hades/engine'

/** Persistence boundary. A backend implementation replaces this later. */
export interface ProgressStore {
  load(): Promise<FactMap>
  save(facts: FactMap): Promise<void>
}
