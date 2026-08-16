import { describe, expect, it } from 'vitest'
import { parseTransfer, toTransfer } from '../src/storage/transfer.js'

describe('transfer', () => {
  it('writes a versioned file', () => {
    expect(toTransfer({ 'nectar:dusa': true })).toEqual({
      version: 1,
      facts: { 'nectar:dusa': true },
    })
  })

  it('reads a versioned file', () => {
    expect(parseTransfer({ version: 1, facts: { 'nectar:dusa': true } })).toEqual({
      'nectar:dusa': true,
    })
  })

  it('rejects an unknown version', () => {
    expect(() => parseTransfer({ version: 2, facts: {} })).toThrow(/version/i)
  })

  it('rejects a fact value that is not boolean or number', () => {
    expect(() => parseTransfer({ version: 1, facts: { 'a:one': 'yes' } })).toThrow()
  })
})
