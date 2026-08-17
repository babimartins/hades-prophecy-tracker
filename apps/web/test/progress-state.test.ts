import { describe, expect, it, vi } from 'vitest'
import type { ProgressStore } from '../src/storage/progress-store.js'
import { ProgressState } from '../src/state/progress-state.js'

function fakeStore(initial = {}): ProgressStore & { saved: unknown[] } {
  const saved: unknown[] = []
  return {
    saved,
    load: async () => initial,
    save: async (facts) => {
      saved.push(facts)
    },
  }
}

/** Advances past a bounded number of pending microtasks, without a real timer. */
async function flushMicrotasks(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('ProgressState', () => {
  it('loads the stored facts', async () => {
    const state = new ProgressState(fakeStore({ 'a:one': true }))
    await state.ready
    expect(state.facts).toEqual({ 'a:one': true })
  })

  it('sets a fact and saves it', async () => {
    const store = fakeStore()
    const state = new ProgressState(store)
    await state.ready
    await state.setFact('a:one', true)
    expect(state.facts).toEqual({ 'a:one': true })
    expect(store.saved).toEqual([{ 'a:one': true }])
  })

  it('removes a fact set to false', async () => {
    const state = new ProgressState(fakeStore({ 'a:one': true }))
    await state.ready
    await state.setFact('a:one', false)
    expect(state.facts).toEqual({})
  })

  it('notifies subscribers on change', async () => {
    const state = new ProgressState(fakeStore())
    await state.ready
    const listener = vi.fn()
    const unsubscribe = state.subscribe(listener)
    await state.setFact('a:one', true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    await state.setFact('a:two', true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('propagates a setFact save failure without updating facts or notifying', async () => {
    const store: ProgressStore = {
      load: async () => ({}),
      save: async () => {
        throw new Error('disk full')
      },
    }
    const state = new ProgressState(store)
    await state.ready
    const listener = vi.fn()
    state.subscribe(listener)

    await expect(state.setFact('a:one', true)).rejects.toThrow('disk full')
    expect(state.facts).toEqual({})
    expect(listener).not.toHaveBeenCalled()
  })

  it('propagates a replaceAll save failure without updating facts or notifying', async () => {
    const store: ProgressStore = {
      load: async () => ({ 'a:one': true }),
      save: async () => {
        throw new Error('disk full')
      },
    }
    const state = new ProgressState(store)
    await state.ready
    const listener = vi.fn()
    state.subscribe(listener)

    await expect(state.replaceAll({ 'a:two': true })).rejects.toThrow('disk full')
    expect(state.facts).toEqual({ 'a:one': true })
    expect(listener).not.toHaveBeenCalled()
  })

  it('applies two overlapping setFact calls for different facts without losing either', async () => {
    const store = fakeStore()
    const state = new ProgressState(store)
    await state.ready

    const first = state.setFact('a:one', true)
    const second = state.setFact('a:two', true)
    await Promise.all([first, second])

    expect(state.facts).toEqual({ 'a:one': true, 'a:two': true })
    expect(store.saved.at(-1)).toEqual({ 'a:one': true, 'a:two': true })
  })

  it('keeps the surviving change and reports the failure when one of two overlapping saves rejects', async () => {
    const store: ProgressStore = {
      load: async () => ({}),
      save: async (facts) => {
        if ('a:one' in facts) throw new Error('rejected a:one')
      },
    }
    const state = new ProgressState(store)
    await state.ready

    const first = state.setFact('a:one', true)
    const second = state.setFact('a:two', true)

    await expect(first).rejects.toThrow('rejected a:one')
    await expect(second).resolves.toBeUndefined()
    expect(state.facts).toEqual({ 'a:two': true })
  })

  it('settles overlapping calls in call order, even when a later write could finish first', async () => {
    const settleOrder: string[] = []
    const gate = deferred()
    const store: ProgressStore = {
      load: async () => ({}),
      save: async (facts) => {
        if ('a:slow' in facts) await gate.promise
      },
    }
    const state = new ProgressState(store)
    await state.ready

    const first = state.setFact('a:slow', true).then(() => settleOrder.push('first'))
    const second = state.setFact('a:fast', true).then(() => settleOrder.push('second'))

    // Give the fast write every chance to resolve before the slow one's gate opens.
    await flushMicrotasks()
    gate.resolve()
    await Promise.all([first, second])

    expect(settleOrder).toEqual(['first', 'second'])
    expect(state.facts).toEqual({ 'a:slow': true, 'a:fast': true })
  })
})
