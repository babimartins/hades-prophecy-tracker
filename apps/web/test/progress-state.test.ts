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
})
