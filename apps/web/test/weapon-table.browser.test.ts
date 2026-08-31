import type { FactMap } from '@hades/engine'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildWeaponRows, type WeaponTable } from '../src/components/weapon-table.js'

function table(): WeaponTable {
  const element = document.body.querySelector('weapon-table')
  if (!element) throw new Error('weapon-table did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = table().shadowRoot
  if (!shadow) throw new Error('weapon-table has no shadow root')
  return shadow
}

async function mount(facts: FactMap = {}): Promise<void> {
  render(html`<weapon-table .facts=${facts}></weapon-table>`, document.body)
  await table().updateComplete
}

describe('the Weapons index', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount()
  })

  it('shows the six weapons', () => {
    expect(root().querySelectorAll('tbody tr')).toHaveLength(6)
  })

  it('reads an aspect level from the fact max, never from a hard-coded five', () => {
    const rows = buildWeaponRows({})
    for (const row of rows) {
      expect([row.subject.id, row.aspects]).toEqual([row.subject.id, expect.any(Array)])
      expect([row.subject.id, row.aspects.length]).toEqual([row.subject.id, 4])
      for (const aspect of row.aspects) {
        expect([aspect.fact.id, aspect.max]).toEqual([aspect.fact.id, aspect.fact.max])
      }
    }
  })

  it('counts twelve Daedalus enchantments per weapon', () => {
    for (const row of buildWeaponRows({})) {
      expect([row.subject.id, row.daedalus.total]).toEqual([row.subject.id, 12])
    }
  })

  it('opens a weapon when its row is clicked', async () => {
    let opened: string | undefined
    table().addEventListener('open-subject', (event) => {
      opened = (event as CustomEvent<{ id: string }>).detail.id
    })
    root().querySelector<HTMLElement>('tr[data-weapon="stygius"]')?.click()
    expect(opened).toBe('stygius')
  })

  it('ticks in place, and the tick does not open the weapon', async () => {
    // The owner could not find where to record an escape. The row answers it.
    const set: { id: string; value: unknown }[] = []
    let opened = false
    table().addEventListener('set-fact', (event) => {
      set.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    table().addEventListener('open-subject', () => {
      opened = true
    })
    const escaped = root().querySelector<HTMLButtonElement>(
      'tr[data-weapon="stygius"] td:nth-child(3) .check',
    )
    escaped?.click()
    expect(set).toHaveLength(1)
    expect(set[0]?.id).toMatch(/^escape:/)
    expect(set[0]?.value).toBe(true)
    expect(opened).toBe(false)
  })

  it('reflects a stored tick', async () => {
    const rows = buildWeaponRows({})
    const escapeId = rows.find((row) => row.subject.id === 'stygius')?.escaped?.id ?? ''
    await mount({ [escapeId]: true })
    const escaped = root().querySelector(
      'tr[data-weapon="stygius"] td:nth-child(3) .check',
    )
    expect(escaped?.getAttribute('aria-checked')).toBe('true')
  })

  it('names each tick for assistive technology', () => {
    const ticks = [...root().querySelectorAll('.check')]
    expect(ticks.length).toBe(12)
    for (const tick of ticks) {
      expect(tick.getAttribute('aria-label')?.length).toBeGreaterThan(5)
    }
  })

  it('opens a header tooltip downwards, so the sticky header cannot clip it', () => {
    // The header is sticky inside the scroll container, which clips anything
    // above it, so an upward box is invisible. Measure where the box actually
    // lands rather than reading a style: getComputedStyle resolves `bottom` to
    // a used pixel value even when the rule never set it.
    const term = root().querySelector<HTMLElement>('.term')
    const box = root().querySelector<HTMLElement>('.term .box')
    expect(box).not.toBeNull()
    const termRect = term!.getBoundingClientRect()
    const boxRect = box!.getBoundingClientRect()
    expect(boxRect.top).toBeGreaterThanOrEqual(termRect.bottom)
  })

  it('explains a term the player does not meet under that name in the game', () => {
    const terms = [...root().querySelectorAll('.term')].map((term) => term.textContent ?? '')
    expect(terms.join(' ')).toContain('Titan Blood')
    expect(terms.join(' ')).toContain('Daedalus Hammer')
  })

  it('scrolls its own body rather than the page', () => {
    expect(getComputedStyle(root().querySelector('.table')!).overflow).toBe('auto')
  })
})
