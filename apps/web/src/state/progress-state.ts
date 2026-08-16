import type { FactId } from '@hades/schema'
import type { FactMap, FactValue } from '@hades/engine'
import type { ProgressStore } from '../storage/progress-store.js'

type Listener = () => void

/** Holds the fact map in memory and writes every change to the store. */
export class ProgressState {
  readonly ready: Promise<void>

  #facts: FactMap = {}
  readonly #listeners = new Set<Listener>()

  constructor(private readonly store: ProgressStore) {
    this.ready = store.load().then((facts) => {
      this.#facts = facts
      this.#emit()
    })
  }

  get facts(): FactMap {
    return this.#facts
  }

  /** A value of `false` or `0` removes the fact, to keep the export small. */
  async setFact(id: FactId, value: FactValue): Promise<void> {
    const next: Record<string, FactValue> = { ...this.#facts } as Record<string, FactValue>
    if (value === false || value === 0) delete next[id]
    else next[id] = value
    this.#facts = next
    this.#emit()
    await this.store.save(next)
  }

  async replaceAll(facts: FactMap): Promise<void> {
    this.#facts = facts
    this.#emit()
    await this.store.save(facts)
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}
