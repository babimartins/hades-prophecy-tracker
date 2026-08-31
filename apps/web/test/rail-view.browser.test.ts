import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RailItem, RailView } from '../src/components/rail-view.js'
import '../src/components/rail-view.js'

const ITEMS: RailItem[] = [
  { id: 'one', label: 'God of the Heavens', done: 9, total: 13 },
  { id: 'two', label: 'Close at Heart', done: 11, total: 25 },
  { id: 'three', label: 'Eternal Rest', done: 0, total: 1 },
]

function rail(): RailView {
  const element = document.body.querySelector('rail-view')
  if (!element) throw new Error('rail-view did not render')
  return element
}

function root(): ShadowRoot {
  const shadow = rail().shadowRoot
  if (!shadow) throw new Error('rail-view has no shadow root')
  return shadow
}

async function mount(selected = ''): Promise<void> {
  render(
    html`<rail-view .items=${ITEMS} .selected=${selected}><p id="pane">pane</p></rail-view>`,
    document.body,
  )
  await rail().updateComplete
}

describe('the rail', () => {
  beforeEach(async () => {
    render(html``, document.body)
    await mount()
  })

  it('lists every item with its own progress', () => {
    const buttons = [...root().querySelectorAll('.rail button')]
    expect(buttons).toHaveLength(3)
    expect(buttons[0]?.textContent).toContain('9/13')
    expect(buttons[2]?.textContent).toContain('0/1')
  })

  it('selects the first item until one is chosen', () => {
    const selected = [...root().querySelectorAll('.rail button')].filter(
      (button) => button.getAttribute('aria-selected') === 'true',
    )
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toContain('God of the Heavens')
  })

  it('moves the selection and asks the parent to swap the pane', async () => {
    let chosen: string | undefined
    rail().addEventListener('rail-select', (event) => {
      chosen = (event as CustomEvent<{ id: string }>).detail.id
    })
    root().querySelector<HTMLButtonElement>('button[data-item="two"]')?.click()
    await rail().updateComplete
    expect(chosen).toBe('two')
    const selected = [...root().querySelectorAll<HTMLButtonElement>('.rail button')].filter(
      (button) => button.getAttribute('aria-selected') === 'true',
    )
    expect(selected).toHaveLength(1)
    expect(selected[0]?.dataset.item).toBe('two')
  })

  it('exposes the rail as a tab list, not as a bare set of buttons', () => {
    expect(root().querySelector('.rail')?.getAttribute('role')).toBe('tablist')
    expect(root().querySelector('.pane')?.getAttribute('role')).toBe('tabpanel')
  })

  it('scrolls the rail and the pane independently', () => {
    // The page-scroll assertion that used to sit here could not fail: three
    // items in a bare body never overflow. The frozen page is covered where
    // the grid actually lives, in shell.browser.test.ts.
    expect(getComputedStyle(root().querySelector('.rail')!).overflowY).toBe('auto')
    expect(getComputedStyle(root().querySelector('.pane')!).overflowY).toBe('auto')
  })

  it('renders whatever the parent slots into the pane', () => {
    const slotted = document.body.querySelector('#pane')
    expect(slotted).not.toBeNull()
    expect(slotted?.assignedSlot).not.toBeNull()
  })

  it('shows a bar only when the item has a total to measure against', async () => {
    render(
      html`<rail-view
        .items=${[{ id: 'empty', label: 'Platform achievements', sub: 'none yet', done: 0, total: 0 }]}
      ></rail-view>`,
      document.body,
    )
    await rail().updateComplete
    expect(root().querySelector('.bar')).toBeNull()
    expect(root().querySelector('.meta')?.textContent).toContain('none yet')
  })
})
