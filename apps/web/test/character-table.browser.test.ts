import { dataset } from '@hades/data'
import { subjectsOfType, type FactMap } from '@hades/engine'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildRows, isFoe, type CharacterTable } from '../src/components/character-table.js'

function table(): CharacterTable {
  const element = document.body.querySelector('character-table')
  if (!element) throw new Error('character-table did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = table().shadowRoot
  if (!shadow) throw new Error('character-table has no shadow root')
  return shadow
}

async function mount(facts: FactMap = {}): Promise<void> {
  render(html`<character-table .facts=${facts}></character-table>`, document.body)
  await table().updateComplete
}

function rowNames(): string[] {
  // The cell holds the name plus a <small> section label, and lit leaves marker
  // comments between them. Take the whole cell and subtract the small.
  return [...root().querySelectorAll('tbody tr td.name')].map((cell) => {
    const section = cell.querySelector('small')?.textContent ?? ''
    return (cell.textContent ?? '').replace(section, '').trim()
  })
}

function chip(id: string): HTMLButtonElement {
  const found = root().querySelector<HTMLButtonElement>(`.chip[data-filter="${id}"]`)
  if (!found) throw new Error(`no chip for ${id}`)
  return found
}

describe('the Characters index', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount()
  })

  it('shows exactly the characters that are more than a foe', () => {
    // The bounds were 20 to 40, which could not see the split drift from
    // 29/44 to 34/39. Derive both sides from the data instead.
    const characters = subjectsOfType(dataset, 'character')
    expect(characters).toHaveLength(73)
    const rows = buildRows({})
    const expected = rows.filter((row) => !isFoe(row))
    expect(rowNames().sort()).toEqual(expected.map((row) => row.subject.name).sort())
    expect(rowNames()).toContain('Zeus')
    expect(rowNames()).not.toContain('Numbskull')
  })

  it('counts each chip over the population it actually shows', async () => {
    // Counting across all 73 gave "Fightable · 42" beside "All · 34", and
    // clicking it surfaced the bare foes the default view hides on purpose.
    const counts: Record<string, number> = {}
    for (const chipId of ['all', 'olympian', 'affinity', 'fightable', 'favor', 'companion', 'foes']) {
      const text = root().querySelector(`.chip[data-filter="${chipId}"]`)?.textContent ?? ''
      counts[chipId] = Number(text.split('·').at(-1)?.trim())
      chip(chipId).click()
      await table().updateComplete
      expect([chipId, rowNames().length]).toEqual([chipId, counts[chipId]])
      chip('all').click()
      await table().updateComplete
    }
    // no filter of the default population may exceed it
    for (const id of ['olympian', 'affinity', 'fightable', 'favor', 'companion']) {
      expect([id, counts[id]! <= counts.all!]).toEqual([id, true])
    }
    expect(counts.olympian).toBe(9)
    // the chip counts the givers, not the companions: `companion` means two
    // opposite things and a chip has to pick one
    expect(counts.companion).toBe(6)
  })

  it('narrows to a filter, and the Foes chip reveals the ones hidden by default', async () => {
    chip('olympian').click()
    await table().updateComplete
    expect(rowNames()).toHaveLength(9)
    expect(rowNames()).toContain('Zeus')

    chip('foes').click()
    await table().updateComplete
    expect(rowNames()).toContain('Numbskull')
  })

  it('sorts by hearts ascending, which is the Ambrosia queue', async () => {
    // The owner's own use: "quantos corações tenho com cada personagem pra
    // decidir pra quem dou ambrosia". Lowest affinity first.
    const facts: FactMap = { 'nectar:zeus': 6, 'nectar:dusa': 1 }
    await mount(facts)
    chip('affinity').click()
    await table().updateComplete
    const heartsHeader = [...root().querySelectorAll<HTMLButtonElement>('thead button')].find(
      (button) => button.textContent?.includes('Hearts'),
    )
    heartsHeader?.click()
    await table().updateComplete
    const names = rowNames()
    expect(names.indexOf('Dusa')).toBeLessThan(names.indexOf('Zeus'))
  })

  it('reverses the sort when the same column is pressed again', async () => {
    const facts: FactMap = { 'nectar:zeus': 6, 'nectar:dusa': 1 }
    await mount(facts)
    chip('affinity').click()
    await table().updateComplete
    const heartsHeader = () =>
      [...root().querySelectorAll<HTMLButtonElement>('thead button')].find((button) =>
        button.textContent?.includes('Hearts'),
      )
    heartsHeader()?.click()
    await table().updateComplete
    heartsHeader()?.click()
    await table().updateComplete
    const names = rowNames()
    expect(names.indexOf('Zeus')).toBeLessThan(names.indexOf('Dusa'))
  })

  it('exposes the sorted column to assistive technology', async () => {
    const heartsHeader = [...root().querySelectorAll<HTMLButtonElement>('thead button')].find(
      (button) => button.textContent?.includes('Hearts'),
    )
    heartsHeader?.click()
    await table().updateComplete
    const sorted = [...root().querySelectorAll('th[aria-sort]')].filter(
      (header) => header.getAttribute('aria-sort') !== 'none',
    )
    expect(sorted).toHaveLength(1)
    expect(sorted[0]?.textContent).toContain('Hearts')
  })

  it('reads a heart count from the fact, not from a fixed maximum', () => {
    // Affinity maxima differ per character: Hades has 5, Dusa has 10.
    const rows = buildRows({})
    expect(rows.find((row) => row.subject.id === 'hades')?.hearts?.max).toBe(5)
    expect(rows.find((row) => row.subject.id === 'dusa')?.hearts?.max).toBe(10)
  })

  it('marks only what varies: no Codex, Affinity or Keepsake tag', () => {
    const markers = new Set(buildRows({}).flatMap((row) => row.markers))
    expect([...markers].sort()).toEqual([
      'Companion',
      'Favor',
      'Fightable',
      'Gives a companion',
      'Grants boons',
      'Olympian',
    ])
  })

  it('asks to open a character when its row is clicked', async () => {
    let opened: string | undefined
    table().addEventListener('open-subject', (event) => {
      opened = (event as CustomEvent<{ id: string }>).detail.id
    })
    root().querySelector<HTMLElement>('tbody tr[data-subject="zeus"]')?.click()
    expect(opened).toBe('zeus')
  })

  it('scrolls its own body rather than the page', () => {
    const scroller = root().querySelector('.table')
    expect(scroller).not.toBeNull()
    expect(getComputedStyle(scroller!).overflow).toBe('auto')
  })
})

describe('what the Characters index must get right', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount()
  })

  it('names the Codex section in English, not as a slug', () => {
    const sections = [...root().querySelectorAll('td.name small')].map((s) => s.textContent ?? '')
    expect(sections).toContain('Olympian Gods')
    expect(sections.join(' ')).not.toContain('olympian-gods')
  })

  it('files Chaos the deity under Chthonic Gods, not under The Underworld', () => {
    // Two Codex entries are named "Chaos". A name-keyed lookup keeps the last
    // and files the god as a realm; AGENTS.md records this trap by name.
    const row = root().querySelector('tr[data-subject="chaos"] td.name small')
    expect(row?.textContent).toBe('Chthonic Gods')
  })

  it('opens a character from the keyboard', async () => {
    let opened: string | undefined
    table().addEventListener('open-subject', (event) => {
      opened = (event as CustomEvent<{ id: string }>).detail.id
    })
    const row = root().querySelector<HTMLElement>('tr[data-subject="zeus"]')
    expect(row?.tabIndex).toBe(0)
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(opened).toBe('zeus')
  })

  it('does not claim a reversal the Character column never performs', async () => {
    const nameHeader = () =>
      [...root().querySelectorAll<HTMLButtonElement>('thead button')].find((b) =>
        b.textContent?.includes('Character'),
      )
    nameHeader()?.click()
    await table().updateComplete
    const ascending = rowNames()
    nameHeader()?.click()
    await table().updateComplete
    const descending = rowNames()
    expect(descending).toEqual([...ascending].reverse())
  })

  it('draws a bar beside a ratio, as the approved design does', () => {
    const boons = root().querySelector('tr[data-subject="zeus"] td:nth-child(4) .bar')
    expect(boons).not.toBeNull()
  })

  it('tells a companion apart from the character who gives one', () => {
    // The engine warns that `companion` means two opposite things and that the
    // interface must choose the word. Battie is one; Megaera gives one.
    const rows = buildRows({})
    expect(rows.find((r) => r.subject.id === 'companion-battie')?.markers).toContain('Companion')
    expect(rows.find((r) => r.subject.id === 'megaera')?.markers).toContain('Gives a companion')
  })
})
