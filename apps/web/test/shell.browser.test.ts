import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/app-shell.js'

const SECTIONS = ['characters', 'weapons', 'fated', 'house', 'collections']

function shell(): Element {
  const element = document.body.querySelector('app-shell')
  if (!element) throw new Error('app-shell did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = shell().shadowRoot
  if (!shadow) throw new Error('app-shell has no shadow root')
  return shadow
}

async function mount(): Promise<void> {
  render(html`<app-shell></app-shell>`, document.body)
  await (shell() as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

function tabs(): HTMLButtonElement[] {
  return [...root().querySelectorAll<HTMLButtonElement>('nav button')]
}

function pageScroll(): number {
  return document.documentElement.scrollHeight - document.documentElement.clientHeight
}

describe('the shell', () => {
  beforeEach(async () => {
    // Clearing with Lit, not innerHTML: innerHTML corrupts lit-html's render
    // bookkeeping and the next render throws ChildPart has no parentNode.
    render(html``, document.body)
    await mount()
  })

  it('offers the five sections, in the order the owner approved', () => {
    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual([
      'Characters',
      'Weapons',
      'Fated List',
      'The House',
      'Collections',
    ])
  })

  it('exposes the current section to assistive technology, not by colour alone', () => {
    const current = tabs().filter((tab) => tab.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent?.trim()).toBe('Characters')
  })

  it('moves the current section when a tab is pressed', async () => {
    tabs()[2]?.click()
    await (shell() as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const current = tabs().find((tab) => tab.getAttribute('aria-current') === 'page')
    expect(current?.textContent?.trim()).toBe('Fated List')
  })

  it('renders exactly one section at a time', async () => {
    for (const section of SECTIONS) {
      const tab = tabs().find((candidate) => candidate.dataset.section === section)
      tab?.click()
      await (shell() as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      const shown = [...root().querySelectorAll('[data-page]')].filter(
        (page) => (page as HTMLElement).hidden === false,
      )
      expect([section, shown.length]).toEqual([section, 1])
    }
  })

  it('never lets the page itself scroll, on any section', async () => {
    // The owner's rule: the table gets a scrollbar, the page height is frozen.
    for (const section of SECTIONS) {
      const tab = tabs().find((candidate) => candidate.dataset.section === section)
      tab?.click()
      await (shell() as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      await new Promise((resolve) => requestAnimationFrame(resolve))
      expect([section, pageScroll()]).toEqual([section, 0])
    }
  })

  it('keeps the header and the footer out of the scrolling region', () => {
    const header = root().querySelector('header')
    const footer = root().querySelector('footer')
    expect(header).not.toBeNull()
    expect(footer).not.toBeNull()
    const scroller = root().querySelector('main')
    expect(scroller?.contains(header!)).toBe(false)
    expect(scroller?.contains(footer!)).toBe(false)
  })

  it('gives main a full-width track, so its auto margins cannot collapse it', () => {
    // A flex item with `margin: 0 auto` does not stretch. Without an explicit
    // width, main shrinks to its content and the page mis-centres.
    const main = root().querySelector('main')
    expect(main).not.toBeNull()
    expect(getComputedStyle(main!).width).not.toBe('auto')
    const headerWidth = root().querySelector('header .wrap')?.getBoundingClientRect().width
    const mainWidth = main!.getBoundingClientRect().width
    expect(Math.abs(mainWidth - (headerWidth ?? 0))).toBeLessThan(41)
  })

  it('reports overall progress in facts, and says which unit it is', () => {
    const text = root().textContent ?? ''
    expect(text).toMatch(/actions recorded/i)
  })
})
