import type { Dataset } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/next-steps-panel.js'

const dataset: Dataset = {
  collections: [{ id: 'prophecy', name: 'Prophecies' }],
  facts: [
    { id: 'a:shared', label: 'Shared step', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:one', label: 'Only step one', kind: 'boolean', collection: 'prophecy' },
    { id: 'a:two', label: 'Only step two', kind: 'boolean', collection: 'prophecy' },
  ],
  achievements: [
    {
      id: 'prophecy:first',
      name: 'First',
      description: 'First.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:one'] },
    },
    {
      id: 'prophecy:second',
      name: 'Second',
      description: 'Second.',
      collection: 'prophecy',
      requirement: { kind: 'all', of: ['a:shared', 'a:two'] },
    },
  ],
}

describe('next-steps-panel', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('lists the highest impact step first with its impact badge', async () => {
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${{}} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items[0]!.getAttribute('label')).toBe('Shared step')
    expect(items[0]!.getAttribute('badge')).toBe('2 entries')
  })

  it('respects the limit', async () => {
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${{}} .limit=${1}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    expect(element.shadowRoot!.querySelectorAll('hd-checklist-item').length).toBe(1)
  })

  it('shows a done message when nothing is pending', async () => {
    const facts = { 'a:shared': true, 'a:one': true, 'a:two': true }
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${facts} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('Nothing left')
  })

  it('lines a number-fact row up with the checkbox rows above it, and keeps its label and badge on one line', async () => {
    const numberDataset: Dataset = {
      collections: [{ id: 'prophecy', name: 'Prophecies' }],
      facts: [
        {
          id: 'a:rank',
          label: 'A label long enough to have wrapped across three lines in the old layout',
          kind: 'number',
          max: 5,
          collection: 'prophecy',
        },
      ],
      achievements: [
        {
          id: 'prophecy:rank',
          name: 'Rank',
          description: 'Rank.',
          collection: 'prophecy',
          requirement: { kind: 'atLeast', fact: 'a:rank', value: 5 },
        },
      ],
    }
    render(
      html`<next-steps-panel .catalog=${numberDataset} .facts=${{}} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete

    const row = element.shadowRoot!.querySelector('.rank')!
    const spacer = row.querySelector('.spacer') as HTMLElement
    const label = row.querySelector('.label') as HTMLElement
    const badge = row.querySelector('.badge') as HTMLElement

    // Same width as the checkbox in hd-checklist-item, so the label column
    // of a number row lines up with the label column of a checkbox row.
    expect(getComputedStyle(spacer).width).toBe('18px')
    expect(getComputedStyle(label).whiteSpace).toBe('nowrap')
    expect(getComputedStyle(label).textOverflow).toBe('ellipsis')
    expect(getComputedStyle(badge).whiteSpace).toBe('nowrap')
  })

  it('never lets a single interaction reduce a number fact below its current value', async () => {
    const numberDataset: Dataset = {
      collections: [{ id: 'prophecy', name: 'Prophecies' }],
      facts: [{ id: 'a:rank', label: 'Reach rank', kind: 'number', max: 5, collection: 'prophecy' }],
      achievements: [
        {
          id: 'prophecy:rank',
          name: 'Rank',
          description: 'Rank.',
          collection: 'prophecy',
          requirement: { kind: 'atLeast', fact: 'a:rank', value: 5 },
        },
      ],
    }
    render(
      html`<next-steps-panel
        .catalog=${numberDataset}
        .facts=${{ 'a:rank': 3 }}
        .limit=${5}
      ></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete

    expect(element.shadowRoot!.querySelectorAll('hd-checklist-item').length).toBe(0)
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    expect(input.value).toBe('3')
  })

  it('does not leave a stale checked state on the row that reuses a ticked item’s position', async () => {
    function mount(facts: Record<string, boolean | number>) {
      render(
        html`<next-steps-panel .catalog=${dataset} .facts=${facts} .limit=${5}></next-steps-panel>`,
        document.body,
      )
      return document.querySelector('next-steps-panel')!
    }

    let element = mount({})
    await element.updateComplete

    // 'a:shared' is first (impact 2). Tick it directly, the way user input would.
    const firstItem = element.shadowRoot!.querySelectorAll('hd-checklist-item')[0]!
    await firstItem.updateComplete
    firstItem.shadowRoot!.querySelector('input')!.click()

    // Simulate the parent applying the write: 'a:shared' is now satisfied and
    // drops out of the pending list, so 'a:one' shifts into position 0, reusing
    // the DOM element that just showed 'a:shared' as checked.
    element = mount({ 'a:shared': true })
    await element.updateComplete

    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items[0]!.getAttribute('label')).toBe('Only step one')
    expect(items[0]!.hasAttribute('checked')).toBe(false)
  })

  it('fires fact-toggle with the fact id and the checked value', async () => {
    render(
      html`<next-steps-panel .catalog=${dataset} .facts=${{}} .limit=${5}></next-steps-panel>`,
      document.body,
    )
    const element = document.querySelector('next-steps-panel')!
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const item = element.shadowRoot!.querySelector('hd-checklist-item')!
    await item.updateComplete
    item.shadowRoot!.querySelector('input')!.click()
    expect(detail).toEqual([{ id: 'a:shared', value: true }])
  })
})
