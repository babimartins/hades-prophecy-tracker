import { dataset } from '@hades/data'
import { subjectFacts, type FactMap } from '@hades/engine'
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

  it('never renders an empty block', async () => {
    for (const id of ['zeus', 'dusa', 'theseus', 'stygius', 'mati']) {
      await mount(id)
      const empty = [...root().querySelectorAll('section')].filter(
        (section) => section.querySelectorAll('li').length === 0,
      )
      expect([id, empty.length]).toEqual([id, 0])
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
    const withDescription = root().querySelector('.desc')
    expect(withDescription?.textContent?.trim().length).toBeGreaterThan(5)
  })

  it('hides a spoiler label until the reader asks for it', async () => {
    // companion:shady says "after his sentence is amended". The reveal is in
    // the label, so hiding only the description would hide nothing.
    await mount('sisyphus')
    const row = root().querySelector('li[data-fact="companion:shady"]')
    expect(row).not.toBeNull()
    expect(composedText(row!)).not.toContain('sentence is amended')
    expect(row?.querySelector('.reveal')).not.toBeNull()

    row?.querySelector<HTMLButtonElement>('.reveal')?.click()
    await page().updateComplete
    const revealed = root().querySelector('li[data-fact="companion:shady"]')
    expect(composedText(revealed!)).toContain('sentence is amended')
  })

  it('asks to set a fact rather than writing it, and sends the right value', async () => {
    await mount('zeus')
    const events: { id: string; value: unknown }[] = []
    page().addEventListener('set-fact', (event) => {
      events.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    const boon = root().querySelector('li[data-fact="boon:zeus:lightning-strike"] hd-checklist-item')
    boon?.dispatchEvent(new CustomEvent('toggle', { bubbles: true, composed: true }))
    expect(events).toEqual([{ id: 'boon:zeus:lightning-strike', value: true }])
  })

  it('sends a number fact to its own max, not to 1', async () => {
    // A number fact read as a boolean is how a stored rank was destroyed once.
    await mount('zeus')
    const events: { id: string; value: unknown }[] = []
    page().addEventListener('set-fact', (event) => {
      events.push((event as CustomEvent<{ id: string; value: unknown }>).detail)
    })
    const affinity = root().querySelector('li[data-fact="nectar:zeus"] hd-checklist-item')
    affinity?.dispatchEvent(new CustomEvent('toggle', { bubbles: true, composed: true }))
    expect(events).toEqual([{ id: 'nectar:zeus', value: 7 }])
  })

  it('scrolls its block list rather than the page', async () => {
    await mount('zeus')
    const scroller = root().querySelector('.blocks')
    expect(getComputedStyle(scroller!).overflowY).toBe('auto')
  })
})
