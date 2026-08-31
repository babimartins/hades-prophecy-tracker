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

  it('shows the characters with content, and hides the 44 bare foes by default', () => {
    const characters = subjectsOfType(dataset, 'character')
    expect(characters).toHaveLength(73)
    const shown = rowNames()
    expect(shown.length).toBeGreaterThan(20)
    expect(shown.length).toBeLessThan(40)
    expect(shown).toContain('Zeus')
    expect(shown).toContain('Dusa')
    expect(shown).not.toContain('Numbskull')
  })

  it('counts every chip from the data, never from a written-down number', () => {
    const rows = buildRows({})
    const olympians = root().querySelector('.chip[data-filter="olympian"]')?.textContent ?? ''
    expect(olympians).toContain(String(rows.filter((row) => row.markers.includes('olympian')).length))
    expect(olympians).toContain('9')
    const foes = root().querySelector('.chip[data-filter="foes"]')?.textContent ?? ''
    expect(foes).toContain(String(rows.filter(isFoe).length))
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
    expect([...markers].sort()).toEqual(['companion', 'favor', 'fightable', 'grants', 'olympian'])
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
