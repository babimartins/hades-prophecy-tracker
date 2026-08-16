import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createIndexedDbStore } from '../src/storage/indexeddb-store.js'

describe('createIndexedDbStore', () => {
  it('returns an empty map before the first save', async () => {
    const store = createIndexedDbStore('test-db-empty')
    expect(await store.load()).toEqual({})
  })

  it('round trips the fact map', async () => {
    const store = createIndexedDbStore('test-db-round-trip')
    await store.save({ 'nectar:dusa': true, 'pact:extreme-measures': 4 })
    expect(await store.load()).toEqual({ 'nectar:dusa': true, 'pact:extreme-measures': 4 })
  })
})
