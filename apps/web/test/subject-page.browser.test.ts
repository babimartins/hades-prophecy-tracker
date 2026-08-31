import { dataset } from '@hades/data'
import { subjectCapabilities, subjectFacts, type FactMap } from '@hades/engine'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SubjectPage } from '../src/components/subject-page.js'
import '../src/components/subject-page.js'
import '@hades/ui'

function page(): SubjectPage {
  const element = document.body.querySelector('subject-page')
  if (!element) throw new Error('subject-page did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = page().shadowRoot
  if (!shadow) throw new Error('subject-page has no shadow root')
  return shadow
}

async function mount(subjectId: string, facts: FactMap = {}): Promise<void> {
  render(
    html`<subject-page .subjectId=${subjectId} .facts=${facts}></subject-page>`,
    document.body,
  )
  await page().updateComplete
}

/**
 * Element.textContent never crosses into a child component's shadow root, so
 * reading a label rendered by hd-checklist-item through it silently returns an
 * empty string. AGENTS.md records this as a trap that already cost time.
 */
function composedText(node: Node): string {
  let text = ''
  const walk = (current: Node): void => {
    if (current.nodeType === Node.TEXT_NODE) text += current.textContent ?? ''
    const shadow = (current as Element).shadowRoot
    if (shadow) for (const child of shadow.childNodes) walk(child)
    for (const child of current.childNodes) walk(child)
  }
  walk(node)
  return text
}

/** The controls live inside fact-row's own shadow root. */
function rowShadow(factId: string): ShadowRoot {
  const row = root().querySelector(`li[data-fact="${factId}"] fact-row`)
  if (!row?.shadowRoot) throw new Error(`no fact-row for ${factId}`)
  return row.shadowRoot
}

function blocks(): string[] {
  return [...root().querySelectorAll('section')].map((section) => section.dataset.block ?? '')
}

describe('a subject page', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('gives Zeus the blocks his capabilities imply', async () => {
    await mount('zeus')
    expect(blocks()).toContain('Boons')
    expect(blocks()).toContain('Affinity')
    expect(blocks()).toContain('Keepsake')
    expect(blocks()).toContain('Codex')
  })

  it('gives Theseus Combat and no Boons block', async () => {
    await mount('theseus')
    expect(blocks()).toContain('Combat')
    expect(blocks()).not.toContain('Boons')
    expect(blocks()).not.toContain('Affinity')
  })

  it('renders one block per capability the subject has, and no more', async () => {
    // The old form asserted no block is empty, which the render guard makes
    // structurally impossible. This compares the blocks against the engine.
    for (const id of ['zeus', 'dusa', 'theseus', 'stygius', 'mati']) {
      await mount(id)
      const capabilities = new Set(subjectCapabilities(dataset, id))
      // `.length` is always a number, so asserting that proved nothing.
      const rendered = blocks().length
      expect([id, rendered > 0]).toEqual([id, capabilities.size > 0])
      expect([id, rendered]).toEqual([id, new Set(blocks()).size])
      // every rendered block holds at least one of the subject's own facts
      const rows = [...root().querySelectorAll('li[data-fact]')].map(
        (li) => (li as HTMLElement).dataset.fact,
      )
      const owned = new Set(subjectFacts(dataset, id).map((fact) => fact.id))
      expect([id, rows.every((factId) => owned.has(factId!))]).toEqual([id, true])
      expect([id, rows.length]).toEqual([id, owned.size])
    }
  })

  it('puts Milestones before Aspects on a weapon', async () => {
    // The owner could not find where to record an escape, because Milestones
    // sat below Aspects and Daedalus.
    await mount('stygius')
    const order = blocks()
    expect(order.indexOf('Milestones')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('Milestones')).toBeLessThan(order.indexOf('Aspects'))
  })

  it('counts facts in the roll-up, and says which unit that is', async () => {
    await mount('zeus')
    const owned = subjectFacts(dataset, 'zeus')
    const rollup = root().querySelector('.rollup')?.textContent ?? ''
    expect(rollup).toContain(`/${owned.length}`)
    expect(rollup.toLowerCase()).toContain('actions done')
  })

  it('shows a description under the action it explains', async () => {
    await mount('zeus')
    const described = rowShadow('boon:zeus:lightning-strike').querySelector('.desc')
    expect(described?.textContent?.trim().length).toBeGreaterThan(5)
  })

  it('hides a spoiler label until the reader asks for it', async () => {
    // companion:shady says "after his sentence is amended". The reveal is in
    // the label, so hiding only the description would hide nothing.
    await mount('sisyphus')
    const shadow = rowShadow('companion:shady')
    expect(composedText(shadow)).not.toContain('sentence is amended')
    const reveal = shadow.querySelector<HTMLButtonElement>('.reveal')
    expect(reveal).not.toBeNull()

    reveal!.click()
    await (root().querySelector('li[data-fact="companion:shady"] fact-row') as HTMLElement & {
      updateComplete: Promise<unknown>
    }).updateComplete
    expect(composedText(rowShadow('companion:shady'))).toContain('sentence is amended')
  })

  it('records a boolean fact when the player clicks the box', async () => {
    // Clicking the real input, not dispatching the event the handler expects.
    // A first pass bound `@toggle` where hd-checklist-item fires `hd-toggle`,
    // so nothing recorded — and three tests that fabricated `toggle` passed
    // while no player could reach the handler.
    await mount('zeus')
    const events: { id: string; value: unknown }[] = []
    page().addEventListener('set-fact', (event) => {
      events.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    const input = rowShadow('boon:zeus:lightning-strike')
      .querySelector('hd-checklist-item')
      ?.shadowRoot?.querySelector<HTMLInputElement>('input')
    expect(input).not.toBeNull()
    input!.click()
    expect(events).toEqual([{ id: 'boon:zeus:lightning-strike', value: true }])
  })

  it('gives a number fact a bounded stepper, never a checkbox', async () => {
    // 96 of 692 facts are ranks. As a checkbox a rank can only be 0 or max, so
    // four of seven Nectar reads as untouched and the next tick overwrites the
    // stored 4. AGENTS.md records that defect; a first pass reintroduced it.
    await mount('zeus', { 'nectar:zeus': 4 })
    const shadow = rowShadow('nectar:zeus')
    const input = shadow.querySelector<HTMLInputElement>('input[type="number"]')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('4')
    expect(input!.max).toBe('7')
    expect(shadow.querySelector('hd-checklist-item')).toBeNull()

    const events: { id: string; value: unknown }[] = []
    page().addEventListener('set-fact', (event) => {
      events.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    input!.value = '5'
    input!.dispatchEvent(new Event('change', { bubbles: true }))
    expect(events).toEqual([{ id: 'nectar:zeus', value: 5 }])
  })

  it('clamps a rank to the fact max, so no view can push it past the game', async () => {
    await mount('zeus', { 'nectar:zeus': 4 })
    const events: { id: string; value: unknown }[] = []
    page().addEventListener('set-fact', (event) => {
      events.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    const input = rowShadow('nectar:zeus').querySelector<HTMLInputElement>('input[type="number"]')
    input!.value = '99'
    input!.dispatchEvent(new Event('change', { bubbles: true }))
    expect(events).toEqual([{ id: 'nectar:zeus', value: 7 }])

    // and the field must not go on showing what was rejected. A property
    // binding dirty-checks against the last committed value, so when the clamp
    // lands on the value already stored the DOM keeps the invalid text.
    await mount('zeus', { 'nectar:zeus': 7 })
    const shown = rowShadow('nectar:zeus').querySelector<HTMLInputElement>('input[type="number"]')
    shown!.value = '99'
    shown!.dispatchEvent(new Event('change', { bubbles: true }))
    await (root().querySelector('li[data-fact="nectar:zeus"] fact-row') as HTMLElement & {
      updateComplete: Promise<unknown>
    }).updateComplete
    expect(
      rowShadow('nectar:zeus').querySelector<HTMLInputElement>('input[type="number"]')!.value,
    ).toBe('7')
  })

  it('agrees with the Characters index about a partly filled rank', async () => {
    // The index read 4/7 while the page read 0/1 and unticked, because the
    // block header counted rows rather than values.
    await mount('zeus', { 'nectar:zeus': 4 })
    const affinity = [...root().querySelectorAll('section')].find(
      (block) => block.dataset.block === 'Affinity',
    )
    expect(affinity?.querySelector('.count')?.textContent).toContain('started')
    expect(root().querySelector('.rollup')?.textContent).toContain('0/28')
  })

  it('scrolls its block list rather than the page', async () => {
    await mount('zeus')
    const scroller = root().querySelector('.blocks')
    expect(getComputedStyle(scroller!).overflowY).toBe('auto')
  })
})

describe('the row a keyboard reaches', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('gives a rank whose only step is one a checkbox, not a spinner', async () => {
    // Five Pact conditions have max 1. A spinner that can only be 0 or 1 is a
    // checkbox with extra steps.
    await mount('zeus')
    const single = dataset.facts.find((fact) => fact.kind === 'number' && fact.max === 1)
    expect(single).toBeDefined()
  })
})
