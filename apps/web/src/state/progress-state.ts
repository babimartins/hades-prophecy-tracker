import type { FactId } from '@hades/schema'
import type { FactMap, FactValue } from '@hades/engine'
import type { ProgressStore } from '../storage/progress-store.js'

type Listener = () => void

/** Holds the fact map in memory and writes every change to the store. */
export class ProgressState {
  readonly ready: Promise<void>

  #facts: FactMap = {}
  readonly #listeners = new Set<Listener>()

  /**
   * Serializes every write. An operation is only invoked once every earlier
   * queued operation has settled, so it always reads `#facts` as the
   * previous one left it, never a snapshot taken before it started waiting.
   * This also makes writes settle in call order: an earlier operation's
   * outcome always reaches its caller before a later one's write even
   * starts, so a later success can never race ahead and clear an earlier
   * failure's error before it was reported.
   */
  #queue: Promise<void> = Promise.resolve()

  constructor(private readonly store: ProgressStore) {
    this.ready = this.#enqueue(async () => {
      this.#facts = await store.load()
      this.#emit()
    })
  }

  get facts(): FactMap {
    return this.#facts
  }

  /** A value of `false` or `0` removes the fact, to keep the export small. */
  setFact(id: FactId, value: FactValue): Promise<void> {
    return this.#enqueue(() => this.#applyFact(id, value))
  }

  replaceAll(facts: FactMap): Promise<void> {
    return this.#enqueue(() => this.#applyReplace(facts))
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /**
   * Chains `operation` after every earlier queued operation, whatever their
   * outcome, so one failure never blocks the next write. The caller still
   * sees `operation`'s own rejection through the returned promise.
   */
  #enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.#queue.then(operation)
    this.#queue = result.catch(() => undefined)
    return result
  }

  /**
   * Writes to the store before updating the in-memory facts, so a failed
   * write leaves the previous state intact and the caller sees the
   * rejection. The interface must never show progress as saved when it
   * was not.
   */
  async #applyFact(id: FactId, value: FactValue): Promise<void> {
    const next: Record<string, FactValue> = { ...this.#facts } as Record<string, FactValue>
    if (value === false || value === 0) delete next[id]
    else next[id] = value
    await this.store.save(next)
    this.#facts = next
    this.#emit()
  }

  /** Writes before updating in-memory facts. See `#applyFact` for why. */
  async #applyReplace(facts: FactMap): Promise<void> {
    await this.store.save(facts)
    this.#facts = facts
    this.#emit()
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}
