import type { FactMap } from '@hades/engine'
import { openDB, type IDBPDatabase } from 'idb'
import type { ProgressStore } from './progress-store.js'

const STORE_NAME = 'progress'
const RECORD_KEY = 'facts'

export function createIndexedDbStore(databaseName = 'hades-prophecy-tracker'): ProgressStore {
  let connection: Promise<IDBPDatabase> | undefined

  function db(): Promise<IDBPDatabase> {
    connection ??= openDB(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore(STORE_NAME)
      },
    })
    return connection
  }

  return {
    async load() {
      const value = await (await db()).get(STORE_NAME, RECORD_KEY)
      return (value as FactMap | undefined) ?? {}
    },
    async save(facts) {
      await (await db()).put(STORE_NAME, facts, RECORD_KEY)
    },
  }
}
