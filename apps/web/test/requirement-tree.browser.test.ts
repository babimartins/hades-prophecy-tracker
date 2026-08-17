import type { Fact, RequirementChild } from '@hades/schema'
import { html, render } from 'lit'
import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/requirement-tree.js'

const facts: Fact[] = [
  { id: 'a:one', label: 'Do the first thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:two', label: 'Do the second thing', kind: 'boolean', collection: 'prophecy' },
  { id: 'a:rank', label: 'Reach rank', kind: 'number', max: 4, collection: 'prophecy' },
  // Fact max deliberately differs from the atLeast threshold used below, the
  // way `aspect:stygius:zagreus` (max 5) differs between `prophecy:eternal-rest`
  // (atLeast 5) and `prophecy:violent-past` (atLeast 1).
  { id: 'a:shared-rank', label: 'Reach shared rank', kind: 'number', max: 5, collection: 'prophecy' },
]
const factsById = new Map(facts.map((fact) => [fact.id, fact]))

function mount(node: RequirementChild, current: Record<string, boolean | number> = {}) {
  render(
    html`<requirement-tree .node=${node} .facts=${current} .factsById=${factsById}></requirement-tree>`,
    document.body,
  )
  return document.querySelector('requirement-tree')!
}

describe('requirement-tree', () => {
  beforeEach(() => {
    render(html``, document.body)
  })

  it('renders one checklist item per boolean fact with its label', async () => {
    const element = mount({ kind: 'all', of: ['a:one', 'a:two'] })
    await element.updateComplete
    const items = element.shadowRoot!.querySelectorAll('hd-checklist-item')
    expect(items.length).toBe(2)
    expect(items[0]!.getAttribute('label')).toBe('Do the first thing')
  })

  it('shows the node kind for a nested group', async () => {
    const element = mount({
      kind: 'all',
      of: ['a:one', { kind: 'any', of: ['a:two'] }],
    })
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('Any of')
  })

  it('renders a number input for an atLeast node', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    expect(input.value).toBe('2')
    expect(input.max).toBe('4')
  })

  it('fires fact-toggle when the user checks an item', async () => {
    const element = mount({ kind: 'all', of: ['a:one'] })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const item = element.shadowRoot!.querySelector('hd-checklist-item')!
    await item.updateComplete
    item.shadowRoot!.querySelector('input')!.click()
    expect(detail).toEqual([{ id: 'a:one', value: true }])
  })

  it('bounds and clamps by the fact maximum, not by a lower node threshold', async () => {
    const element = mount(
      { kind: 'atLeast', fact: 'a:shared-rank', value: 1 },
      { 'a:shared-rank': 5 },
    )
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement

    // The fact is already at its own max (5), which is well past this node's
    // threshold (1). The input must reflect and clamp to the fact's max, not
    // silently cap the player's progress at the threshold of this one entry.
    expect(input.value).toBe('5')
    expect(input.max).toBe('5')

    input.value = '99'
    input.dispatchEvent(new Event('change'))
    expect(detail).toEqual([{ id: 'a:shared-rank', value: 5 }])
  })

  it('shows the node threshold as text, separate from the fact-maximum input bound', async () => {
    const element = mount(
      { kind: 'atLeast', fact: 'a:shared-rank', value: 1 },
      { 'a:shared-rank': 5 },
    )
    await element.updateComplete
    expect(element.shadowRoot!.textContent).toContain('1')
  })

  it('clamps a value typed past the maximum before emitting it', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    input.value = '99'
    input.dispatchEvent(new Event('change'))
    expect(detail).toEqual([{ id: 'a:rank', value: 4 }])
  })

  it('clamps a negative value to zero before emitting it', async () => {
    const element = mount({ kind: 'atLeast', fact: 'a:rank', value: 4 }, { 'a:rank': 2 })
    await element.updateComplete
    const detail: Array<{ id: string; value: boolean | number }> = []
    element.addEventListener('fact-toggle', (event) => {
      detail.push((event as CustomEvent<{ id: string; value: boolean | number }>).detail)
    })
    const input = element.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement
    input.value = '-5'
    input.dispatchEvent(new Event('change'))
    expect(detail).toEqual([{ id: 'a:rank', value: 0 }])
  })
})
